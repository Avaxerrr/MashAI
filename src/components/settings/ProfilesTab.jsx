import { Plus, Trash2, GripVertical, Briefcase, User, Home, Zap, Code, Globe } from 'lucide-react'

// Icon map for rendering profile icons
const iconMap = {
    'briefcase': Briefcase,
    'user': User,
    'home': Home,
    'zap': Zap,
    'code': Code,
    'globe': Globe
}

const availableIcons = [
    { name: 'briefcase', component: Briefcase },
    { name: 'user', component: User },
    { name: 'home', component: Home },
    { name: 'zap', component: Zap },
    { name: 'code', component: Code },
    { name: 'globe', component: Globe }
]

/**
 * ProfilesTab - Profile management section
 */
export default function ProfilesTab({
    profiles,
    addProfile,
    updateProfile,
    deleteProfile,
    reorderProfiles,
    // Drag state
    draggedProfileId,
    setDraggedProfileId,
    dragOverProfileId,
    setDragOverProfileId,
    // Animation
    newlyAddedProfileId,
    profilesListRef
}) {
    const renderProfileIcon = (iconName) => {
        const IconComponent = iconMap[iconName] || User
        return <IconComponent size={20} />
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <User size={20} className="text-blue-400" />
                        Profiles
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Organize your work with different profiles</p>
                </div>
                <button
                    onClick={addProfile}
                    className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-blue-600/20"
                >
                    <Plus size={16} /> Add Profile
                </button>
            </div>

            {/* Helpful hints with intentional design */}
            <div className="flex items-start gap-3 px-4 py-3 bg-[#1e293b] border-l-2 border-blue-500 rounded-r-lg -mt-3">
                <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-gray-300 leading-relaxed">
                    Drag to reorder • Click color picker to customize • Choose icons for each profile
                </p>
            </div>
            <div ref={profilesListRef} className="space-y-3">
                {profiles.map((profile, idx) => {
                    const isDragging = draggedProfileId === profile.id
                    const isDragOver = dragOverProfileId === profile.id

                    return (
                        <div
                            key={profile.id}
                            draggable
                            onDragStart={(e) => {
                                setDraggedProfileId(profile.id)
                                e.dataTransfer.effectAllowed = 'move'
                            }}
                            onDragOver={(e) => {
                                e.preventDefault()
                                e.dataTransfer.dropEffect = 'move'
                                if (draggedProfileId && draggedProfileId !== profile.id) {
                                    setDragOverProfileId(profile.id)
                                }
                            }}
                            onDragLeave={(e) => {
                                if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
                                    setDragOverProfileId(null)
                                }
                            }}
                            onDrop={(e) => {
                                e.preventDefault()
                                if (draggedProfileId && draggedProfileId !== profile.id) {
                                    const draggedIndex = profiles.findIndex(p => p.id === draggedProfileId)
                                    const targetIndex = profiles.findIndex(p => p.id === profile.id)

                                    if (draggedIndex !== -1 && targetIndex !== -1) {
                                        reorderProfiles(draggedIndex, targetIndex)
                                    }
                                }
                                setDraggedProfileId(null)
                                setDragOverProfileId(null)
                            }}
                            onDragEnd={() => {
                                setDraggedProfileId(null)
                                setDragOverProfileId(null)
                            }}
                            className={`flex items-center gap-4 bg-[#252526] p-4 rounded-xl transition-all cursor-move ${newlyAddedProfileId === profile.id ? 'neon-glow-blue' : ''
                                } ${isDragOver ? 'border-l-4 border-l-blue-500' : ''}`}
                            style={{ opacity: isDragging ? 0.5 : 1 }}
                        >
                            {/* Drag Handle */}
                            <div className="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing">
                                <GripVertical size={20} />
                            </div>
                            {/* Icon & Color Selector */}
                            <div className="flex flex-col gap-2 flex-shrink-0">
                                <div
                                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white transition-all"
                                    style={{ backgroundColor: profile.color || '#3b82f6' }}
                                >
                                    {renderProfileIcon(profile.icon)}
                                </div>
                                <input
                                    type="color"
                                    value={profile.color || '#3b82f6'}
                                    onChange={(e) => updateProfile(profile.id, 'color', e.target.value)}
                                    className="w-12 h-6 rounded cursor-pointer border-0"
                                    title="Profile Color"
                                />
                            </div>

                            <div className="flex-1 space-y-3">
                                <input
                                    type="text"
                                    value={profile.name}
                                    onChange={(e) => updateProfile(profile.id, 'name', e.target.value)}
                                    className={`w-full bg-[#1e1e1e] text-white text-sm px-3 py-2 rounded-lg outline-none border-2 transition-all ${!profile.name.trim()
                                        ? 'border-red-500/50 focus:ring-2 focus:ring-red-500'
                                        : 'border-transparent focus:ring-2 focus:ring-blue-500'
                                        }`}
                                    placeholder="Profile Name (required)"
                                />
                                {/* Icon Selector */}
                                <div className="flex gap-2">
                                    {availableIcons.map(({ name, component: IconComp }) => (
                                        <button
                                            key={name}
                                            onClick={() => updateProfile(profile.id, 'icon', name)}
                                            className={`p-2 rounded-lg transition-all ${profile.icon === name
                                                ? 'bg-blue-500/20 text-blue-400'
                                                : 'bg-[#1e1e1e] text-gray-400 hover:text-white hover:bg-[#2a2a2c]'
                                                }`}
                                            title={name}
                                        >
                                            <IconComp size={16} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={() => deleteProfile(profile.id)}
                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-all"
                                title="Delete Profile"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
