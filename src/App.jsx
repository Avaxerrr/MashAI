import { useState, useEffect, useRef } from 'react'
import TitleBar from './components/TitleBar'
import SettingsModal from './components/SettingsModal'

function App() {
    const [profiles, setProfiles] = useState([])
    const [tabs, setTabs] = useState([])
    const [activeProfileId, setActiveProfileId] = useState('work')
    const [activeTabId, setActiveTabId] = useState(null)

    const [aiProviders, setAiProviders] = useState([]) // New state for providers
    const [defaultProviderId, setDefaultProviderId] = useState('perplexity')
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    // Ref to hold the latest closeTab function to avoid stale closures in listeners
    const closeTabRef = useRef()

    useEffect(() => {
        // Safety check
        if (!window.api) {
            console.error('window.api is undefined - preload script failed to load!')
            return
        }

        // Initial Data Load
        const loadInitialData = async () => {
            try {
                const settings = await window.api.getSettings();
                if (settings) {
                    if (settings.aiProviders) setAiProviders(settings.aiProviders);
                    if (settings.defaultProviderId) setDefaultProviderId(settings.defaultProviderId);
                }

                // Restore tabs from backend (important for Ctrl+R reload)
                const tabData = await window.api.getAllTabs();
                if (tabData && tabData.tabs) {
                    setTabs(tabData.tabs);
                    if (tabData.activeTabId) {
                        setActiveTabId(tabData.activeTabId);
                    }
                }
            } catch (err) {
                console.error('Failed to load settings:', err);
            }
        }
        loadInitialData();

        // Event handlers
        const handleProfilesLoaded = (profileList) => {
            console.log('App: Profiles loaded', profileList)
            setProfiles(profileList)
        }

        const handleTabCreated = (tab) => {
            console.log('App: Tab created', tab)
            setTabs(prev => {
                // Prevent duplicates
                if (prev.some(t => t.id === tab.id)) {
                    return prev
                }
                return [...prev, tab]
            })
            // If this tab was just created for the active profile, switch to it?
            // Actually, main process handles switching most of the time.
            setActiveTabId(tab.id)
        }

        const handleTabUpdated = ({ id, title }) => {
            setTabs(prev => prev.map(tab =>
                tab.id === id ? { ...tab, title } : tab
            ))
        }

        const handleOpenSettings = () => {
            setIsSettingsOpen(true)
        }

        const handleRestoreActive = (tabId) => {
            setActiveTabId(tabId)
        }

        const handleProfileTabsLoaded = ({ profileId, tabs: loadedTabs }) => {
            setTabs(loadedTabs)
            if (loadedTabs.length > 0) {
                setActiveTabId(loadedTabs[0].id)
                window.api.switchTab(loadedTabs[0].id)
            }
        }

        // Register listeners
        window.api.onProfilesLoaded(handleProfilesLoaded)
        window.api.onTabCreated(handleTabCreated)
        window.api.onTabUpdated(handleTabUpdated)
        window.api.onRestoreActive(handleRestoreActive)
        window.api.onProfileTabsLoaded(handleProfileTabsLoaded)
        window.api.onOpenSettingsModal(handleOpenSettings)

        // Listen for Menu events
        const removeSwitchProfileRequest = window.api.onSwitchProfileRequest((id) => {
            switchProfile(id)
        })
        if (window.api.onRequestCloseTab) {
            window.api.onRequestCloseTab((tabId) => {
                if (closeTabRef.current) {
                    closeTabRef.current(tabId)
                }
            })
        }

        // Listen for backend-initiated closures (Context Menu)
        if (window.api.onTabClosedBackend) {
            window.api.onTabClosedBackend((tabId) => {
                setTabs(prev => prev.filter(tab => tab.id !== tabId))
            })
        }

        // Cleanup function (prevents double registration)
        return () => {
            // Note: ipcRenderer.removeListener would go here if we exposed it
            console.log('Cleaning up listeners')
        }
    }, [])

    const createTab = () => {
        window.api.createTab(activeProfileId)
    }

    const createTabWithUrl = (profileId, url) => {
        window.api.createTabWithUrl(profileId, url)
    }

    const switchTab = (tabId) => {
        setActiveTabId(tabId)
        window.api.switchTab(tabId)
    }

    const closeTab = (tabId) => {
        // Prevent closing the last tab for the current profile
        const activeProfileTabs = tabs.filter(t => t.profileId === activeProfileId)
        if (activeProfileTabs.length <= 1) {
            return
        }

        window.api.closeTab(tabId)
        setTabs(prev => {
            const filtered = prev.filter(tab => tab.id !== tabId)

            // If we closed the active tab, switch to another
            if (tabId === activeTabId && filtered.length > 0) {
                // We need to find a tab that belongs to the current profile
                const currentProfileFiltered = filtered.filter(t => t.profileId === activeProfileId)

                if (currentProfileFiltered.length > 0) {
                    const newActiveTab = currentProfileFiltered[currentProfileFiltered.length - 1]
                    setActiveTabId(newActiveTab.id)
                    window.api.switchTab(newActiveTab.id)
                }
            } else if (filtered.length === 0) {
                setActiveTabId(null)
            }

            return filtered
        })
    }

    // Update ref whenever closeTab changes (which depends on state)
    useEffect(() => {
        closeTabRef.current = closeTab
    }, [closeTab])

    const duplicateTab = (tabId) => {
        window.api.duplicateTab(tabId)
    }

    const reloadTab = (tabId) => {
        window.api.reloadTab(tabId)
    }

    const reopenClosedTab = () => {
        window.api.reopenClosedTab()
    }

    const closeOtherTabs = (tabId) => {
        window.api.closeOtherTabs(tabId, activeProfileId)
        setTabs(prev => prev.filter(tab => tab.id === tabId))
    }

    const closeTabsToRight = (tabId) => {
        window.api.closeTabsToRight(tabId, activeProfileId)
        setTabs(prev => {
            const index = prev.findIndex(t => t.id === tabId)
            return prev.slice(0, index + 1)
        })
    }

    const switchProfile = (profileId) => {
        setActiveProfileId(profileId)
        window.api.getProfileTabs(profileId)
    }

    const handleSaveSettings = async (newSettings) => {
        const success = await window.api.saveSettings(newSettings)
        if (success) {
            // Reload local state
            setProfiles(newSettings.profiles)
            setAiProviders(newSettings.aiProviders)
            setDefaultProviderId(newSettings.defaultProviderId)
            // If active profile was deleted, switch to first??
            if (!newSettings.profiles.find(p => p.id === activeProfileId)) {
                if (newSettings.profiles.length > 0) {
                    switchProfile(newSettings.profiles[0].id)
                }
            }
        }
    }

    // Removed useKeyboardShortcuts - handled by Electron Main Menu now

    const currentTabs = tabs.filter(t => t.profileId === activeProfileId)

    return (
        <div className="h-screen w-screen bg-editor-bg flex flex-col overflow-hidden">
            <TitleBar
                profiles={profiles}
                activeProfile={profiles.find(p => p.id === activeProfileId)}
                tabs={currentTabs}
                activeTabId={activeTabId}
                onCreateTab={createTab}
                onCreateTabWithUrl={createTabWithUrl}
                onSwitchTab={switchTab}
                onCloseTab={closeTab}
                onDuplicateTab={duplicateTab}
                onReloadTab={reloadTab}
                onCloseOtherTabs={closeOtherTabs}
                onCloseTabsToRight={closeTabsToRight}
                onSwitchProfile={switchProfile}
                aiProviders={aiProviders}
            />

            {/* The WebContentsView will render here (controlled by Electron) */}
            <div className="flex-1" />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSave={handleSaveSettings}
                initialSettings={{
                    profiles,
                    aiProviders,
                    defaultProviderId
                }}
            />
        </div>
    )
}

export default App
