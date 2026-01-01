const { ipcMain } = require('electron');

/**
 * Registers tab management IPC handlers
 * @param {BrowserWindow} mainWindow - The main application window
 * @param {Object} dependencies - Required dependencies
 * @param {TabManager} dependencies.tabManager - Tab manager instance
 * @param {Function} dependencies.saveSession - Function to save session
 * @param {Function} dependencies.updateViewBounds - Function to update view bounds
 * @param {Array} dependencies.closedTabs - Array to track closed tabs
 */
function register(mainWindow, { tabManager, saveSession, updateViewBounds, closedTabs }) {
    // Create new tab
    ipcMain.on('create-tab', (event, profileId) => {
        const id = tabManager.createTab(profileId);
        const tab = tabManager.tabs.get(id);
        const success = tabManager.switchTo(id);

        if (success) {
            mainWindow.webContents.send('tab-created', {
                id,
                profileId,
                title: 'New Thread',
                url: tab?.url || ''
            });
            updateViewBounds();
            saveSession();
        }
    });

    // Create new tab with specific URL
    ipcMain.on('create-tab-with-url', (event, { profileId, url }) => {
        const id = tabManager.createTab(profileId, url);
        const tab = tabManager.tabs.get(id);
        const success = tabManager.switchTo(id);

        if (success) {
            mainWindow.webContents.send('tab-created', {
                id,
                profileId,
                title: 'New Thread',
                url: tab?.url || url || ''
            });
            updateViewBounds();
            saveSession();
        }
    });

    // Switch to tab
    ipcMain.on('switch-tab', (event, tabId) => {
        const success = tabManager.switchTo(tabId);
        if (success) {
            updateViewBounds();
            saveSession(); // Save session to track active tab per profile
        }
    });

    // Close tab
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

    // Duplicate tab
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

    // Reload tab
    ipcMain.on('reload-tab', (event, tabId) => {
        const tab = tabManager.tabs.get(tabId);
        if (tab && tab.view) {
            tab.view.webContents.reload();
        }
    });

    // Reopen last closed tab
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

    // Close other tabs
    ipcMain.on('close-other-tabs', (event, { tabId, profileId }) => {
        const tabs = tabManager.getTabsForProfile(profileId);
        tabs.forEach(tab => {
            if (tab.id !== tabId) {
                tabManager.closeTab(tab.id);
            }
        });
        saveSession();
    });

    // Close tabs to the right
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

    // Reorder tabs
    ipcMain.on('reorder-tabs', (event, tabOrder) => {
        tabManager.reorderTabs(tabOrder);
        saveSession();
    });
}

module.exports = { register };
