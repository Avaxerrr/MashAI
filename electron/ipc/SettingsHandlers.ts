import { ipcMain, app, session, BrowserWindow } from 'electron';
import type TabManager from '../TabManager';
import type SettingsManager from '../SettingsManager';
import type ProfileManager from '../ProfileManager';
import TrayManager from '../TrayManager';
import type { Settings } from '../types';

interface SettingsDependencies {
    settingsManager: SettingsManager;
    profileManager: ProfileManager;
    tabManager: TabManager;
    trayManager: TrayManager;
    saveSession: () => void;
    updateViewBounds: () => void;
}

/**
 * Registers settings management IPC handlers
 */
export function register(
    mainWindow: BrowserWindow,
    { settingsManager, profileManager, tabManager, trayManager, saveSession, updateViewBounds }: SettingsDependencies
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

    // Get memory usage statistics
    ipcMain.handle('get-memory-usage', async () => {
        try {
            const metrics = app.getAppMetrics();
            const isWindows = process.platform === 'win32';

            let totalKB = 0;

            for (const metric of metrics) {
                const memoryKB = isWindows
                    ? (metric.memory?.privateBytes || 0)
                    : (metric.memory?.workingSetSize || 0);

                if (metric.type !== 'GPU') {
                    totalKB += memoryKB;
                }
            }

            let activeTabCount = 0;
            let suspendedTabCount = 0;

            if (tabManager) {
                for (const [tabId, tab] of tabManager.tabs) {
                    if (tab.view && tab.view.webContents && !tab.view.webContents.isDestroyed()) {
                        activeTabCount++;
                    } else if (!tab.loaded) {
                        suspendedTabCount++;
                    }
                }
            }

            return {
                total: Math.round(totalKB / 1024),
                tabCount: activeTabCount,
                suspendedCount: suspendedTabCount
            };
        } catch (e) {
            console.error('Failed to get memory usage:', e);
            return { total: 0, tabCount: 0, suspendedCount: 0 };
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
                return {
                    memory: Math.round((processMetric.memory.privateBytes || 0) / 1024),
                    loaded: true
                };
            }

            return { memory: 0, loaded: true };
        } catch (e) {
            console.error('Failed to get tab memory:', e);
            return null;
        }
    });

    // Get memory usage for all tabs
    ipcMain.handle('get-all-tabs-memory', async () => {
        try {
            if (!tabManager) return {};

            const metrics = app.getAppMetrics();
            const pidToMemory: Record<number, number> = {};
            for (const m of metrics) {
                if (m.memory) {
                    pidToMemory[m.pid] = Math.round((m.memory.privateBytes || 0) / 1024);
                }
            }

            const result: Record<string, { memory: number; loaded: boolean }> = {};

            for (const [tabId, tab] of tabManager.tabs) {
                if (!tab.loaded || !tab.view || !tab.view.webContents || tab.view.webContents.isDestroyed()) {
                    result[tabId] = { memory: 0, loaded: false };
                } else {
                    try {
                        const tabPid = tab.view.webContents.getOSProcessId();
                        const memory = pidToMemory[tabPid] || 0;
                        result[tabId] = { memory, loaded: true };
                    } catch (e) {
                        result[tabId] = { memory: 0, loaded: false };
                    }
                }
            }

            return result;
        } catch (e) {
            console.error('Failed to get all tabs memory:', e);
            return {};
        }
    });
}
