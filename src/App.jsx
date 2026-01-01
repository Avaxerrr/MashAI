import { useState, useEffect, useRef } from 'react'
import TitleBar from './components/TitleBar'

function App() {
    const [profiles, setProfiles] = useState([])
    const [tabs, setTabs] = useState([])
    const [activeProfileId, setActiveProfileId] = useState(() => {
        // Read from localStorage for instant startup (zero flicker)
        return localStorage.getItem('lastActiveProfileId') || 'work'
    })
    const [activeTabId, setActiveTabId] = useState(null)

    const [aiProviders, setAiProviders] = useState([]) // New state for providers
    const [defaultProviderId, setDefaultProviderId] = useState('perplexity')

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

                        // IMPORTANT: Set the active profile based on the active tab
                        const activeTab = tabData.tabs.find(t => t.id === tabData.activeTabId);
                        if (activeTab && activeTab.profileId) {
                            setActiveProfileId(activeTab.profileId);
                            // Keep localStorage in sync with backend's truth
                            localStorage.setItem('lastActiveProfileId', activeTab.profileId);
                        }
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
            console.log('Current activeProfileId:', activeProfileId)
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

        const handleTabUpdated = ({ id, title, url }) => {
            setTabs(prev => prev.map(tab =>
                tab.id === id ? {
                    ...tab,
                    ...(title !== undefined && { title }),
                    ...(url !== undefined && { url })
                } : tab
            ))
        }

        const handleRestoreActive = (tabId) => {
            setActiveTabId(tabId)
            // Also update the active profile to match the restored tab
            setTabs(prev => {
                const restoredTab = prev.find(t => t.id === tabId);
                if (restoredTab && restoredTab.profileId) {
                    setActiveProfileId(restoredTab.profileId);
                    // Save to localStorage cache
                    localStorage.setItem('lastActiveProfileId', restoredTab.profileId);
                }
                return prev;
            })
        }

        const handleProfileTabsLoaded = ({ profileId, tabs: loadedTabs, lastActiveTabId }) => {
            console.log('Profile tabs loaded for', profileId, 'count:', loadedTabs.length)
            setTabs(loadedTabs)
            if (loadedTabs.length > 0) {
                // Use the last active tab if provided, otherwise use the first tab
                const tabToActivate = lastActiveTabId || loadedTabs[0].id
                setActiveTabId(tabToActivate)
                window.api.switchTab(tabToActivate)
            } else {
                // Profile has no tabs, create a default one
                window.api.createTab(profileId)
            }
        }

        // Register listeners and store cleanup functions
        const cleanupProfilesLoaded = window.api.onProfilesLoaded(handleProfilesLoaded)
        const cleanupTabCreated = window.api.onTabCreated(handleTabCreated)
        const cleanupTabUpdated = window.api.onTabUpdated(handleTabUpdated)
        const cleanupRestoreActive = window.api.onRestoreActive(handleRestoreActive)
        const cleanupProfileTabsLoaded = window.api.onProfileTabsLoaded(handleProfileTabsLoaded)

        // Listen for Menu events
        const cleanupSwitchProfileRequest = window.api.onSwitchProfileRequest((id) => {
            switchProfile(id)
        })

        const cleanupRequestCloseTab = window.api.onRequestCloseTab((tabId) => {
            if (closeTabRef.current) {
                closeTabRef.current(tabId)
            }
        })

        // Listen for backend-initiated closures (Context Menu)
        const cleanupTabClosedBackend = window.api.onTabClosedBackend((tabId) => {
            setTabs(prev => prev.filter(tab => tab.id !== tabId))
        })

        // Listen for settings updates (when user changes settings in the Settings window)
        const cleanupSettingsUpdated = window.api.onSettingsUpdated((newSettings) => {
            console.log('App: Settings updated', newSettings)
            if (newSettings.profiles) {
                setProfiles(newSettings.profiles)
            }
            if (newSettings.aiProviders) {
                setAiProviders(newSettings.aiProviders)
            }
            if (newSettings.defaultProviderId) {
                setDefaultProviderId(newSettings.defaultProviderId)
            }
        })

        // Listen for active profile changes from backend (e.g., after deletion)
        const cleanupActiveProfileChanged = window.api.onActiveProfileChanged((profileId) => {
            setActiveProfileId(profileId)
            localStorage.setItem('lastActiveProfileId', profileId)
            // Load the new profile's tabs so they appear in the UI
            window.api.getProfileTabs(profileId)
        })

        // Cleanup function - ACTUALLY remove listeners
        return () => {
            console.log('Cleaning up listeners')
            if (cleanupProfilesLoaded) cleanupProfilesLoaded()
            if (cleanupTabCreated) cleanupTabCreated()
            if (cleanupTabUpdated) cleanupTabUpdated()
            if (cleanupRestoreActive) cleanupRestoreActive()
            if (cleanupProfileTabsLoaded) cleanupProfileTabsLoaded()
            if (cleanupSwitchProfileRequest) cleanupSwitchProfileRequest()
            if (cleanupRequestCloseTab) cleanupRequestCloseTab()
            if (cleanupTabClosedBackend) cleanupTabClosedBackend()
            if (cleanupSettingsUpdated) cleanupSettingsUpdated()
            if (cleanupActiveProfileChanged) cleanupActiveProfileChanged()
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

        // Update active profile if switching to a tab from a different profile
        const targetTab = tabs.find(t => t.id === tabId);
        if (targetTab && targetTab.profileId && targetTab.profileId !== activeProfileId) {
            setActiveProfileId(targetTab.profileId);
            // Save to localStorage cache
            localStorage.setItem('lastActiveProfileId', targetTab.profileId);
        }
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
        // Save to localStorage cache
        localStorage.setItem('lastActiveProfileId', profileId)
        window.api.getProfileTabs(profileId)
    }

    const reorderTabs = (fromIndex, toIndex) => {
        // Get the current profile's tabs to find the actual tab IDs
        const profileTabs = tabs.filter(t => t.profileId === activeProfileId);

        if (fromIndex < 0 || fromIndex >= profileTabs.length ||
            toIndex < 0 || toIndex >= profileTabs.length) {
            return;
        }

        const movedTabId = profileTabs[fromIndex].id;
        const targetTabId = profileTabs[toIndex].id;

        setTabs(prev => {
            const newTabs = [...prev];

            // Find actual indices in the full array
            const actualFromIndex = newTabs.findIndex(t => t.id === movedTabId);
            const actualToIndex = newTabs.findIndex(t => t.id === targetTabId);

            if (actualFromIndex === -1 || actualToIndex === -1) return prev;

            // Remove the moved tab and insert at new position
            const [movedTab] = newTabs.splice(actualFromIndex, 1);

            // Recalculate target index since array changed after splice
            const newTargetIndex = newTabs.findIndex(t => t.id === targetTabId);
            if (newTargetIndex === -1) {
                // Target was removed, insert at end
                newTabs.push(movedTab);
            } else {
                // Insert at or after the target position
                newTabs.splice(actualFromIndex < actualToIndex ? newTargetIndex + 1 : newTargetIndex, 0, movedTab);
            }

            // Send new order to backend
            const tabOrder = newTabs.map(t => t.id);
            window.api.reorderTabs(tabOrder);

            return newTabs;
        });
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
                onReorderTabs={reorderTabs}
                aiProviders={aiProviders}
            />

            {/* The WebContentsView will render here (controlled by Electron) */}
            <div className="flex-1" />
        </div>
    )
}

export default App
