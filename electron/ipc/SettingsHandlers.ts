import { ipcMain, app, session, BrowserWindow, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type TabManager from '../TabManager';
import type SettingsManager from '../SettingsManager';
import type ProfileManager from '../ProfileManager';
import type AdBlockManager from '../AdBlockManager';
import type MenuBuilder from '../MenuBuilder';
import TrayManager from '../TrayManager';
import type { Settings } from '../types';

interface SettingsDependencies {
    settingsManager: SettingsManager;
    profileManager: ProfileManager;
    tabManager: TabManager;
    trayManager: TrayManager;
    adBlockManager: AdBlockManager | null;
    menuBuilder: MenuBuilder | null;
    saveSession: () => void;
    updateViewBounds: () => void;
}

/**
 * Registers settings management IPC handlers
 */
export function register(
    mainWindow: BrowserWindow,
    { settingsManager, profileManager, tabManager, trayManager, adBlockManager, menuBuilder, saveSession, updateViewBounds }: SettingsDependencies
): void {
    // Get current settings
    ipcMain.handle('get-settings', () => {
        return settingsManager.getSettings();
    });

    // Get the current active profile ID (for deletion validation)
    ipcMain.handle('get-active-profile-id', () => {
        if (tabManager && tabManager.activeTabId) {
            const activeTab = tabManager.tabs.get(tabManager.activeTabId);
            if (activeTab) {
                return activeTab.profileId;
            }
        }
        return null;
    });

    // Delete a profile immediately (with full data cleanup)
    ipcMain.handle('delete-profile', async (event, profileId: string) => {
        console.log(`[SettingsHandlers] Deleting profile: ${profileId}`);

        const currentSettings = settingsManager.getSettings();
        const profileToDelete = currentSettings.profiles.find(p => p.id === profileId);

        if (!profileToDelete) {
            console.error(`[SettingsHandlers] Profile not found: ${profileId}`);
            return { success: false, error: 'Profile not found' };
        }

        // Prevent deleting the last profile
        if (currentSettings.profiles.length <= 1) {
            console.error(`[SettingsHandlers] Cannot delete the last profile`);
            return { success: false, error: 'Cannot delete the last profile' };
        }

        // Check if this is the active profile
        let activeProfileId: string | null = null;
        if (tabManager && tabManager.activeTabId) {
            const activeTab = tabManager.tabs.get(tabManager.activeTabId);
            if (activeTab) {
                activeProfileId = activeTab.profileId;
            }
        }

        if (activeProfileId === profileId) {
            console.error(`[SettingsHandlers] Cannot delete the active profile`);
            return { success: false, error: 'Cannot delete the active profile. Switch to another profile first.' };
        }

        try {
            // 1. Close all tabs belonging to this profile
            const tabsToDelete = tabManager.getTabsForProfile(profileId);
            console.log(`[SettingsHandlers] Closing ${tabsToDelete.length} tabs for profile ${profileId}`);

            tabsToDelete.forEach(tab => {
                tabManager.closeTab(tab.id);
                mainWindow.webContents.send('tab-closed-backend', tab.id);
            });

            // 2. Clear partition data (cache, cookies, localStorage, etc.)
            const partitionName = `persist:${profileId}`;
            console.log(`[SettingsHandlers] Clearing partition data: ${partitionName}`);

            const profileSession = session.fromPartition(partitionName);
            await profileSession.clearStorageData();
            await profileSession.clearCache();
            console.log(`[SettingsHandlers] Cleared all partition data for ${profileId}`);

            // 3. Delete the partition folder from disk to reclaim storage
            // Electron stores partitions in folders with lowercase names
            const partitionFolderName = profileId.toLowerCase();
            const partitionPath = path.join(app.getPath('userData'), 'Partitions', partitionFolderName);
            console.log(`[SettingsHandlers] Deleting partition folder: ${partitionPath}`);

            try {
                if (fs.existsSync(partitionPath)) {
                    await fs.promises.rm(partitionPath, { recursive: true, force: true });
                    console.log(`[SettingsHandlers] Successfully deleted partition folder for ${profileId}`);
                } else {
                    console.log(`[SettingsHandlers] Partition folder does not exist (already deleted): ${partitionPath}`);
                }
            } catch (fsError) {
                console.warn(`[SettingsHandlers] Could not delete partition folder (will be cleaned up later): ${fsError}`);
            }

            // 3. Remove profile from settings
            const updatedProfiles = currentSettings.profiles.filter(p => p.id !== profileId);
            currentSettings.profiles = updatedProfiles;

            // If this was the default profile, update to the first remaining profile
            if (currentSettings.defaultProfileId === profileId && updatedProfiles.length > 0) {
                currentSettings.defaultProfileId = updatedProfiles[0].id;
            }

            settingsManager.saveSettings(currentSettings);
            console.log(`[SettingsHandlers] Profile removed from settings`);

            // 4. Reload profiles in ProfileManager
            if (profileManager) {
                profileManager.loadProfiles();
            }

            // 5. Save session state
            saveSession();

            // 6. Notify frontend
            mainWindow.webContents.send('profile-deleted', profileId);
            mainWindow.webContents.send('settings-updated', settingsManager.getSettings());

            console.log(`[SettingsHandlers] Profile ${profileId} deleted successfully`);
            return { success: true };
        } catch (error) {
            console.error(`[SettingsHandlers] Failed to delete profile ${profileId}:`, error);
            return { success: false, error: (error as Error).message };
        }
    });

    // Save settings
    ipcMain.handle('save-settings', async (event, newSettings: Settings) => {
        const oldSettings = settingsManager.getSettings();
        const success = settingsManager.saveSettings(newSettings);

        // Reload profiles in ProfileManager to sync with new settings
        if (profileManager) {
            profileManager.loadProfiles();
        }

        // Clean up tabs for deleted profiles
        if (tabManager && newSettings.profiles) {
            const newProfileIds = new Set(newSettings.profiles.map(p => p.id));
            const oldProfileIds = new Set(oldSettings.profiles.map(p => p.id));

            // Find deleted profile IDs
            const deletedProfileIds = Array.from(oldProfileIds).filter(id => !newProfileIds.has(id));

            if (deletedProfileIds.length > 0) {
                // Close all tabs belonging to deleted profiles
                deletedProfileIds.forEach(profileId => {
                    const tabsToDelete = tabManager.getTabsForProfile(profileId);
                    tabsToDelete.forEach(tab => {
                        tabManager.closeTab(tab.id);
                        mainWindow.webContents.send('tab-closed-backend', tab.id);
                    });
                });

                // Clear partition data for deleted profiles
                for (const profileId of deletedProfileIds) {
                    const partitionName = `persist:${profileId}`;
                    console.log(`[SettingsHandlers] Clearing partition data for deleted profile: ${profileId}`);

                    try {
                        const profileSession = session.fromPartition(partitionName);
                        await profileSession.clearStorageData();
                        await profileSession.clearCache();
                        console.log(`[SettingsHandlers] Successfully cleaned up all data for deleted profile: ${profileId}`);

                        // Delete the partition folder from disk to reclaim storage
                        // Electron stores partitions in folders with lowercase names
                        const partitionFolderName = profileId.toLowerCase();
                        const partitionPath = path.join(app.getPath('userData'), 'Partitions', partitionFolderName);
                        if (fs.existsSync(partitionPath)) {
                            await fs.promises.rm(partitionPath, { recursive: true, force: true });
                            console.log(`[SettingsHandlers] Deleted partition folder for ${profileId}`);
                        }
                    } catch (error) {
                        console.error(`[SettingsHandlers] Failed to clear partition data for ${profileId}:`, error);
                    }
                }

                saveSession();
            }
        }

        // Fetch favicons for any new providers
        await settingsManager.ensureProvidersFavicons();

        // Immediate enforcement of profile switch behavior
        const behavior = newSettings.performance?.profileSwitchBehavior || 'suspend';

        if (behavior !== 'keep' && tabManager) {
            let activeProfileId: string | null = null;
            if (tabManager.activeTabId) {
                const activeTab = tabManager.tabs.get(tabManager.activeTabId);
                if (activeTab) {
                    activeProfileId = activeTab.profileId;
                }
            }

            if (activeProfileId) {
                console.log(`[SettingsHandlers] Enforcing profile switch behavior: ${behavior}`);

                const allProfiles = newSettings.profiles || [];
                const otherProfiles = allProfiles.filter(p => p.id !== activeProfileId);

                otherProfiles.forEach(profile => {
                    const profileTabs = tabManager.getTabsForProfile(profile.id);

                    if (behavior === 'suspend') {
                        profileTabs.forEach(tab => {
                            if (tabManager.isTabLoaded(tab.id)) {
                                console.log(`[SettingsHandlers] Suspending tab ${tab.id} from profile ${profile.name}`);
                                tabManager.unloadTab(tab.id);
                            }
                        });
                    } else if (behavior === 'close') {
                        profileTabs.forEach(tab => {
                            console.log(`[SettingsHandlers] Closing tab ${tab.id} from profile ${profile.name}`);
                            tabManager.closeTab(tab.id);
                            mainWindow.webContents.send('tab-closed-backend', tab.id);
                        });
                    }
                });

                saveSession();
            }
        }

        // Apply tray/window settings immediately
        if (trayManager) {
            trayManager.updateSettings(newSettings);
        }

        // Apply ad blocker settings immediately (enable/disable on the fly)
        if (adBlockManager) {
            const wasEnabled = oldSettings.adBlock?.enabled ?? true;
            await adBlockManager.onSettingsChanged(newSettings, wasEnabled);
        }

        // Rebuild menus if shortcuts changed
        if (menuBuilder && JSON.stringify(oldSettings.shortcuts) !== JSON.stringify(newSettings.shortcuts)) {
            console.log('[SettingsHandlers] Shortcuts changed, rebuilding menus');
            menuBuilder.rebuildMenus();
        }

        // Broadcast to all windows
        mainWindow.webContents.send('settings-updated', settingsManager.getSettings());
        return success;
    });

    // Validate a keyboard shortcut before saving
    ipcMain.handle('validate-shortcut', async (event, shortcut: string) => {
        // Use the static method from TrayManager
        const validation = TrayManager.validateShortcut(shortcut);
        if (!validation.valid) {
            return { valid: false, available: false, reason: validation.reason };
        }

        if (trayManager) {
            const availability = trayManager.testShortcut(shortcut);
            return {
                valid: true,
                available: availability.available,
                reason: availability.reason
            };
        }

        return { valid: true, available: true, reason: null };
    });

    // Select download folder via dialog
    ipcMain.handle('select-download-folder', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: 'Select Download Location'
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        return result.filePaths[0];
    });

    // Get memory usage statistics
    ipcMain.handle('get-memory-usage', async () => {
        try {
            const metrics = app.getAppMetrics();
            const isWindows = process.platform === 'win32';

            let totalKB = 0;
            for (const metric of metrics) {
                const memKB = isWindows
                    ? (metric.memory?.privateBytes || 0)
                    : (metric.memory?.workingSetSize || 0);
                if (metric.type !== 'GPU') {
                    totalKB += memKB;
                }
            }

            // Build per-tab memory info
            const tabsMemory: Array<{ tabId: string; title: string; profileId: string; memoryKB: number; loaded: boolean }> = [];

            if (tabManager) {
                const pidToMemory: Record<number, number> = {};
                for (const m of metrics) {
                    if (m.memory) {
                        // Convert to MB for frontend display - use platform-appropriate metric
                        const memBytes = isWindows
                            ? (m.memory.privateBytes || 0)
                            : (m.memory.workingSetSize || 0);
                        pidToMemory[m.pid] = Math.round(memBytes / 1024);
                    }
                }

                for (const [tabId, tab] of tabManager.tabs) {
                    if (!tab.loaded || !tab.view || !tab.view.webContents || tab.view.webContents.isDestroyed()) {
                        tabsMemory.push({
                            tabId,
                            title: tab.title || 'Untitled',
                            profileId: tab.profileId,
                            memoryKB: 0,
                            loaded: false
                        });
                    } else {
                        const tabPid = tab.view.webContents.getOSProcessId();
                        tabsMemory.push({
                            tabId,
                            title: tab.title || 'Untitled',
                            profileId: tab.profileId,
                            memoryKB: pidToMemory[tabPid] || 0,
                            loaded: true
                        });
                    }
                }
            }

            return {
                totalKB: Math.round(totalKB / 1024), // Return as MB (named totalKB but value is MB for consistency)
                tabsMemory
            };
        } catch (e) {
            console.error('Failed to get memory usage:', e);
            return { totalKB: 0, tabsMemory: [] };
        }
    });

    // Get memory usage for a specific tab
    ipcMain.handle('get-tab-memory', async (event, tabId: string) => {
        try {
            if (!tabManager) return null;

            const tab = tabManager.tabs.get(tabId);
            if (!tab) return null;

            if (!tab.loaded || !tab.view || !tab.view.webContents || tab.view.webContents.isDestroyed()) {
                return { memory: 0, loaded: false };
            }

            const tabPid = tab.view.webContents.getOSProcessId();
            const metrics = app.getAppMetrics();
            const processMetric = metrics.find(m => m.pid === tabPid);

            if (processMetric && processMetric.memory) {
                // Use platform-appropriate memory metric
                const isWindows = process.platform === 'win32';
                const memBytes = isWindows
                    ? (processMetric.memory.privateBytes || 0)
                    : (processMetric.memory.workingSetSize || 0);
                return {
                    memory: Math.round(memBytes / 1024),
                    loaded: true
                };
            }

            return { memory: 0, loaded: true };
        } catch (e) {
            console.error('Failed to get tab memory:', e);
            return null;
        }
    });

    // Get memory usage for all tabs - returns array for frontend
    ipcMain.handle('get-all-tabs-memory', async () => {
        try {
            if (!tabManager) return [];

            const metrics = app.getAppMetrics();
            const isWindows = process.platform === 'win32';
            const pidToMemory: Record<number, number> = {};
            for (const m of metrics) {
                if (m.memory) {
                    // Convert to MB for frontend display - use platform-appropriate metric
                    const memBytes = isWindows
                        ? (m.memory.privateBytes || 0)
                        : (m.memory.workingSetSize || 0);
                    pidToMemory[m.pid] = Math.round(memBytes / 1024);
                }
            }

            const result: Array<{ tabId: string; title: string; profileId: string; memoryKB: number; loaded: boolean }> = [];

            for (const [tabId, tab] of tabManager.tabs) {
                if (!tab.loaded || !tab.view || !tab.view.webContents || tab.view.webContents.isDestroyed()) {
                    result.push({
                        tabId,
                        title: tab.title || 'Untitled',
                        profileId: tab.profileId,
                        memoryKB: 0,
                        loaded: false
                    });
                } else {
                    const tabPid = tab.view.webContents.getOSProcessId();
                    result.push({
                        tabId,
                        title: tab.title || 'Untitled',
                        profileId: tab.profileId,
                        memoryKB: pidToMemory[tabPid] || 0,
                        loaded: true
                    });
                }
            }

            return result;
        } catch (e) {
            console.error('Failed to get all tabs memory:', e);
            return [];
        }
    });
}
