import { ipcMain, BrowserWindow } from 'electron';

/**
 * Registers window control IPC handlers
 */
export function register(mainWindow: BrowserWindow): void {
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
