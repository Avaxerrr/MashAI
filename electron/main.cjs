const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { TITLEBAR_HEIGHT, DEFAULT_WINDOW, SETTINGS_WINDOW, MAX_CLOSED_TABS } = require('./constants.cjs');
const TabManager = require('./TabManager.cjs');
const ProfileManager = require('./ProfileManager.cjs');
const SettingsManager = require('./SettingsManager.cjs');
const SessionManager = require('./SessionManager.cjs');
const MenuBuilder = require('./MenuBuilder.cjs');
const TrayManager = require('./TrayManager.cjs');

// Import IPC handlers
const WindowHandlers = require('./ipc/WindowHandlers.cjs');
const TabHandlers = require('./ipc/TabHandlers.cjs');
const NavigationHandlers = require('./ipc/NavigationHandlers.cjs');
const ProfileHandlers = require('./ipc/ProfileHandlers.cjs');
const SettingsHandlers = require('./ipc/SettingsHandlers.cjs');

// Check hardware acceleration setting BEFORE app is ready
// This must be done synchronously before app.whenReady()
try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        if (settings.general?.hardwareAcceleration === false) {
            console.log('[main] Hardware acceleration disabled by user setting');
            app.disableHardwareAcceleration();
        }
    }
} catch (e) {
    console.warn('[main] Could not read settings for hardware acceleration:', e.message);
}

// Global references
let mainWindow;
let settingsWindow;
let tabManager;
let profileManager;
let settingsManager;
let sessionManager;
let menuBuilder;
let trayManager;

const closedTabs = [];
const isDev = process.env.NODE_ENV === 'development';

/**
 * Create the settings window
 */
function createSettingsWindow() {
    // Prevent multiple settings windows
    if (settingsWindow) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: SETTINGS_WINDOW.width,
        height: SETTINGS_WINDOW.height,
        minWidth: SETTINGS_WINDOW.minWidth,
        minHeight: SETTINGS_WINDOW.minHeight,
        maximizable: false,
        resizable: true,
        backgroundColor: '#252526',
        parent: mainWindow,
        modal: false,
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    settingsWindow.setMenuBarVisibility(false);

    // Load settings page
    if (isDev) {
        settingsWindow.loadURL('http://localhost:5173/#/settings');
    } else {
        settingsWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/settings' });
    }

    // Restore focus to main window when settings window closes
    settingsWindow.on('close', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.focus();
        }
    });

    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
}

/**
 * Update view bounds for the active tab
 */
function updateViewBounds() {
    if (!mainWindow || !tabManager) return;
    const bounds = mainWindow.getBounds();
    const contentBounds = {
        x: 0,
        y: TITLEBAR_HEIGHT,
        width: bounds.width,
        height: bounds.height - TITLEBAR_HEIGHT
    };
    tabManager.resizeActiveView(contentBounds);
}

/**
 * Create the main application window
 */
function createWindow() {
    // Initialize settings and profile managers first (don't need mainWindow)
    settingsManager = new SettingsManager();
    profileManager = new ProfileManager(settingsManager);

    // Pre-fetch favicons for providers that don't have them cached
    settingsManager.ensureProvidersFavicons().catch(err => {
        console.error('Failed to fetch provider favicons:', err);
    });

    // Load window state from previous session (SessionManager can load state before tabManager exists)
    const sessionPath = require('path').join(app.getPath('userData'), 'session.json');
    let windowState = {};
    try {
        const fs = require('fs');
        if (fs.existsSync(sessionPath)) {
            const data = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
            if (data.windowBounds) {
                windowState = { ...data.windowBounds, isMaximized: data.isMaximized || false };
            }
        }
    } catch (e) {
        console.error('Failed to load window state:', e);
    }

    // Create mainWindow FIRST
    mainWindow = new BrowserWindow({
        width: windowState.width || DEFAULT_WINDOW.width,
        height: windowState.height || DEFAULT_WINDOW.height,
        x: windowState.x,
        y: windowState.y,
        minWidth: DEFAULT_WINDOW.minWidth,
        minHeight: DEFAULT_WINDOW.minHeight,
        backgroundColor: '#1e1e1e',
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    if (windowState.isMaximized) {
        mainWindow.maximize();
    }

    mainWindow.setMenuBarVisibility(false);

    // Load React app from Vite dev server or built files
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        // mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // NOW initialize TabManager and SessionManager with the valid mainWindow
    tabManager = new TabManager(mainWindow, settingsManager);
    sessionManager = new SessionManager(tabManager, settingsManager);  // Pass settingsManager for lazy loading

    // Initialize menu builder and register handlers
    menuBuilder = new MenuBuilder(mainWindow, {
        tabManager,
        profileManager,
        settingsManager,
        closedTabs,
        saveSession: () => sessionManager.saveSession(),
        updateViewBounds,
        createSettingsWindow
    });
    menuBuilder.registerHandlers();
    menuBuilder.createApplicationMenu();

    // Initialize TrayManager for system tray functionality (before SettingsHandlers so it can receive updates)
    trayManager = new TrayManager(mainWindow, settingsManager);
    trayManager.setTabManager(tabManager); // Wire up tabManager for suspension functionality

    // Register all IPC handlers
    WindowHandlers.register(mainWindow);

    TabHandlers.register(mainWindow, {
        tabManager,
        settingsManager,
        sessionManager,
        saveSession: () => sessionManager.saveSession(),
        updateViewBounds,
        closedTabs
    });

    NavigationHandlers.register({ tabManager });

    ProfileHandlers.register(mainWindow, { tabManager, sessionManager });

    SettingsHandlers.register(mainWindow, {
        settingsManager,
        profileManager,
        tabManager,
        trayManager,
        saveSession: () => sessionManager.saveSession(),
        updateViewBounds
    });

    // Intercept close event - hide to tray instead of quitting (if enabled)
    mainWindow.on('close', (event) => {
        if (trayManager && !trayManager.isQuitting && trayManager.isMinimizeToTrayEnabled()) {
            event.preventDefault();
            trayManager.hideWindow(); // Use trayManager.hideWindow() to trigger suspension scheduling
            console.log('[main] Window hidden to tray (close intercepted)');
        }
    });

    // Handle initial load
    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('profiles-loaded', profileManager.getAllProfiles());

        // Restore session
        sessionManager.restoreSession(mainWindow, updateViewBounds);

        // Ensure at least one tab exists if restore failed or was empty
        if (tabManager.tabs.size === 0) {
            const defaultProfile = profileManager.getAllProfiles()[0]?.id || 'work';
            const id = tabManager.createTab(defaultProfile);
            tabManager.switchTo(id);
            mainWindow.webContents.send('tab-created', {
                id,
                profileId: defaultProfile,
                title: 'New Thread'
            });
            updateViewBounds();
            sessionManager.saveSession();
        }
    });

    // Intercept Ctrl+R to reload active tab, not the React app
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown' && input.control && input.key.toLowerCase() === 'r') {
            event.preventDefault();
            tabManager.reload();
        }
    });

    // Window event handlers
    mainWindow.on('resize', () => {
        updateViewBounds();
        if (!mainWindow.isMaximized() && !mainWindow.isMinimized()) {
            const bounds = mainWindow.getBounds();
            sessionManager.updateWindowState({
                width: bounds.width,
                height: bounds.height,
                x: bounds.x,
                y: bounds.y
            });
        }
    });

    mainWindow.on('move', () => {
        if (!mainWindow.isMaximized() && !mainWindow.isMinimized()) {
            const bounds = mainWindow.getBounds();
            sessionManager.updateWindowState({
                x: bounds.x,
                y: bounds.y
            });
        }
    });

    mainWindow.on('maximize', () => {
        sessionManager.updateWindowState({ isMaximized: true });
        mainWindow.webContents.send('window-maximized', true);
    });

    mainWindow.on('unmaximize', () => {
        sessionManager.updateWindowState({ isMaximized: false });
        mainWindow.webContents.send('window-maximized', false);
    });
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    // Don't quit when windows are closed - we're hiding to tray
    // The quit is handled by TrayManager.quitApp() or before-quit
    if (sessionManager) sessionManager.saveSession();
    // Only auto-quit on macOS if trayManager says we're quitting
    if (process.platform !== 'darwin' && trayManager?.isQuitting) {
        app.quit();
    }
});

app.on('before-quit', () => {
    // Mark that we're quitting so close handler doesn't intercept
    if (trayManager) trayManager.isQuitting = true;
    if (sessionManager) sessionManager.saveSession();
    // Cleanup tray
    if (trayManager) trayManager.destroy();
});
