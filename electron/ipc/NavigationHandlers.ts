import { ipcMain } from 'electron';
import type TabManager from '../TabManager';

interface NavigationDependencies {
    tabManager: TabManager;
}

/**
 * Registers navigation IPC handlers
 */
export function register({ tabManager }: NavigationDependencies): void {
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
