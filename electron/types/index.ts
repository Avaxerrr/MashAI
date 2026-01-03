/**
 * Core TypeScript type definitions for MashAI
 * These types are shared across the Electron main process and can be
 * imported by the React renderer process as needed.
 */

// =============================================================================
// Profile Types
// =============================================================================

export interface Profile {
    id: string;
    name: string;
    icon: string;  // lucide-react icon name (e.g., 'briefcase', 'home')
    color: string; // hex color (e.g., '#3b82f6')
}

// =============================================================================
// AI Provider Types  
// =============================================================================

export interface AIProvider {
    id: string;
    name: string;
    url: string;
    icon: string;           // URL to icon/favicon
    color: string;          // hex background color
    faviconDataUrl?: string; // cached base64 favicon
}

// =============================================================================
// Tab Types
// =============================================================================

export interface Tab {
    id: string;
    profileId: string;
    url: string;
    title: string;
    loaded: boolean;        // true if WebContentsView exists
    suspended?: boolean;    // true if tab was explicitly suspended
    lastActiveTime?: number; // timestamp for inactivity tracking
}

/** Tab data stored in session (subset of Tab) */
export interface SessionTab {
    id: string;
    profileId: string;
    url: string;
    title: string;
    faviconDataUrl?: string;
}

/** Tab data sent to frontend */
export interface TabInfo {
    id: string;
    profileId: string;
    title: string;
    url: string;
    loaded: boolean;
    suspended?: boolean;
    faviconDataUrl?: string;
}

/** Options for creating a new tab */
export interface CreateTabOptions {
    profileId: string;
    url?: string;
}

// =============================================================================
// Settings Types
// =============================================================================

export interface PerformanceSettings {
    tabLoadingStrategy: 'all' | 'activeProfile' | 'lastActiveOnly';
    autoSuspendEnabled: boolean;
    autoSuspendMinutes: number;
    profileSwitchBehavior: 'keep' | 'suspend' | 'close';
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
    suspendOnHide: boolean;
    keepLastActiveTab: boolean;
    suspendDelaySeconds: number;
}

export interface Settings {
    profiles: Profile[];
    defaultProfileId: string;
    aiProviders: AIProvider[];
    defaultProviderId: string;
    performance: PerformanceSettings;
    general: GeneralSettings;
}

// =============================================================================
// Session/Window State Types
// =============================================================================

export interface WindowBounds {
    x?: number;
    y?: number;
    width: number;
    height: number;
}

export interface WindowState extends WindowBounds {
    isMaximized: boolean;
}

export interface Session {
    tabs: SessionTab[];
    activeTabId: string | null;
    lastActiveProfileId: string | null;
    activeTabByProfile: Record<string, string>;
    windowBounds: WindowBounds;
    isMaximized: boolean;
}

// =============================================================================
// IPC Event Payload Types
// =============================================================================

export interface TabCreatedPayload {
    id: string;
    profileId: string;
    title: string;
    loaded: boolean;
}

export interface TabUpdatedPayload {
    id: string;
    title?: string;
    url?: string;
    loaded?: boolean;
    suspended?: boolean;
}

export interface ProfileTabsLoadedPayload {
    profileId: string;
    tabs: TabInfo[];
    lastActiveTabId: string | null;
}

export interface SwitchProfilePayload {
    toProfileId: string;
}

export interface CreateTabWithUrlPayload {
    profileId: string;
    url: string;
}

export interface CloseOtherTabsPayload {
    tabId: string;
    profileId: string;
}

export interface ContextMenuPayload {
    tabId: string;
}

export interface ProfileMenuPayload {
    x: number;
    y: number;
    activeProfileId: string;
}

export interface NewTabMenuPayload {
    x: number;
    y: number;
    profileId: string;
}

// =============================================================================
// Privacy/Data Types
// =============================================================================

export interface ClearPrivacyDataOptions {
    profileId?: string;       // If provided, clear only for this profile
    clearCache?: boolean;
    clearCookies?: boolean;
    clearStorage?: boolean;
    clearHistory?: boolean;
}

// =============================================================================
// Memory Usage Types
// =============================================================================

export interface TabMemoryInfo {
    tabId: string;
    title: string;
    profileId: string;
    memoryKB: number;
    loaded: boolean;
}

export interface MemoryUsageInfo {
    totalKB: number;
    tabsMemory: TabMemoryInfo[];
}
