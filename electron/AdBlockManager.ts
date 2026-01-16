import { ElectronBlocker } from '@ghostery/adblocker-electron';
import { session, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type SettingsManager from './SettingsManager';
import type { AdBlockSettings, AdBlockStatus, FilterListInfo } from './types';

/**
 * Built-in filter lists with human-readable names
 * These are the same lists as Ghostery's fullLists, but with names for transparency
 */
const BUILT_IN_LISTS: { name: string; url: string }[] = [
    { name: 'EasyList', url: 'https://easylist.to/easylist/easylist.txt' },
    { name: 'EasyPrivacy', url: 'https://easylist.to/easylist/easyprivacy.txt' },
    { name: 'EasyList Cookie', url: 'https://easylist-downloads.adblockplus.org/easylist-cookie.txt' },
    { name: 'Peter Lowe\'s List', url: 'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=adblockplus&showintro=1&mimetype=plaintext' },
    { name: 'uBlock Filters', url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt' },
    { name: 'uBlock Privacy', url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt' },
    { name: 'uBlock Badware', url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt' },
    { name: 'uBlock Quick Fixes', url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/quick-fixes.txt' },
    { name: 'uBlock Annoyances', url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances-others.txt' },
    { name: 'uBlock Cookies', url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances-cookies.txt' },
];

/**
 * AdBlockManager - Manages the Ghostery ad blocking engine
 * 
 * Features:
 * - Blocks ads, trackers, and annoyances
 * - Caches blocker state for fast startup
 * - Auto-updates filter lists every 24 hours
 * - Per-session blocking (per profile)
 * - Whitelist support
 * - Transparent filter list tracking
 */
class AdBlockManager {
    private blocker: ElectronBlocker | null = null;
    private settingsManager: SettingsManager;
    private blockedCount: number = 0;
    private lastUpdated: string | null = null;
    private cacheFilePath: string;
    private metadataFilePath: string;
    private enabledSessions: Set<string> = new Set();
    private initialized: boolean = false;
    private filterLists: FilterListInfo[] = [];

    // Package version (read from node_modules)
    private version: string = '2.13.2';

    constructor(settingsManager: SettingsManager) {
        this.settingsManager = settingsManager;
        this.cacheFilePath = path.join(app.getPath('userData'), 'adblock-cache.bin');
        this.metadataFilePath = path.join(app.getPath('userData'), 'adblock-metadata.json');

        // Try to read version from package
        try {
            const pkgPath = require.resolve('@ghostery/adblocker-electron/package.json');
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            this.version = pkg.version || '2.13.2';
        } catch {
            // Use default version
        }

        // Try to load cached metadata
        this.loadMetadata();

        console.log(`[AdBlock] Manager created - Ghostery Engine v${this.version}`);
    }

    /**
     * Load filter list metadata from cache
     */
    private loadMetadata(): void {
        try {
            if (fs.existsSync(this.metadataFilePath)) {
                const data = JSON.parse(fs.readFileSync(this.metadataFilePath, 'utf-8'));
                this.filterLists = data.filterLists || [];
                this.lastUpdated = data.lastUpdated || null;
            }
        } catch (error) {
            console.warn('[AdBlock] Failed to load metadata:', error);
        }
    }

    /**
     * Save filter list metadata to cache
     */
    private saveMetadata(): void {
        try {
            const data = {
                filterLists: this.filterLists,
                lastUpdated: this.lastUpdated
            };
            fs.writeFileSync(this.metadataFilePath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.warn('[AdBlock] Failed to save metadata:', error);
        }
    }

    /**
     * Parse filter list header to extract version and date
     */
    private parseListHeader(content: string, listName: string): { version: string; lastUpdated: string } {
        let version = 'unknown';
        let lastUpdated = new Date().toISOString();

        // Common header patterns:
        // ! Version: 202401161234
        // ! Last modified: 16 Jan 2024 12:34 UTC
        // ! Updated: 2024-01-16
        const lines = content.split('\n').slice(0, 30); // Check first 30 lines

        for (const line of lines) {
            // Try to find version
            const versionMatch = line.match(/!\s*Version:\s*(\S+)/i);
            if (versionMatch) {
                version = versionMatch[1];
            }

            // Try to find last modified date
            const dateMatch = line.match(/!\s*(Last modified|Updated|Date):\s*(.+)/i);
            if (dateMatch) {
                try {
                    const parsed = new Date(dateMatch[2].trim());
                    if (!isNaN(parsed.getTime())) {
                        lastUpdated = parsed.toISOString();
                    }
                } catch {
                    // Keep default
                }
            }
        }

        return { version, lastUpdated };
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

                // Read last updated timestamp from metadata
                this.loadMetadata();

                console.log('[AdBlock] ✓ Loaded from cache');

                // Check if cache is older than 24 hours, update in background
                const cacheStat = fs.statSync(this.cacheFilePath);
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
     * Fetch fresh filter lists from the internet with metadata tracking
     */
    private async fetchFreshLists(): Promise<void> {
        console.log('[AdBlock] Fetching filter lists...');

        const settings = this.settingsManager.getSettings();
        const customUrls = settings.adBlock?.customListUrls || [];

        // Combine built-in lists with custom lists
        const allLists = [
            ...BUILT_IN_LISTS,
            ...customUrls.map((url, i) => ({ name: `Custom List ${i + 1}`, url }))
        ];

        const listContents: string[] = [];
        const newFilterLists: FilterListInfo[] = [];

        // Fetch each list individually for transparency
        for (const list of allLists) {
            try {
                console.log(`[AdBlock] Fetching: ${list.name}`);
                const response = await fetch(list.url);
                if (!response.ok) {
                    console.warn(`[AdBlock] Failed to fetch ${list.name}: ${response.status}`);
                    continue;
                }

                const content = await response.text();
                listContents.push(content);

                // Parse header for metadata
                const { version, lastUpdated } = this.parseListHeader(content, list.name);
                const ruleCount = content.split('\n').filter(line =>
                    line.trim() && !line.startsWith('!') && !line.startsWith('[')
                ).length;

                newFilterLists.push({
                    name: list.name,
                    url: list.url,
                    version,
                    lastUpdated,
                    ruleCount
                });

                console.log(`[AdBlock] ✓ ${list.name}: ${ruleCount} rules (v${version})`);
            } catch (error) {
                console.warn(`[AdBlock] Error fetching ${list.name}:`, error);
            }
        }

        if (listContents.length === 0) {
            throw new Error('Failed to fetch any filter lists');
        }

        // Create blocker from fetched lists by combining all filter content
        const combinedFilters = listContents.join('\n');
        this.blocker = ElectronBlocker.parse(combinedFilters, {
            enableCompression: true
        });

        // Update metadata
        this.filterLists = newFilterLists;
        this.lastUpdated = new Date().toISOString();

        // Save to cache
        this.saveCache();
        this.saveMetadata();

        const totalRules = newFilterLists.reduce((sum, l) => sum + l.ruleCount, 0);
        console.log(`[AdBlock] ✓ Fresh lists fetched: ${newFilterLists.length} lists, ${totalRules} total rules`);
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
        const totalRules = this.filterLists.reduce((sum, l) => sum + l.ruleCount, 0);
        return {
            enabled: settings.adBlock?.enabled ?? true,
            version: this.version,
            lastUpdated: this.lastUpdated,
            blockedCount: this.blockedCount,
            filterLists: this.filterLists,
            totalRules
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
