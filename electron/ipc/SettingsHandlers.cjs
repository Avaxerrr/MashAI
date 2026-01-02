const { ipcMain, app, session } = require('electron');

/**
 * Registers settings management IPC handlers
 * @param {BrowserWindow} mainWindow - The main application window
 * @param {Object} dependencies - Required dependencies
 * @param {SettingsManager} dependencies.settingsManager - Settings manager instance
 * @param {ProfileManager} dependencies.profileManager - Profile manager instance
 * @param {TabManager} dependencies.tabManager - Tab manager instance
 * @param {TrayManager} dependencies.trayManager - Tray manager instance
 * @param {Function} dependencies.saveSession - Function to save session
 * @param {Function} dependencies.updateViewBounds - Function to update view bounds
 */
function register(mainWindow, { settingsManager, profileManager, tabManager, trayManager, saveSession, updateViewBounds }) {
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
    ipcMain.handle('save-settings', async (event, newSettings) => {
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
                // Track if we need to switch profiles
                let needsProfileSwitch = false;
                let currentActiveProfileId = null;

                // Get current active profile from active tab
                if (tabManager.activeTabId) {
                    const activeTab = tabManager.tabs.get(tabManager.activeTabId);
                    if (activeTab) {
                        currentActiveProfileId = activeTab.profileId;
                        if (deletedProfileIds.includes(currentActiveProfileId)) {
                            needsProfileSwitch = true;
                        }
                    }
                }

                // Close all tabs belonging to deleted profiles
                deletedProfileIds.forEach(profileId => {
                    const tabsToDelete = tabManager.getTabsForProfile(profileId);
                    tabsToDelete.forEach(tab => {
                        tabManager.closeTab(tab.id);
                        mainWindow.webContents.send('tab-closed-backend', tab.id);
                    });
                });

                // Clear partition data for deleted profiles (auto-cleanup)
                // TODO: Thorough testing needed for profile deletion auto-cleanup:
                // - [ ] Verify partition data is actually deleted (check AppData folder)
                // - [ ] Verify no ghost data remains after profile deletion
                // - [ ] Test deleting multiple profiles at once
                // - [ ] Test what happens if clearStorageData fails midway
                // - [ ] Verify UI correctly removes tabs and switches profile
                for (const profileId of deletedProfileIds) {
                    const partitionName = `persist:${profileId}`;
                    console.log(`[SettingsHandlers] Clearing partition data for deleted profile: ${profileId}`);
                    console.log(`[SettingsHandlers] Partition: ${partitionName}`);

                    try {
                        const profileSession = session.fromPartition(partitionName);

                        // Clear all storage data for this partition
                        await profileSession.clearStorageData();
                        console.log(`[SettingsHandlers] Cleared storage data for ${profileId}`);

                        // Clear cache for this partition
                        await profileSession.clearCache();
                        console.log(`[SettingsHandlers] Cleared cache for ${profileId}`);

                        console.log(`[SettingsHandlers] Successfully cleaned up all data for deleted profile: ${profileId}`);
                    } catch (error) {
                        console.error(`[SettingsHandlers] Failed to clear partition data for ${profileId}:`, error);
                        // Continue with other profiles even if one fails
                    }
                }

                // If active profile was deleted, switch to first remaining profile
                if (needsProfileSwitch && newSettings.profiles.length > 0) {
                    const newActiveProfile = newSettings.profiles[0];
                    const profileTabs = tabManager.getTabsForProfile(newActiveProfile.id);

                    if (profileTabs.length > 0) {
                        // Switch to first tab of the new active profile
                        tabManager.switchTo(profileTabs[0].id);
                        mainWindow.webContents.send('restore-active', profileTabs[0].id);
                    } else {
                        // Create a new tab for this profile
                        const newTabId = tabManager.createTab(newActiveProfile.id);
                        tabManager.switchTo(newTabId);
                        mainWindow.webContents.send('tab-created', {
                            id: newTabId,
                            profileId: newActiveProfile.id,
                            title: 'New Thread',
                            url: tabManager.tabs.get(newTabId)?.url || ''
                        });
                        updateViewBounds();
                    }

                    // Notify frontend to update its active profile state
                    mainWindow.webContents.send('active-profile-changed', newActiveProfile.id);
                }

                saveSession();
            }
        }

        // Fetch favicons for any new providers that don't have them cached
        // This is async but we await it to ensure the favicon is ready before broadcasting
        await settingsManager.ensureProvidersFavicons();

        // ===== IMMEDIATE ENFORCEMENT OF PROFILE SWITCH BEHAVIOR =====
        // When user saves settings, immediately apply the new behavior to all non-active profiles
        const behavior = newSettings.performance?.profileSwitchBehavior || 'suspend';

        if (behavior !== 'keep' && tabManager) {
            // Get the current active profile
            let activeProfileId = null;
            if (tabManager.activeTabId) {
                const activeTab = tabManager.tabs.get(tabManager.activeTabId);
                if (activeTab) {
                    activeProfileId = activeTab.profileId;
                }
            }

            if (activeProfileId) {
                console.log(`[SettingsHandlers] Enforcing profile switch behavior: ${behavior}`);
                console.log(`[SettingsHandlers] Active profile: ${activeProfileId}`);

                // Get all profiles except the active one
                const allProfiles = newSettings.profiles || [];
                const otherProfiles = allProfiles.filter(p => p.id !== activeProfileId);

                otherProfiles.forEach(profile => {
                    const profileTabs = tabManager.getTabsForProfile(profile.id);

                    if (behavior === 'suspend') {
                        // Suspend all loaded tabs in this profile
                        profileTabs.forEach(tab => {
                            if (tabManager.isTabLoaded(tab.id)) {
                                console.log(`[SettingsHandlers] Suspending tab ${tab.id} (${tab.title}) from profile ${profile.name}`);
                                tabManager.unloadTab(tab.id);
                            }
                        });
                    } else if (behavior === 'close') {
                        // Close all tabs in this profile
                        profileTabs.forEach(tab => {
                            console.log(`[SettingsHandlers] Closing tab ${tab.id} (${tab.title}) from profile ${profile.name}`);
                            tabManager.closeTab(tab.id);
                            mainWindow.webContents.send('tab-closed-backend', tab.id);
                        });
                    }
                });

                saveSession();
            }
        }
        // ===== END IMMEDIATE ENFORCEMENT =====

        // Apply tray/window settings immediately
        if (trayManager) {
            trayManager.updateSettings(newSettings);
        }

        // Broadcast to all windows (main window updates its UI) - now includes fetched favicons
        mainWindow.webContents.send('settings-updated', settingsManager.getSettings());
        return success;
    });

    // Validate a keyboard shortcut before saving
    ipcMain.handle('validate-shortcut', async (event, shortcut) => {
        const TrayManager = require('../TrayManager.cjs');

        // First do static validation (format, reserved shortcuts)
        const validation = TrayManager.validateShortcut(shortcut);
        if (!validation.valid) {
            return { valid: false, available: false, reason: validation.reason };
        }

        // Then check if it's available (not used by another app)
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

    // Get memory usage statistics using app.getAppMetrics() for accurate readings
    // Cross-platform: privateBytes on Windows, workingSetSize on macOS/Linux
    ipcMain.handle('get-memory-usage', async () => {
        try {
            const metrics = app.getAppMetrics();
            const isWindows = process.platform === 'win32';

            console.log('\n[MemoryUsage] ========== Process Metrics ==========');
            console.log(`[MemoryUsage] Platform: ${process.platform}, Total processes: ${metrics.length}`);

            let totalKB = 0;
            let gpuKB = 0;

            for (const metric of metrics) {
                // Use privateBytes on Windows, workingSetSize on macOS/Linux
                // Note: workingSetSize includes shared memory, privateBytes is more accurate on Windows
                const memoryKB = isWindows
                    ? (metric.memory?.privateBytes || 0)
                    : (metric.memory?.workingSetSize || 0);

                // Track GPU separately (it reports inflated values that don't match Task Manager)
                if (metric.type === 'GPU') {
                    gpuKB = memoryKB;
                    console.log(`[MemoryUsage] PID ${metric.pid} (${metric.type}): ${memoryKB} KB (${Math.round(memoryKB / 1024)} MB) [EXCLUDED - GPU reports inflated values]`);
                } else {
                    totalKB += memoryKB;
                    console.log(`[MemoryUsage] PID ${metric.pid} (${metric.type}): ${memoryKB} KB (${Math.round(memoryKB / 1024)} MB)`);
                }
            }

            console.log(`[MemoryUsage] ---------- Totals ----------`);
            console.log(`[MemoryUsage] App memory (excl. GPU): ${totalKB} KB = ${Math.round(totalKB / 1024)} MB`);
            console.log(`[MemoryUsage] GPU memory (excluded): ${gpuKB} KB = ${Math.round(gpuKB / 1024)} MB`);
            console.log(`[MemoryUsage] =====================================\n`);

            // Count active and suspended tabs
            let activeTabCount = 0;
            let suspendedTabCount = 0;

            if (tabManager) {
                for (const [tabId, tab] of tabManager.tabs) {
                    if (tab.view && tab.view.webContents && !tab.view.webContents.isDestroyed()) {
                        activeTabCount++;
                    } else if (tab.suspended || !tab.loaded) {
                        suspendedTabCount++;
                    }
                }
            }

            return {
                total: Math.round(totalKB / 1024), // KB to MB
                tabCount: activeTabCount,
                suspendedCount: suspendedTabCount
            };
        } catch (e) {
            console.error('Failed to get memory usage:', e);
            return { total: 0, tabCount: 0, suspendedCount: 0 };
        }
    });

    // Get memory usage for a specific tab using app.getAppMetrics()
    ipcMain.handle('get-tab-memory', async (event, tabId) => {
        try {
            if (!tabManager) return null;

            const tab = tabManager.tabs.get(tabId);
            if (!tab) return null;

            // If tab is not loaded, return 0
            if (!tab.loaded || !tab.view || !tab.view.webContents || tab.view.webContents.isDestroyed()) {
                return { memory: 0, loaded: false };
            }

            // Get the process ID for this tab's webContents
            const tabPid = tab.view.webContents.getOSProcessId();

            // Find this process in app metrics
            const metrics = app.getAppMetrics();
            const processMetric = metrics.find(m => m.pid === tabPid);

            if (processMetric && processMetric.memory) {
                return {
                    memory: Math.round((processMetric.memory.privateBytes || 0) / 1024), // KB to MB
                    loaded: true
                };
            }

            return { memory: 0, loaded: true };
        } catch (e) {
            console.error('Failed to get tab memory:', e);
            return null;
        }
    });

    // Get memory usage for all tabs (for bulk display)
    ipcMain.handle('get-all-tabs-memory', async () => {
        try {
            if (!tabManager) return {};

            // Get all process metrics once
            const metrics = app.getAppMetrics();
            const pidToMemory = {};
            for (const m of metrics) {
                if (m.memory) {
                    pidToMemory[m.pid] = Math.round((m.memory.privateBytes || 0) / 1024); // KB to MB
                }
            }

            const result = {};

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

module.exports = { register };
