const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class SettingsManager {
    constructor() {
        this.userDataPath = app.getPath('userData');
        this.settingsPath = path.join(this.userDataPath, 'settings.json');
        this.settings = this.loadSettings();
    }

    getDefaultSettings() {
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
                }
            ],
            defaultProviderId: 'perplexity'
        };
    }

    loadSettings() {
        try {
            if (fs.existsSync(this.settingsPath)) {
                const data = JSON.parse(fs.readFileSync(this.settingsPath, 'utf-8'));
                // Merge with defaults to ensure new keys exist if schema changes
                const defaults = this.getDefaultSettings();

                // Deep merge/Backfill for providers to ensure they get the new 'color' field
                // if the user hasn't deleted them.
                if (data.aiProviders) {
                    data.aiProviders = data.aiProviders.map(p => {
                        const defaultP = defaults.aiProviders.find(dp => dp.id === p.id);
                        return {
                            ...(defaultP ? { color: defaultP.color } : { color: '#191A1A' }), // Default or fallback
                            ...p
                        };
                    });
                }

                // Migrate old emoji-based profiles to new icon system
                if (data.profiles) {
                    data.profiles = data.profiles.map(p => {
                        // If profile has old emoji format, migrate to new icon format
                        if (typeof p.icon === 'string' && /[\u{1F300}-\u{1F9FF}]/u.test(p.icon)) {
                            // Map common emojis to icon names
                            const emojiToIcon = {
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

                return { ...defaults, ...data };
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }

        // If no file or error, return defaults and save them
        const defaults = this.getDefaultSettings();
        this.saveSettings(defaults);
        return defaults;
    }

    saveSettings(newSettings) {
        try {
            this.settings = { ...this.settings, ...newSettings };
            fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
            return true;
        } catch (e) {
            console.error('Failed to save settings:', e);
            return false;
        }
    }

    getSettings() {
        return this.settings;
    }

    getProfiles() {
        return this.settings.profiles;
    }

    getProviders() {
        return this.settings.aiProviders;
    }

    async fetchFaviconAsDataUrl(url) {
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
            console.warn(`Failed to fetch favicon for ${url}:`, err.message);
            return null;
        }
    }

    async ensureProvidersFavicons() {
        // Fetch favicons for any providers that don't have them
        let updated = false;

        for (const provider of this.settings.aiProviders) {
            if (!provider.faviconDataUrl) {
                console.log(`Fetching favicon for ${provider.name}...`);
                provider.faviconDataUrl = await this.fetchFaviconAsDataUrl(provider.url);
                updated = true;
            }
        }

        if (updated) {
            this.saveSettings(this.settings);
        }
    }

    getDefaultProviderId() {
        return this.settings.defaultProviderId || 'perplexity';
    }
}

module.exports = SettingsManager;
