const { ipcMain } = require('electron');

/**
 * Registers window control IPC handlers
 * @param {BrowserWindow} mainWindow - The main application window
 */
function register(mainWindow) {
    // Minimize window
    ipcMain.on('window-minimize', () => {
        mainWindow.minimize();
    });

    // Toggle maximize/unmaximize
    ipcMain.on('window-maximize', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });

    // Close window
    ipcMain.on('window-close', () => {
        mainWindow.close();
    });
}

module.exports = { register };
