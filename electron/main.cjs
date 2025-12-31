const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const TabManager = require('./TabManager.cjs');
const ProfileManager = require('./ProfileManager.cjs');
const SettingsManager = require('./SettingsManager.cjs');

let mainWindow;
let tabManager;
let profileManager;
let settingsManager;
let currentWindowState = { width: 1200, height: 800, isMaximized: false }; // Track state
const SESSION_FILE = path.join(app.getPath('userData'), 'session.json');
const closedTabs = [];
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
    let windowState = {};
    try {
        if (fs.existsSync(SESSION_FILE)) {
            const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
            if (data.windowBounds) windowState = data.windowBounds;
            if (data.isMaximized) windowState.isMaximized = true;
        }
    } catch (e) {
        console.error('Failed to load window state:', e);
    }

    mainWindow = new BrowserWindow({
        width: windowState.width || 1200,
        height: windowState.height || 800,
        x: windowState.x,
        y: windowState.y,
        minWidth: 800,
        minHeight: 600,
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

    settingsManager = new SettingsManager();
    // Initialize ProfileManager with settings
    profileManager = new ProfileManager(settingsManager);

    tabManager = new TabManager(mainWindow, settingsManager);



    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('profiles-loaded', profileManager.getAllProfiles());
        restoreSession();

        // Ensure at least one tab exists if restore failed or was empty
        if (tabManager.tabs.size === 0) {
            // Create default tab for the first available profile (usually 'work')
            const defaultProfile = profileManager.getAllProfiles()[0]?.id || 'work';
            const id = tabManager.createTab(defaultProfile);
            tabManager.switchTo(id);
            mainWindow.webContents.send('tab-created', {
                id,
                profileId: defaultProfile,
                title: 'New Thread'
            });
            updateViewBounds();
            saveSession();
        }
    });

    // Intercept Ctrl+R to reload active tab, not the React app
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown' && input.control && input.key.toLowerCase() === 'r') {
            event.preventDefault();
            // Reload the active tab's web content
            tabManager.reload();
        }
    });

    createApplicationMenu();

    // Window Controls
    ipcMain.on('window-minimize', () => mainWindow.minimize());
    ipcMain.on('window-maximize', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });
    ipcMain.on('window-close', () => mainWindow.close());
    ipcMain.on('hide-webview', () => tabManager.hideActiveView());
    ipcMain.on('show-webview', () => tabManager.showActiveView());

    // Tab Management
    ipcMain.on('create-tab', (event, profileId) => {
        const id = tabManager.createTab(profileId);
        const success = tabManager.switchTo(id);

        if (success) {
            mainWindow.webContents.send('tab-created', {
                id,
                profileId,
                title: 'New Thread'
            });
            updateViewBounds();
            saveSession();
        }
    });

    ipcMain.on('create-tab-with-url', (event, { profileId, url }) => {
        const id = tabManager.createTab(profileId, url);
        const success = tabManager.switchTo(id);

        if (success) {
            mainWindow.webContents.send('tab-created', {
                id,
                profileId,
                title: 'New Thread'
            });
            updateViewBounds();
            saveSession();
        }
    });

    ipcMain.on('switch-tab', (event, tabId) => {
        const success = tabManager.switchTo(tabId);
        if (success) {
            updateViewBounds();
        }
    });

    ipcMain.on('close-tab', (event, tabId) => {
        // Prevent closing the last tab
        if (tabManager.tabs.size <= 1) {
            return;
        }

        const tab = tabManager.tabs.get(tabId);
        if (tab) {
            closedTabs.push({
                profileId: tab.profileId,
                url: tab.url,
                title: tab.title
            });
            if (closedTabs.length > 10) closedTabs.shift();
        }

        tabManager.closeTab(tabId);
        saveSession();
    });

    ipcMain.on('duplicate-tab', (event, tabId) => {
        const tab = tabManager.tabs.get(tabId);
        if (!tab) return;

        const newId = tabManager.createTab(tab.profileId, tab.url);
        tabManager.switchTo(newId);
        mainWindow.webContents.send('tab-created', {
            id: newId,
            profileId: tab.profileId,
            title: tab.title
        });
        updateViewBounds();
        saveSession();
    });

    ipcMain.on('reload-tab', (event, tabId) => {
        const tab = tabManager.tabs.get(tabId);
        if (tab && tab.view) {
            tab.view.webContents.reload();
        }
    });

    ipcMain.on('reopen-closed-tab', () => {
        if (closedTabs.length === 0) return;

        const lastClosed = closedTabs.pop();
        const id = tabManager.createTab(lastClosed.profileId, lastClosed.url);
        tabManager.switchTo(id);
        mainWindow.webContents.send('tab-created', {
            id,
            profileId: lastClosed.profileId,
            title: lastClosed.title
        });
        updateViewBounds();
        saveSession();
    });

    ipcMain.on('close-other-tabs', (event, { tabId, profileId }) => {
        const tabs = tabManager.getTabsForProfile(profileId);
        tabs.forEach(tab => {
            if (tab.id !== tabId) {
                tabManager.closeTab(tab.id);
            }
        });
        saveSession();
    });

    ipcMain.on('close-tabs-to-right', (event, { tabId, profileId }) => {
        const tabs = tabManager.getTabsForProfile(profileId);
        const targetIndex = tabs.findIndex(t => t.id === tabId);

        if (targetIndex >= 0) {
            tabs.slice(targetIndex + 1).forEach(tab => {
                tabManager.closeTab(tab.id);
            });
        }
        saveSession();
    });

    ipcMain.on('show-context-menu', (event, { tabId }) => {
        const tab = tabManager.tabs.get(tabId);
        if (!tab) return;

        const template = [
            {
                label: 'Reload',
                accelerator: 'CmdOrCtrl+R',
                click: () => {
                    if (tab.view) tab.view.webContents.reload();
                }
            },
            {
                label: 'Duplicate',
                click: () => {
                    const newId = tabManager.createTab(tab.profileId, tab.url);
                    tabManager.switchTo(newId);
                    mainWindow.webContents.send('tab-created', {
                        id: newId,
                        profileId: tab.profileId,
                        title: tab.title
                    });
                    updateViewBounds();
                    saveSession();
                }
            },
            { type: 'separator' },
            {
                label: 'Close Tab',
                accelerator: 'CmdOrCtrl+W',
                click: () => {
                    // Use frontend logic for safety
                    mainWindow.webContents.send('request-close-tab', tabId);
                }
            },
            {
                label: 'Close Other Tabs',
                click: () => {
                    // We need to implement this logic safely and update frontend.
                    // Since frontend holds state, let's ask frontend to do it, OR do it here and push update.
                    // Doing it here matches existing IPC pattern 'close-other-tabs'.
                    // We just need to make sure frontend updates its list.
                    const tabs = tabManager.getTabsForProfile(tab.profileId);
                    tabs.forEach(t => {
                        if (t.id !== tabId) {
                            tabManager.closeTab(t.id);
                            mainWindow.webContents.send('tab-closed-backend', t.id); // New event helper
                        }
                    });
                    saveSession();
                }
            },
            {
                label: 'Close Tabs to Right',
                click: () => {
                    const tabs = tabManager.getTabsForProfile(tab.profileId);
                    const idx = tabs.findIndex(t => t.id === tabId);
                    if (idx !== -1) {
                        tabs.slice(idx + 1).forEach(t => {
                            tabManager.closeTab(t.id);
                            mainWindow.webContents.send('tab-closed-backend', t.id);
                        });
                        saveSession();
                    }
                }
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        menu.popup({ window: mainWindow });
    });

    ipcMain.on('show-profile-menu', (event, { x, y, activeProfileId }) => {
        const profiles = profileManager.getAllProfiles();
        // Native Menu Template
        const template = profiles.map(profile => ({
            label: profile.name,
            // Add checkmark if active
            type: 'radio',
            checked: profile.id === activeProfileId,
            click: () => {
                // Tell frontend to switch
                mainWindow.webContents.send('switch-profile-request', profile.id);
                // Also trigger backend switch if needed, but frontend flow drives it
                // 'get-profile-tabs' is called by frontend in handleSwitchProfile
            },
            icon: null // TODO: Can we use emoji here? System menus usually support text.
        }));

        template.push({ type: 'separator' });
        template.push({
            label: 'Settings',
            click: () => {
                // Open Settings (Phase 4 placeholder)
                console.log('Open Settings Clicked');
                // You can send an event to frontend to open modal
                mainWindow.webContents.send('open-settings-modal');
            }
        });

        const menu = Menu.buildFromTemplate(template);
        menu.popup({
            window: mainWindow,
            x: x,
            y: y
        });
    });

    ipcMain.on('show-new-tab-menu', (event, { x, y, profileId }) => {
        const providers = settingsManager.getProviders();

        const template = providers.map(provider => ({
            label: provider.name,
            click: () => {
                // Create a new tab with this provider's URL
                const id = tabManager.createTab(profileId, provider.url);
                const success = tabManager.switchTo(id);

                if (success) {
                    mainWindow.webContents.send('tab-created', {
                        id,
                        profileId,
                        title: 'New Thread',
                        url: provider.url
                    });
                    updateViewBounds();
                    saveSession();
                }
            }
        }));

        const menu = Menu.buildFromTemplate(template);
        menu.popup({
            window: mainWindow,
            x: x,
            y: y
        });
    });

    ipcMain.on('get-profile-tabs', (event, profileId) => {
        const tabs = tabManager.getTabsForProfile(profileId);
        event.reply('profile-tabs-loaded', { profileId, tabs });
    });

    ipcMain.handle('get-all-tabs', () => {
        return {
            tabs: tabManager.getAllTabs(),
            activeTabId: tabManager.activeTabId
        };
    });

    // Settings Management
    ipcMain.handle('get-settings', () => {
        return settingsManager.getSettings();
    });

    ipcMain.handle('save-settings', (event, newSettings) => {
        const success = settingsManager.saveSettings(newSettings);
        // define specific events if needed, e.g. broadcast to all windows
        mainWindow.webContents.send('settings-updated', settingsManager.getSettings());
        return success;
    });

    // Navigation
    ipcMain.on('nav-back', () => tabManager.goBack());
    ipcMain.on('nav-forward', () => tabManager.goForward());
    ipcMain.on('nav-reload', () => tabManager.reload());

    mainWindow.on('resize', () => {
        updateViewBounds();
        if (!mainWindow.isMaximized() && !mainWindow.isMinimized()) {
            const bounds = mainWindow.getBounds();
            currentWindowState.width = bounds.width;
            currentWindowState.height = bounds.height;
            currentWindowState.x = bounds.x;
            currentWindowState.y = bounds.y;
        }
    });

    mainWindow.on('move', () => {
        if (!mainWindow.isMaximized() && !mainWindow.isMinimized()) {
            const bounds = mainWindow.getBounds();
            currentWindowState.x = bounds.x;
            currentWindowState.y = bounds.y;
        }
    });

    mainWindow.on('maximize', () => {
        currentWindowState.isMaximized = true;
        mainWindow.webContents.send('window-maximized', true);
    });
    mainWindow.on('unmaximize', () => {
        currentWindowState.isMaximized = false;
        mainWindow.webContents.send('window-maximized', false);
    });
}

function createApplicationMenu() {
    const isMac = process.platform === 'darwin';

    const template = [
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        }] : []),
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Tab',
                    accelerator: 'CmdOrCtrl+T',
                    click: () => {
                        if (mainWindow && tabManager) {
                            let profileId = 'work';
                            if (tabManager.activeTabId) {
                                const tab = tabManager.tabs.get(tabManager.activeTabId);
                                if (tab) profileId = tab.profileId;
                            }

                            const id = tabManager.createTab(profileId);
                            const success = tabManager.switchTo(id);

                            if (success) {
                                mainWindow.webContents.send('tab-created', {
                                    id,
                                    profileId,
                                    title: 'New Thread'
                                });
                                updateViewBounds();
                                saveSession();
                            }
                        }
                    }
                },
                {
                    label: 'Close Tab',
                    accelerator: 'CmdOrCtrl+W',
                    click: () => {
                        if (mainWindow && tabManager && tabManager.activeTabId) {
                            // Send request to frontend to close it, so frontend logic (state update + min tab check) runs there
                            mainWindow.webContents.send('request-close-tab', tabManager.activeTabId);
                        }
                    }
                },
                {
                    label: 'Reopen Closed Tab',
                    accelerator: 'CmdOrCtrl+Shift+T',
                    click: () => {
                        if (closedTabs.length > 0 && tabManager) {
                            const lastClosed = closedTabs.pop();
                            const id = tabManager.createTab(lastClosed.profileId, lastClosed.url);
                            tabManager.switchTo(id);
                            mainWindow.webContents.send('tab-created', {
                                id,
                                profileId: lastClosed.profileId,
                                title: lastClosed.title
                            });
                            updateViewBounds();
                            saveSession();
                        }
                    }
                },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'delete' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(isMac ? [
                    { type: 'separator' },
                    { role: 'front' },
                    { type: 'separator' },
                    { role: 'window' }
                ] : [
                    { label: 'Close Window', accelerator: 'Alt+F4', click: () => { if (mainWindow) mainWindow.close(); } }
                ])
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function updateViewBounds() {
    if (!mainWindow || !tabManager) return;
    const bounds = mainWindow.getBounds();
    const contentBounds = {
        x: 0,
        y: 40, // Height of React titlebar
        width: bounds.width,
        height: bounds.height - 40
    };
    tabManager.resizeActiveView(contentBounds);
}

function saveSession() {
    if (!tabManager) return;

    const sessionData = {
        tabs: Array.from(tabManager.tabs.values()).map(t => ({
            id: t.id,
            profileId: t.profileId,
            url: t.url,
            title: t.title
        })),
        activeTabId: tabManager.activeTabId,
        windowBounds: currentWindowState,
        isMaximized: currentWindowState.isMaximized
    };

    try {
        fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
    } catch (e) {
        console.error('Failed to save session:', e);
    }
}

function restoreSession() {
    try {
        if (!fs.existsSync(SESSION_FILE)) return;

        const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));

        if (!data.tabs || data.tabs.length === 0) return;

        data.tabs.forEach(tabData => {
            const id = tabManager.createTab(tabData.profileId, tabData.url, tabData.id);
            mainWindow.webContents.send('tab-created', {
                id,
                profileId: tabData.profileId,
                title: tabData.title || 'Restored'
            });
        });

        if (data.activeTabId && tabManager.tabs.has(data.activeTabId)) {
            setTimeout(() => {
                tabManager.switchTo(data.activeTabId);
                mainWindow.webContents.send('restore-active', data.activeTabId);
                updateViewBounds();
            }, 500);
        }
    } catch (e) {
        console.error('Failed to restore session:', e);
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    saveSession();
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    saveSession();
});
