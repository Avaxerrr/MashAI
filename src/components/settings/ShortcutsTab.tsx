import { Keyboard } from 'lucide-react'
import type { GeneralSettings } from '../../types'

interface ShortcutsTabProps {
    generalSettings: GeneralSettings;
}

interface ShortcutRowProps {
    keys: string;
    description: string;
    editable?: boolean;
}

/**
 * ShortcutsTab - Display all keyboard shortcuts
 */
export default function ShortcutsTab({ generalSettings }: ShortcutsTabProps) {
    const settings = {
        ...{
            hideShortcut: 'CommandOrControl+Shift+M',
            alwaysOnTopShortcut: 'CommandOrControl+Shift+A',
        },
        ...generalSettings
    }

    const formatShortcut = (shortcut: string): string => {
        return shortcut
            .replace(/CommandOrControl/g, 'Ctrl')
            .replace(/CmdOrCtrl/g, 'Ctrl')
            .replace(/Command/g, 'Cmd')
            .replace(/Control/g, 'Ctrl')
    }

    const ShortcutRow = ({ keys, description, editable = false }: ShortcutRowProps) => (
        <div className="flex items-center justify-between py-3 px-4 bg-[#1e1e1e] rounded-lg">
            <div className="flex-1">
                <p className="text-sm text-white">{description}</p>
            </div>
            <div className="flex items-center gap-2">
                <kbd className="px-3 py-1.5 bg-[#2a2a2b] border border-[#3e3e42] rounded text-xs text-gray-300 font-mono">
                    {keys}
                </kbd>
                {editable && (
                    <span className="text-xs text-violet-400">(editable in General)</span>
                )}
            </div>
        </div>
    )

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Keyboard size={20} className="text-violet-400" />
                    Keyboard Shortcuts
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                    All available keyboard shortcuts in MashAI
                </p>
            </div>

            {/* Global Shortcuts */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">Global Shortcuts</h3>
                    <p className="text-xs text-gray-500 mt-1">These shortcuts work system-wide, even when MashAI is hidden</p>
                </div>
                <div className="p-5 space-y-2">
                    <ShortcutRow
                        keys={formatShortcut(settings.hideShortcut || 'Not set')}
                        description="Hide/Show MashAI"
                        editable={true}
                    />
                    {settings.alwaysOnTopShortcut && (
                        <ShortcutRow
                            keys={formatShortcut(settings.alwaysOnTopShortcut)}
                            description="Toggle Always-on-Top"
                            editable={true}
                        />
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">Tab Navigation</h3>
                </div>
                <div className="p-5 space-y-2">
                    <ShortcutRow keys="Ctrl + T" description="New Tab" />
                    <ShortcutRow keys="Ctrl + W" description="Close Tab" />
                    <ShortcutRow keys="Ctrl + Tab" description="Next Tab" />
                    <ShortcutRow keys="Ctrl + Shift + Tab" description="Previous Tab" />
                    <ShortcutRow keys="Ctrl + Shift + T" description="Reopen Closed Tab" />
                    <ShortcutRow keys="Ctrl + R" description="Reload Active Tab" />
                </div>
            </div>

            {/* Window Management */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">Window Management</h3>
                </div>
                <div className="p-5 space-y-2">
                    <ShortcutRow keys="Alt + F4" description="Close Window / Quit" />
                    <ShortcutRow keys="F11" description="Toggle Fullscreen" />
                </div>
            </div>

            {/* Note */}
            <div className="bg-[#1e2a1e] rounded-lg border border-[#3a523a] p-4">
                <p className="text-xs text-gray-400">
                    <span className="text-green-400 font-medium">Note:</span> Global shortcuts can be customized in the General settings tab.
                    All other shortcuts are built into the application and cannot be changed.
                </p>
            </div>
        </div>
    )
}
