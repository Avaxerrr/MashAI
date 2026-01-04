/**
 * Shared constants for the Electron main process
 * Migrated from constants.cjs to TypeScript
 */

// =============================================================================
// Window Dimensions
// =============================================================================

export const TITLEBAR_HEIGHT = 36;

export interface WindowDimensions {
    width: number;
    height: number;
    minWidth: number;
    minHeight: number;
}

export const DEFAULT_WINDOW: WindowDimensions = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600
};

export const SETTINGS_WINDOW: WindowDimensions = {
    width: 790,
    height: 600,
    minWidth: 790,
    minHeight: 500
};

// =============================================================================
// Session Management
// =============================================================================

export const MAX_CLOSED_TABS = 10;
export const SESSION_RESTORE_DELAY_MS = 500;

// =============================================================================
// IPC Event Names (prevents typos)
// =============================================================================

export const IPC_EVENTS = {
    // Window
    WINDOW_MINIMIZE: 'window-minimize',
    WINDOW_MAXIMIZE: 'window-maximize',
    WINDOW_CLOSE: 'window-close',
    WINDOW_MAXIMIZED: 'window-maximized',

    // Tabs
    CREATE_TAB: 'create-tab',
    CREATE_TAB_WITH_URL: 'create-tab-with-url',
    SWITCH_TAB: 'switch-tab',
    CLOSE_TAB: 'close-tab',
    DUPLICATE_TAB: 'duplicate-tab',
    RELOAD_TAB: 'reload-tab',
    REOPEN_CLOSED_TAB: 'reopen-closed-tab',
    CLOSE_OTHER_TABS: 'close-other-tabs',
    CLOSE_TABS_TO_RIGHT: 'close-tabs-to-right',
    REORDER_TABS: 'reorder-tabs',
    TAB_CREATED: 'tab-created',
    TAB_UPDATED: 'tab-updated',
    TAB_CLOSED_BACKEND: 'tab-closed-backend',
    REQUEST_CLOSE_TAB: 'request-close-tab',
    TAB_LOADING: 'tab-loading',

    // Profiles
    GET_PROFILE_TABS: 'get-profile-tabs',
    PROFILE_TABS_LOADED: 'profile-tabs-loaded',
    PROFILES_LOADED: 'profiles-loaded',
    SWITCH_PROFILE: 'switch-profile',
    SWITCH_PROFILE_REQUEST: 'switch-profile-request',
    GET_ACTIVE_PROFILE_ID: 'get-active-profile-id',

    // Settings
    GET_SETTINGS: 'get-settings',
    SAVE_SETTINGS: 'save-settings',
    SETTINGS_UPDATED: 'settings-updated',

    // Navigation
    NAV_BACK: 'nav-back',
    NAV_FORWARD: 'nav-forward',
    NAV_RELOAD: 'nav-reload',

    // Menus
    SHOW_CONTEXT_MENU: 'show-context-menu',
    SHOW_PROFILE_MENU: 'show-profile-menu',
    SHOW_NEW_TAB_MENU: 'show-new-tab-menu',

    // Session
    RESTORE_ACTIVE: 'restore-active',
    GET_ALL_TABS: 'get-all-tabs',

    // Tray
    TRAY_SHOW: 'tray-show',
    TRAY_HIDE: 'tray-hide',
    TRAY_TOGGLE: 'tray-toggle',
    VALIDATE_SHORTCUT: 'validate-shortcut',

    // WebView
    HIDE_WEBVIEW: 'hide-webview',
    SHOW_WEBVIEW: 'show-webview',

    // Memory
    GET_MEMORY_USAGE: 'get-memory-usage',
    GET_ALL_TABS_MEMORY: 'get-all-tabs-memory',

    // Privacy
    CLEAR_PRIVACY_DATA: 'clear-privacy-data',

    // External
    OPEN_EXTERNAL: 'open-external',

    // UI
    OPEN_SETTINGS_MODAL: 'open-settings-modal',
    SHOW_TOAST: 'show-toast'
} as const;

// Type for IPC event names
export type IpcEventName = typeof IPC_EVENTS[keyof typeof IPC_EVENTS];

// =============================================================================
// Performance Settings Defaults
// =============================================================================

import type { PerformanceSettings, GeneralSettings } from './types';

export const PERFORMANCE_DEFAULTS: PerformanceSettings = {
    tabLoadingStrategy: 'lastActiveOnly',
    autoSuspendEnabled: true,
    autoSuspendMinutes: 30,
    profileSwitchBehavior: 'suspend',
    // Tray optimization defaults
    suspendOnHide: true,
    keepLastActiveTab: true,
    suspendDelaySeconds: 5
};

export const GENERAL_DEFAULTS: Partial<GeneralSettings> = {
    hardwareAcceleration: true,
    rememberWindowPosition: true
};

// =============================================================================
// Default Provider
// =============================================================================

export const DEFAULT_PROVIDER_ID = 'perplexity';
