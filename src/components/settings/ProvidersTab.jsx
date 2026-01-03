import { Plus, Trash2, GripVertical, Star, RotateCcw, Bot } from 'lucide-react'
import { PROVIDER_DEFAULT_COLORS, DEFAULT_PROVIDER_COLOR } from '../../constants'

/**
 * Helper function to safely extract hostname from URL
 */
const getHostnameSafe = (url) => {
    try {
        return new URL(url).hostname
    } catch (e) {
        return null
    }
}

/**
 * ProvidersTab - AI Provider management section
 */
export default function ProvidersTab({
    providers,
    addProvider,
    updateProvider,
    deleteProvider,
    reorderProviders,
    defaultProviderId,
    setAsDefault,
    // Drag state
    draggedProviderId,
    setDraggedProviderId,
    dragOverProviderId,
    setDragOverProviderId,
    // Animation
    newlyAddedProviderId,
    providersListRef
}) {
    const resetProviderColor = (providerId) => {
        const defaultColor = PROVIDER_DEFAULT_COLORS[providerId] || DEFAULT_PROVIDER_COLOR
        updateProvider(providerId, 'color', defaultColor)
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Bot size={20} className="text-violet-400" />
                        AI Providers
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Click the star to set as default for new tabs</p>
                </div>
                <button
                    onClick={addProvider}
                    className="flex items-center gap-2 text-sm bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-violet-600/20"
                >
                    <Plus size={16} /> Add AI
                </button>
            </div>

            {/* Helpful hints with intentional design */}
            <div className="flex items-start gap-3 px-4 py-3 bg-[#1e293b] border-l-2 border-violet-500 rounded-r-lg -mt-3">
                <svg className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-gray-300 leading-relaxed">
                    Drag to reorder • Customize tab colors • Reset button restores defaults
                </p>
            </div>
            <div ref={providersListRef} className="space-y-3">
                {providers.map((provider, idx) => {
                    const isDefault = provider.id === defaultProviderId
                    const isDragging = draggedProviderId === provider.id
                    const isDragOver = dragOverProviderId === provider.id

                    return (
                        <div
                            key={provider.id}
                            draggable
                            onDragStart={(e) => {
                                setDraggedProviderId(provider.id)
                                e.dataTransfer.effectAllowed = 'move'
                            }}
                            onDragOver={(e) => {
                                e.preventDefault()
                                e.dataTransfer.dropEffect = 'move'
                                if (draggedProviderId && draggedProviderId !== provider.id) {
                                    setDragOverProviderId(provider.id)
                                }
                            }}
                            onDragLeave={(e) => {
                                if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
                                    setDragOverProviderId(null)
                                }
                            }}
                            onDrop={(e) => {
                                e.preventDefault()
                                if (draggedProviderId && draggedProviderId !== provider.id) {
                                    const draggedIndex = providers.findIndex(p => p.id === draggedProviderId)
                                    const targetIndex = providers.findIndex(p => p.id === provider.id)

                                    if (draggedIndex !== -1 && targetIndex !== -1) {
                                        reorderProviders(draggedIndex, targetIndex)
                                    }
                                }
                                setDraggedProviderId(null)
                                setDragOverProviderId(null)
                            }}
                            onDragEnd={() => {
                                setDraggedProviderId(null)
                                setDragOverProviderId(null)
                            }}
                            className={`flex items-center gap-4 p-4 rounded-xl transition-all cursor-move ${newlyAddedProviderId === provider.id
                                ? 'bg-[#252526] neon-glow-green'
                                : isDefault
                                    ? 'bg-[#252526] ring-2 ring-violet-500/50 shadow-lg shadow-violet-500/10'
                                    : 'bg-[#252526]'
                                } ${isDragOver ? 'border-l-4 border-l-green-500' : ''}`}
                            style={{ opacity: isDragging ? 0.5 : 1 }}
                        >
                            {/* Drag Handle */}
                            <div className="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing">
                                <GripVertical size={20} />
                            </div>
                            {/* Star button for setting default */}
                            <button
                                onClick={() => setAsDefault(provider.id)}
                                className={`p-2 rounded-lg transition-all ${isDefault
                                    ? 'text-yellow-400 bg-yellow-500/10'
                                    : 'text-gray-600 hover:text-yellow-400 hover:bg-yellow-500/5'
                                    }`}
                                title={isDefault ? 'Default AI' : 'Set as default'}
                            >
                                <Star size={18} fill={isDefault ? 'currentColor' : 'none'} />
                            </button>

                            {/* Favicon display */}
                            <div className="w-[76px] h-[76px] flex-shrink-0 flex items-center justify-center rounded-lg">
                                {provider.faviconDataUrl ? (
                                    <img
                                        src={provider.faviconDataUrl}
                                        alt=""
                                        className="w-8 h-8"
                                        onError={(e) => {
                                            // Fallback to Google favicon service if cached favicon fails
                                            try {
                                                const urlObj = new URL(provider.url);
                                                e.target.src = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
                                            } catch {
                                                e.target.style.display = 'none';
                                            }
                                        }}
                                    />
                                ) : provider.url ? (
                                    (() => {
                                        const hostname = getHostnameSafe(provider.url)
                                        return hostname ? (
                                            <img
                                                src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                                                alt=""
                                                className="w-8 h-8"
                                                onError={(e) => e.target.style.display = 'none'}
                                            />
                                        ) : (
                                            <div className="w-8 h-8 bg-[#3e3e42] rounded" />
                                        )
                                    })()
                                ) : (
                                    <div className="w-8 h-8 bg-[#3e3e42] rounded" />
                                )}
                            </div>

                            <div className="flex-1 space-y-2">
                                <input
                                    type="text"
                                    value={provider.name}
                                    onChange={(e) => updateProvider(provider.id, 'name', e.target.value)}
                                    className={`w-full bg-[#1e1e1e] text-white text-sm font-medium px-3 py-2 rounded-lg outline-none border-2 transition-all ${!provider.name.trim()
                                        ? 'border-red-500/50 focus:ring-2 focus:ring-red-500'
                                        : 'border-transparent focus:ring-2 focus:ring-violet-500'
                                        }`}
                                    placeholder="Provider Name (required)"
                                />
                                <div className={`flex items-center bg-[#1e1e1e] rounded-lg border-2 transition-all ${!getHostnameSafe(provider.url)
                                    ? 'border-red-500/50 focus-within:ring-2 focus-within:ring-red-500'
                                    : 'border-transparent focus-within:ring-2 focus-within:ring-violet-500'
                                    }`}>
                                    <span className="text-xs text-gray-500 pl-3 select-none">https://</span>
                                    <input
                                        type="text"
                                        value={provider.url.replace(/^https?:\/\//, '')}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/^https?:\/\//, '')
                                            updateProvider(provider.id, 'url', `https://${value}`)
                                        }}
                                        className="flex-1 bg-transparent text-xs text-violet-400 px-1 py-2 outline-none"
                                        placeholder="example.com (required)"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col items-center gap-1">
                                    <input
                                        type="color"
                                        value={provider.color || '#191A1A'}
                                        onChange={(e) => updateProvider(provider.id, 'color', e.target.value)}
                                        className="w-10 h-10 rounded-lg cursor-pointer border-0"
                                        title="Tab Background Color"
                                    />
                                    <button
                                        onClick={() => resetProviderColor(provider.id)}
                                        className="p-1 text-gray-500 hover:text-violet-400 transition-colors"
                                        title="Reset to default color"
                                    >
                                        <RotateCcw size={12} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => deleteProvider(provider.id)}
                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-all"
                                    title="Delete provider"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    )
}
