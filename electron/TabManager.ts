import { BrowserWindow, WebContentsView, session, Menu, dialog, app } from 'electron';
import type { TabInfo, SidePanelState, PanelSide } from './types';
import type SettingsManager from './SettingsManager';
import type AdBlockManager from './AdBlockManager';

const INJECTED_CSS = `
    /* Ensure pages have a white background foundation - prevents dark WebContentsView from bleeding through */
    /* This can be overridden by websites' own CSS that sets explicit backgrounds */
    html, body { background-color: #ffffff; }
    
    .sticky.top-0.z-50.w-full.bg-super,
    [class*="AppBanner"],
    [class*="downloadBanner"] { 
        display: none !important; 
    }
    body { padding-top: 0 !important; }
    
    /* Modern scrollbar styling for all webviews */
    ::-webkit-scrollbar {
        width: 10px;
        height: 10px;
    }
    ::-webkit-scrollbar-track {
        background: #1e1e1e;
        border-radius: 5px;
    }
    ::-webkit-scrollbar-thumb {
        background: #52525b;
        border-radius: 5px;
        border: 2px solid transparent;
        background-clip: padding-box;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: #71717a;
    }
`;

/** Internal tab entry with WebContentsView reference */
interface TabEntry {
    id: string;
    view: WebContentsView | null;
    profileId: string;
    title: string;
    url: string;
    loaded: boolean;
    suspended?: boolean;
    lastActiveTime: number;
    faviconDataUrl?: string;
    // Media activity tracking - prevents suspension of tabs playing audio/video
    isMediaPlaying?: boolean;
    isAudible?: boolean;
    // Manual exclusion from suspension (context menu option)
    excludeFromSuspension?: boolean;
}

interface TabMetadata {
    id: string;
    profileId: string;
    url: string;
    title?: string;
    faviconDataUrl?: string;
}

interface ViewBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface LoadStats {
    loaded: number;
    unloaded: number;
    total: number;
}

/**
 * TabManager with lazy loading support
 * Tabs can exist in two states:
 * 1. loaded: has a WebContentsView (uses memory)
 * 2. unloaded: metadata only (URL, title, profileId) - no memory usage
 */
class TabManager {
    mainWindow: BrowserWindow;
    private settingsManager: SettingsManager;
    tabs: Map<string, TabEntry>;
    activeTabId: string | null;
    private tabOrder: string[];
    private inactivityCheckInterval: NodeJS.Timeout | null;
    private updateViewBoundsCallback: (() => void) | null;
    private downloadManager: { addDownload: (item: Electron.DownloadItem) => void } | null;
    private sessionsWithDownloadListener: Set<string>;
    private openDownloadsWindowCallback: (() => void) | null;
    private pendingDownloadPaths: Map<string, string>; // URL -> save path for user-confirmed downloads
    private adBlockManager: AdBlockManager | null;
    private sidePanelByProfile: Map<string, SidePanelState> = new Map();
    private currentProfileId: string | null = null;

    constructor(mainWindow: BrowserWindow, settingsManager: SettingsManager) {
        this.mainWindow = mainWindow;
        this.settingsManager = settingsManager;
        this.tabs = new Map();
        this.activeTabId = null;
        this.tabOrder = [];
        this.inactivityCheckInterval = null;
        this.updateViewBoundsCallback = null;
        this.downloadManager = null;
        this.sessionsWithDownloadListener = new Set();
        this.openDownloadsWindowCallback = null;
        this.pendingDownloadPaths = new Map();
        this.adBlockManager = null;
        // sidePanelByProfile and currentProfileId already initialized at declaration

        // Start inactivity check timer (runs every minute)
        this._startInactivityTimer();
    }



    /**
     * Set the updateViewBounds callback (called from main.ts after initialization)
     */
    setUpdateViewBounds(callback: () => void): void {
        this.updateViewBoundsCallback = callback;
    }

    /**
     * Set the download manager for tracking downloads
     */
    setDownloadManager(manager: { addDownload: (item: Electron.DownloadItem) => void }): void {
        this.downloadManager = manager;
    }

    /**
     * Set the callback to open downloads window
     */
    setOpenDownloadsWindow(callback: () => void): void {
        this.openDownloadsWindowCallback = callback;
    }

    /**
     * Set the ad block manager for enabling blocking on sessions
     */
    setAdBlockManager(manager: AdBlockManager): void {
        this.adBlockManager = manager;
    }

    /**
     * Start the inactivity timer that checks for idle tabs
     */
    private _startInactivityTimer(): void {
        const CHECK_INTERVAL_MS = 60 * 1000;

        this.inactivityCheckInterval = setInterval(() => {
            this._checkInactiveTabs();
        }, CHECK_INTERVAL_MS);

        console.log('[TabManager] Inactivity timer started (checking every 60 seconds)');
    }

    /**
     * Stop the inactivity timer
     */
    private _stopInactivityTimer(): void {
        if (this.inactivityCheckInterval) {
            clearInterval(this.inactivityCheckInterval);
            this.inactivityCheckInterval = null;
            console.log('[TabManager] Inactivity timer stopped');
        }
    }

    /**
     * Check for inactive tabs and suspend them based on settings
     */
    private _checkInactiveTabs(): void {
        const settings = this.settingsManager.getSettings();
        const autoSuspendEnabled = settings.performance?.autoSuspendEnabled ?? true;
        const autoSuspendMinutes = settings.performance?.autoSuspendMinutes ?? 30;
        const excludeActiveProfile = settings.performance?.excludeActiveProfile ?? false;

        if (!autoSuspendEnabled) {
            return;
        }

        // Get the active profile ID from the currently active tab
        let activeProfileId: string | null = null;
        if (excludeActiveProfile && this.activeTabId) {
            const activeTab = this.tabs.get(this.activeTabId);
            if (activeTab) {
                activeProfileId = activeTab.profileId;
            }
        }

        const now = Date.now();
        const inactivityThresholdMs = autoSuspendMinutes * 60 * 1000;
        let suspendedCount = 0;

        this.tabs.forEach((tab, tabId) => {
            // Skip the currently active tab
            if (tabId === this.activeTabId) {
                return;
            }

            // Skip tabs in the active profile if excludeActiveProfile is enabled
            if (excludeActiveProfile && tab.profileId === activeProfileId) {
                return;
            }

            // Skip tabs that aren't loaded
            if (!tab.loaded || !tab.view) {
                return;
            }

            // Skip tabs with active media playback (Chrome-like behavior)
            if (tab.isMediaPlaying || tab.isAudible) {
                return;
            }

            // Skip tabs manually excluded from suspension
            if (tab.excludeFromSuspension) {
                return;
            }

            // Check if tab has been inactive too long
            const lastActive = tab.lastActiveTime || 0;
            const inactiveMs = now - lastActive;

            if (inactiveMs >= inactivityThresholdMs) {
                console.log(`[TabManager] Auto-suspending tab ${tabId} (${tab.title}) - inactive for ${Math.round(inactiveMs / 60000)} minutes`);
                this.unloadTab(tabId);
                suspendedCount++;
            }
        });

        if (suspendedCount > 0) {
            console.log(`[TabManager] Auto-suspended ${suspendedCount} inactive tab(s)`);
        }
    }

    /**
     * Register tab metadata without creating a WebContentsView
     * Used for lazy loading - the view is created when the tab is activated
     */
    registerTabMetadata(tabData: TabMetadata): string {
        const { id, profileId, url, title, faviconDataUrl } = tabData;

        console.log(`[TabManager] Registering metadata for tab ${id} (lazy - no view created)`);

        this.tabs.set(id, {
            id,
            view: null,
            profileId,
            title: title || 'New Thread',
            url: url || this._getDefaultUrl(),
            loaded: false,
            lastActiveTime: 0,
            faviconDataUrl
        });

        // Add to tab order if not already present
        if (!this.tabOrder.includes(id)) {
            this.tabOrder.push(id);
        }

        return id;
    }

    /**
     * Get the default URL based on settings
     */
    private _getDefaultUrl(): string {
        const defaultProviderId = this.settingsManager.getDefaultProviderId();
        const providers = this.settingsManager.getProviders();
        const provider = providers.find(p => p.id === defaultProviderId);
        return provider ? provider.url : 'https://www.perplexity.ai';
    }

    /**
     * Setup event listeners for a WebContentsView
     */
    private _setupViewListeners(id: string, view: WebContentsView): void {
        const injectCSS = () => {
            view.webContents.insertCSS(INJECTED_CSS, { cssOrigin: 'user' }).catch(() => {
                // Silently fail if CSS injection fails
            });
        };

        // Inject cosmetic filters from ad blocker
        const injectCosmeticFilters = () => {
            if (this.adBlockManager && this.adBlockManager.isEnabled()) {
                try {
                    const url = view.webContents.getURL();
                    const cosmeticCSS = this.adBlockManager.getCosmeticFilters(url);
                    if (cosmeticCSS) {
                        view.webContents.insertCSS(cosmeticCSS, { cssOrigin: 'user' }).catch(() => {
                            // Silently fail
                        });
                    }
                } catch {
                    // Silently fail
                }
            }
        };

        // Inject on multiple events to ensure persistence
        view.webContents.on('will-navigate', injectCSS);
        view.webContents.on('did-start-loading', injectCSS);
        view.webContents.on('did-navigate', injectCSS);
        view.webContents.on('did-finish-load', injectCSS);

        // Inject cosmetic filters after page loads
        view.webContents.on('did-finish-load', injectCosmeticFilters);
        view.webContents.on('did-navigate-in-page', injectCosmeticFilters);

        // Helper to safely send IPC messages (prevents "Object has been destroyed" errors during app shutdown)
        const safeSend = (channel: string, data: object) => {
            try {
                if (!this.mainWindow.isDestroyed() && !this.mainWindow.webContents.isDestroyed()) {
                    this.mainWindow.webContents.send(channel, data);
                }
            } catch {
                // Silently fail during app shutdown
            }
        };

        // Track loading state for UI spinner
        view.webContents.on('did-start-loading', () => {
            safeSend('tab-updated', { id, isLoading: true });
        });

        view.webContents.on('did-stop-loading', () => {
            safeSend('tab-updated', { id, isLoading: false });
        });

        view.webContents.on('page-title-updated', (_e, title) => {
            const tab = this.tabs.get(id);
            if (tab) {
                tab.title = title;
                safeSend('tab-updated', { id, title });
            }
        });

        // Capture favicon when page provides it
        view.webContents.on('page-favicon-updated', async (_e, favicons) => {
            if (favicons.length > 0) {
                try {
                    const faviconUrl = favicons[0];
                    const response = await fetch(faviconUrl);
                    if (response.ok) {
                        const buffer = await response.arrayBuffer();
                        const base64 = Buffer.from(buffer).toString('base64');
                        const contentType = response.headers.get('content-type') || 'image/x-icon';
                        const dataUrl = `data:${contentType};base64,${base64}`;

                        const tab = this.tabs.get(id);
                        if (tab) {
                            tab.faviconDataUrl = dataUrl;
                            safeSend('tab-updated', { id, faviconDataUrl: dataUrl });
                        }
                    }
                } catch (err) {
                    // Silently fail - favicon caching is best-effort
                }
            }
        });

        view.webContents.on('did-navigate', (_e, url) => {
            const tab = this.tabs.get(id);
            if (tab) {
                tab.url = url;
                safeSend('tab-updated', { id, url });
            }
        });

        view.webContents.on('did-navigate-in-page', (_e, url) => {
            const tab = this.tabs.get(id);
            if (tab) {
                tab.url = url;
                safeSend('tab-updated', { id, url });
            }
        });

        // =============================================================================
        // Media Activity Tracking (prevents suspension of tabs playing audio/video)
        // =============================================================================
        view.webContents.on('media-started-playing', () => {
            const tab = this.tabs.get(id);
            if (tab) {
                tab.isMediaPlaying = true;
                console.log(`[TabManager] Media started playing in tab ${id} (${tab.title})`);
                safeSend('tab-updated', { id, isMediaPlaying: true });
            }
        });

        view.webContents.on('media-paused', () => {
            const tab = this.tabs.get(id);
            if (tab) {
                tab.isMediaPlaying = false;
                console.log(`[TabManager] Media paused in tab ${id} (${tab.title})`);
                safeSend('tab-updated', { id, isMediaPlaying: false });
            }
        });

        (view.webContents as Electron.WebContents).on('audio-state-changed' as 'zoom-changed', ((_e: Event, audible: boolean) => {
            const tab = this.tabs.get(id);
            if (tab) {
                tab.isAudible = audible;
                console.log(`[TabManager] Audio state changed in tab ${id}: ${audible ? 'audible' : 'silent'}`);
                safeSend('tab-updated', { id, isAudible: audible });
            }
        }) as () => void);

        // =============================================================================
        // Security Handlers
        // =============================================================================

        // Block file:// URLs (always blocked, no setting)
        view.webContents.on('will-navigate', (e, url) => {
            if (url.startsWith('file://')) {
                console.log(`[TabManager] Blocked file:// URL: ${url}`);
                e.preventDefault();
            }
        });

        // Set up permission handler for this session
        const ses = session.fromPartition(`persist:${this.tabs.get(id)?.profileId}`);
        ses.setPermissionRequestHandler((webContents, permission, callback) => {
            const settings = this.settingsManager.getSettings();
            const security = settings.security;

            // Always block geolocation (no setting exposed)
            if (permission === 'geolocation') {
                console.log(`[TabManager] Blocked geolocation request`);
                this.mainWindow.webContents.send('show-toast', { message: 'Location access blocked', type: 'warning' });
                callback(false);
                return;
            }

            // Camera/microphone based on settings
            if (permission === 'media') {
                const allow = security?.mediaPolicyAsk !== false; // Default: ask/allow
                console.log(`[TabManager] Media permission: ${allow ? 'allowed' : 'blocked'}`);
                if (!allow) {
                    this.mainWindow.webContents.send('show-toast', { message: 'Camera/microphone access blocked', type: 'warning' });
                }
                callback(allow);
                return;
            }

            // Allow other permissions by default
            callback(true);
        });

        // =============================================================================
        // Context Menu
        // =============================================================================
        view.webContents.on('context-menu', (_e, params) => {
            const tab = this.tabs.get(id);
            const menuItems: Electron.MenuItemConstructorOptions[] = [];

            // Editing actions (only show if there's text selection or editable field)
            if (params.isEditable || params.selectionText) {
                if (params.isEditable) {
                    menuItems.push(
                        { label: 'Cut', role: 'cut', enabled: params.editFlags.canCut },
                        { label: 'Copy', role: 'copy', enabled: params.editFlags.canCopy },
                        { label: 'Paste', role: 'paste', enabled: params.editFlags.canPaste }
                    );
                } else if (params.selectionText) {
                    menuItems.push(
                        { label: 'Copy', role: 'copy' }
                    );
                }
                menuItems.push(
                    { label: 'Select All', role: 'selectAll' }
                );
                menuItems.push({ type: 'separator' });
            }

            // Link actions
            if (params.linkURL) {
                menuItems.push({
                    label: 'Open in New Tab',
                    click: () => {
                        if (tab) {
                            // Pass source tab ID to insert new tab right after it
                            // Don't switch to it - open in background
                            const newTabId = this.createTab(tab.profileId, params.linkURL, null, undefined, id);
                            this.mainWindow.webContents.send('tab-created', {
                                id: newTabId,
                                profileId: tab.profileId,
                                title: 'Loading...',
                                loaded: true,
                                afterTabId: id,
                                background: true // Don't switch to this tab
                            });
                            // Update view bounds
                            if (this.updateViewBoundsCallback) {
                                this.updateViewBoundsCallback();
                            }
                        }
                    }
                });
                menuItems.push({ type: 'separator' });
            }

            // Media/Image actions (only if downloads enabled)
            const settings = this.settingsManager.getSettings();
            const downloadsEnabled = settings.security?.downloadsEnabled !== false;

            if (downloadsEnabled && params.mediaType === 'image' && params.srcURL) {
                menuItems.push(
                    { label: 'Save Image As...', click: () => view.webContents.downloadURL(params.srcURL) },
                    { label: 'Copy Image', click: () => view.webContents.copyImageAt(params.x, params.y) },
                    { label: 'Copy Image URL', click: () => require('electron').clipboard.writeText(params.srcURL) }
                );
                menuItems.push({ type: 'separator' });
            }

            if (downloadsEnabled && (params.mediaType === 'video' || params.mediaType === 'audio') && params.srcURL) {
                menuItems.push(
                    { label: 'Save Media As...', click: () => view.webContents.downloadURL(params.srcURL) }
                );
                menuItems.push({ type: 'separator' });
            }

            // Download link (only if downloads enabled and it's a file link)
            if (downloadsEnabled && params.linkURL && !params.linkURL.startsWith('javascript:')) {
                const fileMatch = params.linkURL.match(/\.([a-z0-9]+)$/i);
                if (fileMatch) {
                    const ext = fileMatch[1].toLowerCase();
                    let fileType = 'File';

                    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) fileType = 'Archive';
                    else if (['pdf'].includes(ext)) fileType = 'PDF';
                    else if (['doc', 'docx'].includes(ext)) fileType = 'Document';
                    else if (['xls', 'xlsx', 'csv'].includes(ext)) fileType = 'Spreadsheet';
                    else if (['ppt', 'pptx'].includes(ext)) fileType = 'Presentation';
                    else if (['txt'].includes(ext)) fileType = 'Text File';
                    else if (['mp3', 'wav', 'flac', 'aac'].includes(ext)) fileType = 'Audio';
                    else if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) fileType = 'Video';
                    else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) fileType = 'Image';

                    menuItems.push(
                        { label: `Download ${fileType}...`, click: () => view.webContents.downloadURL(params.linkURL) }
                    );
                    menuItems.push({ type: 'separator' });
                }
            }

            // Navigation actions
            menuItems.push(
                { label: 'Back', enabled: view.webContents.navigationHistory.canGoBack(), click: () => view.webContents.navigationHistory.goBack() },
                { label: 'Forward', enabled: view.webContents.navigationHistory.canGoForward(), click: () => view.webContents.navigationHistory.goForward() },
                { label: 'Reload', click: () => view.webContents.reload() }
            );

            const menu = Menu.buildFromTemplate(menuItems);
            menu.popup();
        });

        // =============================================================================
        // Download Interception (registered once per session to prevent duplicates)
        // =============================================================================
        const tab = this.tabs.get(id);
        const partitionName = `persist:${tab?.profileId}`;

        // Only register the download listener once per session (prevents duplicate entries)
        if (!this.sessionsWithDownloadListener.has(partitionName)) {
            this.sessionsWithDownloadListener.add(partitionName);

            const ses = session.fromPartition(partitionName);
            ses.on('will-download', async (event, item) => {
                const settings = this.settingsManager.getSettings();
                const downloadsEnabled = settings.security?.downloadsEnabled !== false;

                if (!downloadsEnabled) {
                    console.log(`[TabManager] Download blocked: ${item.getFilename()}`);
                    this.mainWindow.webContents.send('show-toast', { message: 'Download blocked', type: 'warning' });
                    event.preventDefault();
                    return;
                }

                const downloadUrl = item.getURL();
                const filename = item.getFilename();
                const defaultLocation = settings.security?.downloadLocation || app.getPath('downloads');

                // Check if this is a retried download with a user-confirmed path
                const pendingSavePath = this.pendingDownloadPaths.get(downloadUrl);
                if (pendingSavePath) {
                    // This is a retry from our save dialog flow - use the confirmed path
                    this.pendingDownloadPaths.delete(downloadUrl);
                    item.setSavePath(pendingSavePath);
                    console.log(`[TabManager] Download resumed with user path: ${filename} -> ${pendingSavePath}`);

                    // Track download with DownloadManager
                    if (this.downloadManager) {
                        this.downloadManager.addDownload(item);
                    }

                    // Auto-open downloads window
                    if (this.openDownloadsWindowCallback) {
                        this.openDownloadsWindowCallback();
                    }
                    return;
                }

                const askWhereToSave = settings.security?.askWhereToSave ?? false;

                if (askWhereToSave) {
                    // Show save dialog - prevent default download until user confirms
                    event.preventDefault();

                    const result = await dialog.showSaveDialog(this.mainWindow, {
                        title: 'Save File',
                        defaultPath: `${defaultLocation}/${filename}`,
                        filters: [{ name: 'All Files', extensions: ['*'] }]
                    });

                    if (result.canceled || !result.filePath) {
                        console.log(`[TabManager] Download cancelled by user: ${filename}`);
                        return;
                    }

                    // Store the confirmed path and restart the download
                    this.pendingDownloadPaths.set(downloadUrl, result.filePath);
                    console.log(`[TabManager] User selected path: ${filename} -> ${result.filePath}`);
                    ses.downloadURL(downloadUrl);
                    // The new download will be caught by this same handler and handled above
                    return;

                } else {
                    // Direct download to default location
                    const savePath = `${defaultLocation}/${filename}`;
                    item.setSavePath(savePath);
                    console.log(`[TabManager] Download started: ${filename} -> ${savePath}`);

                    // Track download with DownloadManager
                    if (this.downloadManager) {
                        this.downloadManager.addDownload(item);
                    }

                    // Auto-open downloads window
                    if (this.openDownloadsWindowCallback) {
                        this.openDownloadsWindowCallback();
                    }
                }
            });

            console.log(`[TabManager] Download listener registered for session: ${partitionName}`);
        }

        // =============================================================================
        // Popup/New Window Handling
        // =============================================================================
        view.webContents.setWindowOpenHandler(({ url, disposition }) => {
            const settings = this.settingsManager.getSettings();
            const popupsEnabled = settings.security?.popupsEnabled !== false;
            const tab = this.tabs.get(id);

            // For Ctrl+click / middle-click (foreground-tab, background-tab), open as a MashAI tab
            if (disposition === 'foreground-tab' || disposition === 'background-tab') {
                if (tab && url && !url.startsWith('about:')) {
                    console.log(`[TabManager] Opening link as new tab (${disposition}): ${url}`);
                    // Pass source tab ID to insert new tab right after it
                    // Don't switch to it - open in background
                    const newTabId = this.createTab(tab.profileId, url, null, undefined, id);
                    this.mainWindow.webContents.send('tab-created', {
                        id: newTabId,
                        profileId: tab.profileId,
                        title: 'Loading...',
                        loaded: true,
                        afterTabId: id,
                        background: true // Don't switch to this tab
                    });
                    // Update view bounds
                    if (this.updateViewBoundsCallback) {
                        this.updateViewBoundsCallback();
                    }
                }
                return { action: 'deny' };
            }

            // For other popups (like OAuth), check settings
            if (!popupsEnabled) {
                console.log(`[TabManager] Popup blocked: ${url}`);
                this.mainWindow.webContents.send('show-toast', { message: 'Popup blocked', type: 'warning' });
                return { action: 'deny' };
            }

            console.log(`[TabManager] Opening popup: ${url}`);

            // Return configuration for the new window with hidden menu bar
            return {
                action: 'allow',
                overrideBrowserWindowOptions: {
                    autoHideMenuBar: true,
                    parent: this.mainWindow,
                    icon: require('path').join(__dirname, '../../src/assets/MashAI-logo.png'),
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true,
                        partition: tab ? `persist:${tab.profileId}` : undefined
                    }
                }
            };
        });
    }

    /**
     * Load a tab that was previously registered as metadata-only
     * Creates the WebContentsView and loads the URL
     */
    loadTab(tabId: string): boolean {
        const tab = this.tabs.get(tabId);
        if (!tab) {
            console.warn(`[TabManager] Cannot load tab ${tabId} - not found`);
            return false;
        }

        if (tab.loaded && tab.view) {
            console.log(`[TabManager] Tab ${tabId} already loaded`);
            return true;
        }

        console.log(`[TabManager] Loading tab ${tabId} - creating WebContentsView for ${tab.url}`);

        const view = new WebContentsView({
            webPreferences: {
                partition: `persist:${tab.profileId}`,
                nodeIntegration: false,
                contextIsolation: true,
                backgroundThrottling: true
            }
        });
        // Dark background prevents white flash during page loading
        // WebContentsForceDark is disabled via command line switch so this won't force dark mode
        view.setBackgroundColor('#1e1e1e');

        // Enable ad blocking for this profile's session
        if (this.adBlockManager) {
            this.adBlockManager.enableForSession(tab.profileId);
        }

        tab.view = view;
        tab.loaded = true;
        tab.lastActiveTime = Date.now();

        view.webContents.loadURL(tab.url);
        this._setupViewListeners(tabId, view);

        // Notify frontend that this tab is now loaded
        this.mainWindow.webContents.send('tab-updated', {
            id: tabId,
            loaded: true
        });

        return true;
    }

    /**
     * Unload a tab - destroy the WebContentsView but keep metadata
     * Used for tab suspension
     */
    unloadTab(tabId: string): boolean {
        const tab = this.tabs.get(tabId);
        if (!tab) return false;

        if (!tab.loaded || !tab.view) {
            console.log(`[TabManager] Tab ${tabId} already unloaded`);
            return true;
        }

        console.log(`[TabManager] Unloading tab ${tabId} - destroying WebContentsView`);

        // Remove from window if it's the active view
        if (this.activeTabId === tabId) {
            try {
                this.mainWindow.contentView.removeChildView(tab.view);
            } catch (e) {
                console.warn('Could not remove view:', e);
            }
        }

        // Destroy the view
        try {
            tab.view.webContents.close();
        } catch (e) {
            console.warn('Could not close webContents:', e);
        }

        tab.view = null;
        tab.loaded = false;
        tab.suspended = true;

        // Notify frontend
        this.mainWindow.webContents.send('tab-updated', {
            id: tabId,
            loaded: false,
            suspended: true
        });

        return true;
    }

    /**
     * Check if a tab is loaded (has an active WebContentsView)
     */
    isTabLoaded(tabId: string): boolean {
        const tab = this.tabs.get(tabId);
        return tab ? tab.loaded : false;
    }

    /**
     * Create a tab with a WebContentsView immediately (original behavior)
     * Used for new tabs created by user action
     * @param faviconDataUrl - Optional cached favicon to preserve during session restore
     * @param afterTabId - Optional tab ID to insert the new tab after (for "open in new tab" behavior)
     */
    createTab(profileId: string, url: string | null = null, existingId: string | null = null, faviconDataUrl?: string, afterTabId?: string): string {
        const id = existingId || 'tab-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        // Determine URL
        const finalUrl = url || this._getDefaultUrl();

        const view = new WebContentsView({
            webPreferences: {
                partition: `persist:${profileId}`,
                nodeIntegration: false,
                contextIsolation: true,
                backgroundThrottling: true
            }
        });
        // Dark background prevents white flash during page loading
        view.setBackgroundColor('#1e1e1e');

        // Enable ad blocking for this profile's session
        if (this.adBlockManager) {
            this.adBlockManager.enableForSession(profileId);
        }

        this.tabs.set(id, {
            id,
            view,
            profileId,
            title: 'New Thread',
            url: finalUrl,
            loaded: true,
            lastActiveTime: Date.now(),
            faviconDataUrl
        });

        // Add to tab order - insert after afterTabId if provided, otherwise append
        if (!this.tabOrder.includes(id)) {
            if (afterTabId) {
                const afterIndex = this.tabOrder.indexOf(afterTabId);
                if (afterIndex !== -1) {
                    // Insert right after the source tab
                    this.tabOrder.splice(afterIndex + 1, 0, id);
                } else {
                    // Fallback to append if source tab not found
                    this.tabOrder.push(id);
                }
            } else {
                this.tabOrder.push(id);
            }
        }

        view.webContents.loadURL(finalUrl);
        this._setupViewListeners(id, view);

        return id;
    }

    /**
     * Switch to a tab - loads it if not already loaded
     */
    switchTo(tabId: string): boolean {
        const tab = this.tabs.get(tabId);
        if (!tab) return false;

        // If tab is not loaded, load it first
        if (!tab.loaded || !tab.view) {
            console.log(`[TabManager] Tab ${tabId} not loaded, loading now...`);

            // Notify frontend that loading is starting
            this.mainWindow.webContents.send('tab-loading', { id: tabId });

            this.loadTab(tabId);
        }

        // Now proceed with the switch
        if (this.activeTabId && this.activeTabId !== tabId) {
            const currentTab = this.tabs.get(this.activeTabId);
            if (currentTab) {
                // Update lastActiveTime on the tab we're LEAVING (this is when it becomes inactive)
                currentTab.lastActiveTime = Date.now();

                if (currentTab.view) {
                    // DON'T remove the view if it's the pinned tab - it needs to stay visible
                    const currentState = this.getCurrentSidePanelState();
                    const isPinnedTab = currentState?.pinnedTabId === this.activeTabId;
                    if (!isPinnedTab) {
                        try {
                            this.mainWindow.contentView.removeChildView(currentTab.view);
                        } catch (e) {
                            console.warn('Could not remove view:', e);
                        }
                    }
                }
            }
        }

        try {
            this.mainWindow.contentView.addChildView(tab.view!);
            this.activeTabId = tabId;

            return true;
        } catch (e) {
            console.error('Could not add view:', e);
            return false;
        }
    }

    closeTab(tabId: string): void {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        // If closing the pinned tab, exit side panel mode first
        const currentState = this.getCurrentSidePanelState();
        if (currentState?.pinnedTabId === tabId) {
            console.log(`[TabManager] Closing pinned tab ${tabId}, exiting side panel mode`);
            this.unpinSidePanel();
        }

        if (this.activeTabId === tabId && tab.view) {
            try {
                this.mainWindow.contentView.removeChildView(tab.view);
            } catch (e) {
                console.warn('Could not remove view:', e);
            }
            this.activeTabId = null;
        }

        // Only close webContents if loaded
        if (tab.loaded && tab.view) {
            try {
                tab.view.webContents.close();
            } catch (e) {
                console.warn('Could not close webContents:', e);
            }
        }

        this.tabs.delete(tabId);

        // Remove from tab order
        const orderIndex = this.tabOrder.indexOf(tabId);
        if (orderIndex !== -1) {
            this.tabOrder.splice(orderIndex, 1);
        }
    }

    getTabsForProfile(profileId: string): TabInfo[] {
        const orderedTabs: TabInfo[] = [];
        for (const tabId of this.tabOrder) {
            const tab = this.tabs.get(tabId);
            if (tab && tab.profileId === profileId) {
                orderedTabs.push({
                    id: tab.id,
                    title: tab.title,
                    url: tab.url,
                    profileId: tab.profileId,
                    loaded: tab.loaded,
                    suspended: tab.suspended || false,
                    faviconDataUrl: tab.faviconDataUrl,
                    isMediaPlaying: tab.isMediaPlaying,
                    isAudible: tab.isAudible
                });
            }
        }
        return orderedTabs;
    }

    getActiveView(): WebContentsView | null {
        if (!this.activeTabId) return null;
        const tab = this.tabs.get(this.activeTabId);
        return tab && tab.loaded ? tab.view : null;
    }

    resizeActiveView(bounds: ViewBounds): void {
        const view = this.getActiveView();
        if (view) {
            view.setBounds(bounds);
        }
    }

    goBack(): void {
        const view = this.getActiveView();
        if (view && view.webContents.canGoBack()) {
            view.webContents.goBack();
        }
    }

    goForward(): void {
        const view = this.getActiveView();
        if (view && view.webContents.canGoForward()) {
            view.webContents.goForward();
        }
    }

    reload(): void {
        const view = this.getActiveView();
        if (view) view.webContents.reload();
    }

    getAllTabs(): TabInfo[] {
        const orderedTabs: TabInfo[] = [];
        for (const tabId of this.tabOrder) {
            const tab = this.tabs.get(tabId);
            if (tab) {
                orderedTabs.push({
                    id: tab.id,
                    profileId: tab.profileId,
                    title: tab.title,
                    url: tab.url,
                    loaded: tab.loaded,
                    suspended: tab.suspended || false,
                    faviconDataUrl: tab.faviconDataUrl,
                    isMediaPlaying: tab.isMediaPlaying,
                    isAudible: tab.isAudible
                });
            }
        }
        return orderedTabs;
    }

    reorderTabs(newOrder: string[]): void {
        // Filter to only include valid tab IDs
        const validNewOrder = newOrder.filter(id => this.tabs.has(id));

        // Find tabs that exist but weren't included in the new order (e.g., from other profiles)
        const missingTabs = this.tabOrder.filter(id => !validNewOrder.includes(id) && this.tabs.has(id));

        // Combine: new order first, then append any missing tabs to preserve them
        this.tabOrder = [...validNewOrder, ...missingTabs];
    }

    getActiveTabId(): string | null {
        return this.activeTabId;
    }

    hideActiveView(): void {
        if (!this.activeTabId) return;
        const tab = this.tabs.get(this.activeTabId);
        if (tab && tab.view) {
            try {
                this.mainWindow.contentView.removeChildView(tab.view);
            } catch (e) {
                console.warn('Could not hide view:', e);
            }
        }
    }

    showActiveView(): void {
        if (!this.activeTabId) return;
        const tab = this.tabs.get(this.activeTabId);
        if (tab && tab.view) {
            try {
                this.mainWindow.contentView.addChildView(tab.view);
            } catch (e) {
                console.warn('Could not show view:', e);
            }
        }
    }

    /**
     * Get count of loaded vs unloaded tabs
     */
    getLoadStats(): LoadStats {
        let loaded = 0;
        let unloaded = 0;
        for (const tab of this.tabs.values()) {
            if (tab.loaded) loaded++;
            else unloaded++;
        }
        return { loaded, unloaded, total: this.tabs.size };
    }

    // =========================================================================
    // Side Panel Methods
    // =========================================================================

    /**
     * Get the current profile's side panel state (helper)
     */
    private getCurrentSidePanelState(): SidePanelState | null {
        if (!this.currentProfileId) return null;
        return this.sidePanelByProfile.get(this.currentProfileId) || null;
    }

    /**
     * Set the current profile ID (called when switching profiles)
     */
    setCurrentProfileId(profileId: string): void {
        this.currentProfileId = profileId;
    }

    /**
     * Switch side panel state when switching profiles
     * Removes old profile's pinned view and adds new profile's pinned view
     */
    switchSidePanelForProfile(fromProfileId: string | null, toProfileId: string): void {
        console.log(`[TabManager] Switching side panel from profile ${fromProfileId} to ${toProfileId}`);

        // 1. Remove old profile's pinned view from window (if any)
        if (fromProfileId) {
            const oldState = this.sidePanelByProfile.get(fromProfileId);
            if (oldState) {
                const oldPinnedTab = this.tabs.get(oldState.pinnedTabId);
                if (oldPinnedTab?.view) {
                    try {
                        this.mainWindow.contentView.removeChildView(oldPinnedTab.view);
                        console.log(`[TabManager] Removed pinned view for profile ${fromProfileId}`);
                    } catch (e) {
                        console.warn('Could not remove old pinned view:', e);
                    }
                }
            }
        }

        // 2. Set current profile ID
        this.currentProfileId = toProfileId;

        // 3. Add new profile's pinned view to window (if exists)
        const newState = this.sidePanelByProfile.get(toProfileId);
        if (newState) {
            const newPinnedTab = this.tabs.get(newState.pinnedTabId);

            // Verify pinned tab still exists
            if (newPinnedTab) {
                // Load the tab if not loaded
                if (!newPinnedTab.loaded) {
                    console.log(`[TabManager] Loading pinned tab ${newState.pinnedTabId} for profile ${toProfileId}`);
                    this.loadTab(newState.pinnedTabId);
                }

                // Add view to window
                if (newPinnedTab.view) {
                    this.mainWindow.contentView.addChildView(newPinnedTab.view);
                    console.log(`[TabManager] Added pinned view for profile ${toProfileId}`);
                }

                // Notify frontend
                this.mainWindow.webContents.send('side-panel-state-changed', newState);
            } else {
                // Pinned tab no longer exists, clear the state
                console.log(`[TabManager] Pinned tab ${newState.pinnedTabId} no longer exists, clearing state`);
                this.sidePanelByProfile.delete(toProfileId);
                this.mainWindow.webContents.send('side-panel-state-changed', null);
            }
        } else {
            // No pinned tab for this profile
            this.mainWindow.webContents.send('side-panel-state-changed', null);
        }

        // 4. Update view bounds
        if (this.updateViewBoundsCallback) {
            this.updateViewBoundsCallback();
        }
    }

    /**
     * Pin a tab to the side panel
     * @param tabId - The tab to pin
     * @param side - Which side to pin to ('left' or 'right')
     * @returns true if successful
     */
    pinToSidePanel(tabId: string, side: PanelSide = 'right'): boolean {
        const tab = this.tabs.get(tabId);
        if (!tab) {
            console.warn(`[TabManager] Cannot pin tab ${tabId} - not found`);
            return false;
        }

        // Use the tab's profile ID as the current profile
        const profileId = tab.profileId;
        this.currentProfileId = profileId;

        // If there's already a pinned tab for this profile, remove its view first
        const currentState = this.sidePanelByProfile.get(profileId);
        const previousWidth = currentState?.panelWidth || 50;
        if (currentState && currentState.pinnedTabId !== tabId) {
            const oldPinnedTab = this.tabs.get(currentState.pinnedTabId);
            if (oldPinnedTab?.view) {
                try {
                    this.mainWindow.contentView.removeChildView(oldPinnedTab.view);
                    console.log(`[TabManager] Removed old pinned tab ${currentState.pinnedTabId}`);
                } catch (e) {
                    console.warn('Could not remove old pinned view:', e);
                }
            }
        }

        // Load the tab if it's not loaded
        if (!tab.loaded) {
            console.log(`[TabManager] Tab ${tabId} not loaded, loading now for side panel...`);
            this.loadTab(tabId);
        }

        // Set the side panel state for this profile
        const newState: SidePanelState = {
            pinnedTabId: tabId,
            panelSide: side,
            panelWidth: previousWidth
        };
        this.sidePanelByProfile.set(profileId, newState);

        console.log(`[TabManager] Pinned tab ${tabId} to ${side} side panel for profile ${profileId}`);

        // If the pinned tab was the active tab, switch to another tab FIRST
        if (this.activeTabId === tabId) {
            const profileTabs = this.getTabsForProfile(tab.profileId);
            const currentIndex = profileTabs.findIndex(t => t.id === tabId);

            // Find next tab (or previous if this was the last)
            let newActiveTab = null;
            if (profileTabs.length > 1) {
                if (currentIndex < profileTabs.length - 1) {
                    newActiveTab = profileTabs[currentIndex + 1];
                } else if (currentIndex > 0) {
                    newActiveTab = profileTabs[currentIndex - 1];
                }
            }

            if (newActiveTab) {
                console.log(`[TabManager] Switching main view to ${newActiveTab.id} after pinning`);
                this.switchTo(newActiveTab.id);
            }
        }

        // NOW add the pinned view to the window (after switchTo is done)
        const pinnedTab = this.tabs.get(tabId);
        if (pinnedTab?.view) {
            this.mainWindow.contentView.addChildView(pinnedTab.view);
        }

        // Notify frontend
        this.mainWindow.webContents.send('side-panel-state-changed', newState);

        // Trigger view bounds update
        if (this.updateViewBoundsCallback) {
            this.updateViewBoundsCallback();
        }

        return true;
    }

    /**
     * Unpin the side panel for the current profile
     */
    unpinSidePanel(): void {
        if (!this.currentProfileId) return;

        const currentState = this.sidePanelByProfile.get(this.currentProfileId);
        if (!currentState) return;

        const pinnedTabId = currentState.pinnedTabId;
        const pinnedTab = this.tabs.get(pinnedTabId);

        // Remove the pinned view from window (if it exists and isn't the active tab)
        if (pinnedTab?.view && pinnedTabId !== this.activeTabId) {
            try {
                this.mainWindow.contentView.removeChildView(pinnedTab.view);
            } catch (e) {
                console.warn('Could not remove pinned view:', e);
            }
        }

        console.log(`[TabManager] Unpinned side panel for profile ${this.currentProfileId} (was tab ${pinnedTabId})`);

        // Remove the state for this profile
        this.sidePanelByProfile.delete(this.currentProfileId);

        // Notify frontend
        this.mainWindow.webContents.send('side-panel-state-changed', null);

        // Trigger view bounds update
        if (this.updateViewBoundsCallback) {
            this.updateViewBoundsCallback();
        }
    }

    /**
     * Swap the side panel to the other side
     */
    swapPanelSide(): void {
        if (!this.currentProfileId) return;

        const currentState = this.sidePanelByProfile.get(this.currentProfileId);
        if (!currentState) return;

        currentState.panelSide = currentState.panelSide === 'left' ? 'right' : 'left';
        console.log(`[TabManager] Swapped side panel to ${currentState.panelSide}`);

        // Notify frontend
        this.mainWindow.webContents.send('side-panel-state-changed', currentState);

        // Trigger view bounds update
        if (this.updateViewBoundsCallback) {
            this.updateViewBoundsCallback();
        }
    }

    /**
     * Set the panel width percentage
     * @param width - Width as percentage (0-100)
     */
    setPanelWidth(width: number): void {
        if (!this.currentProfileId) return;

        const currentState = this.sidePanelByProfile.get(this.currentProfileId);
        if (!currentState) return;

        // Clamp between 20% and 80%
        currentState.panelWidth = Math.max(20, Math.min(80, width));

        // Notify frontend
        this.mainWindow.webContents.send('side-panel-state-changed', currentState);

        // Trigger view bounds update
        if (this.updateViewBoundsCallback) {
            this.updateViewBoundsCallback();
        }
    }

    /**
     * Get the current profile's side panel state
     */
    getSidePanelState(): SidePanelState | null {
        return this.getCurrentSidePanelState();
    }

    /**
     * Get all side panel states (for session persistence)
     */
    getAllSidePanelStates(): Record<string, SidePanelState> {
        const result: Record<string, SidePanelState> = {};
        for (const [profileId, state] of this.sidePanelByProfile.entries()) {
            result[profileId] = state;
        }
        return result;
    }

    /**
     * Set the side panel state for a specific profile (used for session restore)
     */
    setSidePanelState(state: SidePanelState | null, profileId?: string): void {
        const targetProfileId = profileId || this.currentProfileId;
        if (!targetProfileId) return;

        if (state) {
            this.sidePanelByProfile.set(targetProfileId, state);
        } else {
            this.sidePanelByProfile.delete(targetProfileId);
        }
    }

    /**
     * Restore all side panel states from session (called on app startup)
     */
    restoreAllSidePanelStates(states: Record<string, SidePanelState | null>): void {
        for (const [profileId, state] of Object.entries(states)) {
            if (state) {
                this.sidePanelByProfile.set(profileId, state);
            }
        }
        console.log(`[TabManager] Restored side panel states for ${Object.keys(states).length} profiles`);
    }

    /**
     * Get the pinned tab's view for the current profile
     */
    getPinnedView(): WebContentsView | null {
        const currentState = this.getCurrentSidePanelState();
        if (!currentState) return null;
        const tab = this.tabs.get(currentState.pinnedTabId);
        return tab?.view || null;
    }

    /**
     * Resize the pinned view
     */
    resizePinnedView(bounds: ViewBounds): void {
        const view = this.getPinnedView();
        if (view) {
            view.setBounds(bounds);
        }
    }
}

export default TabManager;
