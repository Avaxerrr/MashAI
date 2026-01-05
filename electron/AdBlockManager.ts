import { ElectronBlocker, fullLists } from '@ghostery/adblocker-electron';
import { session, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type SettingsManager from './SettingsManager';
import type { AdBlockSettings, AdBlockStatus } from './types';

/**
 * AdBlockManager - Manages the Ghostery ad blocking engine
 * 
 * Features:
 * - Blocks ads, trackers, and annoyances
 * - Caches blocker state for fast startup
 * - Auto-updates filter lists every 24 hours
 * - Per-session blocking (per profile)
 * - Whitelist support
 */
class AdBlockManager {
    private blocker: ElectronBlocker | null = null;
    private settingsManager: SettingsManager;
    private blockedCount: number = 0;
    private lastUpdated: string | null = null;
    private cacheFilePath: string;
    private enabledSessions: Set<string> = new Set();
    private initialized: boolean = false;

    // Package version (read from node_modules)
    private version: string = '2.13.2';

    constructor(settingsManager: SettingsManager) {
        this.settingsManager = settingsManager;
        this.cacheFilePath = path.join(app.getPath('userData'), 'adblock-cache.bin');

        // Try to read version from package
        try {
            const pkgPath = require.resolve('@ghostery/adblocker-electron/package.json');
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            this.version = pkg.version || '2.13.2';
        } catch {
            // Use default version
        }

        console.log(`[AdBlock] Manager created - Ghostery Engine v${this.version}`);
    }

    /**
     * Initialize the ad blocker engine
     * Loads from cache if available, otherwise fetches fresh lists
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            console.log('[AdBlock] Already initialized');
            return;
        }

        const settings = this.settingsManager.getSettings();
        const adBlockSettings = settings.adBlock;

        // Always initialize the blocker engine, even if disabled
        // This ensures it's ready when user enables ad blocking later
        console.log(`[AdBlock] Initializing... (${adBlockSettings?.enabled ? 'enabled' : 'disabled in settings'})`);

        try {
            // Try to load from cache first for fast startup
            if (fs.existsSync(this.cacheFilePath)) {
                console.log('[AdBlock] Loading from cache...');
                const cacheData = fs.readFileSync(this.cacheFilePath);
                this.blocker = ElectronBlocker.deserialize(cacheData);

                // Read last updated timestamp
                const cacheStat = fs.statSync(this.cacheFilePath);
                this.lastUpdated = cacheStat.mtime.toISOString();

                console.log('[AdBlock] ✓ Loaded from cache');

                // Check if cache is older than 24 hours, update in background
                const cacheAge = Date.now() - cacheStat.mtime.getTime();
                const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
                if (cacheAge > TWENTY_FOUR_HOURS) {
                    console.log('[AdBlock] Cache is stale, updating in background...');
                    this.updateLists().catch(err => {
                        console.warn('[AdBlock] Background update failed:', err.message);
                    });
                }
            } else {
                // No cache, fetch fresh lists
                console.log('[AdBlock] No cache found, fetching fresh lists...');
                await this.fetchFreshLists();
            }

            this.initialized = true;
            console.log(`[AdBlock] ✓ Initialized - Ghostery Engine v${this.version}`);

        } catch (error) {
            console.error('[AdBlock] Failed to initialize:', error);
            // Try fetching fresh lists as fallback
            try {
                await this.fetchFreshLists();
                this.initialized = true;
            } catch (fetchError) {
                console.error('[AdBlock] Failed to fetch lists:', fetchError);
            }
        }
    }

    /**
     * Fetch fresh filter lists from the internet
     */
    private async fetchFreshLists(): Promise<void> {
        console.log('[AdBlock] Fetching filter lists...');

        this.blocker = await ElectronBlocker.fromLists(fetch, fullLists, {
            enableCompression: true
        });

        this.lastUpdated = new Date().toISOString();

        // Save to cache
        this.saveCache();

        console.log('[AdBlock] ✓ Fresh lists fetched and cached');
    }

    /**
     * Save blocker state to cache file
     */
    private saveCache(): void {
        if (!this.blocker) return;

        try {
            const serialized = this.blocker.serialize();
            fs.writeFileSync(this.cacheFilePath, Buffer.from(serialized));
            console.log('[AdBlock] Cache saved');
        } catch (error) {
            console.warn('[AdBlock] Failed to save cache:', error);
        }
    }

    /**
     * Manually update filter lists
     */
    async updateLists(): Promise<void> {
        console.log('[AdBlock] Updating filter lists...');
        await this.fetchFreshLists();

        // Re-enable for all active sessions
        for (const partitionName of this.enabledSessions) {
            this._enableForPartition(partitionName);
        }

        console.log('[AdBlock] ✓ Filter lists updated');
    }

    /**
     * Enable ad blocking for a specific profile session
     */
    enableForSession(profileId: string): void {
        if (!this.blocker) {
            console.warn('[AdBlock] Cannot enable - blocker not initialized');
            return;
        }

        const settings = this.settingsManager.getSettings();
        if (!settings.adBlock?.enabled) {
            return;
        }

        const partitionName = `persist:${profileId}`;

        if (this.enabledSessions.has(partitionName)) {
            return; // Already enabled
        }

        this._enableForPartition(partitionName);
        this.enabledSessions.add(partitionName);
    }

    /**
     * Internal: Enable blocking for a specific partition
     */
    private _enableForPartition(partitionName: string): void {
        if (!this.blocker) return;

        const ses = session.fromPartition(partitionName);

        // Enable request blocking with callback for logging
        // Wrap in try-catch for Electron version compatibility (registerPreloadScript was added in v34)
        try {
            this.blocker.enableBlockingInSession(ses);
            console.log(`[AdBlock] ✓ Enabled for session: ${partitionName}`);
        } catch (error) {
            console.warn(`[AdBlock] ⚠ Could not enable blocking for ${partitionName}:`, (error as Error).message);
            console.warn('[AdBlock] This may be due to Electron version < 34. Ad blocking will have limited functionality.');
            return; // Don't set up event listeners if blocking failed
        }

        // Set up blocked request callback for logging/counting (only once per partition)
        if (!this.enabledSessions.has(partitionName + ':events')) {
            this.enabledSessions.add(partitionName + ':events');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.blocker.on('request-blocked', (request: any) => {
                this.blockedCount++;

                // Debug: Log what's actually in the request object
                if (this.blockedCount <= 3) {
                    console.log('[AdBlock] Request object keys:', Object.keys(request));
                    console.log('[AdBlock] Request webContentsId:', request.webContentsId);
                }



                // Check whitelist - if whitelisted, don't count
                const settings = this.settingsManager.getSettings();
                if (this.isWhitelisted(request.url, settings.adBlock?.whitelist || [])) {
                    this.blockedCount--; // Undo count

                    return;
                }

                // Log blocked requests (for debugging)
                if (this.blockedCount % 10 === 0 || this.blockedCount <= 5) {
                    console.log(`[AdBlock] 🚫 BLOCKED (#${this.blockedCount}): ${this.truncateUrl(request.url)}`);
                }
            });
        }
    }

    /**
     * Disable ad blocking for a specific profile session
     */
    disableForSession(profileId: string): void {
        const partitionName = `persist:${profileId}`;

        if (!this.enabledSessions.has(partitionName)) {
            return;
        }

        if (this.blocker) {
            const ses = session.fromPartition(partitionName);
            this.blocker.disableBlockingInSession(ses);
        }

        this.enabledSessions.delete(partitionName);
        console.log(`[AdBlock] Disabled for session: ${partitionName}`);
    }

    /**
     * Check if a URL is whitelisted
     */
    isWhitelisted(url: string, whitelist: string[]): boolean {
        if (!whitelist || whitelist.length === 0) return false;

        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();

            return whitelist.some(domain => {
                const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');
                const normalizedHostname = hostname.replace(/^www\./, '');
                return normalizedHostname === normalizedDomain ||
                    normalizedHostname.endsWith('.' + normalizedDomain);
            });
        } catch {
            return false;
        }
    }

    /**
     * Get cosmetic filters CSS for a URL
     * Used for hiding ad elements on the page
     */
    getCosmeticFilters(url: string): string | null {
        if (!this.blocker) return null;

        const settings = this.settingsManager.getSettings();
        if (!settings.adBlock?.enabled) return null;

        // Check whitelist
        if (this.isWhitelisted(url, settings.adBlock?.whitelist || [])) {
            return null;
        }

        try {
            const cosmetics = this.blocker.getCosmeticsFilters({
                url,
                hostname: new URL(url).hostname,
                domain: new URL(url).hostname
            });

            if (cosmetics.styles && cosmetics.styles.length > 0) {
                console.log(`[AdBlock] 💉 Injecting ${cosmetics.styles.split(',').length} cosmetic rules for ${this.truncateUrl(url)}`);
                return cosmetics.styles;
            }
        } catch (error) {
            // Silently fail for cosmetic filtering
        }

        return null;
    }

    /**
     * Get current ad blocker status
     */
    getStatus(): AdBlockStatus {
        const settings = this.settingsManager.getSettings();
        return {
            enabled: settings.adBlock?.enabled ?? true,
            version: this.version,
            lastUpdated: this.lastUpdated,
            blockedCount: this.blockedCount
        };
    }



    /**
     * Check if ad blocking is enabled
     */
    isEnabled(): boolean {
        const settings = this.settingsManager.getSettings();
        return settings.adBlock?.enabled ?? true;
    }

    /**
     * Truncate URL for logging
     */
    private truncateUrl(url: string): string {
        if (url.length > 80) {
            return url.substring(0, 77) + '...';
        }
        return url;
    }

    /**
     * Handle settings changes
     * @param newSettings - The new settings being applied
     * @param wasEnabled - Whether ad blocking was enabled BEFORE the settings were saved
     */
    async onSettingsChanged(newSettings: { adBlock?: AdBlockSettings }, wasEnabled: boolean): Promise<void> {
        if (!newSettings.adBlock) return;

        const isNowEnabled = newSettings.adBlock.enabled;
        console.log(`[AdBlock] Settings changed: wasEnabled=${wasEnabled}, isNowEnabled=${isNowEnabled}`);

        if (wasEnabled && !isNowEnabled) {
            // Disable all sessions (filter out :events entries)
            for (const partitionName of this.enabledSessions) {
                if (partitionName.includes(':events')) continue;
                if (this.blocker) {
                    const ses = session.fromPartition(partitionName);
                    this.blocker.disableBlockingInSession(ses);
                    console.log(`[AdBlock] Disabled for session: ${partitionName}`);
                }
            }
            console.log('[AdBlock] Disabled');
        } else if (!wasEnabled && isNowEnabled) {
            // Re-enable all sessions (filter out :events entries)
            for (const partitionName of this.enabledSessions) {
                if (partitionName.includes(':events')) continue;
                this._enableForPartition(partitionName);
            }
            console.log('[AdBlock] Enabled');
        }
    }
}

export default AdBlockManager;
