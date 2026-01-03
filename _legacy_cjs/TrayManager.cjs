const { Tray, Menu, nativeImage, app, globalShortcut } = require('electron');
const path = require('path');

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
    constructor(mainWindow, settingsManager) {
        this.mainWindow = mainWindow;
        this.settingsManager = settingsManager;
        this.tabManager = null; // Set later via setTabManager
        this.tray = null;
        this.isQuitting = false;
        this.currentShortcut = null;  // Hide/Show shortcut
        this.currentAlwaysOnTopShortcut = null;  // Always-on-top toggle shortcut
        this.suspensionTimeout = null; // Track pending suspension

        // Get current settings
        const settings = settingsManager.getSettings();

        // Create tray if enabled in settings (default: true)
        if (settings.general?.showTrayIcon !== false) {
            this._createTray();
        }

        this._setupAppQuitHandler();

        // Apply initial settings (including shortcuts)
        this._applySettings(settings);

        console.log('[TrayManager] Initialized');
    }

    /**
     * Set the TabManager reference (called after TabManager is created)
     */
    setTabManager(tabManager) {
        this.tabManager = tabManager;
    }

    /**
     * Apply settings (called on init and when settings change)
     */
    _applySettings(settings) {
        const general = settings.general || {};

        // Apply always-on-top setting
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            const alwaysOnTop = general.alwaysOnTop || false;
            this.mainWindow.setAlwaysOnTop(alwaysOnTop);
            console.log(`[TrayManager] Always on top: ${alwaysOnTop}`);
        }

        // Apply launch-at-startup setting
        this._setLaunchAtStartup(general.launchAtStartup || false);

        // Register hide/show global shortcut (only if tray icon is enabled)
        if (general.showTrayIcon !== false) {
            const hideShortcut = general.hideShortcut || '';
            this._registerShortcut(hideShortcut, 'hide');
        } else {
            // Unregister hide shortcut if tray is disabled
            this._unregisterShortcut('hide');
        }

        // Register always-on-top toggle shortcut (always available, regardless of current state)
        // This allows users to toggle always-on-top anytime via the shortcut
        const aotShortcut = general.alwaysOnTopShortcut || '';
        this._registerShortcut(aotShortcut, 'alwaysOnTop');
    }

    /**
     * Update settings (called when user changes settings)
     */
    updateSettings(newSettings) {
        const general = newSettings.general || {};

        // Handle tray icon visibility change
        const showTray = general.showTrayIcon !== false;
        if (showTray && !this.tray) {
            this._createTray();
        } else if (!showTray && this.tray) {
            this.tray.destroy();
            this.tray = null;
            console.log('[TrayManager] Tray icon hidden');
        }

        // Apply other settings
        this._applySettings(newSettings);
    }

    /**
     * Register a global shortcut
     * @param {string} shortcut - The keyboard shortcut to register
     * @param {string} type - 'hide' for show/hide toggle, 'alwaysOnTop' for always-on-top toggle
     */
    _registerShortcut(shortcut, type = 'hide') {
        const currentShortcutKey = type === 'alwaysOnTop' ? 'currentAlwaysOnTopShortcut' : 'currentShortcut';
        const currentShortcut = this[currentShortcutKey];

        // Skip if shortcut hasn't changed
        if (currentShortcut === shortcut) {
            return true;
        }

        // Unregister existing shortcut of this type
        if (currentShortcut) {
            try {
                globalShortcut.unregister(currentShortcut);
                console.log(`[TrayManager] Unregistered ${type} shortcut: ${currentShortcut}`);
            } catch (e) {
                console.warn(`[TrayManager] Failed to unregister ${type} shortcut:`, e);
            }
        }

        // Skip if no shortcut specified
        if (!shortcut || shortcut.trim() === '') {
            this[currentShortcutKey] = null;
            return true;
        }

        // Determine the callback based on type
        const callback = type === 'alwaysOnTop'
            ? () => this.toggleAlwaysOnTop()
            : () => this.toggleWindow();

        // Try to register new shortcut
        try {
            const success = globalShortcut.register(shortcut, callback);

            if (success) {
                this[currentShortcutKey] = shortcut;
                console.log(`[TrayManager] Registered ${type} shortcut: ${shortcut}`);
                return true;
            } else {
                console.warn(`[TrayManager] Failed to register ${type} shortcut: ${shortcut} (already in use)`);
                this[currentShortcutKey] = null;
                return false;
            }
        } catch (e) {
            console.error('[TrayManager] Error registering shortcut:', e);
            this[currentShortcutKey] = null;
            return false;
        }
    }

    /**
     * Unregister a specific shortcut type
     * @param {string} type - 'hide' or 'alwaysOnTop'
     */
    _unregisterShortcut(type) {
        const currentShortcutKey = type === 'alwaysOnTop' ? 'currentAlwaysOnTopShortcut' : 'currentShortcut';
        const currentShortcut = this[currentShortcutKey];

        if (currentShortcut) {
            try {
                globalShortcut.unregister(currentShortcut);
                console.log(`[TrayManager] Unregistered ${type} shortcut: ${currentShortcut}`);
            } catch (e) {
                console.warn(`[TrayManager] Failed to unregister ${type} shortcut:`, e);
            }
            this[currentShortcutKey] = null;
        }
    }

    /**
     * Toggle always-on-top setting via shortcut
     */
    toggleAlwaysOnTop() {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

        const settings = this.settingsManager.getSettings();
        const newValue = !this.mainWindow.isAlwaysOnTop();

        // Update window state
        this.mainWindow.setAlwaysOnTop(newValue);

        // Update settings
        const updatedSettings = {
            ...settings,
            general: {
                ...settings.general,
                alwaysOnTop: newValue
            }
        };
        this.settingsManager.saveSettings(updatedSettings);

        // Notify renderer about settings change
        if (this.mainWindow.webContents) {
            this.mainWindow.webContents.send('settings-updated', updatedSettings);

            // Show toast notification for visual feedback
            const toastMessage = newValue ? 'Always on top enabled' : 'Always on top disabled';
            this.mainWindow.webContents.send('show-toast', toastMessage);
        }

        console.log(`[TrayManager] Toggled always-on-top: ${newValue}`);
    }

    /**
     * Validate a shortcut before attempting to register it
     * @param {string} shortcut - The shortcut to validate
     * @returns {Object} { valid: boolean, reason: string|null }
     */
    static validateShortcut(shortcut) {
        if (!shortcut || shortcut.trim() === '') {
            return { valid: true, reason: null }; // Empty is allowed (disables shortcut)
        }

        // Normalize shortcut for comparison
        const normalized = shortcut.trim();

        // Check against reserved shortcuts
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

        // Basic format validation (should have at least one modifier + key)
        const hasModifier = /ctrl|alt|shift|command|commandorcontrol|cmdorctrl|super|meta/i.test(normalized);
        if (!hasModifier) {
            return { valid: false, reason: 'Shortcut must include at least one modifier key (Ctrl, Alt, Shift)' };
        }

        return { valid: true, reason: null };
    }

    /**
     * Try to register a shortcut temporarily to check if it's available
     * @param {string} shortcut - The shortcut to test
     * @returns {Object} { available: boolean, reason: string|null }
     */
    testShortcut(shortcut) {
        // First validate format
        const validation = TrayManager.validateShortcut(shortcut);
        if (!validation.valid) {
            return { available: false, reason: validation.reason };
        }

        if (!shortcut || shortcut.trim() === '') {
            return { available: true, reason: null };
        }

        // Check if it's already registered by our app
        if (globalShortcut.isRegistered(shortcut)) {
            // If it's our current shortcut, it's technically available (we'd re-register)
            if (this.currentShortcut === shortcut) {
                return { available: true, reason: null };
            }
            return { available: false, reason: 'This shortcut is already in use by another app' };
        }

        // Try to register temporarily
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
     */
    _setLaunchAtStartup(enabled) {
        try {
            app.setLoginItemSettings({
                openAtLogin: enabled,
                // On Windows, this sets the registry key
                // path and args are optional - Electron uses the current executable
            });
            console.log(`[TrayManager] Launch at startup: ${enabled}`);
        } catch (e) {
            console.error('[TrayManager] Failed to set launch at startup:', e);
        }
    }

    /**
     * Check if minimize-to-tray is enabled
     * Returns true only if BOTH showTrayIcon and minimizeToTray are enabled
     */
    isMinimizeToTrayEnabled() {
        const settings = this.settingsManager.getSettings();
        const showTray = settings.general?.showTrayIcon !== false;
        const minimizeToTray = settings.general?.minimizeToTray !== false;

        // Can only minimize to tray if the tray icon is visible
        return showTray && minimizeToTray;
    }

    /**
     * Create the system tray icon with context menu
     */
    _createTray() {
        if (this.tray) return; // Already exists

        // Use Electron's default icon as fallback
        // On Windows, we need a proper icon. Try to use the app's icon if available,
        // otherwise create a simple colored icon as placeholder
        let trayIcon;

        try {
            // Try to get the app's icon from electron-builder output or use a placeholder
            // For development, we'll create a simple icon
            trayIcon = this._createPlaceholderIcon();
        } catch (e) {
            console.warn('[TrayManager] Could not create icon, using empty:', e);
            trayIcon = nativeImage.createEmpty();
        }

        this.tray = new Tray(trayIcon);
        this.tray.setToolTip('MashAI');

        // Create context menu
        this._updateContextMenu();

        // Double-click to show window
        this.tray.on('double-click', () => {
            this.showWindow();
        });

        console.log('[TrayManager] Tray icon created');
    }

    /**
 * Create a simple placeholder icon for the tray
 * Creates a 16x16 icon with the app's accent color
 */
    _createPlaceholderIcon() {
        // Load the actual MashAI logo
        const logoPath = path.join(__dirname, '../src/assets/MashAI-logo.png');

        try {
            const icon = nativeImage.createFromPath(logoPath);
            // Resize to proper tray icon size (16x16 for Windows tray)
            return icon.resize({ width: 16, height: 16 });
        } catch (e) {
            console.warn('[TrayManager] Could not load logo, using fallback:', e);
            // Fallback to empty icon if logo fails to load
            return nativeImage.createEmpty();
        }
    }

    /**
     * Update the tray context menu
     */
    _updateContextMenu() {
        const settings = this.settingsManager.getSettings();
        const shortcut = settings.general?.hideShortcut || '';

        const menuTemplate = [
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
    _setupAppQuitHandler() {
        // Set isQuitting flag when app is about to quit
        // This allows the close event handler to know if it should hide or quit
        app.on('before-quit', () => {
            this.isQuitting = true;
        });
    }

    /**
     * Show the main window
     */
    showWindow() {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

        // Cancel any pending suspension since user is returning
        this._cancelSuspension();

        // Restore the active tab if it was suspended
        this._restoreActiveTab();

        // If minimized, restore it
        if (this.mainWindow.isMinimized()) {
            this.mainWindow.restore();
        }

        // Show and focus
        this.mainWindow.show();
        this.mainWindow.focus();

        console.log('[TrayManager] Window shown');
    }

    /**
     * Restore the active tab if it was suspended
     */
    _restoreActiveTab() {
        if (!this.tabManager) return;

        const activeTabId = this.tabManager.activeTabId;
        if (!activeTabId) return;

        const tab = this.tabManager.tabs.get(activeTabId);
        if (!tab) return;

        // If the active tab is not loaded, load it now
        if (!tab.loaded || !tab.view) {
            console.log(`[TrayManager] Restoring active tab ${activeTabId}`);
            this.tabManager.loadTab(activeTabId);

            // Switch to it to ensure it's visible
            this.tabManager.switchTo(activeTabId);

            // Update view bounds after switching - this is critical to avoid blank screen
            this._updateViewBounds();
        }
    }

    /**
     * Update view bounds for the active tab (fixes blank screen after restore)
     */
    _updateViewBounds() {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
        if (!this.tabManager) return;

        const bounds = this.mainWindow.getBounds();
        const TITLEBAR_HEIGHT = 36; // Same as in constants.cjs

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
    hideWindow() {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

        this.mainWindow.hide();
        console.log('[TrayManager] Window hidden to tray');

        // Schedule tab suspension if enabled
        this._scheduleSuspension();
    }

    /**
     * Schedule tab suspension with configurable delay
     */
    _scheduleSuspension() {
        // Clear any existing timeout
        this._cancelSuspension();

        const settings = this.settingsManager.getSettings();
        const general = settings.general || {};

        // Check if suspension is enabled
        if (!general.suspendOnHide) {
            console.log('[TrayManager] Suspension on hide disabled');
            return;
        }

        // Check if tabManager is available
        if (!this.tabManager) {
            console.log('[TrayManager] TabManager not available for suspension');
            return;
        }

        const delaySeconds = general.suspendDelaySeconds || 5;
        const delayMs = delaySeconds * 1000;

        console.log(`[TrayManager] Scheduling tab suspension in ${delaySeconds} seconds`);

        this.suspensionTimeout = setTimeout(() => {
            this._suspendTabs();
        }, delayMs);
    }

    /**
     * Cancel any pending tab suspension
     */
    _cancelSuspension() {
        if (this.suspensionTimeout) {
            clearTimeout(this.suspensionTimeout);
            this.suspensionTimeout = null;
            console.log('[TrayManager] Tab suspension cancelled');
        }
    }

    /**
     * Suspend all loaded tabs (except optionally the last active one)
     */
    _suspendTabs() {
        if (!this.tabManager) return;

        const settings = this.settingsManager.getSettings();
        const general = settings.general || {};
        const keepLastActive = general.keepLastActiveTab !== false;
        const activeTabId = this.tabManager.activeTabId;

        let suspendedCount = 0;

        this.tabManager.tabs.forEach((tab, tabId) => {
            // Skip the active tab if keepLastActive is enabled
            if (keepLastActive && tabId === activeTabId) {
                console.log(`[TrayManager] Keeping active tab ${tabId} loaded`);
                return;
            }

            // Suspend if loaded
            if (tab.loaded && tab.view) {
                console.log(`[TrayManager] Suspending tab ${tabId} (${tab.title})`);
                this.tabManager.unloadTab(tabId);
                suspendedCount++;
            }
        });

        console.log(`[TrayManager] Suspended ${suspendedCount} tabs`);
    }

    /**
     * Toggle window visibility
     */
    toggleWindow() {
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
    quitApp() {
        this.isQuitting = true;
        app.quit();
    }

    /**
     * Destroy the tray icon and unregister shortcuts (cleanup)
     */
    destroy() {
        // Unregister global shortcut
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

module.exports = TrayManager;
