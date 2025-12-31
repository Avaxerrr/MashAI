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

    const getProviderForTab = (tab) => {
        if (!tab.url) return null;
        return aiProviders.find(p => tab.url.includes(p.url) || (p.url && tab.url.startsWith(p.url)));
    }

    const getIconForTab = (tab) => {
        const provider = getProviderForTab(tab);
        if (provider) return provider.icon;

        // Fallback
        if (!tab.url) return 'https://www.perplexity.ai/favicon.ico';
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
        <div
            className="h-[36px] bg-[#323233] flex items-center justify-between select-none"
            style={{ WebkitAppRegion: 'drag' }}
        >

            {/* Left: Profile Switcher */}
            <div className="flex items-center h-full relative" style={{ WebkitAppRegion: 'no-drag' }}>
                <button
                    onClick={handleProfileClick}
                    className="h-full px-2 flex items-center gap-2 hover:bg-[#2a2a2a] transition-colors outline-none focus:outline-none relative z-50"
                >
                    <span className="text-lg">{activeProfile?.icon || '💼'}</span>
                    <span className="text-sm text-white">{activeProfile?.name || 'Work'}</span>
                    <ChevronDown size={14} className="text-gray-400" />
                </button>

                {/* Navigation Buttons */}

                {/* Navigation Buttons */}
                <button
                    onClick={() => window.api.goBack()}
                    className="h-full px-3 hover:bg-[#2a2a2a] transition-colors"
                    title="Back (Alt+Left)"
                >
                    <ArrowLeft size={16} className="text-gray-300" />
                </button>
                <button
                    onClick={() => window.api.reload()}
                    className="h-full px-3 hover:bg-[#2a2a2a] transition-colors"
                    title="Reload (Ctrl+R)"
                >
                    <RotateCw size={16} className="text-gray-300" />
                </button>
            </div>

            {/* Center: Tabs */}
            <div className="flex-1 flex items-center h-full overflow-hidden">
                <div className="flex-1 flex items-center h-full overflow-x-auto scrollbar-hide">
                    {tabs.map(tab => {
                        const isActive = tab.id === activeTabId;
                        const provider = getProviderForTab(tab);
                        const activeBg = isActive ? (provider?.color || '#191A1A') : '';

                        return (
                            <div
                                key={tab.id}
                                onClick={() => onSwitchTab(tab.id)}
                                onContextMenu={(e) => {
                                    e.preventDefault()
                                    window.api.showContextMenu(tab.id)
                                }}
                                className={`h-full px-2 flex items-center gap-2 border-r border-[#1e1e1e] cursor-pointer group select-none
                                        ${!isActive ? 'bg-[#2d2d2d] hover:bg-[#2a2a2a]' : ''}
                                        min-w-[40px] max-w-[160px] flex-1 transition-colors duration-200
                                    `}
                                title={tab.title}
                                style={{
                                    WebkitAppRegion: 'no-drag',
                                    backgroundColor: isActive ? activeBg : undefined
                                }}
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
                        )
                    })}
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

            {/* Guaranteed Drag Region - Reserved space for window dragging */}
            <div className="h-full w-6 flex-shrink-0" title="Drag to move window" />

            {/* Right: Window Controls */}
            <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' }}>
                <button
                    onClick={() => window.api.minimizeWindow()}
                    className="h-full w-12 hover:bg-[#2a2a2a] flex items-center justify-center transition-colors"
                >
                    <Minus size={16} className="text-white" />
                </button>
                <button
                    onClick={handleMaximize}
                    className="h-full w-12 hover:bg-[#2a2a2a] flex items-center justify-center transition-colors"
                >
                    <Square size={14} className="text-white" />
                </button>
                <button
                    onClick={() => window.api.closeWindow()}
                    className="h-full w-12 hover:bg-red-600 flex items-center justify-center transition-colors"
                >
                    <X size={16} className="text-white" />
                </button>
            </div>
        </div>
    )
}
