import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import type { Settings, Profile, AIProvider, PerformanceSettings, GeneralSettings } from './types';

/**
 * Manages application settings persistence and retrieval
 */
class SettingsManager {
    private userDataPath: string;
    private settingsPath: string;
    private settings: Settings;

    constructor() {
        this.userDataPath = app.getPath('userData');
        this.settingsPath = path.join(this.userDataPath, 'settings.json');
        this.settings = this.loadSettings();
    }

    getDefaultSettings(): Settings {
        return {
            profiles: [
                { id: 'work', name: 'Work', icon: 'briefcase', color: '#3b82f6' },
                { id: 'personal', name: 'Personal', icon: 'home', color: '#10b981' }
            ],
            defaultProfileId: 'work',
            aiProviders: [
                {
                    id: 'perplexity',
                    name: 'Perplexity',
                    url: 'https://www.perplexity.ai',
                    icon: 'https://www.perplexity.ai/favicon.ico',
                    color: '#191A1A'
                },
                {
                    id: 'gemini',
                    name: 'Gemini',
                    url: 'https://gemini.google.com',
                    icon: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
                    color: '#000000'
                },
                {
                    id: 'chatgpt',
                    name: 'ChatGPT',
                    url: 'https://chatgpt.com',
                    icon: 'https://cdn.oaistatic.com/assets/favicon-miwirzcz.ico',
                    color: '#212121'
                },
                {
                    id: 'claude',
                    name: 'Claude',
                    url: 'https://claude.ai',
                    icon: 'https://claude.ai/favicon.ico',
                    color: '#262624'
                },
                {
                    id: 'grok',
                    name: 'Grok',
                    url: 'https://grok.com',
                    icon: 'https://grok.com/favicon.ico',
                    color: '#000000'
                },
                {
                    id: 'kling',
                    name: 'Kling AI',
                    url: 'https://app.klingai.com',
                    icon: 'https://app.klingai.com/favicon.ico',
                    color: '#1a1a2e'
                },
                {
                    id: 'firefly',
                    name: 'Adobe Firefly',
                    url: 'https://www.adobe.com/products/firefly.html',
                    icon: 'https://www.adobe.com/favicon.ico',
                    color: '#1a0a0a'
                },
                {
                    id: 'flux',
                    name: 'Flux',
                    url: 'https://flux1.ai/',
                    icon: 'https://flux1.ai/favicon.ico',
                    color: '#0a0a0a'
                },
                {
                    id: 'leonardo',
                    name: 'Leonardo',
                    url: 'https://leonardo.ai/',
                    icon: 'https://leonardo.ai/favicon.ico',
                    color: '#1a1a2e'
                },
                {
                    id: 'runway',
                    name: 'Runway',
                    url: 'https://runwayml.com/',
                    icon: 'https://runwayml.com/favicon.ico',
                    color: '#0f0f0f'
                },
                {
                    id: 'luma',
                    name: 'Luma',
                    url: 'https://lumalabs.ai/',
                    icon: 'https://lumalabs.ai/favicon.ico',
                    color: '#0a0a0a'
                },
                {
                    id: 'heygen',
                    name: 'HeyGen',
                    url: 'https://www.heygen.com/',
                    icon: 'https://www.heygen.com/favicon.ico',
                    color: '#1a1a2e'
                },
                {
                    id: 'elevenlabs',
                    name: 'ElevenLabs',
                    url: 'https://elevenlabs.io/',
                    icon: 'https://elevenlabs.io/favicon.ico',
                    color: '#0f0f0f'
                },
                {
                    id: 'udio',
                    name: 'Udio',
                    url: 'https://www.udio.com/',
                    icon: 'https://www.udio.com/favicon.ico',
                    color: '#1a1a1a'
                },
                {
                    id: 'suno',
                    name: 'Suno',
                    url: 'https://suno.com/home',
                    icon: 'https://suno.com/favicon.ico',
                    color: '#0a0a0a'
                }
            ],
            defaultProviderId: 'perplexity',
            performance: {
                tabLoadingStrategy: 'lastActiveOnly',
                autoSuspendEnabled: true,
                autoSuspendMinutes: 30,
                profileSwitchBehavior: 'keep',
                excludeActiveProfile: false,
                // Tray optimization settings
                suspendOnHide: true,
                keepLastActiveTab: true,
                suspendDelaySeconds: 5
            },
            general: {
                hardwareAcceleration: true,
                rememberWindowPosition: true,
                launchAtStartup: false,
                alwaysOnTop: false,
                alwaysOnTopShortcut: 'CommandOrControl+Shift+A',
                minimizeToTray: false,
                showTrayIcon: false,
                hideShortcut: 'CommandOrControl+Shift+M'
            },
            security: {
                downloadsEnabled: true,    // Enabled for AI-generated content
                popupsEnabled: true,       // Enabled for OAuth flows
                mediaPolicyAsk: true,      // Ask for camera/mic (voice mode)
                downloadLocation: app.getPath('downloads'), // Default to system Downloads
                askWhereToSave: false      // Don't ask by default, save directly
            },
            adBlock: {
                enabled: true,             // ON by default - works out of box
                blockAds: true,            // Block advertisements
                blockTrackers: true,       // Block tracking scripts
                blockAnnoyances: true,     // Block cookie banners, etc.
                whitelist: []              // No sites exempt by default
            }
        };
    }

    loadSettings(): Settings {
        try {
            if (fs.existsSync(this.settingsPath)) {
                const data = JSON.parse(fs.readFileSync(this.settingsPath, 'utf-8')) as Partial<Settings>;
                const defaults = this.getDefaultSettings();

                // Deep merge/Backfill for providers to ensure they get the new 'color' field
                if (data.aiProviders) {
                    data.aiProviders = data.aiProviders.map((p: AIProvider) => {
                        const defaultP = defaults.aiProviders.find(dp => dp.id === p.id);
                        return {
                            ...(defaultP ? { color: defaultP.color } : { color: '#191A1A' }),
                            ...p
                        };
                    });
                }

                // Migrate old emoji-based profiles to new icon system
                if (data.profiles) {
                    data.profiles = data.profiles.map((p: Profile) => {
                        // If profile has old emoji format, migrate to new icon format
                        if (typeof p.icon === 'string' && /[\u{1F300}-\u{1F9FF}]/u.test(p.icon)) {
                            // Map common emojis to icon names
                            const emojiToIcon: Record<string, { icon: string; color: string }> = {
                                '💼': { icon: 'briefcase', color: '#3b82f6' },
                                '🏠': { icon: 'home', color: '#10b981' },
                                '👤': { icon: 'user', color: '#6366f1' },
                                '⚡': { icon: 'zap', color: '#eab308' },
                                '💻': { icon: 'code', color: '#8b5cf6' },
                                '🌐': { icon: 'globe', color: '#06b6d4' }
                            };
                            const mapped = emojiToIcon[p.icon] || { icon: 'user', color: '#6366f1' };
                            return {
                                ...p,
                                icon: mapped.icon,
                                color: p.color || mapped.color
                            };
                        }
                        // Ensure color field exists for already-migrated profiles
                        if (!p.color) {
                            return { ...p, color: '#3b82f6' };
                        }
                        return p;
                    });
                }

                return { ...defaults, ...data } as Settings;
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }

        // If no file or error, return defaults and save them
        const defaults = this.getDefaultSettings();
        this.saveSettings(defaults);
        return defaults;
    }

    saveSettings(newSettings: Partial<Settings>): boolean {
        try {
            this.settings = { ...this.settings, ...newSettings };
            fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
            return true;
        } catch (e) {
            console.error('Failed to save settings:', e);
            return false;
        }
    }

    getSettings(): Settings {
        return this.settings;
    }

    getProfiles(): Profile[] {
        return this.settings.profiles;
    }

    getProviders(): AIProvider[] {
        return this.settings.aiProviders;
    }

    async fetchFaviconAsDataUrl(url: string): Promise<string | null> {
        try {
            const urlObj = new URL(url);
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;

            const response = await fetch(faviconUrl);
            if (!response.ok) throw new Error('Failed to fetch favicon');

            const buffer = await response.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');

            // Determine mime type (Google usually returns PNG)
            const contentType = response.headers.get('content-type') || 'image/png';

            return `data:${contentType};base64,${base64}`;
        } catch (err) {
            console.warn(`Failed to fetch favicon for ${url}:`, (err as Error).message);
            return null;
        }
    }

    async ensureProvidersFavicons(): Promise<void> {
        // Fetch favicons for any providers that don't have them
        let updated = false;

        for (const provider of this.settings.aiProviders) {
            if (!provider.faviconDataUrl) {
                console.log(`Fetching favicon for ${provider.name}...`);
                provider.faviconDataUrl = await this.fetchFaviconAsDataUrl(provider.url) ?? undefined;
                updated = true;
            }
        }

        if (updated) {
            this.saveSettings(this.settings);
        }
    }

    getDefaultProviderId(): string {
        return this.settings.defaultProviderId || 'perplexity';
    }
}

export default SettingsManager;
