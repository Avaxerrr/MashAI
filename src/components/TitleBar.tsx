import { Minus, Square, X, ChevronDown, ArrowLeft, RotateCw, Plus, Briefcase, User, Home, Zap, Code, Globe, Check, LucideIcon } from 'lucide-react'
import { useState, useEffect, SyntheticEvent, DragEvent } from 'react'
import type { Profile, AIProvider, TabMemoryInfo } from '../types'

interface TabState {
    id: string;
    profileId: string;
    url: string;
    title: string;
    loaded: boolean;
    suspended?: boolean;
    loading?: boolean;
    faviconDataUrl?: string;
}

interface TitleBarProps {
    profiles?: Profile[];
    activeProfile?: Profile;
    tabs?: TabState[];
    activeTabId?: string | null;
    tabMemory?: Record<string, TabMemoryInfo>;
    onCreateTab: () => void;
    onCreateTabWithUrl: (profileId: string, url: string) => void;
    onSwitchTab: (tabId: string) => void;
    onCloseTab: (tabId: string) => void;
    onDuplicateTab: (tabId: string) => void;
    onReloadTab: (tabId: string) => void;
    onCloseOtherTabs: (tabId: string) => void;
    onCloseTabsToRight: (tabId: string) => void;
    onSwitchProfile: (profileId: string) => void;
    onReorderTabs: (fromIndex: number, toIndex: number) => void;
    aiProviders?: AIProvider[];
    toastMessage?: string;
    showToast?: boolean;
    onCloseToast: () => void;
}

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
}: TitleBarProps) {
    const [isMaximized, setIsMaximized] = useState(false)
    const [draggedTab, setDraggedTab] = useState<string | null>(null)
    const [dragOverTab, setDragOverTab] = useState<string | null>(null)
    const [dragSide, setDragSide] = useState<'left' | 'right'>('left')

    const getProviderForTab = (tab: TabState): AIProvider | undefined => {
        if (!tab.url) return undefined;
        return aiProviders.find(p => tab.url.includes(p.url) || (p.url && tab.url.startsWith(p.url)));
    }

    const getIconForTab = (tab: TabState): string => {
        // 1. Use tab's own cached favicon (from session/page load)
        if (tab.faviconDataUrl) {
            return tab.faviconDataUrl;
        }

        // 2. Try provider's cached favicon
        const provider = getProviderForTab(tab);
        if (provider?.faviconDataUrl) {
            return provider.faviconDataUrl;
        }

        // 3. Use Google Favicon Service for the tab's URL
        if (tab.url) {
            try {
                const urlObj = new URL(tab.url);
                return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
            } catch {
                // Invalid URL - fall through to default
            }
        }

        // 4. Generic fallback - globe icon
        return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23888" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
    }

    const handleMaximize = () => {
        window.api.maximize()
        setIsMaximized(!isMaximized)
    }

    const handleProfileClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        window.api.showProfileMenu(Math.round(rect.left), Math.round(rect.bottom), activeProfile?.id || '')
    }

    const renderProfileIcon = (iconName: string) => {
        const iconMap: Record<string, LucideIcon> = {
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
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
            {/* Toast Notification */}
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
            <div className="flex items-center h-full relative" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
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
                                onDragStart={(e: DragEvent<HTMLDivElement>) => {
                                    setDraggedTab(tab.id);
                                    e.dataTransfer.effectAllowed = 'move';
                                    const dragImage = document.createElement('div');
                                    dragImage.style.opacity = '0';
                                    document.body.appendChild(dragImage);
                                    e.dataTransfer.setDragImage(dragImage, 0, 0);
                                    setTimeout(() => document.body.removeChild(dragImage), 0);
                                }}
                                onDragOver={(e: DragEvent<HTMLDivElement>) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    if (draggedTab && draggedTab !== tab.id) {
                                        setDragOverTab(tab.id);
                                        // Determine which side based on dragged tab position
                                        const draggedIndex = tabs.findIndex(t => t.id === draggedTab);
                                        const targetIndex = tabs.findIndex(t => t.id === tab.id);
                                        setDragSide(draggedIndex < targetIndex ? 'right' : 'left');
                                    }
                                }}
                                onDragLeave={(e: DragEvent<HTMLDivElement>) => {
                                    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
                                        setDragOverTab(null);
                                        setDragSide('left');
                                    }
                                }}
                                onDrop={(e: DragEvent<HTMLDivElement>) => {
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
                                        ${isDragOver && dragSide === 'left' ? 'border-l-4 border-l-violet-400' : ''}
                                        ${isDragOver && dragSide === 'right' ? 'border-r-4 border-r-violet-400' : ''}
                                        ${isDragOver ? 'bg-violet-500/20 scale-[1.02]' : ''}
                                        ${isDragging ? 'scale-95 shadow-lg shadow-violet-500/30 z-50' : ''}
                                        ${tab.loaded === false && !isDragging && !isDragOver ? 'opacity-50' : ''}
                                        ${tab.loading ? 'tab-loading-shimmer' : ''}
                                    `}
                                title={(() => {
                                    const mem = tabMemory[tab.id];
                                    const memStr = mem?.memoryKB ? ` (${mem.memoryKB} MB)` : '';
                                    if (tab.loaded === false) {
                                        return `${tab.title} (suspended)`;
                                    }
                                    return `${tab.title}${memStr}`;
                                })()}
                                style={{
                                    WebkitAppRegion: 'no-drag',
                                    backgroundColor: isActive ? activeBg : (isDragging ? '#3e3e42' : undefined),
                                    opacity: isDragging ? 0.8 : (isDragOver ? 1 : (tab.loaded === false ? 0.5 : 1))
                                } as React.CSSProperties}
                            >
                                <img
                                    src={getIconForTab(tab)}
                                    className="w-4 h-4 flex-shrink-0"
                                    alt=""
                                    onError={(e: SyntheticEvent<HTMLImageElement>) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.src = 'https://www.perplexity.ai/favicon.ico';
                                    }}
                                />
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
                        window.api.showNewTabMenu(Math.round(rect.left), Math.round(rect.bottom), activeProfile?.id || '')
                    }}
                    className="h-full px-3 hover:bg-[#2a2a2a] transition-colors flex items-center flex-shrink-0 border-l border-[#1e1e1e]"
                    title="New Tab (Ctrl+T)"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                    <Plus size={16} className="text-gray-300" />
                </button>
            </div>

            {/* Guaranteed Drag Region */}
            <div className="h-full w-6 flex-shrink-0" title="Drag to move window" />

            {/* Right: Window Controls */}
            <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <button
                    onClick={() => window.api.minimize()}
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
                    onClick={() => window.api.close()}
                    className="h-full w-12 hover:bg-red-600 flex items-center justify-center transition-colors"
                >
                    <X size={16} className="text-white" />
                </button>
            </div>
        </div>
    )
}
