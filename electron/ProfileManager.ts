import type { Profile } from './types';
import type SettingsManager from './SettingsManager';

/**
 * Manages user profiles (Work, Personal, etc.)
 */
class ProfileManager {
    private settingsManager: SettingsManager;
    private profiles: Map<string, Profile>;

    constructor(settingsManager: SettingsManager) {
        this.settingsManager = settingsManager;
        this.profiles = new Map();
        this.loadProfiles();
    }

    loadProfiles(): void {
        // Clear old data first to remove deleted profiles
        this.profiles.clear();
        const profiles = this.settingsManager.getProfiles();
        profiles.forEach(p => {
            this.profiles.set(p.id, p);
        });
    }

    addProfile(id: string, name: string, icon: string): Profile {
        // Update local map
        const newProfile: Profile = { id, name, icon, color: '#3b82f6' };
        this.profiles.set(id, newProfile);

        // Update settings
        const currentSettings = this.settingsManager.getSettings();
        const updatedProfiles = [...currentSettings.profiles, newProfile];
        this.settingsManager.saveSettings({ profiles: updatedProfiles });

        return newProfile;
    }

    getProfile(id: string): Profile | undefined {
        return this.profiles.get(id);
    }

    getAllProfiles(): Profile[] {
        // Always return fresh list from settings or sync map
        return Array.from(this.profiles.values());
    }

    getPartitionName(profileId: string): string {
        return `persist:${profileId}`;
    }
}

export default ProfileManager;
