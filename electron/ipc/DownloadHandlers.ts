import { ipcMain, BrowserWindow } from 'electron';
import type DownloadManager from '../DownloadManager';

interface DownloadHandlersDependencies {
    downloadManager: DownloadManager;
    createDownloadsWindow: () => void;
}

/**
 * Registers download-related IPC handlers
 */
export function register(
    mainWindow: BrowserWindow,
    { downloadManager, createDownloadsWindow }: DownloadHandlersDependencies
): void {
    // Get all downloads (active + history)
    ipcMain.handle('get-downloads', () => {
        return downloadManager.getDownloads();
    });

    // Cancel an active download
    ipcMain.handle('cancel-download', (_event, id: string) => {
        return downloadManager.cancelDownload(id);
    });

    // Open a downloaded file
    ipcMain.handle('open-download', async (_event, filePath: string) => {
        return await downloadManager.openFile(filePath);
    });

    // Show file in folder
    ipcMain.on('show-download-in-folder', (_event, filePath: string) => {
        downloadManager.showInFolder(filePath);
    });

    // Clear download history
    ipcMain.on('clear-download-history', () => {
        downloadManager.clearHistory();
    });

    // Remove single item from history
    ipcMain.on('remove-download-from-history', (_event, id: string) => {
        downloadManager.removeFromHistory(id);
    });

    // Open downloads window
    ipcMain.on('open-downloads-window', () => {
        createDownloadsWindow();
    });

    console.log('[DownloadHandlers] Handlers registered');
}
