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
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.tabs = new Map();
        this.activeTabId = null;
    }

    createTab(profileId, url = 'https://www.perplexity.ai', existingId = null) {
        const id = existingId || 'tab-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

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
            url: url
        });

        view.webContents.loadURL(url);

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
            if (tab) tab.url = url;
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
    }

    getTabsForProfile(profileId) {
        return Array.from(this.tabs.values())
            .filter(tab => tab.profileId === profileId)
            .map(tab => ({ id: tab.id, title: tab.title, url: tab.url, profileId: tab.profileId }));
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
}

module.exports = TabManager;
