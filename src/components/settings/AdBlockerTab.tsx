import { useState, useEffect } from 'react'
import { Ban, RefreshCw, Plus, X, Zap, Eye, Cookie, ExternalLink, List } from 'lucide-react'
import type { FilterListInfo } from '../../types'

interface AdBlockSettings {
    enabled: boolean;
    blockAds: boolean;
    blockTrackers: boolean;
    blockAnnoyances: boolean;
    whitelist: string[];
    customListUrls?: string[];
}

interface AdBlockStatus {
    enabled: boolean;
    version: string;
    lastUpdated: string | null;
    blockedCount: number;
    filterLists?: FilterListInfo[];
    totalRules?: number;
}

interface AdBlockerTabProps {
    adBlockSettings?: AdBlockSettings;
    onAdBlockChange?: (settings: AdBlockSettings) => void;
}

/**
 * AdBlockerTab - Dedicated settings tab for ad blocker configuration
 */
export default function AdBlockerTab({ adBlockSettings, onAdBlockChange }: AdBlockerTabProps) {
    const [newDomain, setNewDomain] = useState('')
    const [newCustomListUrl, setNewCustomListUrl] = useState('')
    const [status, setStatus] = useState<AdBlockStatus | null>(null)
    const [isUpdating, setIsUpdating] = useState(false)

    // Default settings
    const settings: AdBlockSettings = {
        enabled: true,
        blockAds: true,
        blockTrackers: true,
        blockAnnoyances: true,
        whitelist: [],
        customListUrls: [],
        ...adBlockSettings
    }

    // Fetch status on mount and poll every 2 seconds for real-time updates
    useEffect(() => {
        const fetchStatus = () => {
            if (window.api?.getAdBlockStatus) {
                window.api.getAdBlockStatus().then(setStatus)
            }
        }

        // Initial fetch
        fetchStatus()

        // Poll every 2 seconds for real-time blocked count updates
        const interval = setInterval(fetchStatus, 2000)

        return () => clearInterval(interval)
    }, [])

    const updateSetting = <K extends keyof AdBlockSettings>(key: K, value: AdBlockSettings[K]) => {
        if (onAdBlockChange) {
            onAdBlockChange({ ...settings, [key]: value })
        }
    }

    const addToWhitelist = () => {
        const domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
        if (domain && !settings.whitelist.includes(domain)) {
            updateSetting('whitelist', [...settings.whitelist, domain])
            setNewDomain('')
        }
    }

    const removeFromWhitelist = (domain: string) => {
        updateSetting('whitelist', settings.whitelist.filter(d => d !== domain))
    }

    const addCustomList = () => {
        const url = newCustomListUrl.trim()
        // Basic URL validation
        if (url && (url.startsWith('http://') || url.startsWith('https://')) && !settings.customListUrls?.includes(url)) {
            updateSetting('customListUrls', [...(settings.customListUrls || []), url])
            setNewCustomListUrl('')
        }
    }

    const removeCustomList = (url: string) => {
        updateSetting('customListUrls', (settings.customListUrls || []).filter(u => u !== url))
    }

    const handleUpdateLists = async () => {
        if (!window.api?.updateAdBlockLists) return
        setIsUpdating(true)
        try {
            await window.api.updateAdBlockLists()
            // Refresh status after update
            if (window.api?.getAdBlockStatus) {
                const newStatus = await window.api.getAdBlockStatus()
                setStatus(newStatus)
            }
        } catch (error) {
            console.error('Failed to update filter lists:', error)
        } finally {
            setIsUpdating(false)
        }
    }

    const formatDate = (isoString: string | null) => {
        if (!isoString) return 'Never'
        try {
            return new Date(isoString).toLocaleString()
        } catch {
            return 'Unknown'
        }
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Ban size={20} className="text-violet-400" />
                    Ad Blocker
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                    Block ads, trackers, and annoyances automatically
                </p>
            </div>

            {/* Status Card */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${settings.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                        <div>
                            <h3 className="text-white font-medium text-sm">
                                {settings.enabled ? 'Active' : 'Disabled'}
                            </h3>
                            <p className="text-xs text-gray-500">
                                Ghostery Engine v{status?.version || '2.13.2'}
                            </p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.enabled}
                            onChange={(e) => updateSetting('enabled', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                    </label>
                </div>
                <div className="px-5 py-3 bg-[#1e1e1e] border-t border-[#3e3e42] flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                        Last updated: {formatDate(status?.lastUpdated || null)}
                    </div>
                    <button
                        onClick={handleUpdateLists}
                        disabled={isUpdating || !settings.enabled}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#3e3e42] hover:bg-[#4e4e52] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                        <RefreshCw size={12} className={isUpdating ? 'animate-spin' : ''} />
                        {isUpdating ? 'Updating...' : 'Update Now'}
                    </button>
                </div>
            </div>

            {/* Filter Lists - Transparency Section */}
            {status?.filterLists && status.filterLists.length > 0 && (
                <div className={`bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden transition-opacity ${!settings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b] flex items-center justify-between">
                        <div>
                            <h3 className="text-white font-medium text-sm flex items-center gap-2">
                                <List size={14} className="text-violet-400" />
                                Filter Lists
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {status.filterLists.length} lists • {(status.totalRules || 0).toLocaleString()} total rules
                            </p>
                        </div>
                    </div>
                    <div className="divide-y divide-[#3e3e42]">
                        {status.filterLists.map((list, index) => (
                            <div key={index} className="px-5 py-3 flex items-center justify-between hover:bg-[#2a2a2b] transition-colors">
                                <div className="flex-1 min-w-0">
                                    <a
                                        href={list.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-white hover:text-violet-400 transition-colors flex items-center gap-1.5"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            window.api?.openExternal?.(list.url);
                                        }}
                                    >
                                        {list.name}
                                        <ExternalLink size={12} className="text-gray-500" />
                                    </a>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                        v{list.version} • {formatDate(list.lastUpdated)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm text-violet-400 font-medium">
                                        {list.ruleCount.toLocaleString()}
                                    </span>
                                    <p className="text-xs text-gray-500">rules</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Custom Filter Lists */}
            <div className={`bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden transition-opacity ${!settings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm flex items-center gap-2">
                        <Plus size={14} className="text-violet-400" />
                        Custom Filter Lists
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Add your own filter lists (EasyList format)</p>
                </div>
                <div className="p-5">
                    {/* Existing custom lists */}
                    {settings.customListUrls && settings.customListUrls.length > 0 && (
                        <div className="space-y-2 mb-4">
                            {settings.customListUrls.map((url, index) => (
                                <div key={index} className="flex items-center justify-between bg-[#1e1e1e] rounded-lg px-3 py-2">
                                    <span className="text-sm text-gray-300 truncate flex-1 mr-2">{url}</span>
                                    <button
                                        onClick={() => removeCustomList(url)}
                                        className="p-1 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add new custom list */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newCustomListUrl}
                            onChange={(e) => setNewCustomListUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addCustomList()}
                            placeholder="https://example.com/filterlist.txt"
                            className="flex-1 bg-[#1e1e1e] border border-[#3e3e42] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                        />
                        <button
                            onClick={addCustomList}
                            disabled={!newCustomListUrl.trim() || (!newCustomListUrl.startsWith('http://') && !newCustomListUrl.startsWith('https://'))}
                            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                            <Plus size={14} />
                            Add
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        After adding, click "Update Now" above to fetch the new lists
                    </p>
                </div>
            </div>

            {/* Blocking Options */}
            <div className={`bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden transition-opacity ${!settings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">Blocking Options</h3>
                </div>
                <div className="p-5 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.blockAds}
                            onChange={(e) => updateSetting('blockAds', e.target.checked)}
                            className="w-4 h-4 accent-violet-500 rounded"
                        />
                        <div className="flex items-center gap-2">
                            <Zap size={16} className="text-yellow-400" />
                            <div>
                                <span className="text-sm text-white">Block Ads</span>
                                <p className="text-xs text-gray-500">Banner ads, video ads, pop-ups</p>
                            </div>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.blockTrackers}
                            onChange={(e) => updateSetting('blockTrackers', e.target.checked)}
                            className="w-4 h-4 accent-violet-500 rounded"
                        />
                        <div className="flex items-center gap-2">
                            <Eye size={16} className="text-blue-400" />
                            <div>
                                <span className="text-sm text-white">Block Trackers</span>
                                <p className="text-xs text-gray-500">Tracking scripts that monitor your activity</p>
                            </div>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.blockAnnoyances}
                            onChange={(e) => updateSetting('blockAnnoyances', e.target.checked)}
                            className="w-4 h-4 accent-violet-500 rounded"
                        />
                        <div className="flex items-center gap-2">
                            <Cookie size={16} className="text-orange-400" />
                            <div>
                                <span className="text-sm text-white">Block Annoyances</span>
                                <p className="text-xs text-gray-500">Cookie banners, newsletter popups, chat widgets</p>
                            </div>
                        </div>
                    </label>
                </div>
            </div>

            {/* Whitelist */}
            <div className={`bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden transition-opacity ${!settings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">Allowed Sites</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Sites where ad blocking is disabled</p>
                </div>
                <div className="p-5">
                    {settings.whitelist.length > 0 ? (
                        <div className="space-y-2 mb-4">
                            {settings.whitelist.map(domain => (
                                <div key={domain} className="flex items-center justify-between bg-[#1e1e1e] rounded-lg px-3 py-2">
                                    <span className="text-sm text-gray-300">{domain}</span>
                                    <button
                                        onClick={() => removeFromWhitelist(domain)}
                                        className="p-1 hover:bg-[#3e3e42] rounded text-gray-400 hover:text-red-400 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 mb-4">No sites added. Add sites that break with blocking enabled.</p>
                    )}

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addToWhitelist()}
                            placeholder="example.com"
                            className="flex-1 bg-[#1e1e1e] border border-[#3e3e42] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                        />
                        <button
                            onClick={addToWhitelist}
                            disabled={!newDomain.trim()}
                            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                            <Plus size={14} />
                            Add
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            {status && status.blockedCount > 0 && (
                <div className="bg-[#252526] rounded-xl border border-[#3e3e42] px-5 py-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Blocked this session</span>
                        <span className="text-lg font-semibold text-violet-400">{status.blockedCount.toLocaleString()} requests</span>
                    </div>
                </div>
            )}
        </div>
    )
}
