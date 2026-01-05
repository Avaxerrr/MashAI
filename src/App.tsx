import { useState, useEffect, useRef } from 'react'
import TitleBar from './components/TitleBar'
import type { Profile, AIProvider, Settings, TabCreatedEvent, TabUpdatedEvent, ProfileTabsLoadedEvent, TabMemoryInfo } from './types'

interface TabState {
    id: string;
    profileId: string;
    url: string;
    title: string;
    loaded: boolean;
    suspended?: boolean;
    loading?: boolean;
    faviconDataUrl?: string;
    parentTabId?: string; // The tab that opened this one (for returning on close)
    blockedCount?: number; // Number of blocked ads/trackers for this tab
}

function App() {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [tabs, setTabs] = useState<TabState[]>([])
    const [activeProfileId, setActiveProfileId] = useState<string>(() => {
        return localStorage.getItem('lastActiveProfileId') || 'work'
    })
    const [activeTabId, setActiveTabId] = useState<string | null>(null)

    const [aiProviders, setAiProviders] = useState<AIProvider[]>([])
    const [defaultProviderId, setDefaultProviderId] = useState<string>('perplexity')
    const [tabMemory, setTabMemory] = useState<Record<string, TabMemoryInfo>>({})
    const [toastMessage, setToastMessage] = useState<string>('')
    const [showToast, setShowToast] = useState<boolean>(false)
    const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success')

    const closeTabRef = useRef<((tabId: string) => void) | null>(null)

    useEffect(() => {
        if (!window.api) {
            console.error('window.api is undefined - preload script failed to load!')
            return
        }

        const loadInitialData = async () => {
            try {
                const settings: Settings = await window.api.getSettings();
                if (settings) {
                    if (settings.aiProviders) setAiProviders(settings.aiProviders);
                    if (settings.defaultProviderId) setDefaultProviderId(settings.defaultProviderId);
                }

                const tabData = await window.api.getAllTabs() as TabState[];
                if (tabData && tabData.length > 0) {
                    setTabs(tabData);
                    // Find the first tab to set as active
                    const firstTab = tabData[0];
                    if (firstTab) {
                        setActiveTabId(firstTab.id);
                        if (firstTab.profileId) {
                            setActiveProfileId(firstTab.profileId);
                            localStorage.setItem('lastActiveProfileId', firstTab.profileId);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to load settings:', err);
            }
        }
        loadInitialData();

        const handleProfilesLoaded = (profileList: Profile[]) => {
            console.log('App: Profiles loaded', profileList)
            setProfiles(profileList)
        }

        const handleTabCreated = (tab: TabCreatedEvent) => {
            console.log('App: Tab created', tab)
            setTabs(prev => {
                if (prev.some(t => t.id === tab.id)) {
                    return prev
                }

                // Store afterTabId as parentTabId so we can return to it when closing
                const newTab = {
                    ...tab,
                    url: '',
                    loaded: tab.loaded ?? false,
                    faviconDataUrl: tab.faviconDataUrl,
                    loading: tab.loaded ?? false,
                    parentTabId: tab.afterTabId // Track parent for return-on-close
                };

                // If afterTabId is provided, insert after that tab
                if (tab.afterTabId) {
                    const afterIndex = prev.findIndex(t => t.id === tab.afterTabId);
                    if (afterIndex !== -1) {
                        const newTabs = [...prev];
                        newTabs.splice(afterIndex + 1, 0, newTab);
                        return newTabs;
                    }
                }

                // Default: append to end
                return [...prev, newTab]
            })
            // Only switch to the new tab if it's not a background tab
            if (!tab.background) {
                setActiveTabId(tab.id)
            }
        }

        const handleTabUpdated = ({ id, title, url, loaded, suspended, faviconDataUrl, isLoading, blockedCount }: TabUpdatedEvent) => {
            setTabs(prev => prev.map(tab =>
                tab.id === id ? {
                    ...tab,
                    ...(title !== undefined && { title }),
                    ...(url !== undefined && { url }),
                    ...(loaded !== undefined && { loaded }),
                    ...(suspended !== undefined && { suspended }),
                    ...(faviconDataUrl !== undefined && { faviconDataUrl }),
                    ...(isLoading !== undefined && { loading: isLoading }),
                    ...(blockedCount !== undefined && { blockedCount })
                } : tab
            ))
        }

        const handleTabLoading = ({ id }: { id: string }) => {
            setTabs(prev => prev.map(tab =>
                tab.id === id ? { ...tab, loading: true } : tab
            ))
        }

        const handleRestoreActive = (tabId: string) => {
            setActiveTabId(tabId)
            setTabs(prev => {
                const restoredTab = prev.find(t => t.id === tabId);
                if (restoredTab && restoredTab.profileId) {
                    setActiveProfileId(restoredTab.profileId);
                    localStorage.setItem('lastActiveProfileId', restoredTab.profileId);
                }
                return prev;
            })
        }

        const handleProfileTabsLoaded = ({ profileId, tabs: loadedTabs, lastActiveTabId }: ProfileTabsLoadedEvent) => {
            console.log('Profile tabs loaded for', profileId, 'count:', loadedTabs.length)
            setTabs(loadedTabs)
            if (loadedTabs.length > 0) {
                const tabToActivate = lastActiveTabId || loadedTabs[0].id
                setActiveTabId(tabToActivate)
                window.api.switchTab(tabToActivate)
            } else {
                window.api.createTab(profileId)
            }
        }

        const cleanupProfilesLoaded = window.api.onProfilesLoaded(handleProfilesLoaded)
        const cleanupTabCreated = window.api.onTabCreated(handleTabCreated)
        const cleanupTabUpdated = window.api.onTabUpdated(handleTabUpdated)
        const cleanupTabLoading = window.api.onTabLoading ? window.api.onTabLoading(handleTabLoading) : null
        const cleanupRestoreActive = window.api.onRestoreActive(handleRestoreActive)
        const cleanupProfileTabsLoaded = window.api.onProfileTabsLoaded(handleProfileTabsLoaded)

        const cleanupSwitchProfileRequest = window.api.onSwitchProfileRequest((id: string) => {
            switchProfile(id)
        })

        const cleanupRequestCloseTab = window.api.onRequestCloseTab((tabId: string) => {
            if (closeTabRef.current) {
                closeTabRef.current(tabId)
            }
        })

        const cleanupTabClosedBackend = window.api.onTabClosedBackend((tabId: string) => {
            setTabs(prev => prev.filter(tab => tab.id !== tabId))
        })

        const cleanupSettingsUpdated = window.api.onSettingsUpdated((newSettings: Settings) => {
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

        const cleanupShowToast = window.api.onShowToast?.((data) => {
            setToastMessage(data.message)
            setToastType(data.type || 'success')
            setShowToast(true)
        })

        return () => {
            console.log('Cleaning up listeners')
            if (cleanupProfilesLoaded) cleanupProfilesLoaded()
            if (cleanupTabCreated) cleanupTabCreated()
            if (cleanupTabUpdated) cleanupTabUpdated()
            if (cleanupTabLoading) cleanupTabLoading()
            if (cleanupRestoreActive) cleanupRestoreActive()
            if (cleanupProfileTabsLoaded) cleanupProfileTabsLoaded()
            if (cleanupSwitchProfileRequest) cleanupSwitchProfileRequest()
            if (cleanupRequestCloseTab) cleanupRequestCloseTab()
            if (cleanupTabClosedBackend) cleanupTabClosedBackend()
            if (cleanupSettingsUpdated) cleanupSettingsUpdated()
            if (cleanupShowToast) cleanupShowToast()
        }
    }, [])

    useEffect(() => {
        const fetchTabMemory = async () => {
            if (window.api?.getAllTabsMemory) {
                try {
                    const memory = await window.api.getAllTabsMemory()
                    const memoryMap: Record<string, TabMemoryInfo> = {}
                    if (Array.isArray(memory)) {
                        memory.forEach((m) => { memoryMap[m.tabId] = m })
                    }
                    setTabMemory(memoryMap)
                } catch (e) {
                    // API not ready yet
                }
            }
        }
        fetchTabMemory()
        const interval = setInterval(fetchTabMemory, 10000)
        return () => clearInterval(interval)
    }, [])

    const createTab = () => {
        window.api.createTab(activeProfileId)
    }

    const createTabWithUrl = (profileId: string, url: string) => {
        window.api.createTabWithUrl(profileId, url)
    }

    const switchTab = (tabId: string) => {
        setActiveTabId(tabId)
        window.api.switchTab(tabId)

        const targetTab = tabs.find(t => t.id === tabId);
        if (targetTab && targetTab.profileId && targetTab.profileId !== activeProfileId) {
            setActiveProfileId(targetTab.profileId);
            localStorage.setItem('lastActiveProfileId', targetTab.profileId);
        }
    }

    const closeTab = (tabId: string) => {
        const activeProfileTabs = tabs.filter(t => t.profileId === activeProfileId)
        if (activeProfileTabs.length <= 1) {
            return
        }

        // Find the tab being closed to get its parent
        const closingTab = activeProfileTabs.find(t => t.id === tabId)
        // Find the index of the tab being closed BEFORE closing it
        const closingTabIndex = activeProfileTabs.findIndex(t => t.id === tabId)

        window.api.closeTab(tabId)
        setTabs(prev => {
            const filtered = prev.filter(tab => tab.id !== tabId)

            if (tabId === activeTabId && filtered.length > 0) {
                const currentProfileFiltered = filtered.filter(t => t.profileId === activeProfileId)

                if (currentProfileFiltered.length > 0) {
                    let newActiveTab;

                    // If the closed tab has a parent, return to it (if it still exists)
                    if (closingTab?.parentTabId) {
                        const parentTab = currentProfileFiltered.find(t => t.id === closingTab.parentTabId)
                        if (parentTab) {
                            newActiveTab = parentTab
                        }
                    }

                    // Fallback: if no parent or parent doesn't exist, use default behavior
                    if (!newActiveTab) {
                        if (closingTabIndex >= currentProfileFiltered.length) {
                            // Closed the last tab, go to previous (now the new last)
                            newActiveTab = currentProfileFiltered[currentProfileFiltered.length - 1]
                        } else {
                            // Go to the tab that's now at the same position (next tab moved up)
                            newActiveTab = currentProfileFiltered[closingTabIndex]
                        }
                    }

                    setActiveTabId(newActiveTab.id)
                    window.api.switchTab(newActiveTab.id)
                }
            } else if (filtered.length === 0) {
                setActiveTabId(null)
            }

            return filtered
        })
    }

    useEffect(() => {
        closeTabRef.current = closeTab
    }, [tabs, activeTabId, activeProfileId])

    const duplicateTab = (tabId: string) => {
        window.api.duplicateTab(tabId)
    }

    const reloadTab = (tabId: string) => {
        window.api.reloadTab(tabId)
    }

    const reopenClosedTab = () => {
        window.api.reopenClosedTab()
    }

    const closeOtherTabs = (tabId: string) => {
        window.api.closeOtherTabs(tabId, activeProfileId)
        setTabs(prev => prev.filter(tab => tab.id === tabId))
    }

    const closeTabsToRight = (tabId: string) => {
        window.api.closeTabsToRight(tabId, activeProfileId)
        setTabs(prev => {
            const index = prev.findIndex(t => t.id === tabId)
            return prev.slice(0, index + 1)
        })
    }

    const switchProfile = (profileId: string) => {
        window.api.switchProfile(profileId)
        setActiveProfileId(profileId)
        localStorage.setItem('lastActiveProfileId', profileId)
        window.api.getProfileTabs(profileId)
    }

    const reorderTabs = (fromIndex: number, toIndex: number) => {
        const profileTabs = tabs.filter(t => t.profileId === activeProfileId);

        if (fromIndex < 0 || fromIndex >= profileTabs.length ||
            toIndex < 0 || toIndex >= profileTabs.length) {
            return;
        }

        const movedTabId = profileTabs[fromIndex].id;
        const targetTabId = profileTabs[toIndex].id;

        setTabs(prev => {
            const newTabs = [...prev];
            const actualFromIndex = newTabs.findIndex(t => t.id === movedTabId);
            const actualToIndex = newTabs.findIndex(t => t.id === targetTabId);

            if (actualFromIndex === -1 || actualToIndex === -1) return prev;

            const [movedTab] = newTabs.splice(actualFromIndex, 1);
            const newTargetIndex = newTabs.findIndex(t => t.id === targetTabId);
            if (newTargetIndex === -1) {
                newTabs.push(movedTab);
            } else {
                newTabs.splice(actualFromIndex < actualToIndex ? newTargetIndex + 1 : newTargetIndex, 0, movedTab);
            }

            const tabOrder = newTabs.map(t => t.id);
            window.api.reorderTabs(tabOrder);

            return newTabs;
        });
    }

    const currentTabs = tabs.filter(t => t.profileId === activeProfileId)

    return (
        <div className="h-screen w-screen bg-editor-bg flex flex-col overflow-hidden">
            <TitleBar
                profiles={profiles}
                activeProfile={profiles.find(p => p.id === activeProfileId)}
                tabs={currentTabs}
                activeTabId={activeTabId}
                tabMemory={tabMemory}
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
                toastMessage={toastMessage}
                showToast={showToast}
                toastType={toastType}
                onCloseToast={() => setShowToast(false)}
            />



            <div className="flex-1" />
        </div>
    )
}

export default App
