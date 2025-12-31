import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Save, Monitor, Cpu, RotateCcw, Star } from 'lucide-react'

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
                    { id: 'work', name: 'Work', icon: '💼' },
                    { id: 'personal', name: 'Personal', icon: '🏠' }
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
        setProfiles([...profiles, { id: newId, name: 'New Profile', icon: '👤' }])
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

    return (
        <div className="h-screen w-screen bg-[#252526] flex flex-col overflow-hidden">

            {/* Header - Draggable */}
            <div
                className="h-14 border-b border-[#3e3e42] flex items-center justify-between px-4 select-none"
                style={{ WebkitAppRegion: 'drag' }}
            >
                <h2 className="text-white font-semibold flex items-center gap-2">
                    <Monitor size={18} className="text-blue-400" />
                    Settings
                </h2>
                <button
                    onClick={handleClose}
                    className="p-1 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white"
                    style={{ WebkitAppRegion: 'no-drag' }}
                >
                    <X size={20} />
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-48 border-r border-[#3e3e42] bg-[#1e1e1e] p-2 flex flex-col gap-1">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-3 py-2 rounded text-left text-sm ${activeTab === 'general' ? 'bg-[#37373d] text-white' : 'text-gray-400 hover:text-white hover:bg-[#2a2d2e]'}`}
                    >
                        General
                    </button>
                    <button
                        onClick={() => setActiveTab('profiles')}
                        className={`px-3 py-2 rounded text-left text-sm ${activeTab === 'profiles' ? 'bg-[#37373d] text-white' : 'text-gray-400 hover:text-white hover:bg-[#2a2d2e]'}`}
                    >
                        Profiles
                    </button>
                    <button
                        onClick={() => setActiveTab('providers')}
                        className={`px-3 py-2 rounded text-left text-sm ${activeTab === 'providers' ? 'bg-[#37373d] text-white' : 'text-gray-400 hover:text-white hover:bg-[#2a2d2e]'}`}
                    >
                        AI Providers
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto bg-[#1e1e1e]">

                    {/* GENERAL TAB */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div className="bg-[#252526] p-4 rounded border border-[#3e3e42]">
                                <h3 className="text-white font-medium mb-2">About MashAI</h3>
                                <p className="text-sm text-gray-400">
                                    A unified interface for all your AI assistants. Manage multiple AI providers and profiles in one place.
                                </p>
                                <p className="text-xs text-gray-500 mt-4">Version 1.0.0</p>
                            </div>
                            <div className="text-sm text-gray-500">
                                <p>💡 <strong className="text-gray-400">Tip:</strong> Set your default AI provider in the "AI Providers" tab by clicking the star icon.</p>
                            </div>
                        </div>
                    )}

                    {/* PROFILES TAB */}
                    {activeTab === 'profiles' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-medium">Manage Profiles</h3>
                                <button onClick={addProfile} className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded">
                                    <Plus size={14} /> Add Profile
                                </button>
                            </div>
                            <div className="space-y-2">
                                {profiles.map((profile, idx) => (
                                    <div key={profile.id} className="flex items-center gap-2 bg-[#252526] p-2 rounded border border-[#3e3e42]">
                                        <div className="w-8 flex justify-center text-xl cursor-default">{profile.icon}</div>
                                        <div className="flex-1 space-y-1">
                                            <input
                                                type="text"
                                                value={profile.name}
                                                onChange={(e) => updateProfile(profile.id, 'name', e.target.value)}
                                                className="w-full bg-transparent text-white text-sm outline-none border-b border-transparent focus:border-blue-500"
                                                placeholder="Profile Name"
                                            />
                                            <input
                                                type="text"
                                                value={profile.icon}
                                                onChange={(e) => updateProfile(profile.id, 'icon', e.target.value)}
                                                className="w-full bg-transparent text-xs text-gray-400 outline-none border-b border-transparent focus:border-blue-500"
                                                placeholder="Icon (Emoji)"
                                            />
                                        </div>
                                        <button
                                            onClick={() => deleteProfile(profile.id)}
                                            className="p-2 text-gray-500 hover:text-red-400"
                                            title="Delete Profile"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PROVIDERS TAB */}
                    {activeTab === 'providers' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h3 className="text-white font-medium">AI Presets</h3>
                                    <p className="text-xs text-gray-500">Click the star to set as default for new tabs</p>
                                </div>
                                <button onClick={addProvider} className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded">
                                    <Plus size={14} /> Add AI
                                </button>
                            </div>
                            <div className="space-y-2">
                                {providers.map((provider) => {
                                    const isDefault = provider.id === defaultProviderId;
                                    return (
                                        <div
                                            key={provider.id}
                                            className={`flex items-center gap-2 p-2 rounded border transition-colors ${isDefault
                                                ? 'bg-[#2a2a2a] border-blue-500/50'
                                                : 'bg-[#252526] border-[#3e3e42]'
                                                }`}
                                        >
                                            {/* Star button for setting default */}
                                            <button
                                                onClick={() => setAsDefault(provider.id)}
                                                className={`p-1 transition-colors ${isDefault
                                                    ? 'text-yellow-400'
                                                    : 'text-gray-600 hover:text-yellow-400'
                                                    }`}
                                                title={isDefault ? 'Default AI' : 'Set as default'}
                                            >
                                                <Star size={16} fill={isDefault ? 'currentColor' : 'none'} />
                                            </button>

                                            <div className="flex-1 space-y-1">
                                                <input
                                                    type="text"
                                                    value={provider.name}
                                                    onChange={(e) => updateProvider(provider.id, 'name', e.target.value)}
                                                    className="w-full bg-transparent text-white text-sm outline-none font-medium"
                                                    placeholder="Provider Name"
                                                />
                                                <input
                                                    type="text"
                                                    value={provider.url}
                                                    onChange={(e) => updateProvider(provider.id, 'url', e.target.value)}
                                                    className="w-full bg-transparent text-xs text-blue-400 outline-none hover:underline"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={provider.color || '#191A1A'}
                                                    onChange={(e) => updateProvider(provider.id, 'color', e.target.value)}
                                                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-none p-0"
                                                    title="Tab Background Color"
                                                />
                                                <button
                                                    onClick={() => resetProviderColor(provider.id)}
                                                    className="p-1 text-gray-500 hover:text-blue-400 transition-colors"
                                                    title="Reset to default color"
                                                >
                                                    <RotateCcw size={14} />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => deleteProvider(provider.id)}
                                                className="p-2 text-gray-500 hover:text-red-400"
                                                title="Delete provider"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Footer */}
            <div className="h-14 border-t border-[#3e3e42] flex items-center justify-between px-4 gap-2 bg-[#252526]">
                <button
                    onClick={handleResetAll}
                    className="px-4 py-2 rounded text-sm text-gray-300 hover:bg-[#3e3e42] flex items-center gap-2"
                >
                    <RotateCcw size={16} />
                    Reset All
                </button>
                <div className="flex gap-2">
                    <button onClick={handleClose} className="px-4 py-2 rounded text-sm text-gray-300 hover:bg-[#3e3e42]">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 rounded text-sm bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2">
                        <Save size={16} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    )
}
