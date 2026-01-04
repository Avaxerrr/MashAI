import { ipcMain, session, shell, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type SessionManager from '../SessionManager';
import type TabManager from '../TabManager';

interface PrivacyDependencies {
    sessionManager: SessionManager;
    tabManager: TabManager;
}

interface ClearPrivacyOptions {
    profiles: string[];
    dataType: 'cache' | 'cookies' | 'siteData' | 'all';
}

interface ClearResult {
    success: boolean;
    error?: string;
    results?: Array<{ profileId: string; success: boolean; error?: string }>;
    message?: string;
    removedTabs?: number;
}

/**
 * PrivacyHandlers - Handles privacy and data clearing operations
 */
class PrivacyHandlers {
    private sessionManager: SessionManager;
    private tabManager: TabManager;

    constructor(dependencies: PrivacyDependencies) {
        this.sessionManager = dependencies.sessionManager;
        this.tabManager = dependencies.tabManager;
    }

    /**
     * Register all privacy-related IPC handlers
     */
    register(): void {
        // Main privacy data clearing handler
        ipcMain.handle('clear-privacy-data', async (event, options: ClearPrivacyOptions): Promise<ClearResult> => {
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
                    case 'all':
                        return await this._clearAll(profiles);
                    default:
                        console.log('[PrivacyHandler] Unknown data type:', dataType);
                        return { success: false, error: 'Unknown data type' };
                }
            } catch (error) {
                console.error('[PrivacyHandler] Error clearing data:', error);
                return { success: false, error: (error as Error).message };
            }
        });

        // Open external link handler
        ipcMain.handle('open-external', async (event, url: string) => {
            console.log('[PrivacyHandler] Opening external URL:', url);
            try {
                await shell.openExternal(url);
                return { success: true };
            } catch (error) {
                console.error('[PrivacyHandler] Error opening external link:', error);
                return { success: false, error: (error as Error).message };
            }
        });

        console.log('[PrivacyHandler] Handlers registered');
    }

    /**
     * Get the partition name for a profile
     */
    private _getPartitionName(profileId: string): string {
        return `persist:${profileId}`;
    }

    /**
     * Clear cache for specified profiles
     */
    private async _clearCache(profiles: string[]): Promise<ClearResult> {
        console.log('[PrivacyHandler] Clearing cache for profiles:', profiles);

        const results: Array<{ profileId: string; success: boolean; error?: string }> = [];
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
                results.push({ profileId, success: false, error: (error as Error).message });
            }
        }

        const allSuccess = results.every(r => r.success);
        console.log(`[PrivacyHandler] Cache clearing complete. All success: ${allSuccess}`);
        return { success: allSuccess, results };
    }

    /**
     * Clear cookies for specified profiles
     */
    private async _clearCookies(profiles: string[]): Promise<ClearResult> {
        console.log('[PrivacyHandler] Clearing cookies for profiles:', profiles);

        const results: Array<{ profileId: string; success: boolean; error?: string }> = [];
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
                results.push({ profileId, success: false, error: (error as Error).message });
            }
        }

        const allSuccess = results.every(r => r.success);
        console.log(`[PrivacyHandler] Cookies clearing complete. All success: ${allSuccess}`);
        return { success: allSuccess, results };
    }

    /**
     * Clear site data (localStorage, indexedDB) for specified profiles
     */
    private async _clearSiteData(profiles: string[]): Promise<ClearResult> {
        console.log('[PrivacyHandler] Clearing site data for profiles:', profiles);

        const results: Array<{ profileId: string; success: boolean; error?: string }> = [];
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
                results.push({ profileId, success: false, error: (error as Error).message });
            }
        }

        const allSuccess = results.every(r => r.success);
        console.log(`[PrivacyHandler] Site data clearing complete. All success: ${allSuccess}`);
        return { success: allSuccess, results };
    }

    /**
     * Clear session data (tabs) for specified profiles from session.json
     */
    private async _clearSessions(profiles: string[]): Promise<ClearResult> {
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
                data.tabs = data.tabs.filter((tab: { profileId: string }) => !profiles.includes(tab.profileId));
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
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Clear ALL data for specified profiles (nuclear option)
     */
    private async _clearAll(profiles: string[]): Promise<ClearResult> {
        console.log('[PrivacyHandler] Clearing ALL data for profiles:', profiles);

        const results = {
            cache: await this._clearCache(profiles),
            cookies: await this._clearCookies(profiles),
            siteData: await this._clearSiteData(profiles)
        };

        const allSuccess = Object.values(results).every(r => r.success);
        console.log(`[PrivacyHandler] Clear all complete. All success: ${allSuccess}`);

        return { success: allSuccess };
    }

    /**
     * Clear all partition data for a single profile (used during profile deletion)
     */
    async clearProfileData(profileId: string): Promise<ClearResult> {
        console.log(`[PrivacyHandler] Clearing all data for profile: ${profileId}`);
        return await this._clearAll([profileId]);
    }
}

export default PrivacyHandlers;
