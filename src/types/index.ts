/**
 * Frontend type definitions for MashAI React app
 * Extends Window interface with the exposed Electron API
 */

// Core types (duplicated from electron/types for frontend use)
export interface Profile {
    id: string;
    name: string;
    icon: string;
    color: string;
}

export interface AIProvider {
    id: string;
    name: string;
    url: string;
    icon: string;
    color: string;
    faviconDataUrl?: string;
}

export interface DownloadInfo {
    id: string;
    filename: string;
    path: string;
    totalBytes: number;
    receivedBytes: number;
    state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
    startTime: number;
}

export interface TabInfo {
    id: string;
    profileId: string;
    url: string;
    title: string;
    loaded: boolean;
    suspended?: boolean;
    faviconDataUrl?: string;
    isLoading?: boolean;
}

export interface PerformanceSettings {
    tabLoadingStrategy: 'all' | 'activeProfile' | 'lastActiveOnly';
    autoSuspendEnabled: boolean;
    autoSuspendMinutes: number;
    profileSwitchBehavior: 'keep' | 'suspend' | 'close';
    excludeActiveProfile?: boolean;
    // Tray optimization settings
    suspendOnHide: boolean;
    keepLastActiveTab: boolean;
    suspendDelaySeconds: number;
}

export interface GeneralSettings {
    hardwareAcceleration: boolean;
    rememberWindowPosition: boolean;
    launchAtStartup: boolean;
    alwaysOnTop: boolean;
    alwaysOnTopShortcut: string;
    minimizeToTray: boolean;
    showTrayIcon: boolean;
    hideShortcut: string;
}

export interface SecuritySettings {
    downloadsEnabled: boolean;      // Allow file downloads (for AI-generated content)
    popupsEnabled: boolean;         // Allow popup windows (for OAuth flows)
    mediaPolicyAsk: boolean;        // Ask for camera/mic permission (for voice mode)
    adBlockerEnabled: boolean;      // Placeholder for Ghostery integration
}

export interface Settings {
    profiles: Profile[];
    defaultProfileId: string;
    aiProviders: AIProvider[];
    defaultProviderId: string;
    performance: PerformanceSettings;
    general: GeneralSettings;
    security?: SecuritySettings;
}

// Extend the Window interface with the preload-exposed API
declare global {
    interface Window {
        api: ElectronAPI;
    }
}

export interface ElectronAPI {
    // Window controls
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    onMaximized: (callback: (isMaximized: boolean) => void) => () => void;

    // Tab operations
    createTab: (profileId: string) => void;
    createTabWithUrl: (profileId: string, url: string) => void;
    switchTab: (tabId: string) => void;
    closeTab: (tabId: string) => void;
    duplicateTab: (tabId: string) => void;
    reloadTab: (tabId: string) => void;
    reopenClosedTab: () => void;
    closeOtherTabs: (tabId: string, profileId: string) => void;
    closeTabsToRight: (tabId: string, profileId: string) => void;
    reorderTabs: (newOrder: string[]) => void;
    getProfileTabs: (profileId: string) => Promise<{ tabs: TabInfo[]; lastActiveTabId: string | null }>;
    getAllTabs: () => Promise<TabInfo[]>;
    onTabCreated: (callback: (tab: TabCreatedEvent) => void) => () => void;
    onTabUpdated: (callback: (update: TabUpdatedEvent) => void) => () => void;
    onTabClosedBackend: (callback: (tabId: string) => void) => () => void;
    onRequestCloseTab: (callback: (tabId: string) => void) => () => void;
    onTabLoading: (callback: (data: { id: string }) => void) => () => void;

    // Profile operations
    onProfilesLoaded: (callback: (profiles: Profile[]) => void) => () => void;
    onProfileTabsLoaded: (callback: (data: ProfileTabsLoadedEvent) => void) => () => void;
    switchProfile: (toProfileId: string) => void;
    onSwitchProfileRequest: (callback: (profileId: string) => void) => () => void;
    getActiveProfileId: () => Promise<string | null>;

    // Settings
    getSettings: () => Promise<Settings>;
    saveSettings: (settings: Settings) => Promise<boolean>;
    deleteProfile: (profileId: string) => Promise<{ success: boolean; error?: string }>;
    onSettingsUpdated: (callback: (settings: Settings) => void) => () => void;
    onProfileDeleted: (callback: (profileId: string) => void) => () => void;
    onOpenSettingsModal: (callback: () => void) => () => void;

    // Navigation
    goBack: () => void;
    goForward: () => void;
    reload: () => void;

    // Context menus
    showContextMenu: (tabId: string) => void;
    showProfileMenu: (x: number, y: number, activeProfileId: string) => void;
    showNewTabMenu: (x: number, y: number, profileId: string) => void;

    // Session
    onRestoreActive: (callback: (tabId: string) => void) => () => void;

    // Tray
    hideWebView: () => void;
    showWebView: () => void;
    validateShortcut: (shortcut: string) => Promise<{ valid: boolean; reason: string | null }>;

    // Memory
    getMemoryUsage: () => Promise<{ totalKB: number; tabsMemory: TabMemoryInfo[] }>;
    getAllTabsMemory: () => Promise<TabMemoryInfo[]>;

    // Privacy
    clearPrivacyData: (options: ClearPrivacyDataOptions) => Promise<{ success: boolean; error?: string }>;

    // UI
    onShowToast: (callback: (data: { message: string; type?: 'success' | 'error' | 'warning' | 'info' }) => void) => () => void;

    // External
    openExternal: (url: string) => void;

    // Downloads
    getDownloads: () => Promise<{ active: DownloadInfo[]; history: DownloadInfo[] }>;
    cancelDownload: (id: string) => Promise<boolean>;
    openDownload: (filePath: string) => Promise<boolean>;
    showDownloadInFolder: (filePath: string) => void;
    clearDownloadHistory: () => void;
    removeDownloadFromHistory: (id: string) => void;
    openDownloadsWindow: () => void;
    onDownloadUpdate: (callback: (data: { active: DownloadInfo[]; history: DownloadInfo[] }) => void) => () => void;
}

// Event types
export interface TabCreatedEvent {
    id: string;
    profileId: string;
    title: string;
    loaded?: boolean;
    faviconDataUrl?: string;
    afterTabId?: string; // For inserting new tab after its parent tab
    background?: boolean; // If true, don't switch to this tab (open in background)
}

export interface TabUpdatedEvent {
    id: string;
    title?: string;
    url?: string;
    loaded?: boolean;
    suspended?: boolean;
    faviconDataUrl?: string;
    isLoading?: boolean;
}

export interface ProfileTabsLoadedEvent {
    profileId: string;
    tabs: TabInfo[];
    lastActiveTabId: string | null;
}

export interface TabMemoryInfo {
    tabId: string;
    title: string;
    profileId: string;
    memoryKB: number;
    loaded: boolean;
}

export interface ClearPrivacyDataOptions {
    profiles: string[];
    dataType: 'cache' | 'cookies' | 'siteData' | 'all';
}
