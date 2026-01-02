const { ipcMain, session, shell, app } = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * PrivacyHandlers - Handles privacy and data clearing operations
 * 
 * Manages:
 * - Clearing cache per profile
 * - Clearing cookies per profile
 * - Clearing site data (localStorage, indexedDB) per profile
 * - Clearing session data from session.json
 * 
 * TODO: Thorough testing needed for:
 * - [ ] Verify cache clearing actually removes cached resources
 * - [ ] Verify cookies are cleared (user is logged out of AI providers)
 * - [ ] Verify site data clearing removes localStorage/IndexedDB
 * - [ ] Verify session clearing removes correct tabs from session.json
 * - [ ] Test edge cases: clearing data for non-existent profiles
 * - [ ] Test concurrent clearing operations
 */
class PrivacyHandlers {
    constructor(dependencies) {
        this.sessionManager = dependencies.sessionManager;
        this.tabManager = dependencies.tabManager;
    }

    /**
     * Register all privacy-related IPC handlers
     */
    register() {
        // Main privacy data clearing handler
        ipcMain.handle('clear-privacy-data', async (event, options) => {
            console.log('[PrivacyHandler] clear-privacy-data called with:', JSON.stringify(options));

            const { profiles, dataType } = options;

            if (!profiles || profiles.length === 0) {
                console.log('[PrivacyHandler] No profiles specified');
                return { success: false, error: 'No profiles specified' };
            }

            try {
                switch (dataType) {
                    case 'cache':
                        return await this._clearCache(profiles);
                    case 'cookies':
                        return await this._clearCookies(profiles);
                    case 'siteData':
                        return await this._clearSiteData(profiles);
                    case 'sessions':
                        return await this._clearSessions(profiles);
                    case 'all':
                        return await this._clearAll(profiles);
                    default:
                        console.log('[PrivacyHandler] Unknown data type:', dataType);
                        return { success: false, error: 'Unknown data type' };
                }
            } catch (error) {
                console.error('[PrivacyHandler] Error clearing data:', error);
                return { success: false, error: error.message };
            }
        });

        // Open external link handler
        ipcMain.handle('open-external', async (event, url) => {
            console.log('[PrivacyHandler] Opening external URL:', url);
            try {
                await shell.openExternal(url);
                return { success: true };
            } catch (error) {
                console.error('[PrivacyHandler] Error opening external link:', error);
                return { success: false, error: error.message };
            }
        });

        console.log('[PrivacyHandler] Handlers registered');
    }

    /**
     * Get the partition name for a profile
     */
    _getPartitionName(profileId) {
        return `persist:${profileId}`;
    }

    /**
     * Clear cache for specified profiles
     */
    async _clearCache(profiles) {
        console.log('[PrivacyHandler] Clearing cache for profiles:', profiles);

        const results = [];
        for (const profileId of profiles) {
            const partition = this._getPartitionName(profileId);
            console.log(`[PrivacyHandler] Clearing cache for partition: ${partition}`);

            try {
                const profileSession = session.fromPartition(partition);
                await profileSession.clearCache();
                console.log(`[PrivacyHandler] Cache cleared for ${profileId}`);
                results.push({ profileId, success: true });
            } catch (error) {
                console.error(`[PrivacyHandler] Failed to clear cache for ${profileId}:`, error);
                results.push({ profileId, success: false, error: error.message });
            }
        }

        const allSuccess = results.every(r => r.success);
        console.log(`[PrivacyHandler] Cache clearing complete. All success: ${allSuccess}`);
        return { success: allSuccess, results };
    }

    /**
     * Clear cookies for specified profiles
     */
    async _clearCookies(profiles) {
        console.log('[PrivacyHandler] Clearing cookies for profiles:', profiles);

        const results = [];
        for (const profileId of profiles) {
            const partition = this._getPartitionName(profileId);
            console.log(`[PrivacyHandler] Clearing cookies for partition: ${partition}`);

            try {
                const profileSession = session.fromPartition(partition);
                await profileSession.clearStorageData({ storages: ['cookies'] });
                console.log(`[PrivacyHandler] Cookies cleared for ${profileId}`);
                results.push({ profileId, success: true });
            } catch (error) {
                console.error(`[PrivacyHandler] Failed to clear cookies for ${profileId}:`, error);
                results.push({ profileId, success: false, error: error.message });
            }
        }

        const allSuccess = results.every(r => r.success);
        console.log(`[PrivacyHandler] Cookies clearing complete. All success: ${allSuccess}`);
        return { success: allSuccess, results };
    }

    /**
     * Clear site data (localStorage, indexedDB) for specified profiles
     */
    async _clearSiteData(profiles) {
        console.log('[PrivacyHandler] Clearing site data for profiles:', profiles);

        const results = [];
        for (const profileId of profiles) {
            const partition = this._getPartitionName(profileId);
            console.log(`[PrivacyHandler] Clearing site data for partition: ${partition}`);

            try {
                const profileSession = session.fromPartition(partition);
                await profileSession.clearStorageData({
                    storages: ['localstorage', 'indexdb', 'serviceworkers', 'cachestorage']
                });
                console.log(`[PrivacyHandler] Site data cleared for ${profileId}`);
                results.push({ profileId, success: true });
            } catch (error) {
                console.error(`[PrivacyHandler] Failed to clear site data for ${profileId}:`, error);
                results.push({ profileId, success: false, error: error.message });
            }
        }

        const allSuccess = results.every(r => r.success);
        console.log(`[PrivacyHandler] Site data clearing complete. All success: ${allSuccess}`);
        return { success: allSuccess, results };
    }

    /**
     * Clear session data (tabs) for specified profiles from session.json
     */
    async _clearSessions(profiles) {
        console.log('[PrivacyHandler] Clearing session data for profiles:', profiles);

        try {
            const sessionFile = path.join(app.getPath('userData'), 'session.json');

            if (!fs.existsSync(sessionFile)) {
                console.log('[PrivacyHandler] No session file found');
                return { success: true, message: 'No session data to clear' };
            }

            const data = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
            const originalCount = data.tabs?.length || 0;

            // Filter out tabs belonging to the specified profiles
            if (data.tabs) {
                data.tabs = data.tabs.filter(tab => !profiles.includes(tab.profileId));
            }

            // Update last active tab mappings
            if (data.lastActiveTabByProfile) {
                profiles.forEach(profileId => {
                    delete data.lastActiveTabByProfile[profileId];
                });
            }

            fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2));

            const removedCount = originalCount - (data.tabs?.length || 0);
            console.log(`[PrivacyHandler] Session data cleared. Removed ${removedCount} tabs for specified profiles`);

            return { success: true, removedTabs: removedCount };
        } catch (error) {
            console.error('[PrivacyHandler] Failed to clear session data:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Clear ALL data for specified profiles (nuclear option)
     */
    async _clearAll(profiles) {
        console.log('[PrivacyHandler] NUCLEAR OPTION - Clearing ALL data for profiles:', profiles);

        const results = {
            cache: await this._clearCache(profiles),
            cookies: await this._clearCookies(profiles),
            siteData: await this._clearSiteData(profiles),
            sessions: await this._clearSessions(profiles)
        };

        const allSuccess = Object.values(results).every(r => r.success);
        console.log(`[PrivacyHandler] Nuclear option complete. All success: ${allSuccess}`);
        console.log('[PrivacyHandler] Results:', JSON.stringify(results, null, 2));

        return { success: allSuccess, results };
    }

    /**
     * Clear all partition data for a single profile (used during profile deletion)
     */
    async clearProfileData(profileId) {
        console.log(`[PrivacyHandler] Clearing all data for profile: ${profileId}`);
        return await this._clearAll([profileId]);
    }
}

module.exports = PrivacyHandlers;
