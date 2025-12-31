class ProfileManager {
    constructor() {
        this.profiles = new Map();
        this.addProfile('work', 'Work', '💼');
        this.addProfile('personal', 'Personal', '🏠');
    }

    addProfile(id, name, icon) {
        this.profiles.set(id, { id, name, icon });
    }

    getProfile(id) {
        return this.profiles.get(id);
    }

    getAllProfiles() {
        return Array.from(this.profiles.values());
    }

    getPartitionName(profileId) {
        return `persist:${profileId}`;
    }
}

module.exports = ProfileManager;
