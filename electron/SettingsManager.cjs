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
                { id: 'work', name: 'Work', icon: '💼' },
                { id: 'personal', name: 'Personal', icon: '🏠' }
            ],
            defaultProfileId: 'work',
            aiProviders: [
                {
                    id: 'perplexity',
                    name: 'Perplexity',
                    url: 'https://www.perplexity.ai',
                    icon: 'perplexity' // specific mapping or generic
                },
                {
                    id: 'gemini',
                    name: 'Gemini',
                    url: 'https://gemini.google.com',
                    icon: 'google'
                },
                {
                    id: 'chatgpt',
                    name: 'ChatGPT',
                    url: 'https://chatgpt.com',
                    icon: 'openai'
                },
                {
                    id: 'claude',
                    name: 'Claude',
                    url: 'https://claude.ai',
                    icon: 'anthropic'
                },
                {
                    id: 'grok',
                    name: 'Grok',
                    url: 'https://grok.com',
                    icon: 'x'
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
                return { ...this.getDefaultSettings(), ...data };
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

    getDefaultProviderId() {
        return this.settings.defaultProviderId || 'perplexity';
    }
}

module.exports = SettingsManager;
