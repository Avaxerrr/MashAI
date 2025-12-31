import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Save, Monitor, Cpu } from 'lucide-react'

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

    const handleSave = () => {
        onSave({
            profiles,
            aiProviders: providers,
            defaultProviderId
        })
        window.api.showWebView() // Restore view when closing
        onClose()
    }

    const handleClose = () => {
        window.api.showWebView() // Restore view when closing
        onClose()
    }

    // Hide WebContentsView when modal opens
    useEffect(() => {
        if (isOpen) {
            window.api.hideWebView()
        }
    }, [isOpen])

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
        setProviders([...providers, { id: newId, name: 'New AI', url: 'https://', icon: 'globe' }])
    }

    const updateProvider = (id, field, value) => {
        setProviders(providers.map(p => p.id === id ? { ...p, [field]: value } : p))
    }

    const deleteProvider = (id) => {
        if (providers.length <= 1) return
        setProviders(providers.filter(p => p.id !== id))
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-[#252526] w-full max-w-2xl rounded-lg shadow-xl border border-[#3e3e42] flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="h-14 border-b border-[#3e3e42] flex items-center justify-between px-4 select-none">
                    <h2 className="text-white font-semibold flex items-center gap-2">
                        <Monitor size={18} className="text-blue-400" />
                        Settings
                    </h2>
                    <button onClick={handleClose} className="p-1 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-white">
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
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Default AI Provider</label>
                                    <div className="text-xs text-gray-500 mb-2">This AI will be opened when you create a new tab.</div>
                                    <select
                                        value={defaultProviderId}
                                        onChange={(e) => setDefaultProviderId(e.target.value)}
                                        className="w-full bg-[#3c3c3c] border border-[#3e3e42] rounded p-2 text-white outline-none focus:border-blue-500"
                                    >
                                        {providers.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.url})</option>
                                        ))}
                                    </select>
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
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-white font-medium">AI Presets</h3>
                                    <button onClick={addProvider} className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded">
                                        <Plus size={14} /> Add AI
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {providers.map((provider) => (
                                        <div key={provider.id} className="flex items-center gap-2 bg-[#252526] p-2 rounded border border-[#3e3e42]">
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
                                            <button
                                                onClick={() => deleteProvider(provider.id)}
                                                className="p-2 text-gray-500 hover:text-red-400"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Footer */}
                <div className="h-14 border-t border-[#3e3e42] flex items-center justify-end px-4 gap-2 bg-[#252526]">
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
