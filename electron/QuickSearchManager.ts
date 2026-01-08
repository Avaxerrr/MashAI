import { BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Manages the Quick Search floating window
 */
class QuickSearchManager {
    private mainWindow: BrowserWindow;
    private quickSearchWindow: BrowserWindow | null = null;
    private onSearchCallback: ((url: string) => void) | null = null;

    constructor(mainWindow: BrowserWindow) {
        this.mainWindow = mainWindow;
        this.registerIpcHandlers();
    }

    /**
     * Set callback for when a search is submitted
     */
    setOnSearch(callback: (url: string) => void): void {
        this.onSearchCallback = callback;
    }

    private registerIpcHandlers(): void {
        // Handle search submission from quick search window
        ipcMain.on('quick-search-submit', (_event, url: string) => {
            this.hide();
            if (this.onSearchCallback) {
                this.onSearchCallback(url);
            }
        });

        // Handle close request from quick search window
        ipcMain.on('quick-search-close', () => {
            this.hide();
        });
    }

    private createWindow(): void {
        const mainBounds = this.mainWindow.getBounds();
        const width = 700;  // ~10% bigger
        const height = 130; // Exact fit for content

        this.quickSearchWindow = new BrowserWindow({
            width,
            height,
            x: mainBounds.x + Math.round((mainBounds.width - width) / 2),
            y: mainBounds.y + Math.round(mainBounds.height / 3),
            frame: false,
            transparent: true,
            hasShadow: false, // Disable native shadow to fix Windows transparency
            backgroundColor: '#00000000', // Fully transparent
            resizable: false,
            movable: false,
            alwaysOnTop: true,
            skipTaskbar: true,
            show: false,
            parent: this.mainWindow,
            modal: false,
            focusable: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js'),
            },
        });

        // Force transparent background on Windows
        if (process.platform === 'win32') {
            this.quickSearchWindow.setBackgroundColor('#00000000');
        }

        // Load the quick search HTML (always load from file since it's self-contained)
        const htmlPath = isDev
            ? path.join(__dirname, '../../src/quick-search.html')
            : path.join(__dirname, '../../dist/quick-search.html');
        this.quickSearchWindow.loadFile(htmlPath);

        // Hide on blur (click outside)
        this.quickSearchWindow.on('blur', () => {
            this.hide();
        });

        // Clean up on close
        this.quickSearchWindow.on('closed', () => {
            this.quickSearchWindow = null;
        });
    }

    toggle(): void {
        if (this.quickSearchWindow && this.quickSearchWindow.isVisible()) {
            this.hide();
        } else {
            this.show();
        }
    }

    show(): void {
        if (!this.quickSearchWindow || this.quickSearchWindow.isDestroyed()) {
            this.createWindow();
        }

        // Reposition to center of main window
        const mainBounds = this.mainWindow.getBounds();
        const width = 600;
        const height = 120;
        this.quickSearchWindow!.setBounds({
            x: mainBounds.x + Math.round((mainBounds.width - width) / 2),
            y: mainBounds.y + Math.round(mainBounds.height / 3),
            width,
            height,
        });

        this.quickSearchWindow!.show();
        this.quickSearchWindow!.focus();
        this.quickSearchWindow!.webContents.send('quick-search-focus');
    }

    hide(): void {
        if (this.quickSearchWindow && !this.quickSearchWindow.isDestroyed()) {
            this.quickSearchWindow.hide();
        }
        // Return focus to main window so shortcuts work again
        this.mainWindow.focus();
    }

    destroy(): void {
        if (this.quickSearchWindow && !this.quickSearchWindow.isDestroyed()) {
            this.quickSearchWindow.close();
        }
        this.quickSearchWindow = null;
    }
}

export default QuickSearchManager;
