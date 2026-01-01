const { ipcMain } = require('electron');

/**
 * Registers settings management IPC handlers
 * @param {BrowserWindow} mainWindow - The main application window
 * @param {Object} dependencies - Required dependencies
 * @param {SettingsManager} dependencies.settingsManager - Settings manager instance
 * @param {ProfileManager} dependencies.profileManager - Profile manager instance
 * @param {TabManager} dependencies.tabManager - Tab manager instance
 * @param {Function} dependencies.saveSession - Function to save session
 * @param {Function} dependencies.updateViewBounds - Function to update view bounds
 */
function register(mainWindow, { settingsManager, profileManager, tabManager, saveSession, updateViewBounds }) {
    // Get current settings
    ipcMain.handle('get-settings', () => {
        return settingsManager.getSettings();
    });

    // Save settings
    ipcMain.handle('save-settings', async (event, newSettings) => {
        const oldSettings = settingsManager.getSettings();
        const success = settingsManager.saveSettings(newSettings);

        // Reload profiles in ProfileManager to sync with new settings
        if (profileManager) {
            profileManager.loadProfiles();
        }

        // Clean up tabs for deleted profiles
        if (tabManager && newSettings.profiles) {
            const newProfileIds = new Set(newSettings.profiles.map(p => p.id));
            const oldProfileIds = new Set(oldSettings.profiles.map(p => p.id));

            // Find deleted profile IDs
            const deletedProfileIds = Array.from(oldProfileIds).filter(id => !newProfileIds.has(id));

            if (deletedProfileIds.length > 0) {
                // Track if we need to switch profiles
                let needsProfileSwitch = false;
                let currentActiveProfileId = null;

                // Get current active profile from active tab
                if (tabManager.activeTabId) {
                    const activeTab = tabManager.tabs.get(tabManager.activeTabId);
                    if (activeTab) {
                        currentActiveProfileId = activeTab.profileId;
                        if (deletedProfileIds.includes(currentActiveProfileId)) {
                            needsProfileSwitch = true;
                        }
                    }
                }

                // Close all tabs belonging to deleted profiles
                deletedProfileIds.forEach(profileId => {
                    const tabsToDelete = tabManager.getTabsForProfile(profileId);
                    tabsToDelete.forEach(tab => {
                        tabManager.closeTab(tab.id);
                        mainWindow.webContents.send('tab-closed-backend', tab.id);
                    });
                });

                // If active profile was deleted, switch to first remaining profile
                if (needsProfileSwitch && newSettings.profiles.length > 0) {
                    const newActiveProfile = newSettings.profiles[0];
                    const profileTabs = tabManager.getTabsForProfile(newActiveProfile.id);

                    if (profileTabs.length > 0) {
                        // Switch to first tab of the new active profile
                        tabManager.switchTo(profileTabs[0].id);
                        mainWindow.webContents.send('restore-active', profileTabs[0].id);
                    } else {
                        // Create a new tab for this profile
                        const newTabId = tabManager.createTab(newActiveProfile.id);
                        tabManager.switchTo(newTabId);
                        mainWindow.webContents.send('tab-created', {
                            id: newTabId,
                            profileId: newActiveProfile.id,
                            title: 'New Thread',
                            url: tabManager.tabs.get(newTabId)?.url || ''
                        });
                        updateViewBounds();
                    }

                    // Notify frontend to update its active profile state
                    mainWindow.webContents.send('active-profile-changed', newActiveProfile.id);
                }

                saveSession();
            }
        }

        // Fetch favicons for any new providers that don't have them cached
        // This is async but we await it to ensure the favicon is ready before broadcasting
        await settingsManager.ensureProvidersFavicons();

        // Broadcast to all windows (main window updates its UI) - now includes fetched favicons
        mainWindow.webContents.send('settings-updated', settingsManager.getSettings());
        return success;
    });
}

module.exports = { register };
