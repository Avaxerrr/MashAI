import { ipcMain, BrowserWindow } from 'electron';
import type TabManager from '../TabManager';
import type SessionManager from '../SessionManager';

interface ProfileDependencies {
    tabManager: TabManager;
    sessionManager: SessionManager;
}

/**
 * Registers profile management IPC handlers
 */
export function register(mainWindow: BrowserWindow, { tabManager, sessionManager }: ProfileDependencies): void {
    // Get tabs for a specific profile
    ipcMain.on('get-profile-tabs', (event, profileId: string) => {
        const tabs = tabManager.getTabsForProfile(profileId);

        // Get the last active tab for this profile from session
        let lastActiveTabId: string | null = null;
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
