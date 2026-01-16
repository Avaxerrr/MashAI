import { Tray, Menu, nativeImage, app, globalShortcut, BrowserWindow, MenuItemConstructorOptions } from 'electron';
import * as path from 'path';
import type { Settings } from './types';
import type SettingsManager from './SettingsManager';
import type TabManager from './TabManager';

// Reserved shortcuts that cannot be used
const RESERVED_SHORTCUTS = [
    // System shortcuts
    'Ctrl+C', 'Ctrl+V', 'Ctrl+X', 'Ctrl+Z', 'Ctrl+Y', 'Ctrl+A', 'Ctrl+S',
    'Ctrl+F', 'Ctrl+P', 'Ctrl+N', 'Ctrl+O', 'Ctrl+W', 'Ctrl+Q',
    'CommandOrControl+C', 'CommandOrControl+V', 'CommandOrControl+X',
    'CommandOrControl+Z', 'CommandOrControl+Y', 'CommandOrControl+A',
    'CommandOrControl+S', 'CommandOrControl+F', 'CommandOrControl+P',
    'CommandOrControl+N', 'CommandOrControl+O', 'CommandOrControl+W',
    'CommandOrControl+Q',
    // Windows system shortcuts
    'Alt+F4', 'Alt+Tab', 'Ctrl+Alt+Delete',
    // App shortcuts (common Electron patterns)
    'Ctrl+T', 'CommandOrControl+T', // New tab
    'Ctrl+R', 'CommandOrControl+R', // Reload
    'F5', 'F11', 'F12', // Refresh, Fullscreen, DevTools
];

interface ShortcutValidationResult {
    valid: boolean;
    reason: string | null;
}

interface ShortcutTestResult {
    available: boolean;
    reason: string | null;
}

/**
 * TrayManager - Manages the system tray icon and global shortcuts
 * 
 * Responsibilities:
 * - Create and display system tray icon
 * - Handle tray context menu (Show, Quit)
 * - Handle double-click to restore window
 * - Track quit state to distinguish close-to-tray vs actual quit
 * - Apply settings for always-on-top and launch-at-startup
 * - Register and manage global keyboard shortcuts
 */
class TrayManager {
    private mainWindow: BrowserWindow;
    private settingsManager: SettingsManager;
    private tabManager: TabManager | null;
    private tray: Tray | null;
    isQuitting: boolean;
    private currentShortcut: string | null;
    private currentAlwaysOnTopShortcut: string | null;
    private suspensionTimeout: NodeJS.Timeout | null;

    constructor(mainWindow: BrowserWindow, settingsManager: SettingsManager) {
        this.mainWindow = mainWindow;
        this.settingsManager = settingsManager;
        this.tabManager = null;
        this.tray = null;
        this.isQuitting = false;
        this.currentShortcut = null;
        this.currentAlwaysOnTopShortcut = null;
        this.suspensionTimeout = null;

        const settings = settingsManager.getSettings();

        if (settings.general?.showTrayIcon !== false) {
            this._createTray();
        }

        this._setupAppQuitHandler();
        this._applySettings(settings);

        console.log('[TrayManager] Initialized');
    }

    /**
     * Set the TabManager reference (called after TabManager is created)
     */
    setTabManager(tabManager: TabManager): void {
        this.tabManager = tabManager;
    }

    /**
     * Apply settings (called on init and when settings change)
     */
    private _applySettings(settings: Settings): void {
        const general = settings.general;

        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            const alwaysOnTop = general.alwaysOnTop || false;
            this.mainWindow.setAlwaysOnTop(alwaysOnTop);
            console.log(`[TrayManager] Always on top: ${alwaysOnTop}`);
        }

        this._setLaunchAtStartup(general.launchAtStartup || false);

        if (general.showTrayIcon !== false) {
            const hideShortcut = general.hideShortcut || '';
            this._registerShortcut(hideShortcut, 'hide');
        } else {
            this._unregisterShortcut('hide');
        }

        const aotShortcut = general.alwaysOnTopShortcut || '';
        this._registerShortcut(aotShortcut, 'alwaysOnTop');
    }

    /**
     * Update settings (called when user changes settings)
     */
    updateSettings(newSettings: Settings): void {
        const general = newSettings.general;

        const showTray = general.showTrayIcon !== false;
        if (showTray && !this.tray) {
            this._createTray();
        } else if (!showTray && this.tray) {
            this.tray.destroy();
            this.tray = null;
            console.log('[TrayManager] Tray icon hidden');
        }

        this._applySettings(newSettings);
    }

    /**
     * Register a global shortcut
     */
    private _registerShortcut(shortcut: string, type: 'hide' | 'alwaysOnTop' = 'hide'): boolean {
        const currentShortcutKey = type === 'alwaysOnTop' ? 'currentAlwaysOnTopShortcut' : 'currentShortcut';
        const currentShortcut = this[currentShortcutKey];

        if (currentShortcut === shortcut) {
            return true;
        }

        if (currentShortcut) {
            try {
                globalShortcut.unregister(currentShortcut);
                console.log(`[TrayManager] Unregistered ${type} shortcut: ${currentShortcut}`);
            } catch (e) {
                console.warn(`[TrayManager] Failed to unregister ${type} shortcut:`, e);
            }
        }

        if (!shortcut || shortcut.trim() === '') {
            (this[currentShortcutKey] as string | null) = null;
            return true;
        }

        const callback = type === 'alwaysOnTop'
            ? () => this.toggleAlwaysOnTop()
            : () => this.toggleWindow();

        try {
            const success = globalShortcut.register(shortcut, callback);

            if (success) {
                (this[currentShortcutKey] as string | null) = shortcut;
                console.log(`[TrayManager] Registered ${type} shortcut: ${shortcut}`);
                return true;
            } else {
                console.warn(`[TrayManager] Failed to register ${type} shortcut: ${shortcut} (already in use)`);
                (this[currentShortcutKey] as string | null) = null;
                return false;
            }
        } catch (e) {
            console.error('[TrayManager] Error registering shortcut:', e);
            (this[currentShortcutKey] as string | null) = null;
            return false;
        }
    }

    /**
     * Unregister a specific shortcut type
     */
    private _unregisterShortcut(type: 'hide' | 'alwaysOnTop'): void {
        const currentShortcutKey = type === 'alwaysOnTop' ? 'currentAlwaysOnTopShortcut' : 'currentShortcut';
        const currentShortcut = this[currentShortcutKey];

        if (currentShortcut) {
            try {
                globalShortcut.unregister(currentShortcut);
                console.log(`[TrayManager] Unregistered ${type} shortcut: ${currentShortcut}`);
            } catch (e) {
                console.warn(`[TrayManager] Failed to unregister ${type} shortcut:`, e);
            }
            (this[currentShortcutKey] as string | null) = null;
        }
    }

    /**
     * Toggle always-on-top setting via shortcut
     */
    toggleAlwaysOnTop(): void {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

        const settings = this.settingsManager.getSettings();
        const newValue = !this.mainWindow.isAlwaysOnTop();

        this.mainWindow.setAlwaysOnTop(newValue);

        const updatedSettings: Settings = {
            ...settings,
            general: {
                ...settings.general,
                alwaysOnTop: newValue
            }
        };
        this.settingsManager.saveSettings(updatedSettings);

        if (this.mainWindow.webContents) {
            this.mainWindow.webContents.send('settings-updated', updatedSettings);
            const toastMessage = newValue ? 'Always on top enabled' : 'Always on top disabled';
            this.mainWindow.webContents.send('show-toast', { message: toastMessage, type: 'success' });
        }

        console.log(`[TrayManager] Toggled always-on-top: ${newValue}`);
    }

    /**
     * Validate a shortcut before attempting to register it
     */
    static validateShortcut(shortcut: string): ShortcutValidationResult {
        if (!shortcut || shortcut.trim() === '') {
            return { valid: true, reason: null };
        }

        const normalized = shortcut.trim();
        const normalizedForCheck = normalized
            .replace(/CommandOrControl/gi, 'Ctrl')
            .replace(/CmdOrCtrl/gi, 'Ctrl')
            .replace(/Command/gi, 'Ctrl')
            .replace(/Control/gi, 'Ctrl');

        for (const reserved of RESERVED_SHORTCUTS) {
            const reservedNormalized = reserved
                .replace(/CommandOrControl/gi, 'Ctrl')
                .replace(/CmdOrCtrl/gi, 'Ctrl')
                .replace(/Command/gi, 'Ctrl')
                .replace(/Control/gi, 'Ctrl');

            if (normalizedForCheck.toLowerCase() === reservedNormalized.toLowerCase()) {
                return { valid: false, reason: 'This shortcut is reserved by the system or app' };
            }
        }

        const hasModifier = /ctrl|alt|shift|command|commandorcontrol|cmdorctrl|super|meta/i.test(normalized);
        if (!hasModifier) {
            return { valid: false, reason: 'Shortcut must include at least one modifier key (Ctrl, Alt, Shift)' };
        }

        return { valid: true, reason: null };
    }

    /**
     * Try to register a shortcut temporarily to check if it's available
     */
    testShortcut(shortcut: string): ShortcutTestResult {
        const validation = TrayManager.validateShortcut(shortcut);
        if (!validation.valid) {
            return { available: false, reason: validation.reason };
        }

        if (!shortcut || shortcut.trim() === '') {
            return { available: true, reason: null };
        }

        if (globalShortcut.isRegistered(shortcut)) {
            if (this.currentShortcut === shortcut) {
                return { available: true, reason: null };
            }
            return { available: false, reason: 'This shortcut is already in use by another app' };
        }

        try {
            const success = globalShortcut.register(shortcut, () => { });
            if (success) {
                globalShortcut.unregister(shortcut);
                return { available: true, reason: null };
            } else {
                return { available: false, reason: 'This shortcut is already in use by another app' };
            }
        } catch (e) {
            return { available: false, reason: 'Invalid shortcut format' };
        }
    }

    /**
     * Set whether app launches at system startup
     * Note: Works reliably on Windows and macOS. Linux support varies by distro.
     */
    private _setLaunchAtStartup(enabled: boolean): void {
        try {
            // setLoginItemSettings works on Windows, macOS, and some Linux distros
            // On Linux, it creates a .desktop file in ~/.config/autostart/
            app.setLoginItemSettings({
                openAtLogin: enabled,
                // On macOS, we can optionally hide the app on login
                // openAsHidden: false,
            });
            console.log(`[TrayManager] Launch at startup: ${enabled} (platform: ${process.platform})`);
        } catch (e) {
            // This may fail on some Linux distros that don't support autostart
            console.error('[TrayManager] Failed to set launch at startup:', e);
            if (process.platform === 'linux') {
                console.warn('[TrayManager] Note: Autostart may not be supported on this Linux distribution');
            }
        }
    }

    /**
     * Check if minimize-to-tray is enabled
     */
    isMinimizeToTrayEnabled(): boolean {
        const settings = this.settingsManager.getSettings();
        const showTray = settings.general?.showTrayIcon !== false;
        const minimizeToTray = settings.general?.minimizeToTray !== false;
        return showTray && minimizeToTray;
    }

    /**
     * Create the system tray icon with context menu
     */
    private _createTray(): void {
        if (this.tray) return;

        let trayIcon;

        try {
            trayIcon = this._createPlaceholderIcon();
        } catch (e) {
            console.warn('[TrayManager] Could not create icon, using empty:', e);
            trayIcon = nativeImage.createEmpty();
        }

        this.tray = new Tray(trayIcon);
        this.tray.setToolTip('MashAI');

        this._updateContextMenu();

        this.tray.on('double-click', () => {
            this.showWindow();
        });

        console.log('[TrayManager] Tray icon created');
    }

    /**
     * Create a simple placeholder icon for the tray
     */
    private _createPlaceholderIcon() {
        let logoPath;
        if (app.isPackaged) {
            // In production, assets are in resources/assets
            logoPath = path.join(process.resourcesPath, 'assets/MashAI-logo.png');
        } else {
            // In development, relative to this file
            logoPath = path.join(__dirname, '../../src/assets/MashAI-logo.png');
        }

        try {
            const icon = nativeImage.createFromPath(logoPath);
            return icon.resize({ width: 16, height: 16 });
        } catch (e) {
            console.warn('[TrayManager] Could not load logo, using fallback:', e);
            return nativeImage.createEmpty();
        }
    }

    /**
     * Update the tray context menu
     */
    private _updateContextMenu(): void {
        if (!this.tray) return;

        const settings = this.settingsManager.getSettings();
        const shortcut = settings.general?.hideShortcut || '';

        const menuTemplate: MenuItemConstructorOptions[] = [
            {
                label: 'Show MashAI',
                accelerator: shortcut || undefined,
                click: () => {
                    this.showWindow();
                }
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => {
                    this.quitApp();
                }
            }
        ];

        const contextMenu = Menu.buildFromTemplate(menuTemplate);
        this.tray.setContextMenu(contextMenu);
    }

    /**
     * Setup handler for app quit event
     */
    private _setupAppQuitHandler(): void {
        app.on('before-quit', () => {
            this.isQuitting = true;
        });
    }

    /**
     * Show the main window
     */
    showWindow(): void {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

        this._cancelSuspension();
        this._restoreActiveTab();

        if (this.mainWindow.isMinimized()) {
            this.mainWindow.restore();
        }

        this.mainWindow.show();
        this.mainWindow.focus();

        console.log('[TrayManager] Window shown');
    }

    /**
     * Restore the active tab if it was suspended
     */
    private _restoreActiveTab(): void {
        if (!this.tabManager) return;

        const activeTabId = this.tabManager.activeTabId;
        if (!activeTabId) return;

        const tab = this.tabManager.tabs.get(activeTabId);
        if (!tab) return;

        if (!tab.loaded || !tab.view) {
            console.log(`[TrayManager] Restoring active tab ${activeTabId}`);
            this.tabManager.loadTab(activeTabId);
            this.tabManager.switchTo(activeTabId);
            this._updateViewBounds();
        }
    }

    /**
     * Update view bounds for the active tab
     */
    private _updateViewBounds(): void {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
        if (!this.tabManager) return;

        const bounds = this.mainWindow.getBounds();
        const TITLEBAR_HEIGHT = 36;

        const contentBounds = {
            x: 0,
            y: TITLEBAR_HEIGHT,
            width: bounds.width,
            height: bounds.height - TITLEBAR_HEIGHT
        };

        this.tabManager.resizeActiveView(contentBounds);
        console.log('[TrayManager] View bounds updated');
    }

    /**
     * Hide the main window to tray with optional tab suspension
     */
    hideWindow(): void {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

        this.mainWindow.hide();
        console.log('[TrayManager] Window hidden to tray');

        this._scheduleSuspension();
    }

    /**
     * Schedule tab suspension with configurable delay
     */
    private _scheduleSuspension(): void {
        this._cancelSuspension();

        const settings = this.settingsManager.getSettings();
        const performance = settings.performance;

        if (!performance.suspendOnHide) {
            console.log('[TrayManager] Suspension on hide disabled');
            return;
        }

        if (!this.tabManager) {
            console.log('[TrayManager] TabManager not available for suspension');
            return;
        }

        const delaySeconds = performance.suspendDelaySeconds || 5;
        const delayMs = delaySeconds * 1000;

        console.log(`[TrayManager] Scheduling tab suspension in ${delaySeconds} seconds`);

        this.suspensionTimeout = setTimeout(() => {
            this._suspendTabs();
        }, delayMs);
    }

    /**
     * Cancel any pending tab suspension
     */
    private _cancelSuspension(): void {
        if (this.suspensionTimeout) {
            clearTimeout(this.suspensionTimeout);
            this.suspensionTimeout = null;
            console.log('[TrayManager] Tab suspension cancelled');
        }
    }

    /**
     * Suspend all loaded tabs (except optionally the last active one)
     */
    private _suspendTabs(): void {
        if (!this.tabManager) return;

        const settings = this.settingsManager.getSettings();
        const performance = settings.performance;
        const keepLastActive = performance.keepLastActiveTab !== false;
        const activeTabId = this.tabManager.activeTabId;

        let suspendedCount = 0;

        this.tabManager.tabs.forEach((tab, tabId) => {
            if (keepLastActive && tabId === activeTabId) {
                console.log(`[TrayManager] Keeping active tab ${tabId} loaded`);
                return;
            }

            if (tab.loaded && tab.view) {
                // Skip tabs with active media playback (Chrome-like behavior)
                if (tab.isMediaPlaying || tab.isAudible) {
                    console.log(`[TrayManager] Keeping tab ${tabId} (${tab.title}) - media is playing`);
                    return;
                }
                // Skip tabs manually excluded from suspension
                if (tab.excludeFromSuspension) {
                    console.log(`[TrayManager] Keeping tab ${tabId} (${tab.title}) - excluded from suspension`);
                    return;
                }
                console.log(`[TrayManager] Suspending tab ${tabId} (${tab.title})`);
                this.tabManager!.unloadTab(tabId);
                suspendedCount++;
            }
        });

        console.log(`[TrayManager] Suspended ${suspendedCount} tabs`);
    }

    /**
     * Toggle window visibility
     */
    toggleWindow(): void {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

        if (this.mainWindow.isVisible() && this.mainWindow.isFocused()) {
            this.hideWindow();
        } else {
            this.showWindow();
        }
    }

    /**
     * Quit the application
     */
    quitApp(): void {
        this.isQuitting = true;
        app.quit();
    }

    /**
     * Destroy the tray icon and unregister shortcuts (cleanup)
     */
    destroy(): void {
        if (this.currentShortcut) {
            try {
                globalShortcut.unregister(this.currentShortcut);
            } catch (e) {
                console.warn('[TrayManager] Failed to unregister shortcut on destroy:', e);
            }
        }

        if (this.tray) {
            this.tray.destroy();
            this.tray = null;
            console.log('[TrayManager] Tray destroyed');
        }
    }
}

export default TrayManager;
