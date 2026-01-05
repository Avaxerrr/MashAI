import { useState, useEffect, useRef } from 'react'
import { X, Save, Settings, RotateCcw, Shield, Keyboard, Info, Users, Bot, Gauge } from 'lucide-react'
import GeneralTab from './settings/GeneralTab'
import PrivacyTab from './settings/PrivacyTab'
import PerformanceTab from './settings/PerformanceTab'
import ProfilesTab from './settings/ProfilesTab'
import ProvidersTab from './settings/ProvidersTab'
import ShortcutsTab from './settings/ShortcutsTab'
import AboutTab from './settings/AboutTab'
import Toast from './Toast'
import type { Profile, AIProvider, Settings as SettingsType, PerformanceSettings, GeneralSettings, SecuritySettings } from '../types'

type TabName = 'general' | 'privacy' | 'profiles' | 'providers' | 'performance' | 'shortcuts' | 'about';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (settings: SettingsType) => void;
    initialSettings: SettingsType | null;
}

export default function SettingsModal({ isOpen, onClose, onSave, initialSettings }: SettingsModalProps) {
    if (!isOpen) return null

    const [activeTab, setActiveTab] = useState<TabName>('general')
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [providers, setProviders] = useState<AIProvider[]>([])
    const [defaultProviderId, setDefaultProviderId] = useState<string>('perplexity')

    const [performanceSettings, setPerformanceSettings] = useState<PerformanceSettings>({
        tabLoadingStrategy: 'lastActiveOnly',
        autoSuspendEnabled: true,
        autoSuspendMinutes: 30,
        profileSwitchBehavior: 'suspend',
        suspendOnHide: true,
        keepLastActiveTab: true,
        suspendDelaySeconds: 5
    })

    const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
        hardwareAcceleration: true,
        rememberWindowPosition: true,
        launchAtStartup: false,
        alwaysOnTop: false,
        alwaysOnTopShortcut: '',
        minimizeToTray: true,
        showTrayIcon: true,
        hideShortcut: ''
    })

    const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
        downloadsEnabled: true,
        popupsEnabled: true,
        mediaPolicyAsk: true,
        adBlockerEnabled: true,
        downloadLocation: '',  // Will be populated from initialSettings
        askWhereToSave: false
    })

    const profilesListRef = useRef<HTMLDivElement>(null)
    const providersListRef = useRef<HTMLDivElement>(null)
    const contentAreaRef = useRef<HTMLDivElement>(null)

    const [newlyAddedProfileId, setNewlyAddedProfileId] = useState<string | null>(null)
    const [newlyAddedProviderId, setNewlyAddedProviderId] = useState<string | null>(null)

    const [draggedProfileId, setDraggedProfileId] = useState<string | null>(null)
    const [dragOverProfileId, setDragOverProfileId] = useState<string | null>(null)

    const [draggedProviderId, setDraggedProviderId] = useState<string | null>(null)
    const [dragOverProviderId, setDragOverProviderId] = useState<string | null>(null)

    const [showToast, setShowToast] = useState(false)
    const [toastMessage, setToastMessage] = useState('Settings applied successfully!')
    const [activeProfileId, setActiveProfileId] = useState<string | null>(null)

    useEffect(() => {
        if (initialSettings) {
            setProfiles(initialSettings.profiles || [])
            setProviders(initialSettings.aiProviders || [])
            setDefaultProviderId(initialSettings.defaultProviderId || 'perplexity')
            if (initialSettings.performance) {
                setPerformanceSettings(prev => ({ ...prev, ...initialSettings.performance }))
            }
            if (initialSettings.general) {
                setGeneralSettings(prev => ({ ...prev, ...initialSettings.general }))
            }
            if (initialSettings.security) {
                setSecuritySettings(prev => ({ ...prev, ...initialSettings.security }))
            }

            if (window.api?.getActiveProfileId) {
                window.api.getActiveProfileId().then(id => {
                    if (id) setActiveProfileId(id)
                })
            }
        }
    }, [initialSettings])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    useEffect(() => {
        if (contentAreaRef.current && newlyAddedProfileId && activeTab === 'profiles') {
            setTimeout(() => {
                if (contentAreaRef.current) {
                    contentAreaRef.current.scrollTo({
                        top: contentAreaRef.current.scrollHeight,
                        behavior: 'smooth'
                    })
                }
            }, 100)
        }
    }, [newlyAddedProfileId, activeTab])

    useEffect(() => {
        if (contentAreaRef.current && newlyAddedProviderId && activeTab === 'providers') {
            setTimeout(() => {
                if (contentAreaRef.current) {
                    contentAreaRef.current.scrollTo({
                        top: contentAreaRef.current.scrollHeight,
                        behavior: 'smooth'
                    })
                }
            }, 100)
        }
    }, [newlyAddedProviderId, activeTab])

    useEffect(() => {
        if (contentAreaRef.current) {
            contentAreaRef.current.scrollTop = 0
        }
    }, [activeTab])

    useEffect(() => {
        if (newlyAddedProfileId) {
            const timer = setTimeout(() => setNewlyAddedProfileId(null), 2000)
            return () => clearTimeout(timer)
        }
    }, [newlyAddedProfileId])

    useEffect(() => {
        if (newlyAddedProviderId) {
            const timer = setTimeout(() => setNewlyAddedProviderId(null), 2000)
            return () => clearTimeout(timer)
        }
    }, [newlyAddedProviderId])

    const handleApply = () => {
        onSave({
            profiles,
            aiProviders: providers,
            defaultProviderId,
            defaultProfileId: profiles[0]?.id || 'work',
            performance: performanceSettings,
            general: generalSettings,
            security: securitySettings
        })
        setShowToast(true)
    }

    const handleSave = () => {
        handleApply()
        onClose()
    }

    const handleClose = () => {
        onClose()
    }

    const handleResetAll = async () => {
        if (confirm('Are you sure you want to reset all settings to defaults?\n\nNote: Your profiles will NOT be reset.\nThis cannot be undone.')) {
            // NOTE: Profiles are intentionally excluded from reset.
            // Resetting profiles would orphan their partition data (cookies, cache, localStorage).

            // Reset AI Providers to all 15 defaults
            const defaultProviders = [
                { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai', icon: 'perplexity', color: '#191A1A' },
                { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com', icon: 'google', color: '#000000' },
                { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com', icon: 'openai', color: '#212121' },
                { id: 'claude', name: 'Claude', url: 'https://claude.ai', icon: 'anthropic', color: '#262624' },
                { id: 'grok', name: 'Grok', url: 'https://grok.com', icon: 'x', color: '#000000' },
                { id: 'kling', name: 'Kling AI', url: 'https://app.klingai.com', icon: 'kling', color: '#1a1a2e' },
                { id: 'firefly', name: 'Adobe Firefly', url: 'https://www.adobe.com/products/firefly.html', icon: 'firefly', color: '#1a0a0a' },
                { id: 'flux', name: 'Flux', url: 'https://flux1.ai/', icon: 'flux', color: '#0a0a0a' },
                { id: 'leonardo', name: 'Leonardo', url: 'https://leonardo.ai/', icon: 'leonardo', color: '#1a1a2e' },
                { id: 'runway', name: 'Runway', url: 'https://runwayml.com/', icon: 'runway', color: '#0f0f0f' },
                { id: 'luma', name: 'Luma', url: 'https://lumalabs.ai/', icon: 'luma', color: '#0a0a0a' },
                { id: 'heygen', name: 'HeyGen', url: 'https://www.heygen.com/', icon: 'heygen', color: '#1a1a2e' },
                { id: 'elevenlabs', name: 'ElevenLabs', url: 'https://elevenlabs.io/', icon: 'elevenlabs', color: '#0f0f0f' },
                { id: 'udio', name: 'Udio', url: 'https://www.udio.com/', icon: 'udio', color: '#1a1a1a' },
                { id: 'suno', name: 'Suno', url: 'https://suno.com/home', icon: 'suno', color: '#0a0a0a' }
            ]
            setProviders(defaultProviders)
            setDefaultProviderId('perplexity')

            // Reset Performance settings
            setPerformanceSettings({
                tabLoadingStrategy: 'lastActiveOnly',
                autoSuspendEnabled: true,
                autoSuspendMinutes: 30,
                profileSwitchBehavior: 'keep',
                excludeActiveProfile: false,
                suspendOnHide: true,
                keepLastActiveTab: true,
                suspendDelaySeconds: 5
            })

            // Reset General settings
            setGeneralSettings({
                hardwareAcceleration: true,
                rememberWindowPosition: true,
                launchAtStartup: false,
                alwaysOnTop: false,
                alwaysOnTopShortcut: 'CommandOrControl+Shift+A',
                minimizeToTray: false,
                showTrayIcon: false,
                hideShortcut: 'CommandOrControl+Shift+M'
            })
        }
    }

    const addProfile = () => {
        const newId = 'profile-' + Date.now()
        setProfiles([...profiles, { id: newId, name: 'New Profile', icon: 'user', color: '#6366f1' }])
        setNewlyAddedProfileId(newId)
    }

    const updateProfile = (id: string, field: keyof Profile, value: string) => {
        setProfiles(profiles.map(p => p.id === id ? { ...p, [field]: value } : p))
    }

    const deleteProfile = async (id: string) => {
        if (profiles.length <= 1) {
            alert('Cannot delete the last profile. At least one profile is required.')
            return
        }

        if (id === activeProfileId) {
            alert('Cannot delete the active profile. Please switch to another profile first.')
            return
        }

        const profileToDelete = profiles.find(p => p.id === id)
        const profileName = profileToDelete?.name || 'this profile'

        const confirmed = confirm(
            `Delete "${profileName}"?\n\n` +
            `This will permanently delete:\n` +
            `• All tabs in this profile\n` +
            `• All cached data and cookies\n` +
            `• All AI chat history stored locally\n\n` +
            `This cannot be undone.`
        )

        if (confirmed) {
            // Call backend to delete profile with full data cleanup
            const result = await window.api.deleteProfile(id)

            if (result.success) {
                // Update local state to reflect the deletion
                setProfiles(profiles.filter(p => p.id !== id))
                // Show success toast
                setToastMessage(`Profile "${profileName}" deleted successfully`)
                setShowToast(true)
            } else {
                alert(`Failed to delete profile: ${result.error || 'Unknown error'}`)
            }
        }
    }

    const reorderProfiles = (fromIndex: number, toIndex: number) => {
        const newProfiles = [...profiles]
        const [movedProfile] = newProfiles.splice(fromIndex, 1)
        newProfiles.splice(toIndex, 0, movedProfile)
        setProfiles(newProfiles)
    }

    const addProvider = () => {
        const newId = 'provider-' + Date.now()
        setProviders([...providers, { id: newId, name: 'New AI', url: 'https://', icon: 'globe', color: '#191A1A' }])
        setNewlyAddedProviderId(newId)
    }

    const updateProvider = (id: string, field: keyof AIProvider, value: string) => {
        setProviders(providers.map(p => p.id === id ? { ...p, [field]: value } : p))
    }

    const deleteProvider = (id: string) => {
        if (providers.length <= 1) return

        if (id === defaultProviderId) {
            const remaining = providers.filter(p => p.id !== id)
            if (remaining.length > 0) {
                setDefaultProviderId(remaining[0].id)
            }
        }

        setProviders(providers.filter(p => p.id !== id))
    }

    const reorderProviders = (fromIndex: number, toIndex: number) => {
        const newProviders = [...providers]
        const [movedProvider] = newProviders.splice(fromIndex, 1)
        newProviders.splice(toIndex, 0, movedProvider)
        setProviders(newProviders)
    }

    const setAsDefault = (providerId: string) => {
        setDefaultProviderId(providerId)
    }

    return (
        <div className="h-screen w-screen bg-[#323233] flex flex-col overflow-hidden">

            {/* Header */}
            <div
                className="h-14 border-b border-[#3e3e42] bg-[#323233] flex items-center justify-between px-6 select-none"
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            >
                <h2 className="text-white font-semibold text-lg flex items-center gap-3">
                    <Settings size={20} className="text-violet-400" />
                    Settings
                </h2>
                <button
                    onClick={handleClose}
                    className="p-2 hover:bg-[#3e3e42] rounded-lg text-gray-400 hover:text-white transition-all"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                    <X size={20} />
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-56 border-r border-[#3e3e42] bg-[#252526] p-3 flex flex-col gap-2">
                    {(['general', 'privacy', 'profiles', 'providers', 'performance', 'shortcuts', 'about'] as const).map(tab => {
                        const icons: Record<TabName, typeof Settings> = {
                            general: Settings,
                            privacy: Shield,
                            profiles: Users,
                            providers: Bot,
                            performance: Gauge,
                            shortcuts: Keyboard,
                            about: Info
                        }
                        const labels: Record<TabName, string> = {
                            general: 'General',
                            privacy: 'Privacy & Security',
                            profiles: 'Profiles',
                            providers: 'AI Providers',
                            performance: 'Performance',
                            shortcuts: 'Shortcuts',
                            about: 'About'
                        }
                        const Icon = icons[tab]
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2.5 rounded-lg text-left text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab
                                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                                    : 'text-gray-400 hover:text-white hover:bg-[#3e3e42]'
                                    }`}
                            >
                                <Icon size={16} />
                                {labels[tab]}
                            </button>
                        )
                    })}
                </div>

                {/* Content */}
                <div ref={contentAreaRef} className="flex-1 p-8 overflow-y-auto bg-[#323233] settings-scroll-smooth">
                    {activeTab === 'general' && (
                        <GeneralTab
                            generalSettings={generalSettings}
                            onGeneralChange={setGeneralSettings}
                        />
                    )}

                    {activeTab === 'privacy' && (
                        <PrivacyTab
                            profiles={profiles}
                            securitySettings={securitySettings}
                            onSecurityChange={setSecuritySettings}
                        />
                    )}

                    {activeTab === 'performance' && (
                        <PerformanceTab
                            performanceSettings={performanceSettings}
                            onPerformanceChange={setPerformanceSettings}
                            showTrayIcon={generalSettings.showTrayIcon}
                        />
                    )}

                    {activeTab === 'profiles' && (
                        <ProfilesTab
                            profiles={profiles}
                            addProfile={addProfile}
                            updateProfile={updateProfile}
                            deleteProfile={deleteProfile}
                            reorderProfiles={reorderProfiles}
                            draggedProfileId={draggedProfileId}
                            setDraggedProfileId={setDraggedProfileId}
                            dragOverProfileId={dragOverProfileId}
                            setDragOverProfileId={setDragOverProfileId}
                            newlyAddedProfileId={newlyAddedProfileId}
                            profilesListRef={profilesListRef}
                        />
                    )}

                    {activeTab === 'providers' && (
                        <ProvidersTab
                            providers={providers}
                            addProvider={addProvider}
                            updateProvider={updateProvider}
                            deleteProvider={deleteProvider}
                            reorderProviders={reorderProviders}
                            defaultProviderId={defaultProviderId}
                            setAsDefault={setAsDefault}
                            draggedProviderId={draggedProviderId}
                            setDraggedProviderId={setDraggedProviderId}
                            dragOverProviderId={dragOverProviderId}
                            setDragOverProviderId={setDragOverProviderId}
                            newlyAddedProviderId={newlyAddedProviderId}
                            providersListRef={providersListRef}
                        />
                    )}

                    {activeTab === 'shortcuts' && (
                        <ShortcutsTab
                            generalSettings={generalSettings}
                        />
                    )}

                    {activeTab === 'about' && (
                        <AboutTab />
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="h-16 border-t border-[#3e3e42] flex items-center justify-between px-6 gap-3 bg-[#252526]">
                <button
                    onClick={handleResetAll}
                    className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#3e3e42] flex items-center gap-2 transition-all"
                >
                    <RotateCcw size={16} />
                    Reset All
                </button>
                <div className="flex gap-3">
                    <button onClick={handleClose} className="px-5 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#3e3e42] transition-all font-medium">
                        Cancel
                    </button>
                    <button onClick={handleApply} className="px-5 py-2 rounded-lg text-sm bg-gray-700 hover:bg-gray-600 text-white font-medium transition-all">
                        Apply
                    </button>
                    <button onClick={handleSave} className="px-5 py-2 rounded-lg text-sm bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-2 font-medium transition-all shadow-lg shadow-violet-600/20">
                        <Save size={16} />
                        Save & Close
                    </button>
                </div>
            </div>

            {/* Toast notification */}
            <Toast
                message={toastMessage}
                isVisible={showToast}
                onClose={() => setShowToast(false)}
            />
        </div>
    )
}
