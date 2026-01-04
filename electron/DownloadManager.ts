import { BrowserWindow, shell, DownloadItem } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface DownloadInfo {
    id: string;
    filename: string;
    path: string;
    totalBytes: number;
    receivedBytes: number;
    state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
    startTime: number;
}

interface ActiveDownload {
    info: DownloadInfo;
    item: DownloadItem;
}

/**
 * Manages file downloads with persistent history
 */
class DownloadManager {
    private activeDownloads: Map<string, ActiveDownload> = new Map();
    private history: DownloadInfo[] = [];
    private mainWindow: BrowserWindow | null = null;
    private historyPath: string;
    private downloadsWindow: BrowserWindow | null = null;

    constructor() {
        this.historyPath = path.join(app.getPath('userData'), 'downloads-history.json');
        this.loadHistory();
    }

    /**
     * Set the main window for IPC communication
     */
    setMainWindow(window: BrowserWindow): void {
        this.mainWindow = window;
    }

    /**
     * Set the downloads window for IPC communication
     */
    setDownloadsWindow(window: BrowserWindow | null): void {
        this.downloadsWindow = window;
    }

    /**
     * Load download history from file
     */
    private loadHistory(): void {
        try {
            if (fs.existsSync(this.historyPath)) {
                const data = fs.readFileSync(this.historyPath, 'utf-8');
                this.history = JSON.parse(data);
                console.log(`[DownloadManager] Loaded ${this.history.length} items from history`);
            }
        } catch (error) {
            console.error('[DownloadManager] Failed to load history:', error);
            this.history = [];
        }
    }

    /**
     * Save download history to file
     */
    private saveHistory(): void {
        try {
            // Keep only the last 100 items
            if (this.history.length > 100) {
                this.history = this.history.slice(-100);
            }
            fs.writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2));
        } catch (error) {
            console.error('[DownloadManager] Failed to save history:', error);
        }
    }

    /**
     * Broadcast download updates to windows
     */
    private broadcastUpdate(): void {
        const data = this.getDownloads();
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('download-update', data);
        }
        if (this.downloadsWindow && !this.downloadsWindow.isDestroyed()) {
            this.downloadsWindow.webContents.send('download-update', data);
        }
    }

    /**
     * Add a new download to track
     */
    addDownload(item: DownloadItem): void {
        const id = 'dl-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        const info: DownloadInfo = {
            id,
            filename: item.getFilename(),
            path: item.getSavePath() || '',
            totalBytes: item.getTotalBytes(),
            receivedBytes: item.getReceivedBytes(),
            state: 'progressing',
            startTime: Date.now()
        };

        this.activeDownloads.set(id, { info, item });
        console.log(`[DownloadManager] Download started: ${info.filename}`);
        this.broadcastUpdate();

        // Track progress
        item.on('updated', (_event, state) => {
            const download = this.activeDownloads.get(id);
            if (download) {
                download.info.receivedBytes = item.getReceivedBytes();
                download.info.totalBytes = item.getTotalBytes();
                download.info.path = item.getSavePath() || download.info.path;
                download.info.state = state === 'progressing' ? 'progressing' : 'interrupted';
                this.broadcastUpdate();
            }
        });

        // Handle completion
        item.once('done', (_event, state) => {
            const download = this.activeDownloads.get(id);
            if (download) {
                download.info.state = state as DownloadInfo['state'];
                download.info.receivedBytes = item.getReceivedBytes();
                download.info.path = item.getSavePath() || download.info.path;

                // Only add to history if download actually started (has a save path)
                if (download.info.path && state === 'completed') {
                    this.history.push({ ...download.info });
                    this.saveHistory();
                }

                this.activeDownloads.delete(id);
                console.log(`[DownloadManager] Download ${state}: ${download.info.filename}`);
                this.broadcastUpdate();
            }
        });
    }

    /**
     * Cancel an active download
     */
    cancelDownload(id: string): boolean {
        const download = this.activeDownloads.get(id);
        if (download) {
            download.item.cancel();
            download.info.state = 'cancelled';
            this.activeDownloads.delete(id);
            console.log(`[DownloadManager] Download cancelled: ${download.info.filename}`);
            this.broadcastUpdate();
            return true;
        }
        return false;
    }

    /**
     * Get all downloads (active + history)
     */
    getDownloads(): { active: DownloadInfo[]; history: DownloadInfo[] } {
        return {
            active: Array.from(this.activeDownloads.values()).map(d => d.info),
            history: [...this.history].reverse() // Most recent first
        };
    }

    /**
     * Open a downloaded file
     */
    async openFile(filePath: string): Promise<boolean> {
        try {
            await shell.openPath(filePath);
            return true;
        } catch (error) {
            console.error('[DownloadManager] Failed to open file:', error);
            return false;
        }
    }

    /**
     * Show file in folder
     */
    showInFolder(filePath: string): void {
        shell.showItemInFolder(filePath);
    }

    /**
     * Clear download history
     */
    clearHistory(): void {
        this.history = [];
        this.saveHistory();
        this.broadcastUpdate();
        console.log('[DownloadManager] History cleared');
    }

    /**
     * Remove a single item from history
     */
    removeFromHistory(id: string): void {
        this.history = this.history.filter(item => item.id !== id);
        this.saveHistory();
        this.broadcastUpdate();
    }
}

export default DownloadManager;
