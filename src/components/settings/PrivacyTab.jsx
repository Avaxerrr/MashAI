import { useState } from 'react'
import { Shield, Trash2, Database, HardDrive, Cookie, FileText, FolderOpen } from 'lucide-react'

/**
 * PrivacyTab - Data management and privacy settings
 * 
 * TODO: Thorough UI testing needed:
 * - [ ] Test clearing each data type individually
 * - [ ] Test "Clear All" nuclear option
 * - [ ] Verify user feedback (success/error messages)
 * - [ ] Test with multiple profiles selected
 * - [ ] Test with no profiles selected (should show error)
 */
export default function PrivacyTab({ profiles = [] }) {
    const [selectedProfiles, setSelectedProfiles] = useState([])
    const [selectAll, setSelectAll] = useState(false)
    const [isClearing, setIsClearing] = useState(false)

    const toggleProfile = (profileId) => {
        setSelectedProfiles(prev =>
            prev.includes(profileId)
                ? prev.filter(id => id !== profileId)
                : [...prev, profileId]
        )
    }

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedProfiles([])
        } else {
            setSelectedProfiles(profiles.map(p => p.id))
        }
        setSelectAll(!selectAll)
    }

    const handleClearData = async (dataType) => {
        if (selectedProfiles.length === 0) {
            alert('Please select at least one profile')
            return
        }

        const dataTypeLabels = {
            cache: 'Cache',
            cookies: 'Cookies',
            siteData: 'Site Data',
            sessions: 'Session Data',
            all: 'All Data'
        }

        const confirmMessage = dataType === 'all'
            ? `This will permanently delete ALL data for ${selectedProfiles.length} profile(s). This cannot be undone. Continue?`
            : `Clear ${dataTypeLabels[dataType]} for ${selectedProfiles.length} profile(s)?`

        if (!confirm(confirmMessage)) return

        setIsClearing(true)
        try {
            await window.api.clearPrivacyData({
                profiles: selectedProfiles,
                dataType
            })
            if (dataType === 'all') {
                setSelectedProfiles([])
                setSelectAll(false)
            }
        } catch (error) {
            console.error('Failed to clear data:', error)
        } finally {
            setIsClearing(false)
        }
    }

    const clearOptions = [
        { id: 'cache', icon: HardDrive, label: 'Cache', description: 'Cached images and scripts' },
        { id: 'cookies', icon: Cookie, label: 'Cookies', description: 'Login sessions' },
        { id: 'siteData', icon: Database, label: 'Site Data', description: 'Local storage & history', warning: true },
        { id: 'sessions', icon: FolderOpen, label: 'Sessions', description: 'Saved tabs' }
    ]

    const disabled = isClearing || selectedProfiles.length === 0

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Shield size={20} className="text-violet-400" />
                    Privacy & Data
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                    Manage your data and privacy settings
                </p>
            </div>

            {/* Privacy Statement */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] p-5">
                <h3 className="text-white font-medium text-sm flex items-center gap-2 mb-2">
                    <Shield size={16} className="text-green-400" />
                    Your Privacy Matters
                </h3>
                <p className="text-sm text-gray-400">
                    MashAI runs <span className="text-white font-medium">100% locally</span> on your device. No data is collected or sent to external servers.
                </p>
            </div>

            {/* Unified Clear Data Card */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                {/* Section 1: Profile Selection */}
                <div className="px-5 py-4 border-b border-[#3e3e42]">
                    <h3 className="text-white font-medium text-sm mb-3">1. Select Profiles</h3>

                    <label className="flex items-center gap-3 cursor-pointer mb-3">
                        <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 accent-violet-500 rounded"
                        />
                        <span className="text-sm text-white font-medium">Select All</span>
                    </label>

                    <div className="grid grid-cols-2 gap-2 pl-7">
                        {profiles.map(profile => (
                            <label key={profile.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedProfiles.includes(profile.id)}
                                    onChange={() => toggleProfile(profile.id)}
                                    className="w-4 h-4 accent-violet-500 rounded"
                                />
                                <span className="text-sm text-gray-300 truncate">{profile.name}</span>
                            </label>
                        ))}
                    </div>

                    {selectedProfiles.length > 0 && (
                        <p className="text-xs text-violet-400 mt-3 pl-7">
                            {selectedProfiles.length} profile(s) selected
                        </p>
                    )}
                </div>

                {/* Section 2: Clear Options */}
                <div className="px-5 py-4 border-b border-[#3e3e42]">
                    <h3 className="text-white font-medium text-sm mb-3">2. Choose What to Clear</h3>

                    <div className="grid grid-cols-2 gap-2">
                        {clearOptions.map(option => {
                            const Icon = option.icon
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleClearData(option.id)}
                                    disabled={disabled}
                                    className={`p-3 rounded-lg text-left transition-all border ${disabled
                                        ? 'bg-[#1e1e1e] border-[#3e3e42] opacity-50 cursor-not-allowed'
                                        : option.warning
                                            ? 'bg-[#1e1e1e] border-yellow-900/50 hover:border-yellow-500/50 hover:bg-yellow-950/20'
                                            : 'bg-[#1e1e1e] border-[#3e3e42] hover:border-violet-500/50 hover:bg-violet-950/20'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <Icon size={14} className={option.warning ? 'text-yellow-400' : 'text-gray-400'} />
                                        <span className="text-sm text-white font-medium">{option.label}</span>
                                    </div>
                                    <p className={`text-xs ${option.warning ? 'text-yellow-400/70' : 'text-gray-500'}`}>
                                        {option.description}
                                    </p>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Section 3: Clear All */}
                <div className="px-5 py-4 bg-[#1a1a1a]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-red-950/50 flex items-center justify-center">
                                <Trash2 size={16} className="text-red-400" />
                            </div>
                            <div>
                                <h4 className="text-sm text-white font-medium">Clear All Data</h4>
                                <p className="text-xs text-gray-500">Delete everything for selected profiles</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleClearData('all')}
                            disabled={disabled}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
