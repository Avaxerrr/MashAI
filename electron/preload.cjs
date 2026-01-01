const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Window Controls
    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow: () => ipcRenderer.send('window-close'),
    hideWebView: () => ipcRenderer.send('hide-webview'),
    showWebView: () => ipcRenderer.send('show-webview'),

    // Tab Actions
    createTab: (profileId) => ipcRenderer.send('create-tab', profileId),
    createTabWithUrl: (profileId, url) => ipcRenderer.send('create-tab-with-url', { profileId, url }),
    switchTab: (tabId) => ipcRenderer.send('switch-tab', tabId),
    closeTab: (tabId) => ipcRenderer.send('close-tab', tabId),
    duplicateTab: (tabId) => ipcRenderer.send('duplicate-tab', tabId),
    reloadTab: (tabId) => ipcRenderer.send('reload-tab', tabId),
    reopenClosedTab: () => ipcRenderer.send('reopen-closed-tab'),
    closeOtherTabs: (tabId, profileId) => ipcRenderer.send('close-other-tabs', { tabId, profileId }),
    closeTabsToRight: (tabId, profileId) => ipcRenderer.send('close-tabs-to-right', { tabId, profileId }),
    reorderTabs: (tabOrder) => ipcRenderer.send('reorder-tabs', tabOrder),

    // Profile
    getProfileTabs: (profileId) => ipcRenderer.send('get-profile-tabs', profileId),
    switchProfile: (toProfileId) => ipcRenderer.send('switch-profile', { toProfileId }),
    getAllTabs: () => ipcRenderer.invoke('get-all-tabs'),

    // Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    onSettingsUpdated: (callback) => {
        const handler = (e, data) => callback(data);
        ipcRenderer.on('settings-updated', handler);
        return () => ipcRenderer.removeListener('settings-updated', handler);
    },

    // Memory Usage
    getMemoryUsage: () => ipcRenderer.invoke('get-memory-usage'),
    getAllTabsMemory: () => ipcRenderer.invoke('get-all-tabs-memory'),


    // Navigation
    goBack: () => ipcRenderer.send('nav-back'),
    goForward: () => ipcRenderer.send('nav-forward'),
    reload: () => ipcRenderer.send('nav-reload'),

    // Listeners (React will use these) - Each returns a cleanup function
    onProfilesLoaded: (callback) => {
        const handler = (e, data) => callback(data);
        ipcRenderer.on('profiles-loaded', handler);
        return () => ipcRenderer.removeListener('profiles-loaded', handler);
    },
    onTabCreated: (callback) => {
        const handler = (e, data) => callback(data);
        ipcRenderer.on('tab-created', handler);
        return () => ipcRenderer.removeListener('tab-created', handler);
    },
    onTabUpdated: (callback) => {
        const handler = (e, data) => callback(data);
        ipcRenderer.on('tab-updated', handler);
        return () => ipcRenderer.removeListener('tab-updated', handler);
    },
    onTabLoading: (callback) => {
        const handler = (e, data) => callback(data);
        ipcRenderer.on('tab-loading', handler);
        return () => ipcRenderer.removeListener('tab-loading', handler);
    },
    onRestoreActive: (callback) => {
        const handler = (e, id) => callback(id);
        ipcRenderer.on('restore-active', handler);
        return () => ipcRenderer.removeListener('restore-active', handler);
    },
    onProfileTabsLoaded: (callback) => {
        const handler = (e, data) => callback(data);
        ipcRenderer.on('profile-tabs-loaded', handler);
        return () => ipcRenderer.removeListener('profile-tabs-loaded', handler);
    },
    onWindowMaximized: (callback) => {
        const handler = (e, isMax) => callback(isMax);
        ipcRenderer.on('window-maximized', handler);
        return () => ipcRenderer.removeListener('window-maximized', handler);
    },
    onRequestCloseTab: (callback) => {
        const handler = (e, id) => callback(id);
        ipcRenderer.on('request-close-tab', handler);
        return () => ipcRenderer.removeListener('request-close-tab', handler);
    },
    onTabClosedBackend: (callback) => {
        const handler = (e, id) => callback(id);
        ipcRenderer.on('tab-closed-backend', handler);
        return () => ipcRenderer.removeListener('tab-closed-backend', handler);
    },
    onSwitchProfileRequest: (callback) => {
        const handler = (e, id) => callback(id);
        ipcRenderer.on('switch-profile-request', handler);
        return () => ipcRenderer.removeListener('switch-profile-request', handler);
    },
    onOpenSettingsModal: (callback) => {
        const handler = (e) => callback();
        ipcRenderer.on('open-settings-modal', handler);
        return () => ipcRenderer.removeListener('open-settings-modal', handler);
    },
    onActiveProfileChanged: (callback) => {
        const handler = (e, profileId) => callback(profileId);
        ipcRenderer.on('active-profile-changed', handler);
        return () => ipcRenderer.removeListener('active-profile-changed', handler);
    },

    // Context Menu
    showContextMenu: (tabId) => ipcRenderer.send('show-context-menu', { tabId }),
    showProfileMenu: (x, y, activeProfileId) => ipcRenderer.send('show-profile-menu', { x, y, activeProfileId }),
    showNewTabMenu: (x, y, profileId) => ipcRenderer.send('show-new-tab-menu', { x, y, profileId })
});

