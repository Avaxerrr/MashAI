import { Menu, nativeImage, ipcMain, BrowserWindow, app, MenuItemConstructorOptions } from 'electron';
import * as path from 'path';
import type TabManager from './TabManager';
import type ProfileManager from './ProfileManager';
import type SettingsManager from './SettingsManager';

interface ClosedTab {
    id: string;
    profileId: string;
    url: string;
    title: string;
}

interface MenuDependencies {
    tabManager: TabManager;
    profileManager: ProfileManager;
    settingsManager: SettingsManager;
    closedTabs: ClosedTab[];
    saveSession: () => void;
    updateViewBounds: () => void;
    createSettingsWindow: () => void;
}

/**
 * Builds and manages application menus
 */
class MenuBuilder {
    private mainWindow: BrowserWindow;
    private tabManager: TabManager;
    private profileManager: ProfileManager;
    private settingsManager: SettingsManager;
    private closedTabs: ClosedTab[];
    private saveSession: () => void;
    private updateViewBounds: () => void;
    private createSettingsWindow: () => void;

    constructor(mainWindow: BrowserWindow, dependencies: MenuDependencies) {
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
    registerHandlers(): void {
        // Tab context menu
        ipcMain.on('show-context-menu', (_event, { tabId }: { tabId: string }) => {
            const tab = this.tabManager.tabs.get(tabId);
            if (!tab) return;

            const template: MenuItemConstructorOptions[] = [
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
                        // Pass source tabId to insert duplicate right after the original
                        const newId = this.tabManager.createTab(tab.profileId, tab.url, null, undefined, tabId);
                        this.tabManager.switchTo(newId);
                        this.mainWindow.webContents.send('tab-created', {
                            id: newId,
                            profileId: tab.profileId,
                            title: tab.title,
                            loaded: true,
                            afterTabId: tabId
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
        ipcMain.on('show-profile-menu', (_event, { x, y, activeProfileId }: { x: number; y: number; activeProfileId: string }) => {
            const profiles = this.profileManager.getAllProfiles();
            const template: MenuItemConstructorOptions[] = profiles.map(profile => ({
                label: profile.name,
                type: 'radio' as const,
                checked: profile.id === activeProfileId,
                click: () => {
                    this.mainWindow.webContents.send('switch-profile-request', profile.id);
                }
            }));

            template.push({ type: 'separator' });

            let settingsIcon: Electron.NativeImage | undefined = undefined;
            try {
                let iconPath;
                if (app.isPackaged) {
                    iconPath = path.join(process.resourcesPath, 'assets/settings.png');
                } else {
                    iconPath = path.join(__dirname, '../../src/assets/settings.png');
                }
                settingsIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
            } catch (e) {
                console.error('Failed to load settings icon:', e);
            }

            template.push({
                label: 'Settings',
                ...(settingsIcon ? { icon: settingsIcon } : {}),
                click: () => {
                    this.createSettingsWindow();
                }
            });

            template.push({ type: 'separator' });

            template.push({
                label: 'Quit MashAI',
                click: () => {
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
        ipcMain.on('show-new-tab-menu', (_event, { x, y, profileId }: { x: number; y: number; profileId: string }) => {
            const providers = this.settingsManager.getProviders();

            const template: MenuItemConstructorOptions[] = providers.map(provider => {
                let icon: Electron.NativeImage | undefined = undefined;
                if (provider.faviconDataUrl) {
                    try {
                        const img = nativeImage.createFromDataURL(provider.faviconDataUrl);
                        icon = img.resize({ width: 16, height: 16 });
                    } catch (err) {
                        console.warn(`Failed to load cached favicon for ${provider.name}:`, (err as Error).message);
                    }
                }

                return {
                    label: provider.name,
                    ...(icon ? { icon } : {}),
                    click: () => {
                        const id = this.tabManager.createTab(profileId, provider.url);
                        const success = this.tabManager.switchTo(id);

                        if (success) {
                            this.mainWindow.webContents.send('tab-created', {
                                id,
                                profileId,
                                title: 'New Thread',
                                url: provider.url,
                                loaded: true
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
    createApplicationMenu(): void {
        const isMac = process.platform === 'darwin';

        const template: MenuItemConstructorOptions[] = [
            ...(isMac ? [{
                label: app.name,
                submenu: [
                    { role: 'about' as const },
                    { type: 'separator' as const },
                    { role: 'services' as const },
                    { type: 'separator' as const },
                    { role: 'hide' as const },
                    { role: 'hideOthers' as const },
                    { role: 'unhide' as const },
                    { type: 'separator' as const },
                    { role: 'quit' as const }
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
                                        title: 'New Thread',
                                        loaded: true
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
                                const lastClosed = this.closedTabs.pop()!;
                                const id = this.tabManager.createTab(lastClosed.profileId, lastClosed.url);
                                this.tabManager.switchTo(id);
                                this.mainWindow.webContents.send('tab-created', {
                                    id,
                                    profileId: lastClosed.profileId,
                                    title: lastClosed.title,
                                    loaded: true
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

                            const activeTab = this.tabManager.tabs.get(this.tabManager.activeTabId);
                            if (!activeTab) return;

                            const activeProfileId = activeTab.profileId;
                            const profileTabs = Array.from(this.tabManager.tabs.values())
                                .filter(tab => tab.profileId === activeProfileId);

                            if (profileTabs.length <= 1) return;

                            const currentIndex = profileTabs.findIndex(tab => tab.id === this.tabManager.activeTabId);
                            const nextIndex = (currentIndex + 1) % profileTabs.length;
                            const nextTab = profileTabs[nextIndex];

                            this.tabManager.switchTo(nextTab.id);
                            this.updateViewBounds();
                            this.mainWindow.webContents.send('restore-active', nextTab.id);
                        }
                    },
                    {
                        label: 'Previous Tab',
                        accelerator: 'Ctrl+Shift+Tab',
                        click: () => {
                            if (!this.tabManager || !this.tabManager.activeTabId) return;

                            const activeTab = this.tabManager.tabs.get(this.tabManager.activeTabId);
                            if (!activeTab) return;

                            const activeProfileId = activeTab.profileId;
                            const profileTabs = Array.from(this.tabManager.tabs.values())
                                .filter(tab => tab.profileId === activeProfileId);

                            if (profileTabs.length <= 1) return;

                            const currentIndex = profileTabs.findIndex(tab => tab.id === this.tabManager.activeTabId);
                            const prevIndex = currentIndex - 1 < 0 ? profileTabs.length - 1 : currentIndex - 1;
                            const prevTab = profileTabs[prevIndex];

                            this.tabManager.switchTo(prevTab.id);
                            this.updateViewBounds();
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
                    {
                        label: 'Reload Tab',
                        accelerator: 'CmdOrCtrl+R',
                        click: () => {
                            if (this.tabManager) {
                                this.tabManager.reload();
                            }
                        }
                    },
                    {
                        label: 'Force Reload Tab',
                        accelerator: 'CmdOrCtrl+Shift+R',
                        click: () => {
                            const view = this.tabManager?.getActiveView();
                            if (view) view.webContents.reloadIgnoringCache();
                        }
                    },
                    {
                        label: 'Reload App UI (Dev)',
                        accelerator: 'CmdOrCtrl+Shift+F5',
                        visible: process.env.NODE_ENV === 'development',
                        click: () => {
                            this.mainWindow.webContents.reload();
                        }
                    },
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
                        { type: 'separator' as const },
                        { role: 'front' as const },
                        { type: 'separator' as const },
                        { role: 'window' as const }
                    ] : [
                        {
                            label: 'Close Window',
                            accelerator: 'Alt+F4',
                            click: () => {
                                if (this.mainWindow) this.mainWindow.close();
                            }
                        }
                    ])
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }
}

export default MenuBuilder;
