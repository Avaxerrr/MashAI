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

export default function SettingsModal({ isOpen, onClose, onSave, initialSettings }) {
    if (!isOpen) return null

    const [activeTab, setActiveTab] = useState('general') // general, profiles, providers
    const [profiles, setProfiles] = useState([])
    const [providers, setProviders] = useState([])
    const [defaultProviderId, setDefaultProviderId] = useState('perplexity')

    // Performance settings state
    const [performanceSettings, setPerformanceSettings] = useState({
        tabLoadingStrategy: 'lastActiveOnly',
        autoSuspendEnabled: true,
        autoSuspendMinutes: 30,
        profileSwitchBehavior: 'suspend'
    })

    // General settings state
    const [generalSettings, setGeneralSettings] = useState({
        hardwareAcceleration: true,
        rememberWindowPosition: true
    })

    // Refs for auto-scroll
    const profilesListRef = useRef(null)
    const providersListRef = useRef(null)
    const contentAreaRef = useRef(null)

    // Track newly added items for pulse animation
    const [newlyAddedProfileId, setNewlyAddedProfileId] = useState(null)
    const [newlyAddedProviderId, setNewlyAddedProviderId] = useState(null)

    // Drag-and-drop state for profiles
    const [draggedProfileId, setDraggedProfileId] = useState(null)
    const [dragOverProfileId, setDragOverProfileId] = useState(null)

    // Drag-and-drop state for providers
    const [draggedProviderId, setDraggedProviderId] = useState(null)
    const [dragOverProviderId, setDragOverProviderId] = useState(null)

    // Toast notification state
    const [showToast, setShowToast] = useState(false)

    // Active profile ID (for deletion validation)
    const [activeProfileId, setActiveProfileId] = useState(null)

    // Load initial settings
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

            // Fetch active profile ID for deletion validation
            if (window.api?.getActiveProfileId) {
                window.api.getActiveProfileId().then(id => {
                    if (id) setActiveProfileId(id)
                })
            }
        }
    }, [initialSettings])

    // ESC key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose])

    // Auto-scroll when items are added (profiles only)
    useEffect(() => {
        if (contentAreaRef.current && profiles.length > 0 && activeTab === 'profiles') {
            setTimeout(() => {
                if (contentAreaRef.current) {
                    contentAreaRef.current.scrollTo({
                        top: contentAreaRef.current.scrollHeight,
                        behavior: 'smooth'
                    })
                }
            }, 100)
        }
    }, [profiles.length])

    // Auto-scroll when items are added (providers only)
    useEffect(() => {
        if (contentAreaRef.current && providers.length > 0 && activeTab === 'providers') {
            setTimeout(() => {
                if (contentAreaRef.current) {
                    contentAreaRef.current.scrollTo({
                        top: contentAreaRef.current.scrollHeight,
                        behavior: 'smooth'
                    })
                }
            }, 100)
        }
    }, [providers.length])

    // Reset scroll position when switching tabs
    useEffect(() => {
        if (contentAreaRef.current) {
            contentAreaRef.current.scrollTop = 0
        }
    }, [activeTab])

    // Clear pulse animation after 2 seconds
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

    // --- Event Handlers ---
    const handleApply = () => {
        onSave({
            profiles,
            aiProviders: providers,
            defaultProviderId,
            performance: performanceSettings,
            general: generalSettings
        })
        // Show success toast
        setShowToast(true)
        // Don't close - that's the key difference from handleSave
    }

    const handleSave = () => {
        handleApply()
        onClose()
    }

    const handleClose = () => {
        onClose()
    }

    const handleResetAll = async () => {
        if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            const defaultSettings = {
                profiles: [
                    { id: 'work', name: 'Work', icon: 'briefcase', color: '#8b5cf6' },
                    { id: 'personal', name: 'Personal', icon: 'home', color: '#10b981' }
                ],
                aiProviders: [
                    { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai', icon: 'perplexity', color: '#191A1A' },
                    { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com', icon: 'google', color: '#000000' },
                    { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com', icon: 'openai', color: '#212121' },
                    { id: 'claude', name: 'Claude', url: 'https://claude.ai', icon: 'anthropic', color: '#262624' },
                    { id: 'grok', name: 'Grok', url: 'https://grok.com', icon: 'x', color: '#000000' },
                    { id: 'kling', name: 'Kling AI', url: 'https://app.klingai.com', icon: 'globe', color: '#1a1a2e' },
                    { id: 'firefly', name: 'Adobe Firefly', url: 'https://www.adobe.com/products/firefly.html', icon: 'globe', color: '#1a0a0a' },
                    { id: 'flux', name: 'Flux', url: 'https://flux1.ai/', icon: 'globe', color: '#0a0a0a' },
                    { id: 'leonardo', name: 'Leonardo', url: 'https://leonardo.ai/', icon: 'globe', color: '#1a1a2e' },
                    { id: 'runway', name: 'Runway', url: 'https://runwayml.com/', icon: 'globe', color: '#0f0f0f' },
                    { id: 'luma', name: 'Luma', url: 'https://lumalabs.ai/', icon: 'globe', color: '#0a0a0a' },
                    { id: 'heygen', name: 'HeyGen', url: 'https://www.heygen.com/', icon: 'globe', color: '#1a1a2e' },
                    { id: 'elevenlabs', name: 'ElevenLabs', url: 'https://elevenlabs.io/', icon: 'globe', color: '#0f0f0f' },
                    { id: 'udio', name: 'Udio', url: 'https://www.udio.com/', icon: 'globe', color: '#1a1a1a' },
                    { id: 'suno', name: 'Suno', url: 'https://suno.com/home', icon: 'globe', color: '#0a0a0a' }
                ],
                defaultProviderId: 'perplexity'
            }
            setProfiles(defaultSettings.profiles)
            setProviders(defaultSettings.aiProviders)
            setDefaultProviderId(defaultSettings.defaultProviderId)
        }
    }

    // --- Profile Handlers ---
    const addProfile = () => {
        const newId = 'profile-' + Date.now()
        setProfiles([...profiles, { id: newId, name: 'New Profile', icon: 'user', color: '#6366f1' }])
        setNewlyAddedProfileId(newId)
    }

    const updateProfile = (id, field, value) => {
        setProfiles(profiles.map(p => p.id === id ? { ...p, [field]: value } : p))
    }

    // TODO: Thorough testing needed for profile deletion:
    // - [ ] Verify active profile cannot be deleted
    // - [ ] Verify confirmation dialog appears with correct warning
    // - [ ] Verify partition data is cleaned up (check console logs)
    // - [ ] Verify tabs are closed for deleted profile
    // - [ ] Test deleting profile that has open tabs
    const deleteProfile = (id) => {
        if (profiles.length <= 1) {
            alert('Cannot delete the last profile. At least one profile is required.')
            return
        }

        // Prevent deleting the active profile
        if (id === activeProfileId) {
            alert('Cannot delete the active profile. Please switch to another profile first.')
            return
        }

        // Get profile name for confirmation
        const profileToDelete = profiles.find(p => p.id === id)
        const profileName = profileToDelete?.name || 'this profile'

        // Show confirmation dialog with warning about data deletion
        const confirmed = confirm(
            `Delete "${profileName}"?\n\n` +
            `This will permanently delete:\n` +
            `• All tabs in this profile\n` +
            `• All cached data and cookies\n` +
            `• All AI chat history stored locally\n\n` +
            `This cannot be undone.`
        )

        if (confirmed) {
            setProfiles(profiles.filter(p => p.id !== id))
        }
    }

    const reorderProfiles = (fromIndex, toIndex) => {
        const newProfiles = [...profiles]
        const [movedProfile] = newProfiles.splice(fromIndex, 1)
        newProfiles.splice(toIndex, 0, movedProfile)
        setProfiles(newProfiles)
    }

    // --- Provider Handlers ---
    const addProvider = () => {
        const newId = 'provider-' + Date.now()
        setProviders([...providers, { id: newId, name: 'New AI', url: 'https://', icon: 'globe', color: '#191A1A' }])
        setNewlyAddedProviderId(newId)
    }

    const updateProvider = (id, field, value) => {
        setProviders(providers.map(p => p.id === id ? { ...p, [field]: value } : p))
    }

    const deleteProvider = (id) => {
        if (providers.length <= 1) return

        if (id === defaultProviderId) {
            const remaining = providers.filter(p => p.id !== id)
            if (remaining.length > 0) {
                setDefaultProviderId(remaining[0].id)
            }
        }

        setProviders(providers.filter(p => p.id !== id))
    }

    const reorderProviders = (fromIndex, toIndex) => {
        const newProviders = [...providers]
        const [movedProvider] = newProviders.splice(fromIndex, 1)
        newProviders.splice(toIndex, 0, movedProvider)
        setProviders(newProviders)
    }

    const setAsDefault = (providerId) => {
        setDefaultProviderId(providerId)
    }

    return (
        <div className="h-screen w-screen bg-[#323233] flex flex-col overflow-hidden">

            {/* Header - Draggable */}
            <div
                className="h-14 border-b border-[#3e3e42] bg-[#323233] flex items-center justify-between px-6 select-none"
                style={{ WebkitAppRegion: 'drag' }}
            >
                <h2 className="text-white font-semibold text-lg flex items-center gap-3">
                    <Settings size={20} className="text-violet-400" />
                    Settings
                </h2>
                <button
                    onClick={handleClose}
                    className="p-2 hover:bg-[#3e3e42] rounded-lg text-gray-400 hover:text-white transition-all"
                    style={{ WebkitAppRegion: 'no-drag' }}
                >
                    <X size={20} />
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-56 border-r border-[#3e3e42] bg-[#252526] p-3 flex flex-col gap-2">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-2.5 rounded-lg text-left text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'general'
                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-[#3e3e42]'
                            }`}
                    >
                        <Settings size={16} />
                        General
                    </button>
                    <button
                        onClick={() => setActiveTab('privacy')}
                        className={`px-4 py-2.5 rounded-lg text-left text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'privacy'
                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-[#3e3e42]'
                            }`}
                    >
                        <Shield size={16} />
                        Privacy
                    </button>
                    <button
                        onClick={() => setActiveTab('profiles')}
                        className={`px-4 py-2.5 rounded-lg text-left text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'profiles'
                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-[#3e3e42]'
                            }`}
                    >
                        <Users size={16} />
                        Profiles
                    </button>
                    <button
                        onClick={() => setActiveTab('providers')}
                        className={`px-4 py-2.5 rounded-lg text-left text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'providers'
                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-[#3e3e42]'
                            }`}
                    >
                        <Bot size={16} />
                        AI Providers
                    </button>
                    <button
                        onClick={() => setActiveTab('performance')}
                        className={`px-4 py-2.5 rounded-lg text-left text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'performance'
                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-[#3e3e42]'
                            }`}
                    >
                        <Gauge size={16} />
                        Performance
                    </button>
                    <button
                        onClick={() => setActiveTab('shortcuts')}
                        className={`px-4 py-2.5 rounded-lg text-left text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'shortcuts'
                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-[#3e3e42]'
                            }`}
                    >
                        <Keyboard size={16} />
                        Shortcuts
                    </button>
                    <button
                        onClick={() => setActiveTab('about')}
                        className={`px-4 py-2.5 rounded-lg text-left text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'about'
                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-[#3e3e42]'
                            }`}
                    >
                        <Info size={16} />
                        About
                    </button>
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
                        />
                    )}

                    {activeTab === 'performance' && (
                        <PerformanceTab
                            performanceSettings={performanceSettings}
                            onPerformanceChange={setPerformanceSettings}
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
                message="Settings applied successfully!"
                isVisible={showToast}
                onClose={() => setShowToast(false)}
            />
        </div>
    )
}
