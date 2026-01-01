const { WebContentsView } = require('electron');

const INJECTED_CSS = `
    .sticky.top-0.z-50.w-full.bg-super,
    [class*="AppBanner"],
    [class*="downloadBanner"] { 
        display: none !important; 
    }
    body { padding-top: 0 !important; }
`;

class TabManager {
    constructor(mainWindow, settingsManager) {
        this.mainWindow = mainWindow;
        this.settingsManager = settingsManager;
        this.tabs = new Map();
        this.activeTabId = null;
        this.tabOrder = []; // Track tab order globally
    }

    createTab(profileId, url = null, existingId = null) {
        const id = existingId || 'tab-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        // Determine URL
        let finalUrl = url;
        if (!finalUrl) {
            const defaultProviderId = this.settingsManager.getDefaultProviderId();
            const providers = this.settingsManager.getProviders();
            const provider = providers.find(p => p.id === defaultProviderId);
            finalUrl = provider ? provider.url : 'https://www.perplexity.ai';
        }

        const view = new WebContentsView({
            webPreferences: {
                partition: `persist:${profileId}`,
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        this.tabs.set(id, {
            id,
            view,
            profileId,
            title: 'New Thread',
            url: finalUrl
        });

        // Add to tab order if not already present
        if (!this.tabOrder.includes(id)) {
            this.tabOrder.push(id);
        }

        view.webContents.loadURL(finalUrl);

        view.webContents.on('did-finish-load', () => {
            view.webContents.insertCSS(INJECTED_CSS);
        });

        view.webContents.on('page-title-updated', (e, title) => {
            const tab = this.tabs.get(id);
            if (tab) {
                tab.title = title;
                this.mainWindow.webContents.send('tab-updated', { id, title });
            }
        });

        view.webContents.on('did-navigate', (e, url) => {
            const tab = this.tabs.get(id);
            if (tab) {
                tab.url = url;
                this.mainWindow.webContents.send('tab-updated', { id, url });
            }
        });

        view.webContents.on('did-navigate-in-page', (e, url) => {
            const tab = this.tabs.get(id);
            if (tab) {
                tab.url = url;
                this.mainWindow.webContents.send('tab-updated', { id, url });
            }
        });

        return id;
    }

    switchTo(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return false;

        if (this.activeTabId && this.activeTabId !== tabId) {
            const currentTab = this.tabs.get(this.activeTabId);
            if (currentTab && currentTab.view) {
                try {
                    this.mainWindow.contentView.removeChildView(currentTab.view);
                } catch (e) {
                    console.warn('Could not remove view:', e);
                }
            }
        }

        try {
            this.mainWindow.contentView.addChildView(tab.view);
            this.activeTabId = tabId;
            return true;
        } catch (e) {
            console.error('Could not add view:', e);
            return false;
        }
    }

    closeTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        if (this.activeTabId === tabId) {
            try {
                this.mainWindow.contentView.removeChildView(tab.view);
            } catch (e) {
                console.warn('Could not remove view:', e);
            }
            this.activeTabId = null;
        }

        try {
            tab.view.webContents.close();
        } catch (e) {
            console.warn('Could not close webContents:', e);
        }

        this.tabs.delete(tabId);

        // Remove from tab order
        const orderIndex = this.tabOrder.indexOf(tabId);
        if (orderIndex !== -1) {
            this.tabOrder.splice(orderIndex, 1);
        }
    }

    getTabsForProfile(profileId) {
        // Return tabs in the order defined by tabOrder, filtered by profileId
        const orderedTabs = [];
        for (const tabId of this.tabOrder) {
            const tab = this.tabs.get(tabId);
            if (tab && tab.profileId === profileId) {
                orderedTabs.push({
                    id: tab.id,
                    title: tab.title,
                    url: tab.url,
                    profileId: tab.profileId
                });
            }
        }
        return orderedTabs;
    }

    getActiveView() {
        if (!this.activeTabId) return null;
        const tab = this.tabs.get(this.activeTabId);
        return tab ? tab.view : null;
    }

    resizeActiveView(bounds) {
        const view = this.getActiveView();
        if (view) {
            view.setBounds(bounds);
        }
    }

    goBack() {
        const view = this.getActiveView();
        if (view && view.webContents.canGoBack()) {
            view.webContents.goBack();
        }
    }

    goForward() {
        const view = this.getActiveView();
        if (view && view.webContents.canGoForward()) {
            view.webContents.goForward();
        }
    }

    reload() {
        const view = this.getActiveView();
        if (view) view.webContents.reload();
    }

    getAllTabs() {
        // Return tabs in the order defined by tabOrder
        const orderedTabs = [];
        for (const tabId of this.tabOrder) {
            const tab = this.tabs.get(tabId);
            if (tab) {
                orderedTabs.push({
                    id: tab.id,
                    profileId: tab.profileId,
                    title: tab.title,
                    url: tab.url
                });
            }
        }
        return orderedTabs;
    }

    reorderTabs(newOrder) {
        // Update the tab order array
        // Only include tabs that currently exist
        this.tabOrder = newOrder.filter(id => this.tabs.has(id));
    }

    getActiveTabId() {
        return this.activeTabId;
    }

    hideActiveView() {
        if (!this.activeTabId) return;
        const tab = this.tabs.get(this.activeTabId);
        if (tab && tab.view) {
            try {
                this.mainWindow.contentView.removeChildView(tab.view);
            } catch (e) {
                console.warn('Could not hide view:', e);
            }
        }
    }

    showActiveView() {
        if (!this.activeTabId) return;
        const tab = this.tabs.get(this.activeTabId);
        if (tab && tab.view) {
            try {
                this.mainWindow.contentView.addChildView(tab.view);
            } catch (e) {
                console.warn('Could not show view:', e);
            }
        }
    }
}

module.exports = TabManager;
