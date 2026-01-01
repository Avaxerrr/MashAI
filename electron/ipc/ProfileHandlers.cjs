const { ipcMain } = require('electron');

/**
 * Registers profile management IPC handlers
 * @param {BrowserWindow} mainWindow - The main application window
 * @param {Object} dependencies - Required dependencies
 * @param {TabManager} dependencies.tabManager - Tab manager instance
 * @param {SessionManager} dependencies.sessionManager - Session manager instance
 */
function register(mainWindow, { tabManager, sessionManager }) {
    // Get tabs for a specific profile
    ipcMain.on('get-profile-tabs', (event, profileId) => {
        const tabs = tabManager.getTabsForProfile(profileId);

        // Get the last active tab for this profile from session
        let lastActiveTabId = null;
        if (sessionManager) {
            lastActiveTabId = sessionManager.getLastActiveTabForProfile(profileId);

            // Verify the tab still exists in the current tabs
            if (lastActiveTabId && !tabs.find(t => t.id === lastActiveTabId)) {
                lastActiveTabId = null;
            }
        }

        // If no saved tab or it doesn't exist, use the first tab
        if (!lastActiveTabId && tabs.length > 0) {
            lastActiveTabId = tabs[0].id;
        }

        event.reply('profile-tabs-loaded', { profileId, tabs, lastActiveTabId });
    });

    // Get all tabs
    ipcMain.handle('get-all-tabs', () => {
        return {
            tabs: tabManager.getAllTabs(),
            activeTabId: tabManager.activeTabId
        };
    });
}

module.exports = { register };
