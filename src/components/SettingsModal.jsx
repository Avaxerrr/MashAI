import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Save, Monitor, Cpu, RotateCcw, Star, Briefcase, User, Home, Zap, Code, Globe } from 'lucide-react'

export default function SettingsModal({ isOpen, onClose, onSave, initialSettings }) {
    if (!isOpen) return null

    const [activeTab, setActiveTab] = useState('general') // general, profiles, providers
    const [profiles, setProfiles] = useState([])
    const [providers, setProviders] = useState([])
    const [defaultProviderId, setDefaultProviderId] = useState('perplexity')

    // Load initial settings
    useEffect(() => {
        if (initialSettings) {
            setProfiles(initialSettings.profiles || [])
            setProviders(initialSettings.aiProviders || [])
            setDefaultProviderId(initialSettings.defaultProviderId || 'perplexity')
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

    const handleSave = () => {
        onSave({
            profiles,
            aiProviders: providers,
            defaultProviderId
        })
        onClose()
    }

    const handleClose = () => {
        onClose()
    }

    const handleResetAll = async () => {
        if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            const defaults = await window.api.getSettings()
            // Get fresh defaults from backend
            const defaultSettings = {
                profiles: [
                    { id: 'work', name: 'Work', icon: 'briefcase', color: '#3b82f6' },
                    { id: 'personal', name: 'Personal', icon: 'home', color: '#10b981' }
                ],
                aiProviders: [
                    { id: 'perplexity', name: 'Perplexity', url: 'https://www.perplexity.ai', icon: 'perplexity', color: '#191A1A' },
                    { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com', icon: 'google', color: '#000000' },
                    { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com', icon: 'openai', color: '#212121' },
                    { id: 'claude', name: 'Claude', url: 'https://claude.ai', icon: 'anthropic', color: '#262624' },
                    { id: 'grok', name: 'Grok', url: 'https://grok.com', icon: 'x', color: '#000000' }
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
    }

    const updateProfile = (id, field, value) => {
        setProfiles(profiles.map(p => p.id === id ? { ...p, [field]: value } : p))
    }

    const deleteProfile = (id) => {
        if (profiles.length <= 1) return // Prevent deleting last profile
        setProfiles(profiles.filter(p => p.id !== id))
    }

    // --- Provider Handlers ---
    const addProvider = () => {
        const newId = 'provider-' + Date.now()
        setProviders([...providers, { id: newId, name: 'New AI', url: 'https://', icon: 'globe', color: '#191A1A' }])
    }

    const updateProvider = (id, field, value) => {
        setProviders(providers.map(p => p.id === id ? { ...p, [field]: value } : p))
    }

    const deleteProvider = (id) => {
        if (providers.length <= 1) return

        // If deleting the default provider, set fallback to first remaining provider
        if (id === defaultProviderId) {
            const remaining = providers.filter(p => p.id !== id)
            if (remaining.length > 0) {
                setDefaultProviderId(remaining[0].id)
            }
        }

        setProviders(providers.filter(p => p.id !== id))
    }

    const setAsDefault = (providerId) => {
        setDefaultProviderId(providerId)
    }

    const resetProviderColor = (providerId) => {
        const defaultColors = {
            'perplexity': '#191A1A',
            'gemini': '#000000',
            'chatgpt': '#212121',
            'claude': '#262624',
            'grok': '#000000'
        }
        const defaultColor = defaultColors[providerId] || '#191A1A'
        updateProvider(providerId, 'color', defaultColor)
    }

    // Icon renderer for profiles
    const renderProfileIcon = (iconName) => {
        const iconMap = {
            'briefcase': Briefcase,
            'user': User,
            'home': Home,
            'zap': Zap,
            'code': Code,
            'globe': Globe
        }
        const IconComponent = iconMap[iconName] || User
        return <IconComponent size={20} />
    }

    const availableIcons = [
        { name: 'briefcase', component: Briefcase },
        { name: 'user', component: User },
        { name: 'home', component: Home },
        { name: 'zap', component: Zap },
        { name: 'code', component: Code },
        { name: 'globe', component: Globe }
    ]

    return (
        <div className="h-screen w-screen bg-[#323233] flex flex-col overflow-hidden">

            {/* Header - Draggable */}
            <div
                className="h-14 border-b border-[#3e3e42] bg-[#323233] flex items-center justify-between px-6 select-none"
                style={{ WebkitAppRegion: 'drag' }}
            >
                <h2 className="text-white font-semibold text-lg flex items-center gap-3">
                    <Monitor size={20} className="text-blue-400" />
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
                        className={`px-4 py-2.5 rounded-lg text-left text-sm font-medium transition-all ${activeTab === 'general'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-[#3e3e42]'
                            }`}
                    >
                        General
                    </button>
                    <button
                        onClick={() => setActiveTab('profiles')}
                        className={`px-4 py-2.5 rounded-lg text-left text-sm font-medium transition-all ${activeTab === 'profiles'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-[#18181b]'
                            }`}
                    >
                        Profiles
                    </button>
                    <button
                        onClick={() => setActiveTab('providers')}
                        className={`px-4 py-2.5 rounded-lg text-left text-sm font-medium transition-all ${activeTab === 'providers'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-[#18181b]'
                            }`}
                    >
                        AI Providers
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-8 overflow-y-auto bg-[#323233]">

                    {/* GENERAL TAB */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 max-w-2xl">
                            <div className="bg-[#252526] p-6 rounded-xl border border-[#3e3e42]">
                                <h3 className="text-white font-semibold text-base mb-3">About MashAI</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    A unified interface for all your AI assistants. Manage multiple AI providers and profiles in one place.
                                </p>
                                <div className="mt-6 pt-4 border-t border-[#3e3e42]">
                                    <p className="text-xs text-gray-500">Version 1.0.0</p>
                                </div>
                            </div>
                            <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-4">
                                <p className="text-sm text-blue-300">
                                    💡 <strong className="font-medium">Tip:</strong> Set your default AI provider in the "AI Providers" tab by clicking the star icon.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* PROFILES TAB */}
                    {activeTab === 'profiles' && (
                        <div className="space-y-6 max-w-2xl">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h3 className="text-white font-semibold text-lg">Manage Profiles</h3>
                                    <p className="text-sm text-gray-500 mt-1">Organize your work with different profiles</p>
                                </div>
                                <button onClick={addProfile} className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-blue-600/20">
                                    <Plus size={16} /> Add Profile
                                </button>
                            </div>
                            <div className="space-y-3">
                                {profiles.map((profile, idx) => (
                                    <div key={profile.id} className="flex items-center gap-4 bg-[#252526] p-4 rounded-xl transition-all">
                                        {/* Icon & Color Selector */}
                                        <div className="flex flex-col gap-2 flex-shrink-0">
                                            <div
                                                className="w-12 h-12 rounded-lg flex items-center justify-center text-white transition-all"
                                                style={{ backgroundColor: profile.color || '#3b82f6' }}
                                            >
                                                {renderProfileIcon(profile.icon)}
                                            </div>
                                            <input
                                                type="color"
                                                value={profile.color || '#3b82f6'}
                                                onChange={(e) => updateProfile(profile.id, 'color', e.target.value)}
                                                className="w-12 h-6 rounded cursor-pointer border-0"
                                                title="Profile Color"
                                            />
                                        </div>

                                        <div className="flex-1 space-y-3">
                                            <input
                                                type="text"
                                                value={profile.name}
                                                onChange={(e) => updateProfile(profile.id, 'name', e.target.value)}
                                                className="w-full bg-[#1e1e1e] text-white text-sm px-3 py-2 rounded-lg outline-none border-0 focus:ring-2 focus:ring-blue-500 transition-all"
                                                placeholder="Profile Name"
                                            />
                                            {/* Icon Selector */}
                                            <div className="flex gap-2">
                                                {availableIcons.map(({ name, component: IconComp }) => (
                                                    <button
                                                        key={name}
                                                        onClick={() => updateProfile(profile.id, 'icon', name)}
                                                        className={`p-2 rounded-lg transition-all ${profile.icon === name
                                                            ? 'bg-blue-500/20 text-blue-400'
                                                            : 'bg-[#1e1e1e] text-gray-400 hover:text-white hover:bg-[#2a2a2c]'
                                                            }`}
                                                        title={name}
                                                    >
                                                        <IconComp size={16} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteProfile(profile.id)}
                                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-all"
                                            title="Delete Profile"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PROVIDERS TAB */}
                    {activeTab === 'providers' && (
                        <div className="space-y-6 max-w-3xl">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h3 className="text-white font-semibold text-lg">AI Providers</h3>
                                    <p className="text-sm text-gray-500 mt-1">Click the star to set as default for new tabs</p>
                                </div>
                                <button onClick={addProvider} className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-blue-600/20">
                                    <Plus size={16} /> Add AI
                                </button>
                            </div>
                            <div className="space-y-3">
                                {providers.map((provider) => {
                                    const isDefault = provider.id === defaultProviderId;
                                    return (
                                        <div
                                            key={provider.id}
                                            className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isDefault
                                                ? 'bg-[#252526] ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/10'
                                                : 'bg-[#252526]'
                                                }`}
                                        >
                                            {/* Star button for setting default */}
                                            <button
                                                onClick={() => setAsDefault(provider.id)}
                                                className={`p-2 rounded-lg transition-all ${isDefault
                                                    ? 'text-yellow-400 bg-yellow-500/10'
                                                    : 'text-gray-600 hover:text-yellow-400 hover:bg-yellow-500/5'
                                                    }`}
                                                title={isDefault ? 'Default AI' : 'Set as default'}
                                            >
                                                <Star size={18} fill={isDefault ? 'currentColor' : 'none'} />
                                            </button>

                                            {/* Favicon display */}
                                            <div className="w-[76px] h-[76px] flex-shrink-0 flex items-center justify-center rounded-lg">
                                                {provider.faviconDataUrl ? (
                                                    <img
                                                        src={provider.faviconDataUrl}
                                                        alt=""
                                                        className="w-8 h-8"
                                                        onError={(e) => {
                                                            // Fallback to Google favicon service if cached favicon fails
                                                            try {
                                                                const urlObj = new URL(provider.url);
                                                                e.target.src = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
                                                            } catch {
                                                                e.target.style.display = 'none';
                                                            }
                                                        }}
                                                    />
                                                ) : provider.url ? (
                                                    <img
                                                        src={`https://www.google.com/s2/favicons?domain=${new URL(provider.url).hostname}&sz=32`}
                                                        alt=""
                                                        className="w-8 h-8"
                                                        onError={(e) => e.target.style.display = 'none'}
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 bg-[#3e3e42] rounded" />
                                                )}
                                            </div>

                                            <div className="flex-1 space-y-2">
                                                <input
                                                    type="text"
                                                    value={provider.name}
                                                    onChange={(e) => updateProvider(provider.id, 'name', e.target.value)}
                                                    className="w-full bg-[#1e1e1e] text-white text-sm font-medium px-3 py-2 rounded-lg outline-none border-0 focus:ring-2 focus:ring-blue-500 transition-all"
                                                    placeholder="Provider Name"
                                                />
                                                <input
                                                    type="text"
                                                    value={provider.url}
                                                    onChange={(e) => updateProvider(provider.id, 'url', e.target.value)}
                                                    className="w-full bg-[#1e1e1e] text-xs text-blue-400 px-3 py-2 rounded-lg outline-none border-0 focus:ring-2 focus:ring-blue-500 transition-all"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col items-center gap-1">
                                                    <input
                                                        type="color"
                                                        value={provider.color || '#191A1A'}
                                                        onChange={(e) => updateProvider(provider.id, 'color', e.target.value)}
                                                        className="w-10 h-10 rounded-lg cursor-pointer border-0"
                                                        title="Tab Background Color"
                                                    />
                                                    <button
                                                        onClick={() => resetProviderColor(provider.id)}
                                                        className="p-1 text-gray-500 hover:text-blue-400 transition-colors"
                                                        title="Reset to default color"
                                                    >
                                                        <RotateCcw size={12} />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => deleteProvider(provider.id)}
                                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-all"
                                                    title="Delete provider"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
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
                    <button onClick={handleSave} className="px-5 py-2 rounded-lg text-sm bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 font-medium transition-all shadow-lg shadow-blue-600/20">
                        <Save size={16} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    )
}
