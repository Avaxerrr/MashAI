import { useState, useEffect, useRef } from 'react'
import TitleBar from './components/TitleBar'

function App() {
    const [profiles, setProfiles] = useState([])
    const [tabs, setTabs] = useState([])
    const [activeProfileId, setActiveProfileId] = useState('work')
    const [activeTabId, setActiveTabId] = useState(null)

    // Ref to hold the latest closeTab function to avoid stale closures in listeners
    const closeTabRef = useRef()

    useEffect(() => {
        // Safety check
        if (!window.api) {
            console.error('window.api is undefined - preload script failed to load!')
            return
        }

        // Event handlers
        const handleProfilesLoaded = (profileList) => {
            setProfiles(profileList)
        }

        const handleTabCreated = (tab) => {
            setTabs(prev => {
                // Prevent duplicates
                if (prev.some(t => t.id === tab.id)) {
                    return prev
                }
                return [...prev, tab]
            })
            setActiveTabId(tab.id)
        }

        const handleTabUpdated = ({ id, title }) => {
            setTabs(prev => prev.map(tab =>
                tab.id === id ? { ...tab, title } : tab
            ))
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

        // Listen for Menu shortcuts (Backend -> Frontend)
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
                onSwitchTab={switchTab}
                onCloseTab={closeTab}
                onDuplicateTab={duplicateTab}
                onReloadTab={reloadTab}
                onCloseOtherTabs={closeOtherTabs}
                onCloseTabsToRight={closeTabsToRight}
                onSwitchProfile={switchProfile}
            />

            {/* The WebContentsView will render here (controlled by Electron) */}
            <div className="flex-1" />
        </div>
    )
}

export default App
