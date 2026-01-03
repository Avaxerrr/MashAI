import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { TITLEBAR_HEIGHT, DEFAULT_WINDOW, SETTINGS_WINDOW, MAX_CLOSED_TABS } from './constants';
import TabManager from './TabManager';
import ProfileManager from './ProfileManager';
import SettingsManager from './SettingsManager';
import SessionManager from './SessionManager';
import MenuBuilder from './MenuBuilder';
import TrayManager from './TrayManager';

// Import IPC handlers
import * as WindowHandlers from './ipc/WindowHandlers';
import * as TabHandlers from './ipc/TabHandlers';
import * as NavigationHandlers from './ipc/NavigationHandlers';
import * as ProfileHandlers from './ipc/ProfileHandlers';
import * as SettingsHandlers from './ipc/SettingsHandlers';
import PrivacyHandlers from './ipc/PrivacyHandlers';

// Check hardware acceleration setting BEFORE app is ready
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
    console.warn('[main] Could not read settings for hardware acceleration:', (e as Error).message);
}

// Global references
let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tabManager: TabManager | null = null;
let profileManager: ProfileManager | null = null;
let settingsManager: SettingsManager | null = null;
let sessionManager: SessionManager | null = null;
let menuBuilder: MenuBuilder | null = null;
let trayManager: TrayManager | null = null;

interface ClosedTab {
    id: string;
    profileId: string;
    url: string;
    title: string;
}

const closedTabs: ClosedTab[] = [];
const isDev = process.env.NODE_ENV === 'development';

/**
 * Create the settings window
 */
function createSettingsWindow(): void {
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
        parent: mainWindow!,
        modal: false,
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    settingsWindow.setMenuBarVisibility(false);

    if (isDev) {
        settingsWindow.loadURL('http://localhost:5173/#/settings');
    } else {
        settingsWindow.loadFile(path.join(__dirname, '../../dist/index.html'), { hash: '/settings' });
    }

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
function updateViewBounds(): void {
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
function createWindow(): void {
    // Initialize settings and profile managers first
    settingsManager = new SettingsManager();
    profileManager = new ProfileManager(settingsManager);

    // Pre-fetch favicons
    settingsManager.ensureProvidersFavicons().catch(err => {
        console.error('Failed to fetch provider favicons:', err);
    });

    // Load window state from previous session
    const sessionPath = path.join(app.getPath('userData'), 'session.json');
    let windowState: { width?: number; height?: number; x?: number; y?: number; isMaximized?: boolean } = {};
    try {
        if (fs.existsSync(sessionPath)) {
            const data = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
            if (data.windowBounds) {
                windowState = { ...data.windowBounds, isMaximized: data.isMaximized || false };
            }
        }
    } catch (e) {
        console.error('Failed to load window state:', e);
    }

    // Create mainWindow
    mainWindow = new BrowserWindow({
        width: windowState.width || DEFAULT_WINDOW.width,
        height: windowState.height || DEFAULT_WINDOW.height,
        x: windowState.x,
        y: windowState.y,
        minWidth: DEFAULT_WINDOW.minWidth,
        minHeight: DEFAULT_WINDOW.minHeight,
        backgroundColor: '#1e1e1e',
        icon: path.join(__dirname, '../../src/assets/MashAI-logo.png'),
        frame: false,
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    if (windowState.isMaximized) {
        mainWindow.maximize();
    }

    mainWindow.setMenuBarVisibility(false);

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    }

    // Initialize managers with mainWindow
    tabManager = new TabManager(mainWindow, settingsManager);
    sessionManager = new SessionManager(tabManager, settingsManager);

    // Initialize window state from actual window bounds (ensures x/y are captured)
    const initialBounds = mainWindow.getBounds();
    sessionManager.updateWindowState({
        width: initialBounds.width,
        height: initialBounds.height,
        x: initialBounds.x,
        y: initialBounds.y,
        isMaximized: mainWindow.isMaximized()
    });

    // Initialize menu builder
    menuBuilder = new MenuBuilder(mainWindow, {
        tabManager,
        profileManager,
        settingsManager,
        closedTabs,
        saveSession: () => sessionManager!.saveSession(),
        updateViewBounds,
        createSettingsWindow
    });
    menuBuilder.registerHandlers();
    menuBuilder.createApplicationMenu();

    // Initialize TrayManager
    trayManager = new TrayManager(mainWindow, settingsManager);
    trayManager.setTabManager(tabManager);

    // Register all IPC handlers
    WindowHandlers.register(mainWindow);

    TabHandlers.register(mainWindow, {
        tabManager,
        settingsManager,
        sessionManager,
        saveSession: () => sessionManager!.saveSession(),
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
        saveSession: () => sessionManager!.saveSession(),
        updateViewBounds
    });

    const privacyHandlers = new PrivacyHandlers({
        sessionManager,
        tabManager
    });
    privacyHandlers.register();

    // Intercept close event
    mainWindow.on('close', (event) => {
        const settings = settingsManager!.getSettings();
        const showTray = settings.general?.showTrayIcon !== false;
        const minimizeToTray = settings.general?.minimizeToTray !== false;
        const isEnabled = trayManager?.isMinimizeToTrayEnabled() || false;

        console.log('[main] Close event triggered');
        console.log(`[main] Settings - showTrayIcon: ${showTray}, minimizeToTray: ${minimizeToTray}`);
        console.log(`[main] isMinimizeToTrayEnabled(): ${isEnabled}`);
        console.log(`[main] trayManager.isQuitting: ${trayManager?.isQuitting}`);

        if (trayManager && !trayManager.isQuitting && isEnabled) {
            event.preventDefault();
            trayManager.hideWindow();
            console.log('[main] Window hidden to tray (close intercepted)');
        } else {
            console.log('[main] Allowing window to close (quitting app)');
        }
    });

    // Handle initial load
    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow!.webContents.send('profiles-loaded', profileManager!.getAllProfiles());

        sessionManager!.restoreSession(mainWindow!, updateViewBounds);

        if (tabManager!.tabs.size === 0) {
            const defaultProfile = profileManager!.getAllProfiles()[0]?.id || 'work';
            const id = tabManager!.createTab(defaultProfile);
            tabManager!.switchTo(id);
            mainWindow!.webContents.send('tab-created', {
                id,
                profileId: defaultProfile,
                title: 'New Thread'
            });
            updateViewBounds();
            sessionManager!.saveSession();
        }
    });

    // Note: Ctrl+R is handled by the application menu in MenuBuilder.ts

    // Window event handlers
    mainWindow.on('resize', () => {
        updateViewBounds();
        if (!mainWindow!.isMaximized() && !mainWindow!.isMinimized()) {
            const bounds = mainWindow!.getBounds();
            sessionManager!.updateWindowState({
                width: bounds.width,
                height: bounds.height,
                x: bounds.x,
                y: bounds.y
            });
        }
    });

    mainWindow.on('move', () => {
        if (!mainWindow!.isMaximized() && !mainWindow!.isMinimized()) {
            const bounds = mainWindow!.getBounds();
            sessionManager!.updateWindowState({
                x: bounds.x,
                y: bounds.y
            });
        }
    });

    mainWindow.on('maximize', () => {
        sessionManager!.updateWindowState({ isMaximized: true });
        mainWindow!.webContents.send('window-maximized', true);
    });

    mainWindow.on('unmaximize', () => {
        sessionManager!.updateWindowState({ isMaximized: false });
        mainWindow!.webContents.send('window-maximized', false);
    });
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (sessionManager) sessionManager.saveSession();

    const shouldStayAlive = trayManager?.isMinimizeToTrayEnabled() && !trayManager?.isQuitting;

    console.log('[main] window-all-closed event');
    console.log(`[main] isMinimizeToTrayEnabled: ${trayManager?.isMinimizeToTrayEnabled()}`);
    console.log(`[main] isQuitting: ${trayManager?.isQuitting}`);
    console.log(`[main] shouldStayAlive: ${shouldStayAlive}`);

    if (!shouldStayAlive) {
        console.log('[main] Quitting app (tray disabled or explicit quit)');
        app.quit();
    } else {
        console.log('[main] Staying alive in tray mode');
    }
});

app.on('before-quit', () => {
    if (trayManager) trayManager.isQuitting = true;
    if (sessionManager) sessionManager.saveSession();
    if (trayManager) trayManager.destroy();
});
