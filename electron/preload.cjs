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
    getAllTabs: () => ipcRenderer.invoke('get-all-tabs'),

    // Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    onSettingsUpdated: (callback) => ipcRenderer.on('settings-updated', (e, data) => callback(data)),


    // Navigation
    goBack: () => ipcRenderer.send('nav-back'),
    goForward: () => ipcRenderer.send('nav-forward'),
    reload: () => ipcRenderer.send('nav-reload'),

    // Listeners (React will use these)
    onProfilesLoaded: (callback) => ipcRenderer.on('profiles-loaded', (e, data) => callback(data)),
    onTabCreated: (callback) => ipcRenderer.on('tab-created', (e, data) => callback(data)),
    onTabUpdated: (callback) => ipcRenderer.on('tab-updated', (e, data) => callback(data)),
    onRestoreActive: (callback) => ipcRenderer.on('restore-active', (e, id) => callback(id)),
    onProfileTabsLoaded: (callback) => ipcRenderer.on('profile-tabs-loaded', (e, data) => callback(data)),
    onWindowMaximized: (callback) => ipcRenderer.on('window-maximized', (e, isMax) => callback(isMax)),
    onRequestCloseTab: (callback) => ipcRenderer.on('request-close-tab', (e, id) => callback(id)),
    onTabClosedBackend: (callback) => ipcRenderer.on('tab-closed-backend', (e, id) => callback(id)),
    onSwitchProfileRequest: (callback) => ipcRenderer.on('switch-profile-request', (e, id) => callback(id)),
    onOpenSettingsModal: (callback) => ipcRenderer.on('open-settings-modal', (e) => callback()),

    // Context Menu
    showContextMenu: (tabId) => ipcRenderer.send('show-context-menu', { tabId }),
    showProfileMenu: (x, y, activeProfileId) => ipcRenderer.send('show-profile-menu', { x, y, activeProfileId }),
    showNewTabMenu: (x, y, profileId) => ipcRenderer.send('show-new-tab-menu', { x, y, profileId })
});
