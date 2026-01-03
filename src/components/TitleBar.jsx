import { Minus, Square, X, ChevronDown, ArrowLeft, RotateCw, Plus, Briefcase, User, Home, Zap, Code, Globe, Check } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function TitleBar({
    profiles = [],
    activeProfile,
    tabs = [],
    activeTabId,
    tabMemory = {},
    onCreateTab,
    onCreateTabWithUrl,
    onSwitchTab,
    onCloseTab,
    onDuplicateTab,
    onReloadTab,
    onCloseOtherTabs,
    onCloseTabsToRight,
    onSwitchProfile,
    onReorderTabs,
    aiProviders = [],
    toastMessage = '',
    showToast = false,
    onCloseToast
}) {
    const [isMaximized, setIsMaximized] = useState(false)
    const [draggedTab, setDraggedTab] = useState(null)
    const [dragOverTab, setDragOverTab] = useState(null)

    // ... (rest of methods)

    const getProviderForTab = (tab) => {
        if (!tab.url) return null;
        return aiProviders.find(p => tab.url.includes(p.url) || (p.url && tab.url.startsWith(p.url)));
    }

    const getIconForTab = (tab) => {
        const provider = getProviderForTab(tab);

        // First priority: use pre-cached favicon from provider settings
        if (provider?.faviconDataUrl) {
            return provider.faviconDataUrl;
        }

        // Second priority: Use Google favicon service for the specific URL
        if (tab.url) {
            try {
                const urlObj = new URL(tab.url);
                return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
            } catch {
                // Invalid URL
            }
        }

        // Final fallback
        return 'https://www.google.com/s2/favicons?domain=perplexity.ai&sz=32';
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
        return <IconComponent size={16} />
    }

    // Auto-close toast after 2.5 seconds
    useEffect(() => {
        if (showToast && onCloseToast) {
            const timer = setTimeout(() => {
                onCloseToast()
            }, 2500)
            return () => clearTimeout(timer)
        }
    }, [showToast, onCloseToast])

    return (
        <div
            className="h-[36px] bg-[#323233] flex items-center justify-between select-none relative"
            style={{ WebkitAppRegion: 'drag' }}
        >
            {/* Toast Notification - inside TitleBar so it shows above WebContentsView */}
            {showToast && toastMessage && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] animate-fadeIn">
                    <div className="bg-green-600 text-white px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 border border-green-500">
                        <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                            <Check size={10} className="text-green-600" strokeWidth={3} />
                        </div>
                        <span className="font-medium text-xs whitespace-nowrap">{toastMessage}</span>
                    </div>
                </div>
            )}

            {/* Left: Profile Switcher */}
            <div className="flex items-center h-full relative" style={{ WebkitAppRegion: 'no-drag' }}>
                <button
                    onClick={handleProfileClick}
                    className="h-full px-2 flex items-center gap-2 hover:bg-[#2a2a2a] transition-colors outline-none focus:outline-none relative z-50"
                >
                    <div
                        className="w-6 h-6 rounded flex items-center justify-center text-white"
                        style={{ backgroundColor: activeProfile?.color || '#8b5cf6' }}
                    >
                        {renderProfileIcon(activeProfile?.icon || 'briefcase')}
                    </div>
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
                        const isDragging = draggedTab === tab.id;
                        const isDragOver = dragOverTab === tab.id;

                        return (
                            <div
                                key={tab.id}
                                draggable
                                onDragStart={(e) => {
                                    setDraggedTab(tab.id);
                                    e.dataTransfer.effectAllowed = 'move';
                                    // Set a transparent drag image to avoid the default ghost image
                                    const dragImage = document.createElement('div');
                                    dragImage.style.opacity = '0';
                                    document.body.appendChild(dragImage);
                                    e.dataTransfer.setDragImage(dragImage, 0, 0);
                                    setTimeout(() => document.body.removeChild(dragImage), 0);
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    if (draggedTab && draggedTab !== tab.id) {
                                        setDragOverTab(tab.id);
                                    }
                                }}
                                onDragLeave={(e) => {
                                    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
                                        setDragOverTab(null);
                                    }
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (draggedTab && draggedTab !== tab.id && onReorderTabs) {
                                        const draggedIndex = tabs.findIndex(t => t.id === draggedTab);
                                        const targetIndex = tabs.findIndex(t => t.id === tab.id);

                                        if (draggedIndex !== -1 && targetIndex !== -1) {
                                            onReorderTabs(draggedIndex, targetIndex);
                                        }
                                    }
                                    setDraggedTab(null);
                                    setDragOverTab(null);
                                }}
                                onDragEnd={() => {
                                    setDraggedTab(null);
                                    setDragOverTab(null);
                                }}
                                onClick={() => onSwitchTab(tab.id)}
                                onContextMenu={(e) => {
                                    e.preventDefault()
                                    window.api.showContextMenu(tab.id)
                                }}
                                className={`h-full px-2 flex items-center gap-2 border-r border-[#1e1e1e] cursor-pointer group select-none
                                        ${!isActive ? 'bg-[#2d2d2d] hover:bg-[#2a2a2a]' : ''}
                                        min-w-[40px] max-w-[160px] flex-1 transition-all duration-200
                                        ${isDragOver ? 'border-l-4 border-l-violet-400 bg-violet-500/20 scale-[1.02]' : ''}
                                        ${isDragging ? 'scale-95 shadow-lg shadow-violet-500/30 z-50' : ''}
                                        ${tab.loaded === false && !isDragging ? 'opacity-50' : ''}
                                    `}
                                title={(() => {
                                    const mem = tabMemory[tab.id];
                                    const memStr = mem?.memory ? ` (${mem.memory} MB)` : '';
                                    if (tab.loaded === false) {
                                        return `${tab.title} (suspended)`;
                                    }
                                    return `${tab.title}${memStr}`;
                                })()}
                                style={{
                                    WebkitAppRegion: 'no-drag',
                                    backgroundColor: isActive ? activeBg : (isDragging ? '#3e3e42' : undefined),
                                    opacity: isDragging ? 0.9 : 1
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
