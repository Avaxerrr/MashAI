const { Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');

/**
 * Builds and manages application menus
 */
class MenuBuilder {
    constructor(mainWindow, dependencies) {
        this.mainWindow = mainWindow;
        this.tabManager = dependencies.tabManager;
        this.profileManager = dependencies.profileManager;
        this.settingsManager = dependencies.settingsManager;
        this.closedTabs = dependencies.closedTabs;
        this.saveSession = dependencies.saveSession;
        this.updateViewBounds = dependencies.updateViewBounds;
        this.createSettingsWindow = dependencies.createSettingsWindow;
    }

    /**
     * Register context menu IPC handlers
     */
    registerHandlers() {
        // Tab context menu
        ipcMain.on('show-context-menu', (event, { tabId }) => {
            const tab = this.tabManager.tabs.get(tabId);
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
                        const newId = this.tabManager.createTab(tab.profileId, tab.url);
                        this.tabManager.switchTo(newId);
                        this.mainWindow.webContents.send('tab-created', {
                            id: newId,
                            profileId: tab.profileId,
                            title: tab.title
                        });
                        this.updateViewBounds();
                        this.saveSession();
                    }
                },
                { type: 'separator' },
                {
                    label: 'Close Tab',
                    accelerator: 'CmdOrCtrl+W',
                    click: () => {
                        // Use frontend logic for safety
                        this.mainWindow.webContents.send('request-close-tab', tabId);
                    }
                },
                {
                    label: 'Close Other Tabs',
                    click: () => {
                        const tabs = this.tabManager.getTabsForProfile(tab.profileId);
                        tabs.forEach(t => {
                            if (t.id !== tabId) {
                                this.tabManager.closeTab(t.id);
                                this.mainWindow.webContents.send('tab-closed-backend', t.id);
                            }
                        });
                        this.saveSession();
                    }
                },
                {
                    label: 'Close Tabs to Right',
                    click: () => {
                        const tabs = this.tabManager.getTabsForProfile(tab.profileId);
                        const idx = tabs.findIndex(t => t.id === tabId);
                        if (idx !== -1) {
                            tabs.slice(idx + 1).forEach(t => {
                                this.tabManager.closeTab(t.id);
                                this.mainWindow.webContents.send('tab-closed-backend', t.id);
                            });
                            this.saveSession();
                        }
                    }
                }
            ];

            const menu = Menu.buildFromTemplate(template);
            menu.popup({ window: this.mainWindow });
        });

        // Profile menu
        ipcMain.on('show-profile-menu', (event, { x, y, activeProfileId }) => {
            const profiles = this.profileManager.getAllProfiles();
            const template = profiles.map(profile => ({
                label: profile.name,
                type: 'radio',
                checked: profile.id === activeProfileId,
                click: () => {
                    this.mainWindow.webContents.send('switch-profile-request', profile.id);
                },
                icon: null
            }));

            template.push({ type: 'separator' });

            let settingsIcon = null;
            try {
                const iconPath = path.join(__dirname, '../src/assets/settings.png');
                settingsIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
            } catch (e) {
                console.error('Failed to load settings icon:', e);
            }

            template.push({
                label: 'Settings',
                icon: settingsIcon,
                click: () => {
                    this.createSettingsWindow();
                }
            });

            template.push({ type: 'separator' });

            template.push({
                label: 'Quit MashAI',
                click: () => {
                    const { app } = require('electron');
                    app.quit();
                }
            });

            const menu = Menu.buildFromTemplate(template);
            menu.popup({
                window: this.mainWindow,
                x: x,
                y: y
            });
        });

        // New tab menu
        ipcMain.on('show-new-tab-menu', (event, { x, y, profileId }) => {
            const providers = this.settingsManager.getProviders();

            const template = providers.map(provider => {
                let icon = null;
                if (provider.faviconDataUrl) {
                    try {
                        const img = nativeImage.createFromDataURL(provider.faviconDataUrl);
                        icon = img.resize({ width: 16, height: 16 });
                    } catch (err) {
                        console.warn(`Failed to load cached favicon for ${provider.name}:`, err.message);
                    }
                }

                return {
                    label: provider.name,
                    icon: icon,
                    click: () => {
                        const id = this.tabManager.createTab(profileId, provider.url);
                        const success = this.tabManager.switchTo(id);

                        if (success) {
                            this.mainWindow.webContents.send('tab-created', {
                                id,
                                profileId,
                                title: 'New Thread',
                                url: provider.url
                            });
                            this.updateViewBounds();
                            this.saveSession();
                        }
                    }
                };
            });

            const menu = Menu.buildFromTemplate(template);
            menu.popup({
                window: this.mainWindow,
                x: x,
                y: y
            });
        });
    }

    /**
     * Create the application menu bar
     */
    createApplicationMenu() {
        const { app } = require('electron');
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
                            if (this.mainWindow && this.tabManager) {
                                let profileId = 'work';
                                if (this.tabManager.activeTabId) {
                                    const tab = this.tabManager.tabs.get(this.tabManager.activeTabId);
                                    if (tab) profileId = tab.profileId;
                                }

                                const id = this.tabManager.createTab(profileId);
                                const success = this.tabManager.switchTo(id);

                                if (success) {
                                    this.mainWindow.webContents.send('tab-created', {
                                        id,
                                        profileId,
                                        title: 'New Thread'
                                    });
                                    this.updateViewBounds();
                                    this.saveSession();
                                }
                            }
                        }
                    },
                    {
                        label: 'Close Tab',
                        accelerator: 'CmdOrCtrl+W',
                        click: () => {
                            if (this.mainWindow && this.tabManager && this.tabManager.activeTabId) {
                                this.mainWindow.webContents.send('request-close-tab', this.tabManager.activeTabId);
                            }
                        }
                    },
                    {
                        label: 'Reopen Closed Tab',
                        accelerator: 'CmdOrCtrl+Shift+T',
                        click: () => {
                            if (this.closedTabs.length > 0 && this.tabManager) {
                                const lastClosed = this.closedTabs.pop();
                                const id = this.tabManager.createTab(lastClosed.profileId, lastClosed.url);
                                this.tabManager.switchTo(id);
                                this.mainWindow.webContents.send('tab-created', {
                                    id,
                                    profileId: lastClosed.profileId,
                                    title: lastClosed.title
                                });
                                this.updateViewBounds();
                                this.saveSession();
                            }
                        }
                    },
                    {
                        label: 'Next Tab',
                        accelerator: 'Ctrl+Tab',
                        click: () => {
                            if (!this.tabManager || !this.tabManager.activeTabId) return;

                            // Get active tab's profile
                            const activeTab = this.tabManager.tabs.get(this.tabManager.activeTabId);
                            if (!activeTab) return;

                            const activeProfileId = activeTab.profileId;

                            // Get only tabs from the active profile
                            const profileTabs = Array.from(this.tabManager.tabs.values())
                                .filter(tab => tab.profileId === activeProfileId);

                            if (profileTabs.length <= 1) return;

                            const currentIndex = profileTabs.findIndex(tab => tab.id === this.tabManager.activeTabId);
                            const nextIndex = (currentIndex + 1) % profileTabs.length;
                            const nextTab = profileTabs[nextIndex];

                            this.tabManager.switchTo(nextTab.id);
                            this.updateViewBounds();

                            // Notify frontend to update active tab state
                            this.mainWindow.webContents.send('restore-active', nextTab.id);
                        }
                    },
                    {
                        label: 'Previous Tab',
                        accelerator: 'Ctrl+Shift+Tab',
                        click: () => {
                            if (!this.tabManager || !this.tabManager.activeTabId) return;

                            // Get active tab's profile
                            const activeTab = this.tabManager.tabs.get(this.tabManager.activeTabId);
                            if (!activeTab) return;

                            const activeProfileId = activeTab.profileId;

                            // Get only tabs from the active profile
                            const profileTabs = Array.from(this.tabManager.tabs.values())
                                .filter(tab => tab.profileId === activeProfileId);

                            if (profileTabs.length <= 1) return;

                            const currentIndex = profileTabs.findIndex(tab => tab.id === this.tabManager.activeTabId);
                            const prevIndex = currentIndex - 1 < 0 ? profileTabs.length - 1 : currentIndex - 1;
                            const prevTab = profileTabs[prevIndex];

                            this.tabManager.switchTo(prevTab.id);
                            this.updateViewBounds();

                            // Notify frontend to update active tab state
                            this.mainWindow.webContents.send('restore-active', prevTab.id);
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
                        { label: 'Close Window', accelerator: 'Alt+F4', click: () => { if (this.mainWindow) this.mainWindow.close(); } }
                    ])
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }
}

module.exports = MenuBuilder;
