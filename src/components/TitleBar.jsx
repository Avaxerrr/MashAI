import { Minus, Square, X, ChevronDown, ArrowLeft, RotateCw, Plus } from 'lucide-react'
import { useState } from 'react'

export default function TitleBar({
    profiles = [],
    activeProfile,
    tabs = [],
    activeTabId,
    onCreateTab,
    onCreateTabWithUrl,
    onSwitchTab,
    onCloseTab,
    onDuplicateTab,
    onReloadTab,
    onCloseOtherTabs,
    onCloseTabsToRight,
    onSwitchProfile,
    aiProviders = []
}) {
    const [isMaximized, setIsMaximized] = useState(false)

    // ... (rest of methods)

    const getIconForTab = (tab) => {
        // Find provider matching the URL
        if (!tab.url) return 'https://www.perplexity.ai/favicon.ico'; // Fallback

        const provider = aiProviders.find(p => tab.url.includes(p.url) || (p.url && tab.url.startsWith(p.url)));
        if (provider) return provider.icon;

        // Use Google Favicon grabber as fallback for unknown URLs
        try {
            const urlObj = new URL(tab.url);
            return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
        } catch {
            return 'https://www.perplexity.ai/favicon.ico';
        }
    }



    const handleMaximize = () => {
        window.api.maximizeWindow()
        setIsMaximized(!isMaximized)
    }

    const handleProfileClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        // Send coordinates for menu
        window.api.showProfileMenu(Math.round(rect.left), Math.round(rect.bottom), activeProfile?.id)
    }

    return (
        <>
            <div
                className="h-10 bg-[#323233] flex items-center justify-between select-none border-b border-[#1e1e1e]"
                style={{ WebkitAppRegion: 'drag' }}
            >

                {/* Left: Profile Switcher */}
                <div className="flex items-center h-full relative" style={{ WebkitAppRegion: 'no-drag' }}>
                    <div className="relative z-50">
                        <button
                            onClick={handleProfileClick}
                            className="h-10 px-3 flex items-center gap-2 hover:bg-[#2a2a2a] transition-colors"
                        >
                            <span className="text-lg">{activeProfile?.icon || '💼'}</span>
                            <span className="text-sm text-white">{activeProfile?.name || 'Work'}</span>
                            <ChevronDown size={14} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Navigation Buttons */}

                    {/* Navigation Buttons */}
                    <button
                        onClick={() => window.api.goBack()}
                        className="h-10 px-3 hover:bg-[#2a2a2a] transition-colors"
                        title="Back (Alt+Left)"
                    >
                        <ArrowLeft size={16} className="text-gray-300" />
                    </button>
                    <button
                        onClick={() => window.api.reload()}
                        className="h-10 px-3 hover:bg-[#2a2a2a] transition-colors"
                        title="Reload (Ctrl+R)"
                    >
                        <RotateCw size={16} className="text-gray-300" />
                    </button>
                </div>

                {/* Center: Tabs */}
                <div className="flex-1 flex items-center h-full overflow-hidden">
                    <div className="flex-1 flex items-center h-full overflow-x-auto scrollbar-hide">
                        {tabs.map(tab => (
                            <div
                                key={tab.id}
                                onClick={() => onSwitchTab(tab.id)}
                                onContextMenu={(e) => {
                                    e.preventDefault()
                                    window.api.showContextMenu(tab.id)
                                }}
                                className={`h-full px-2 flex items-center gap-2 border-r border-[#1e1e1e] cursor-pointer group select-none
                                    ${tab.id === activeTabId ? 'bg-[#191A1A]' : 'bg-[#2d2d2d] hover:bg-[#2a2a2a]'}
                                    min-w-[40px] max-w-[160px] flex-1
                                `}
                                title={tab.title}
                                style={{ WebkitAppRegion: 'no-drag' }}
                            >
                                <img
                                    src={getIconForTab(tab)}
                                    className="w-4 h-4 flex-shrink-0"
                                    alt=""
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.src = 'https://www.perplexity.ai/favicon.ico'; // Fallback to default on error
                                    }}
                                />
                                {/* Hide text if tab gets too small */}
                                <span className="text-xs text-white truncate flex-1 text-center">
                                    {tab.title?.replace(' - Perplexity', '') || 'New Thread'}
                                </span>
                                <button
                                    onContextMenu={(e) => {
                                        e.preventDefault()
                                        window.api.showContextMenu(tab.id)
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onCloseTab(tab.id)
                                    }}
                                    className="hover:bg-[#3e3e42] rounded p-0.5 flex-shrink-0"
                                >
                                    <X size={14} className="text-gray-400" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* New Tab Button */}
                    <button
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            window.api.showNewTabMenu(Math.round(rect.left), Math.round(rect.bottom), activeProfile?.id)
                        }}
                        className="h-full px-3 hover:bg-[#2a2a2a] transition-colors flex items-center flex-shrink-0 border-l border-[#1e1e1e]"
                        title="New Tab (Ctrl+T)"
                        style={{ WebkitAppRegion: 'no-drag' }}
                    >
                        <Plus size={16} className="text-gray-300" />
                    </button>
                </div>

                {/* Right: Window Controls */}
                <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' }}>
                    <button
                        onClick={() => window.api.minimizeWindow()}
                        className="h-10 w-12 hover:bg-[#2a2a2a] flex items-center justify-center transition-colors"
                    >
                        <Minus size={16} className="text-white" />
                    </button>
                    <button
                        onClick={handleMaximize}
                        className="h-10 w-12 hover:bg-[#2a2a2a] flex items-center justify-center transition-colors"
                    >
                        <Square size={14} className="text-white" />
                    </button>
                    <button
                        onClick={() => window.api.closeWindow()}
                        className="h-10 w-12 hover:bg-red-600 flex items-center justify-center transition-colors"
                    >
                        <X size={16} className="text-white" />
                    </button>
                </div>
            </div>
        </>
    )
}
