import { useState } from 'react'
import { Shield, Trash2, Database, HardDrive, Cookie, LucideIcon, Download, ExternalLink, Mic, ShieldCheck } from 'lucide-react'
import type { Profile, SecuritySettings } from '../../types'

interface PrivacyTabProps {
    profiles?: Profile[];
    securitySettings?: SecuritySettings;
    onSecurityChange?: (settings: SecuritySettings) => void;
}

interface ClearOption {
    id: 'cache' | 'cookies' | 'siteData' | 'all';
    icon: LucideIcon;
    label: string;
    description: string;
    warning?: boolean;
}

/**
 * PrivacyTab - Privacy, security, and data management settings
 */
export default function PrivacyTab({ profiles = [], securitySettings, onSecurityChange }: PrivacyTabProps) {
    const [selectedProfiles, setSelectedProfiles] = useState<string[]>([])
    const [selectAll, setSelectAll] = useState(false)
    const [isClearing, setIsClearing] = useState(false)

    // Defaults for security settings
    const security: SecuritySettings = {
        downloadsEnabled: true,
        popupsEnabled: true,
        mediaPolicyAsk: true,
        adBlockerEnabled: true,
        ...securitySettings
    }

    const updateSecuritySetting = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
        if (onSecurityChange) {
            onSecurityChange({ ...security, [key]: value })
        }
    }

    const toggleProfile = (profileId: string) => {
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

    const handleClearData = async (dataType: 'cache' | 'cookies' | 'siteData' | 'all') => {
        if (selectedProfiles.length === 0) {
            alert('Please select at least one profile')
            return
        }

        const dataTypeLabels: Record<string, string> = {
            cache: 'Cache',
            cookies: 'Cookies',
            siteData: 'Site Data',
            all: 'All Data'
        }

        const confirmMessage = dataType === 'all'
            ? `This will permanently delete ALL data for ${selectedProfiles.length} profile(s). This cannot be undone. Continue?`
            : `Clear ${dataTypeLabels[dataType]} for ${selectedProfiles.length} profile(s)?`

        if (!confirm(confirmMessage)) return

        setIsClearing(true)
        try {
            const result = await window.api.clearPrivacyData({
                profiles: selectedProfiles,
                dataType
            })
            console.log('[PrivacyTab] Clear result:', result)
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

    const clearOptions: ClearOption[] = [
        { id: 'cache', icon: HardDrive, label: 'Cache', description: 'Cached images and scripts' },
        { id: 'cookies', icon: Cookie, label: 'Cookies', description: 'Login sessions' },
        { id: 'siteData', icon: Database, label: 'Site Data', description: 'Local storage & IndexedDB', warning: true }
    ]

    const disabled = isClearing || selectedProfiles.length === 0

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Shield size={20} className="text-violet-400" />
                    Privacy & Security
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                    Manage security settings and your data
                </p>
            </div>

            {/* Privacy Statement */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] p-5">
                <h3 className="text-white font-medium text-sm flex items-center gap-2 mb-2">
                    <Shield size={16} className="text-green-400" />
                    Your Privacy Matters
                </h3>
                <p className="text-sm text-gray-400">
                    MashAI runs <span className="text-white font-medium">100% locally</span> on your device. No data is collected or sent to external servers. Location access is automatically blocked for security.
                </p>
            </div>

            {/* Security Settings */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">Permissions</h3>
                </div>
                <div className="p-5 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={security.downloadsEnabled}
                            onChange={(e) => updateSecuritySetting('downloadsEnabled', e.target.checked)}
                            className="w-4 h-4 accent-violet-500 rounded"
                        />
                        <div className="flex items-center gap-2">
                            <Download size={16} className="text-gray-400" />
                            <div>
                                <span className="text-sm text-white">Allow downloads</span>
                                <p className="text-xs text-gray-500">Enables file downloads and right-click "Save Image/Media" options</p>
                            </div>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={security.popupsEnabled}
                            onChange={(e) => updateSecuritySetting('popupsEnabled', e.target.checked)}
                            className="w-4 h-4 accent-violet-500 rounded"
                        />
                        <div className="flex items-center gap-2">
                            <ExternalLink size={16} className="text-gray-400" />
                            <div>
                                <span className="text-sm text-white">Allow popup windows</span>
                                <p className="text-xs text-gray-500">Required for OAuth login flows (e.g., "Sign in with Google")</p>
                            </div>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={security.mediaPolicyAsk}
                            onChange={(e) => updateSecuritySetting('mediaPolicyAsk', e.target.checked)}
                            className="w-4 h-4 accent-violet-500 rounded"
                        />
                        <div className="flex items-center gap-2">
                            <Mic size={16} className="text-gray-400" />
                            <div>
                                <span className="text-sm text-white">Allow camera/microphone requests</span>
                                <p className="text-xs text-gray-500">Sites can ask for access (you'll be prompted to confirm)</p>
                            </div>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={security.adBlockerEnabled}
                            onChange={(e) => updateSecuritySetting('adBlockerEnabled', e.target.checked)}
                            className="w-4 h-4 accent-violet-500 rounded"
                        />
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-gray-400" />
                            <div>
                                <span className="text-sm text-white">Block ads & trackers</span>
                                <p className="text-xs text-gray-500">Coming soon - Powered by Ghostery</p>
                            </div>
                        </div>
                    </label>
                </div>
            </div>

            {/* Clear Data Card */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">Clear Browsing Data</h3>
                </div>

                {/* Section 1: Profile Selection */}
                <div className="px-5 py-4 border-b border-[#3e3e42]">
                    <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-3">1. Select Profiles</h4>

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
                    <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-3">2. Choose What to Clear</h4>

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

