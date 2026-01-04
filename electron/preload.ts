import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('api', {
    // Window Controls
    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow: () => ipcRenderer.send('window-close'),
    // Aliases for frontend types
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    hideWebView: () => ipcRenderer.send('hide-webview'),
    showWebView: () => ipcRenderer.send('show-webview'),

    // Tab Actions
    createTab: (profileId: string) => ipcRenderer.send('create-tab', profileId),
    createTabWithUrl: (profileId: string, url: string) => ipcRenderer.send('create-tab-with-url', { profileId, url }),
    switchTab: (tabId: string) => ipcRenderer.send('switch-tab', tabId),
    closeTab: (tabId: string) => ipcRenderer.send('close-tab', tabId),
    duplicateTab: (tabId: string) => ipcRenderer.send('duplicate-tab', tabId),
    reloadTab: (tabId: string) => ipcRenderer.send('reload-tab', tabId),
    reopenClosedTab: () => ipcRenderer.send('reopen-closed-tab'),
    closeOtherTabs: (tabId: string, profileId: string) => ipcRenderer.send('close-other-tabs', { tabId, profileId }),
    closeTabsToRight: (tabId: string, profileId: string) => ipcRenderer.send('close-tabs-to-right', { tabId, profileId }),
    reorderTabs: (tabOrder: string[]) => ipcRenderer.send('reorder-tabs', tabOrder),

    // Profile
    getProfileTabs: (profileId: string) => ipcRenderer.send('get-profile-tabs', profileId),
    switchProfile: (toProfileId: string) => ipcRenderer.send('switch-profile', { toProfileId }),
    getAllTabs: () => ipcRenderer.invoke('get-all-tabs'),

    // Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings: unknown) => ipcRenderer.invoke('save-settings', settings),
    deleteProfile: (profileId: string) => ipcRenderer.invoke('delete-profile', profileId),
    validateShortcut: (shortcut: string) => ipcRenderer.invoke('validate-shortcut', shortcut),
    getActiveProfileId: () => ipcRenderer.invoke('get-active-profile-id'),
    onSettingsUpdated: (callback: (data: unknown) => void) => {
        const handler = (e: IpcRendererEvent, data: unknown) => callback(data);
        ipcRenderer.on('settings-updated', handler);
        return () => ipcRenderer.removeListener('settings-updated', handler);
    },
    onProfileDeleted: (callback: (profileId: string) => void) => {
        const handler = (e: IpcRendererEvent, profileId: string) => callback(profileId);
        ipcRenderer.on('profile-deleted', handler);
        return () => ipcRenderer.removeListener('profile-deleted', handler);
    },

    // Memory Usage
    getMemoryUsage: () => ipcRenderer.invoke('get-memory-usage'),
    getAllTabsMemory: () => ipcRenderer.invoke('get-all-tabs-memory'),

    // Navigation
    goBack: () => ipcRenderer.send('nav-back'),
    goForward: () => ipcRenderer.send('nav-forward'),
    reload: () => ipcRenderer.send('nav-reload'),

    // Listeners (React will use these) - Each returns a cleanup function
    onProfilesLoaded: (callback: (data: unknown) => void) => {
        const handler = (e: IpcRendererEvent, data: unknown) => callback(data);
        ipcRenderer.on('profiles-loaded', handler);
        return () => ipcRenderer.removeListener('profiles-loaded', handler);
    },
    onTabCreated: (callback: (data: unknown) => void) => {
        const handler = (e: IpcRendererEvent, data: unknown) => callback(data);
        ipcRenderer.on('tab-created', handler);
        return () => ipcRenderer.removeListener('tab-created', handler);
    },
    onTabUpdated: (callback: (data: unknown) => void) => {
        const handler = (e: IpcRendererEvent, data: unknown) => callback(data);
        ipcRenderer.on('tab-updated', handler);
        return () => ipcRenderer.removeListener('tab-updated', handler);
    },
    onTabLoading: (callback: (data: unknown) => void) => {
        const handler = (e: IpcRendererEvent, data: unknown) => callback(data);
        ipcRenderer.on('tab-loading', handler);
        return () => ipcRenderer.removeListener('tab-loading', handler);
    },
    onRestoreActive: (callback: (id: string) => void) => {
        const handler = (e: IpcRendererEvent, id: string) => callback(id);
        ipcRenderer.on('restore-active', handler);
        return () => ipcRenderer.removeListener('restore-active', handler);
    },
    onProfileTabsLoaded: (callback: (data: unknown) => void) => {
        const handler = (e: IpcRendererEvent, data: unknown) => callback(data);
        ipcRenderer.on('profile-tabs-loaded', handler);
        return () => ipcRenderer.removeListener('profile-tabs-loaded', handler);
    },
    onWindowMaximized: (callback: (isMax: boolean) => void) => {
        const handler = (e: IpcRendererEvent, isMax: boolean) => callback(isMax);
        ipcRenderer.on('window-maximized', handler);
        return () => ipcRenderer.removeListener('window-maximized', handler);
    },
    onRequestCloseTab: (callback: (id: string) => void) => {
        const handler = (e: IpcRendererEvent, id: string) => callback(id);
        ipcRenderer.on('request-close-tab', handler);
        return () => ipcRenderer.removeListener('request-close-tab', handler);
    },
    onTabClosedBackend: (callback: (id: string) => void) => {
        const handler = (e: IpcRendererEvent, id: string) => callback(id);
        ipcRenderer.on('tab-closed-backend', handler);
        return () => ipcRenderer.removeListener('tab-closed-backend', handler);
    },
    onSwitchProfileRequest: (callback: (id: string) => void) => {
        const handler = (e: IpcRendererEvent, id: string) => callback(id);
        ipcRenderer.on('switch-profile-request', handler);
        return () => ipcRenderer.removeListener('switch-profile-request', handler);
    },
    onOpenSettingsModal: (callback: () => void) => {
        const handler = () => callback();
        ipcRenderer.on('open-settings-modal', handler);
        return () => ipcRenderer.removeListener('open-settings-modal', handler);
    },
    onShowToast: (callback: (data: { message: string; type?: 'success' | 'error' | 'warning' | 'info' }) => void) => {
        const handler = (e: IpcRendererEvent, data: { message: string; type?: 'success' | 'error' | 'warning' | 'info' }) => callback(data);
        ipcRenderer.on('show-toast', handler);
        return () => ipcRenderer.removeListener('show-toast', handler);
    },

    // Context Menu
    showContextMenu: (tabId: string) => ipcRenderer.send('show-context-menu', { tabId }),
    showProfileMenu: (x: number, y: number, activeProfileId: string) => ipcRenderer.send('show-profile-menu', { x, y, activeProfileId }),
    showNewTabMenu: (x: number, y: number, profileId: string) => ipcRenderer.send('show-new-tab-menu', { x, y, profileId }),

    // Privacy & Data Management
    clearPrivacyData: (options: unknown) => ipcRenderer.invoke('clear-privacy-data', options),

    // External Links
    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

    // Downloads
    getDownloads: () => ipcRenderer.invoke('get-downloads'),
    cancelDownload: (id: string) => ipcRenderer.invoke('cancel-download', id),
    openDownload: (filePath: string) => ipcRenderer.invoke('open-download', filePath),
    showDownloadInFolder: (filePath: string) => ipcRenderer.send('show-download-in-folder', filePath),
    clearDownloadHistory: () => ipcRenderer.send('clear-download-history'),
    removeDownloadFromHistory: (id: string) => ipcRenderer.send('remove-download-from-history', id),
    openDownloadsWindow: () => ipcRenderer.send('open-downloads-window'),
    onDownloadUpdate: (callback: (data: unknown) => void) => {
        const handler = (e: IpcRendererEvent, data: unknown) => callback(data);
        ipcRenderer.on('download-update', handler);
        return () => ipcRenderer.removeListener('download-update', handler);
    }
});
