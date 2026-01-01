const { app } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Manages session persistence (tabs, window state, etc.)
 */
class SessionManager {
    constructor(tabManager) {
        this.tabManager = tabManager;
        this.currentWindowState = { width: 1200, height: 800, isMaximized: false };
        this.activeTabByProfile = {}; // Track active tab per profile in memory
    }

    /**
     * Get the path to the session file
     * @returns {string} Path to session.json
     */
    getSessionFile() {
        return path.join(app.getPath('userData'), 'session.json');
    }

    /**
     * Update the current window state
     * @param {Object} state - Window state object
     */
    updateWindowState(state) {
        this.currentWindowState = { ...this.currentWindowState, ...state };
    }

    /**
     * Save current session to disk
     */
    saveSession() {
        if (!this.tabManager) return;

        // Derive the last active profile from the active tab
        let lastActiveProfileId = null;
        if (this.tabManager.activeTabId) {
            const activeTab = this.tabManager.tabs.get(this.tabManager.activeTabId);
            if (activeTab) {
                lastActiveProfileId = activeTab.profileId;
                // Update in-memory tracking for the current profile
                this.activeTabByProfile[activeTab.profileId] = this.tabManager.activeTabId;
            }
        }

        // Clean up only if saved tab no longer exists
        for (const profileId of Object.keys(this.activeTabByProfile)) {
            const savedTabId = this.activeTabByProfile[profileId];
            const savedTab = this.tabManager.tabs.get(savedTabId);

            // Only reset if the tab doesn't exist OR belongs to a different profile
            if (!savedTab || savedTab.profileId !== profileId) {
                // Tab was closed or moved, find another tab for this profile
                const profileTabs = this.tabManager.getTabsForProfile(profileId);
                if (profileTabs.length > 0) {
                    this.activeTabByProfile[profileId] = profileTabs[0].id;
                } else {
                    delete this.activeTabByProfile[profileId];
                }
            }
        }

        const sessionData = {
            tabs: Array.from(this.tabManager.tabs.values()).map(t => ({
                id: t.id,
                profileId: t.profileId,
                url: t.url,
                title: t.title
            })),
            activeTabId: this.tabManager.activeTabId,
            lastActiveProfileId: lastActiveProfileId,
            activeTabByProfile: this.activeTabByProfile, // Use in-memory map
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
     * Restore session from disk
     * @param {BrowserWindow} mainWindow - The main window to send events to
     * @param {Function} updateViewBounds - Function to update view bounds
     */
    restoreSession(mainWindow, updateViewBounds) {
        try {
            if (!fs.existsSync(this.getSessionFile())) return;

            const data = JSON.parse(fs.readFileSync(this.getSessionFile(), 'utf-8'));

            if (!data.tabs || data.tabs.length === 0) return;

            // IMPORTANT: Load activeTabByProfile into memory first
            if (data.activeTabByProfile) {
                this.activeTabByProfile = { ...data.activeTabByProfile };
            }

            data.tabs.forEach(tabData => {
                const id = this.tabManager.createTab(tabData.profileId, tabData.url, tabData.id);
                mainWindow.webContents.send('tab-created', {
                    id,
                    profileId: tabData.profileId,
                    title: tabData.title || 'Restored'
                });
            });

            // Try to restore the exact active tab first
            if (data.activeTabId && this.tabManager.tabs.has(data.activeTabId)) {
                setTimeout(() => {
                    this.tabManager.switchTo(data.activeTabId);
                    mainWindow.webContents.send('restore-active', data.activeTabId);
                    updateViewBounds();
                }, 500);
            } else if (data.lastActiveProfileId) {
                // If we can't restore the exact tab, switch to the last active profile
                setTimeout(() => {
                    const profileTabs = this.tabManager.getTabsForProfile(data.lastActiveProfileId);
                    if (profileTabs.length > 0) {
                        // Switch to the first tab of the last active profile
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
     * @returns {Object} Window state object
     */
    loadWindowState() {
        try {
            if (fs.existsSync(this.getSessionFile())) {
                const data = JSON.parse(fs.readFileSync(this.getSessionFile(), 'utf-8'));
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
     * @param {string} profileId - The profile ID
     * @returns {string|null} The last active tab ID for this profile, or null
     */
    getLastActiveTabForProfile(profileId) {
        // First check in-memory map (for runtime changes)
        if (this.activeTabByProfile[profileId]) {
            return this.activeTabByProfile[profileId];
        }

        // Fall back to disk (for app startup)
        try {
            if (fs.existsSync(this.getSessionFile())) {
                const data = JSON.parse(fs.readFileSync(this.getSessionFile(), 'utf-8'));
                if (data.activeTabByProfile && data.activeTabByProfile[profileId]) {
                    // Also populate in-memory map for next time
                    this.activeTabByProfile[profileId] = data.activeTabByProfile[profileId];
                    return data.activeTabByProfile[profileId];
                }
            }
        } catch (e) {
            console.error('Failed to get last active tab for profile:', e);
        }
        return null;
    }
}

module.exports = SessionManager;
