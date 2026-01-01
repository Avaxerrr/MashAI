const { ipcMain } = require('electron');

/**
 * Registers profile management IPC handlers
 * @param {BrowserWindow} mainWindow - The main application window
 * @param {Object} dependencies - Required dependencies
 * @param {TabManager} dependencies.tabManager - Tab manager instance
 */
function register(mainWindow, { tabManager }) {
    // Get tabs for a specific profile
    ipcMain.on('get-profile-tabs', (event, profileId) => {
        const tabs = tabManager.getTabsForProfile(profileId);
        event.reply('profile-tabs-loaded', { profileId, tabs });
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
