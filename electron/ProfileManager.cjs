class ProfileManager {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.profiles = new Map();
        this.loadProfiles();
    }

    loadProfiles() {
        // Clear old data first to remove deleted profiles
        this.profiles.clear();
        const profiles = this.settingsManager.getProfiles();
        profiles.forEach(p => {
            this.profiles.set(p.id, p);
        });
    }

    addProfile(id, name, icon) {
        // Update local map
        const newProfile = { id, name, icon };
        this.profiles.set(id, newProfile);

        // Update settings
        const currentSettings = this.settingsManager.getSettings();
        const updatedProfiles = [...currentSettings.profiles, newProfile];
        this.settingsManager.saveSettings({ profiles: updatedProfiles });

        return newProfile;
    }

    getProfile(id) {
        return this.profiles.get(id);
    }

    getAllProfiles() {
        // Always return fresh list from settings or sync map
        // For now, map should be in sync
        return Array.from(this.profiles.values());
    }

    getPartitionName(profileId) {
        return `persist:${profileId}`;
    }
}

module.exports = ProfileManager;
