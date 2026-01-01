/**
 * Shared constants for the Electron main process
 */

// Window dimensions
const TITLEBAR_HEIGHT = 36;

const DEFAULT_WINDOW = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600
};

const SETTINGS_WINDOW = {
    width: 750,
    height: 600,
    minWidth: 750,
    minHeight: 500
};

// Session management
const MAX_CLOSED_TABS = 10;
const SESSION_RESTORE_DELAY_MS = 500;

// IPC Event names (prevents typos)
const IPC_EVENTS = {
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

    // Profiles
    GET_PROFILE_TABS: 'get-profile-tabs',
    PROFILE_TABS_LOADED: 'profile-tabs-loaded',
    PROFILES_LOADED: 'profiles-loaded',
    SWITCH_PROFILE_REQUEST: 'switch-profile-request',
    ACTIVE_PROFILE_CHANGED: 'active-profile-changed',

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
    GET_ALL_TABS: 'get-all-tabs'
};

// Default provider
const DEFAULT_PROVIDER_ID = 'perplexity';

module.exports = {
    TITLEBAR_HEIGHT,
    DEFAULT_WINDOW,
    SETTINGS_WINDOW,
    MAX_CLOSED_TABS,
    SESSION_RESTORE_DELAY_MS,
    IPC_EVENTS,
    DEFAULT_PROVIDER_ID
};
