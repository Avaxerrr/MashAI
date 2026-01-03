import { useState, useEffect } from 'react'
import { Settings, Keyboard, AlertCircle, Check } from 'lucide-react'
import type { GeneralSettings } from '../../types'

interface GeneralTabProps {
    generalSettings: GeneralSettings;
    onGeneralChange: (settings: GeneralSettings) => void;
}

interface ShortcutInputProps {
    type: 'hide' | 'aot';
    value: string;
    label: string;
    description: string;
}

/**
 * GeneralTab - System settings, tray settings, and general app settings
 */
export default function GeneralTab({ generalSettings, onGeneralChange }: GeneralTabProps) {
    const settings: GeneralSettings = {
        ...{
            rememberWindowPosition: true,
            hardwareAcceleration: true,
            launchAtStartup: false,
            alwaysOnTop: false,
            alwaysOnTopShortcut: 'CommandOrControl+Shift+A',
            minimizeToTray: true,
            showTrayIcon: true,
            hideShortcut: 'CommandOrControl+Shift+M',
            suspendOnHide: true,
            keepLastActiveTab: true,
            suspendDelaySeconds: 5,
        },
        ...generalSettings
    }

    const [hideShortcutInput, setHideShortcutInput] = useState(settings.hideShortcut || '')
    const [aotShortcutInput, setAotShortcutInput] = useState(settings.alwaysOnTopShortcut || '')
    const [shortcutError, setShortcutError] = useState<string | null>(null)
    const [shortcutValid, setShortcutValid] = useState(true)
    const [isRecording, setIsRecording] = useState<'hide' | 'aot' | null>(null)

    const DEFAULT_HIDE_SHORTCUT = 'CommandOrControl+Shift+M'
    const DEFAULT_AOT_SHORTCUT = 'CommandOrControl+Shift+A'

    useEffect(() => {
        setHideShortcutInput(settings.hideShortcut || '')
    }, [generalSettings?.hideShortcut])

    useEffect(() => {
        setAotShortcutInput(settings.alwaysOnTopShortcut || '')
    }, [generalSettings?.alwaysOnTopShortcut])

    const updateSetting = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
        if (onGeneralChange) {
            onGeneralChange({ ...settings, [key]: value })
        }
    }

    const handleShortcutKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>, type: 'hide' | 'aot') => {
        if (isRecording !== type) return

        e.preventDefault()
        e.stopPropagation()

        const parts: string[] = []
        if (e.ctrlKey) parts.push('Ctrl')
        if (e.altKey) parts.push('Alt')
        if (e.shiftKey) parts.push('Shift')
        if (e.metaKey) parts.push('Super')

        const key = e.key
        if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
            parts.push(key.length === 1 ? key.toUpperCase() : key)
        }

        if (parts.length > 1) {
            const shortcut = parts.join('+')

            if (type === 'hide') {
                setHideShortcutInput(shortcut)
                updateSetting('hideShortcut', shortcut)
            } else {
                setAotShortcutInput(shortcut)
                updateSetting('alwaysOnTopShortcut', shortcut)
            }

            setShortcutError(null)
            setShortcutValid(true)
            setIsRecording(null)
        }
    }

    const clearShortcut = (type: 'hide' | 'aot') => {
        if (type === 'hide') {
            setHideShortcutInput('')
            updateSetting('hideShortcut', '')
        } else {
            setAotShortcutInput('')
            updateSetting('alwaysOnTopShortcut', '')
        }
        setShortcutError(null)
        setShortcutValid(true)
    }

    const resetShortcut = (type: 'hide' | 'aot') => {
        if (type === 'hide') {
            setHideShortcutInput(DEFAULT_HIDE_SHORTCUT)
            updateSetting('hideShortcut', DEFAULT_HIDE_SHORTCUT)
        } else {
            setAotShortcutInput(DEFAULT_AOT_SHORTCUT)
            updateSetting('alwaysOnTopShortcut', DEFAULT_AOT_SHORTCUT)
        }
        setShortcutError(null)
        setShortcutValid(true)
    }

    const handleShowTrayIconChange = (checked: boolean) => {
        if (checked) {
            updateSetting('showTrayIcon', true)
        } else {
            onGeneralChange({
                ...settings,
                showTrayIcon: false,
                minimizeToTray: false
            })
        }
    }

    const ShortcutInput = ({ type, value, label, description }: ShortcutInputProps) => (
        <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 text-sm text-white">
                <Keyboard size={16} className="text-gray-400" />
                {label}
            </label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={isRecording === type ? 'Press a key combination...' : value || 'Not set'}
                        readOnly
                        onFocus={() => setIsRecording(type)}
                        onBlur={() => setIsRecording(null)}
                        onKeyDown={(e) => handleShortcutKeyDown(e, type)}
                        className={`w-full bg-[#1e1e1e] border ${shortcutError ? 'border-red-500' : shortcutValid ? 'border-[#3e3e42]' : 'border-yellow-500'
                            } rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 cursor-pointer`}
                        placeholder="Click to record shortcut"
                    />
                    {value && shortcutValid && !shortcutError && (
                        <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                    )}
                    {shortcutError && (
                        <AlertCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" />
                    )}
                </div>
                <button
                    onClick={() => resetShortcut(type)}
                    className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg transition-colors"
                    title="Reset to default"
                >
                    Reset
                </button>
                <button
                    onClick={() => clearShortcut(type)}
                    className="px-3 py-2 bg-[#3e3e42] hover:bg-[#4e4e52] text-white text-sm rounded-lg transition-colors"
                >
                    Clear
                </button>
            </div>
            <p className="text-xs text-gray-500">{description}</p>
        </div>
    )

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Settings size={20} className="text-violet-400" />
                    General
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                    System settings, tray options, and general app configuration.
                </p>
            </div>

            {/* System Settings */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">System</h3>
                </div>
                <div className="p-5 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.launchAtStartup}
                            onChange={(e) => updateSetting('launchAtStartup', e.target.checked)}
                            className="w-4 h-4 accent-violet-500 rounded"
                        />
                        <div>
                            <span className="text-sm text-white">Launch at system startup</span>
                            <p className="text-xs text-gray-500">Start MashAI when you log in to Windows</p>
                        </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.alwaysOnTop}
                            onChange={(e) => updateSetting('alwaysOnTop', e.target.checked)}
                            className="w-4 h-4 accent-violet-500 rounded"
                        />
                        <div>
                            <span className="text-sm text-white">Always on top</span>
                            <p className="text-xs text-gray-500">Keep MashAI window above other windows</p>
                        </div>
                    </label>

                    {settings.alwaysOnTop && (
                        <div className="pl-7">
                            <ShortcutInput
                                type="aot"
                                value={aotShortcutInput}
                                label="Toggle always-on-top shortcut"
                                description="Press this shortcut anywhere to toggle always-on-top"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* System Tray Settings */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">System Tray</h3>
                </div>
                <div className="p-5 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.showTrayIcon}
                            onChange={(e) => handleShowTrayIconChange(e.target.checked)}
                            className="w-4 h-4 accent-violet-500 rounded"
                        />
                        <div>
                            <span className="text-sm text-white">Show tray icon</span>
                            <p className="text-xs text-gray-500">Display MashAI icon in the system tray</p>
                        </div>
                    </label>

                    {settings.showTrayIcon && (
                        <>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.minimizeToTray}
                                    onChange={(e) => updateSetting('minimizeToTray', e.target.checked)}
                                    className="w-4 h-4 accent-violet-500 rounded"
                                />
                                <div>
                                    <span className="text-sm text-white">Minimize to tray instead of closing</span>
                                    <p className="text-xs text-gray-500">When clicking X, hide to tray instead of quitting</p>
                                </div>
                            </label>

                            <ShortcutInput
                                type="hide"
                                value={hideShortcutInput}
                                label="Hide/Show shortcut"
                                description="Press this shortcut anywhere to quickly show or hide MashAI"
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Tray Optimization Settings */}
            {settings.showTrayIcon && (
                <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                        <h3 className="text-white font-medium text-sm">Tray Optimization</h3>
                    </div>
                    <div className="p-5 space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.suspendOnHide}
                                onChange={(e) => updateSetting('suspendOnHide', e.target.checked)}
                                className="w-4 h-4 accent-violet-500 rounded"
                            />
                            <div>
                                <span className="text-sm text-white">Suspend tabs when hidden to tray</span>
                                <p className="text-xs text-gray-500">Free up memory by suspending background tabs</p>
                            </div>
                        </label>

                        {settings.suspendOnHide && (
                            <>
                                <label className="flex items-center gap-3 cursor-pointer pl-7">
                                    <input
                                        type="checkbox"
                                        checked={settings.keepLastActiveTab}
                                        onChange={(e) => updateSetting('keepLastActiveTab', e.target.checked)}
                                        className="w-4 h-4 accent-violet-500 rounded"
                                    />
                                    <div>
                                        <span className="text-sm text-white">Keep last active tab loaded</span>
                                        <p className="text-xs text-gray-500">Don't suspend the tab you were viewing</p>
                                    </div>
                                </label>

                                <div className="pl-7 space-y-2">
                                    <label className="text-sm text-white">Delay before suspension</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min="1"
                                            max="30"
                                            value={settings.suspendDelaySeconds}
                                            onChange={(e) => updateSetting('suspendDelaySeconds', parseInt(e.target.value))}
                                            className="flex-1 accent-violet-500"
                                        />
                                        <span className="text-sm text-gray-400 w-20">
                                            {settings.suspendDelaySeconds} second{settings.suspendDelaySeconds !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Wait before suspending to prevent accidental suspension
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Window Settings */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">Window</h3>
                </div>
                <div className="p-5 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.rememberWindowPosition}
                            onChange={(e) => updateSetting('rememberWindowPosition', e.target.checked)}
                            className="w-4 h-4 accent-violet-500 rounded"
                        />
                        <span className="text-sm text-white">Remember window size and position</span>
                    </label>
                    <div className="space-y-1">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.hardwareAcceleration}
                                onChange={(e) => updateSetting('hardwareAcceleration', e.target.checked)}
                                className="w-4 h-4 accent-violet-500 rounded"
                            />
                            <div>
                                <span className="text-sm text-white">Hardware acceleration</span>
                                <span className="text-xs text-gray-500 ml-2">(requires restart)</span>
                            </div>
                        </label>
                        <p className="text-xs text-gray-500 pl-7 leading-relaxed">
                            Uses your graphics card to make the app faster and smoother. Disable this if you experience display issues, flickering, or high GPU usage.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
