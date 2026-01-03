import { BrowserWindow, WebContentsView } from 'electron';
import type { TabInfo } from './types';
import type SettingsManager from './SettingsManager';

const INJECTED_CSS = `
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
        background: rgba(255, 255, 255, 0.03);
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

    constructor(mainWindow: BrowserWindow, settingsManager: SettingsManager) {
        this.mainWindow = mainWindow;
        this.settingsManager = settingsManager;
        this.tabs = new Map();
        this.activeTabId = null;
        this.tabOrder = [];
        this.inactivityCheckInterval = null;

        // Start inactivity check timer (runs every minute)
        this._startInactivityTimer();
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
        // Note: excludeActiveProfile is not in our Settings type, using optional chaining
        const excludeActiveProfile = (settings.performance as any)?.excludeActiveProfile ?? true;

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

        // Inject on multiple events to ensure persistence
        view.webContents.on('will-navigate', injectCSS);
        view.webContents.on('did-start-loading', injectCSS);
        view.webContents.on('did-navigate', injectCSS);
        view.webContents.on('did-finish-load', injectCSS);

        view.webContents.on('page-title-updated', (_e, title) => {
            const tab = this.tabs.get(id);
            if (tab) {
                tab.title = title;
                this.mainWindow.webContents.send('tab-updated', { id, title });
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
                            this.mainWindow.webContents.send('tab-updated', { id, faviconDataUrl: dataUrl });
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
                this.mainWindow.webContents.send('tab-updated', { id, url });
            }
        });

        view.webContents.on('did-navigate-in-page', (_e, url) => {
            const tab = this.tabs.get(id);
            if (tab) {
                tab.url = url;
                this.mainWindow.webContents.send('tab-updated', { id, url });
            }
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
     */
    createTab(profileId: string, url: string | null = null, existingId: string | null = null, faviconDataUrl?: string): string {
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

        // Add to tab order if not already present
        if (!this.tabOrder.includes(id)) {
            this.tabOrder.push(id);
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
            if (currentTab && currentTab.view) {
                try {
                    this.mainWindow.contentView.removeChildView(currentTab.view);
                } catch (e) {
                    console.warn('Could not remove view:', e);
                }
            }
        }

        try {
            this.mainWindow.contentView.addChildView(tab.view!);
            this.activeTabId = tabId;

            // Update last active time for inactivity tracking
            tab.lastActiveTime = Date.now();

            return true;
        } catch (e) {
            console.error('Could not add view:', e);
            return false;
        }
    }

    closeTab(tabId: string): void {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

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
                    faviconDataUrl: tab.faviconDataUrl
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
                    faviconDataUrl: tab.faviconDataUrl
                });
            }
        }
        return orderedTabs;
    }

    reorderTabs(newOrder: string[]): void {
        this.tabOrder = newOrder.filter(id => this.tabs.has(id));
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
}

export default TabManager;
