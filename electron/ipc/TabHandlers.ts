import { ipcMain, BrowserWindow } from 'electron';
import type TabManager from '../TabManager';
import type SettingsManager from '../SettingsManager';
import type SessionManager from '../SessionManager';

interface ClosedTab {
    profileId: string;
    url: string;
    title: string;
}

interface TabDependencies {
    tabManager: TabManager;
    settingsManager: SettingsManager;
    sessionManager: SessionManager;
    saveSession: () => void;
    updateViewBounds: () => void;
    closedTabs: ClosedTab[];
}

/**
 * Registers tab management IPC handlers
 */
export function register(
    mainWindow: BrowserWindow,
    { tabManager, settingsManager, sessionManager, saveSession, updateViewBounds, closedTabs }: TabDependencies
): void {
    // Create new tab
    ipcMain.on('create-tab', (event, profileId: string) => {
        const id = tabManager.createTab(profileId);
        const tab = tabManager.tabs.get(id);
        const success = tabManager.switchTo(id);

        if (success) {
            mainWindow.webContents.send('tab-created', {
                id,
                profileId,
                title: 'New Thread',
                url: tab?.url || '',
                loaded: true
            });
            updateViewBounds();
            saveSession();
        }
    });

    // Create new tab with specific URL
    ipcMain.on('create-tab-with-url', (event, { profileId, url }: { profileId: string; url: string }) => {
        const id = tabManager.createTab(profileId, url);
        const tab = tabManager.tabs.get(id);
        const success = tabManager.switchTo(id);

        if (success) {
            mainWindow.webContents.send('tab-created', {
                id,
                profileId,
                title: 'New Thread',
                url: tab?.url || url || '',
                loaded: true
            });
            updateViewBounds();
            saveSession();
        }
    });

    // Switch to tab
    ipcMain.on('switch-tab', (event, tabId: string) => {
        const success = tabManager.switchTo(tabId);
        if (success) {
            updateViewBounds();
            saveSession();
        }
    });

    // Close tab
    ipcMain.on('close-tab', (event, tabId: string) => {
        // Prevent closing the last tab
        if (tabManager.tabs.size <= 1) {
            return;
        }

        const tab = tabManager.tabs.get(tabId);
        if (tab) {
            closedTabs.push({
                profileId: tab.profileId,
                url: tab.url,
                title: tab.title
            });
            if (closedTabs.length > 10) closedTabs.shift();
        }

        tabManager.closeTab(tabId);
        saveSession();
    });

    // Duplicate tab
    ipcMain.on('duplicate-tab', (event, tabId: string) => {
        const tab = tabManager.tabs.get(tabId);
        if (!tab) return;

        const newId = tabManager.createTab(tab.profileId, tab.url);
        tabManager.switchTo(newId);
        mainWindow.webContents.send('tab-created', {
            id: newId,
            profileId: tab.profileId,
            title: tab.title,
            loaded: true
        });
        updateViewBounds();
        saveSession();
    });

    // Reload tab
    ipcMain.on('reload-tab', (event, tabId: string) => {
        const tab = tabManager.tabs.get(tabId);
        if (tab && tab.view) {
            tab.view.webContents.reload();
        }
    });

    // Reopen last closed tab
    ipcMain.on('reopen-closed-tab', () => {
        if (closedTabs.length === 0) return;

        const lastClosed = closedTabs.pop()!;
        const id = tabManager.createTab(lastClosed.profileId, lastClosed.url);
        tabManager.switchTo(id);
        mainWindow.webContents.send('tab-created', {
            id,
            profileId: lastClosed.profileId,
            title: lastClosed.title,
            loaded: true
        });
        updateViewBounds();
        saveSession();
    });

    // Close other tabs
    ipcMain.on('close-other-tabs', (event, { tabId, profileId }: { tabId: string; profileId: string }) => {
        const tabs = tabManager.getTabsForProfile(profileId);
        tabs.forEach(tab => {
            if (tab.id !== tabId) {
                tabManager.closeTab(tab.id);
            }
        });
        saveSession();
    });

    // Close tabs to the right
    ipcMain.on('close-tabs-to-right', (event, { tabId, profileId }: { tabId: string; profileId: string }) => {
        const tabs = tabManager.getTabsForProfile(profileId);
        const targetIndex = tabs.findIndex(t => t.id === tabId);

        if (targetIndex >= 0) {
            tabs.slice(targetIndex + 1).forEach(tab => {
                tabManager.closeTab(tab.id);
            });
        }
        saveSession();
    });

    // Reorder tabs
    ipcMain.on('reorder-tabs', (event, tabOrder: string[]) => {
        tabManager.reorderTabs(tabOrder);
        saveSession();
    });

    // Switch profile with suspension logic
    ipcMain.on('switch-profile', (event, { toProfileId }: { toProfileId: string }) => {
        if (!toProfileId) {
            return;
        }

        // Determine the current profile from the active tab
        let fromProfileId: string | null = null;
        if (tabManager.activeTabId) {
            const activeTab = tabManager.tabs.get(tabManager.activeTabId);
            if (activeTab) {
                fromProfileId = activeTab.profileId;
            }
        }

        // If no active tab or switching to the same profile, skip
        if (!fromProfileId || fromProfileId === toProfileId) {
            console.log(`[TabHandlers] No profile switch needed (from: ${fromProfileId}, to: ${toProfileId})`);
            return;
        }

        // Get the profile switch behavior setting
        const settings = settingsManager.getSettings();
        const behavior = settings.performance?.profileSwitchBehavior || 'suspend';

        console.log(`[TabHandlers] Switching from profile ${fromProfileId} to ${toProfileId}, behavior: ${behavior}`);

        // Get all tabs from the old profile
        const oldProfileTabs = tabManager.getTabsForProfile(fromProfileId);
        console.log(`[TabHandlers] Old profile has ${oldProfileTabs.length} tabs`);

        if (behavior === 'suspend') {
            // Suspend (unload) all tabs from the old profile
            oldProfileTabs.forEach(tab => {
                if (tabManager.isTabLoaded(tab.id)) {
                    console.log(`[TabHandlers] Suspending tab ${tab.id} (${tab.title})`);
                    tabManager.unloadTab(tab.id);
                }
            });
        } else if (behavior === 'close') {
            // Close all tabs from the old profile
            oldProfileTabs.forEach(tab => {
                console.log(`[TabHandlers] Closing tab ${tab.id} (${tab.title})`);
                tabManager.closeTab(tab.id);
                mainWindow.webContents.send('tab-closed-backend', tab.id);
            });
        }
        // 'keep' behavior does nothing - tabs stay loaded

        // Update session tracking for the old profile
        if (sessionManager && tabManager.activeTabId) {
            sessionManager.setActiveTabForProfile(fromProfileId, tabManager.activeTabId);
        }

        saveSession();
    });

    // Handle request to update view bounds (from TabManager when creating tabs internally)
    ipcMain.on('request-update-bounds', () => {
        updateViewBounds();
    });
}
