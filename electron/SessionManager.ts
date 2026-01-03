import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import type { Session, SessionTab, WindowState } from './types';
import type TabManager from './TabManager';
import type SettingsManager from './SettingsManager';

/**
 * Manages session persistence (tabs, window state, etc.)
 * Supports lazy loading based on performance settings
 */
class SessionManager {
    private tabManager: TabManager;
    private settingsManager: SettingsManager;
    private currentWindowState: WindowState;
    private activeTabByProfile: Record<string, string>;

    constructor(tabManager: TabManager, settingsManager: SettingsManager) {
        this.tabManager = tabManager;
        this.settingsManager = settingsManager;
        this.currentWindowState = { width: 1200, height: 800, isMaximized: false };
        this.activeTabByProfile = {};
    }

    /**
     * Get the path to the session file
     */
    getSessionFile(): string {
        return path.join(app.getPath('userData'), 'session.json');
    }

    /**
     * Update the current window state
     */
    updateWindowState(state: Partial<WindowState>): void {
        this.currentWindowState = { ...this.currentWindowState, ...state };
    }

    /**
     * Get the tab loading strategy from settings
     */
    getTabLoadingStrategy(): 'all' | 'activeProfile' | 'lastActiveOnly' {
        if (this.settingsManager) {
            const settings = this.settingsManager.getSettings();
            if (settings.performance && settings.performance.tabLoadingStrategy) {
                return settings.performance.tabLoadingStrategy;
            }
        }
        return 'lastActiveOnly';
    }

    /**
     * Save current session to disk
     */
    saveSession(): void {
        if (!this.tabManager) return;

        // Derive the last active profile from the active tab
        let lastActiveProfileId: string | null = null;
        if (this.tabManager.activeTabId) {
            const activeTab = this.tabManager.tabs.get(this.tabManager.activeTabId);
            if (activeTab) {
                lastActiveProfileId = activeTab.profileId;
                this.activeTabByProfile[activeTab.profileId] = this.tabManager.activeTabId;
            }
        }

        // Clean up only if saved tab no longer exists
        for (const profileId of Object.keys(this.activeTabByProfile)) {
            const savedTabId = this.activeTabByProfile[profileId];
            const savedTab = this.tabManager.tabs.get(savedTabId);

            if (!savedTab || savedTab.profileId !== profileId) {
                const profileTabs = this.tabManager.getTabsForProfile(profileId);
                if (profileTabs.length > 0) {
                    this.activeTabByProfile[profileId] = profileTabs[0].id;
                } else {
                    delete this.activeTabByProfile[profileId];
                }
            }
        }

        const sessionData: Session = {
            tabs: Array.from(this.tabManager.tabs.values()).map(t => ({
                id: t.id,
                profileId: t.profileId,
                url: t.url,
                title: t.title
            })),
            activeTabId: this.tabManager.activeTabId,
            lastActiveProfileId: lastActiveProfileId,
            activeTabByProfile: this.activeTabByProfile,
            windowBounds: this.currentWindowState,
            isMaximized: this.currentWindowState.isMaximized
        };

        try {
            fs.writeFileSync(this.getSessionFile(), JSON.stringify(sessionData, null, 2));
        } catch (e) {
            console.error('Failed to save session:', e);
        }
    }

    /**
     * Restore session from disk with lazy loading support
     */
    restoreSession(mainWindow: BrowserWindow, updateViewBounds: () => void): void {
        try {
            if (!fs.existsSync(this.getSessionFile())) return;

            const data = JSON.parse(fs.readFileSync(this.getSessionFile(), 'utf-8')) as Session;

            if (!data.tabs || data.tabs.length === 0) return;

            // Load activeTabByProfile into memory first
            if (data.activeTabByProfile) {
                this.activeTabByProfile = { ...data.activeTabByProfile };
            }

            const strategy = this.getTabLoadingStrategy();
            const lastActiveProfileId = data.lastActiveProfileId;
            const activeTabId = data.activeTabId;

            console.log(`[SessionManager] Restoring session with strategy: ${strategy}`);
            console.log(`[SessionManager] Found ${data.tabs.length} tabs to restore`);

            // Determine which tabs should be loaded immediately
            const tabsToLoad = new Set<string>();

            switch (strategy) {
                case 'all':
                    console.log('[SessionManager] Strategy: all - loading all tabs');
                    data.tabs.forEach(t => tabsToLoad.add(t.id));
                    break;

                case 'activeProfile':
                    console.log(`[SessionManager] Strategy: activeProfile - loading tabs for profile ${lastActiveProfileId}`);
                    data.tabs.forEach(t => {
                        if (t.profileId === lastActiveProfileId) {
                            tabsToLoad.add(t.id);
                        }
                    });
                    break;

                case 'lastActiveOnly':
                default:
                    console.log(`[SessionManager] Strategy: lastActiveOnly - loading only tab ${activeTabId}`);
                    if (activeTabId) {
                        tabsToLoad.add(activeTabId);
                    } else if (lastActiveProfileId) {
                        const profileActiveTab = this.activeTabByProfile[lastActiveProfileId];
                        if (profileActiveTab) {
                            tabsToLoad.add(profileActiveTab);
                        } else if (data.tabs.length > 0) {
                            tabsToLoad.add(data.tabs[0].id);
                        }
                    }
                    break;
            }

            console.log(`[SessionManager] Will load ${tabsToLoad.size} tabs immediately, ${data.tabs.length - tabsToLoad.size} will be lazy-loaded`);

            // Register or create tabs based on whether they should be loaded
            data.tabs.forEach((tabData: SessionTab) => {
                const shouldLoad = tabsToLoad.has(tabData.id);

                if (shouldLoad) {
                    console.log(`[SessionManager] Creating tab ${tabData.id} with view (immediate load)`);
                    const id = this.tabManager.createTab(tabData.profileId, tabData.url, tabData.id);
                    mainWindow.webContents.send('tab-created', {
                        id,
                        profileId: tabData.profileId,
                        title: tabData.title || 'Restored',
                        loaded: true
                    });
                } else {
                    console.log(`[SessionManager] Registering tab ${tabData.id} as metadata (lazy)`);
                    this.tabManager.registerTabMetadata({
                        id: tabData.id,
                        profileId: tabData.profileId,
                        url: tabData.url,
                        title: tabData.title || 'Restored'
                    });
                    mainWindow.webContents.send('tab-created', {
                        id: tabData.id,
                        profileId: tabData.profileId,
                        title: tabData.title || 'Restored',
                        loaded: false
                    });
                }
            });

            // Log stats
            const stats = this.tabManager.getLoadStats();
            console.log(`[SessionManager] Tab stats: ${stats.loaded} loaded, ${stats.unloaded} unloaded, ${stats.total} total`);

            // Switch to the active tab
            if (activeTabId && this.tabManager.tabs.has(activeTabId)) {
                setTimeout(() => {
                    this.tabManager.switchTo(activeTabId);
                    mainWindow.webContents.send('restore-active', activeTabId);
                    updateViewBounds();
                }, 500);
            } else if (lastActiveProfileId) {
                setTimeout(() => {
                    const profileTabs = this.tabManager.getTabsForProfile(lastActiveProfileId);
                    if (profileTabs.length > 0) {
                        this.tabManager.switchTo(profileTabs[0].id);
                        mainWindow.webContents.send('restore-active', profileTabs[0].id);
                        updateViewBounds();
                    }
                }, 500);
            }
        } catch (e) {
            console.error('Failed to restore session:', e);
        }
    }

    /**
     * Load window state from session
     */
    loadWindowState(): Partial<WindowState> {
        try {
            if (fs.existsSync(this.getSessionFile())) {
                const data = JSON.parse(fs.readFileSync(this.getSessionFile(), 'utf-8')) as Session;
                if (data.windowBounds) {
                    return {
                        ...data.windowBounds,
                        isMaximized: data.isMaximized || false
                    };
                }
            }
        } catch (e) {
            console.error('Failed to load window state:', e);
        }
        return {};
    }

    /**
     * Get the last active tab for a specific profile
     */
    getLastActiveTabForProfile(profileId: string): string | null {
        // First check in-memory map
        if (this.activeTabByProfile[profileId]) {
            return this.activeTabByProfile[profileId];
        }

        // Fall back to disk
        try {
            if (fs.existsSync(this.getSessionFile())) {
                const data = JSON.parse(fs.readFileSync(this.getSessionFile(), 'utf-8')) as Session;
                if (data.activeTabByProfile && data.activeTabByProfile[profileId]) {
                    this.activeTabByProfile[profileId] = data.activeTabByProfile[profileId];
                    return data.activeTabByProfile[profileId];
                }
            }
        } catch (e) {
            console.error('Failed to get last active tab for profile:', e);
        }
        return null;
    }

    /**
     * Update the active tab for a profile
     */
    setActiveTabForProfile(profileId: string, tabId: string): void {
        this.activeTabByProfile[profileId] = tabId;
    }
}

export default SessionManager;
