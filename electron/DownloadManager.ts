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
    state: 'progressing' | 'completed' | 'cancelled' | 'interrupted' | 'paused';
    startTime: number;
    isPaused?: boolean;
    canResume?: boolean;
    speed?: number; // bytes per second
}

interface ActiveDownload {
    info: DownloadInfo;
    item: DownloadItem;
    lastReceivedBytes: number;
    lastUpdateTime: number;
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
     * Send a toast notification to the main window
     */
    private sendToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('show-toast', { message, type });
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

        const now = Date.now();
        this.activeDownloads.set(id, {
            info,
            item,
            lastReceivedBytes: 0,
            lastUpdateTime: now
        });
        console.log(`[DownloadManager] Download started: ${info.filename}`);
        this.broadcastUpdate();

        // Send toast notification if downloads window is not visible
        if (!this.downloadsWindow || this.downloadsWindow.isDestroyed()) {
            this.sendToast(`Downloading: ${info.filename}`, 'info');
        }

        // Track progress
        item.on('updated', (_event, state) => {
            const download = this.activeDownloads.get(id);
            if (download) {
                const currentTime = Date.now();
                const currentBytes = item.getReceivedBytes();

                // Calculate speed (bytes per second)
                const timeDelta = (currentTime - download.lastUpdateTime) / 1000; // Convert to seconds
                if (timeDelta > 0) {
                    const bytesDelta = currentBytes - download.lastReceivedBytes;
                    download.info.speed = Math.max(0, bytesDelta / timeDelta);
                }

                // Update tracking for next calculation
                download.lastReceivedBytes = currentBytes;
                download.lastUpdateTime = currentTime;

                download.info.receivedBytes = currentBytes;
                download.info.totalBytes = item.getTotalBytes();
                download.info.path = item.getSavePath() || download.info.path;
                download.info.isPaused = item.isPaused();
                download.info.canResume = item.canResume();
                if (state === 'interrupted') {
                    download.info.state = item.isPaused() ? 'paused' : 'interrupted';
                    download.info.speed = 0; // No speed when paused/interrupted
                } else {
                    download.info.state = 'progressing';
                }
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

                // Send toast notification if downloads window is not visible
                if (!this.downloadsWindow || this.downloadsWindow.isDestroyed()) {
                    if (state === 'completed') {
                        this.sendToast(`Download complete: ${download.info.filename}`, 'success');
                    }
                }
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
     * Pause an active download
     */
    pauseDownload(id: string): boolean {
        const download = this.activeDownloads.get(id);
        if (download && !download.item.isPaused()) {
            download.item.pause();
            download.info.isPaused = true;
            download.info.state = 'paused';
            console.log(`[DownloadManager] Download paused: ${download.info.filename}`);
            this.broadcastUpdate();
            return true;
        }
        return false;
    }

    /**
     * Resume a paused download
     */
    resumeDownload(id: string): boolean {
        const download = this.activeDownloads.get(id);
        if (download && download.item.isPaused() && download.item.canResume()) {
            download.item.resume();
            download.info.isPaused = false;
            download.info.state = 'progressing';
            console.log(`[DownloadManager] Download resumed: ${download.info.filename}`);
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
