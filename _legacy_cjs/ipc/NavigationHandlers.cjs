const { ipcMain } = require('electron');

/**
 * Registers navigation IPC handlers
 * @param {Object} dependencies - Required dependencies
 * @param {TabManager} dependencies.tabManager - Tab manager instance
 */
function register({ tabManager }) {
    // Navigate back
    ipcMain.on('nav-back', () => {
        tabManager.goBack();
    });

    // Navigate forward
    ipcMain.on('nav-forward', () => {
        tabManager.goForward();
    });

    // Reload current tab
    ipcMain.on('nav-reload', () => {
        tabManager.reload();
    });
}

module.exports = { register };
