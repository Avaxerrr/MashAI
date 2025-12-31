import { Minus, Square, X, ChevronDown, Plus, ArrowLeft, RotateCw } from 'lucide-react'
import { useState } from 'react'

export default function TitleBar({
    profiles = [],
    activeProfile,
    tabs = [],
    activeTabId,
    onCreateTab,
    onSwitchTab,
    onCloseTab,
    onDuplicateTab,
    onReloadTab,
    onCloseOtherTabs,
    onCloseTabsToRight,
    onSwitchProfile
}) {
    const [showProfileMenu, setShowProfileMenu] = useState(false)
    const [isMaximized, setIsMaximized] = useState(false)

    const handleMaximize = () => {
        window.api.maximizeWindow()
        setIsMaximized(!isMaximized)
    }

    return (
        <>
            <div
                className="h-10 bg-[#323233] flex items-center justify-between select-none border-b border-[#1e1e1e]"
                style={{ WebkitAppRegion: 'drag' }}
            >

                {/* Left: Profile Switcher */}
                <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' }}>
                    <div className="relative">
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="h-10 px-3 flex items-center gap-2 hover:bg-[#2a2a2a] transition-colors"
                        >
                            <span className="text-lg">{activeProfile?.icon || '💼'}</span>
                            <span className="text-sm text-white">{activeProfile?.name || 'Work'}</span>
                            <ChevronDown size={14} className="text-gray-400" />
                        </button>

                        {/* Profile Dropdown */}
                        {showProfileMenu && (
                            <div className="absolute top-10 left-0 bg-[#252526] border border-[#3e3e42] rounded shadow-lg min-w-[150px] z-50">
                                {profiles.map(profile => (
                                    <button
                                        key={profile.id}
                                        onClick={() => {
                                            onSwitchProfile(profile.id)
                                            setShowProfileMenu(false)
                                        }}
                                        className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-[#2a2d2e] text-white text-sm ${profile.id === activeProfile?.id ? 'bg-[#37373d]' : ''}`}
                                    >
                                        <span>{profile.icon}</span>
                                        <span>{profile.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

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
                {/* REMOVED no-drag from container so the gaps are draggable */}
                {/* Center: Tabs */}
                {/* REMOVED no-drag from container so the gaps are draggable */}
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
                                    src="https://www.perplexity.ai/favicon.ico"
                                    className="w-4 h-4 flex-shrink-0"
                                    alt=""
                                    onError={(e) => e.target.style.display = 'none'}
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

                    {/* New Tab Button (Fixed outside scroll area) */}
                    <button
                        onClick={onCreateTab}
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
