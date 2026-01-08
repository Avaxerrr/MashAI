import { useState, useEffect } from 'react'
import { Keyboard, RotateCcw, ChevronDown } from 'lucide-react'
import type { GeneralSettings, ShortcutSettings, ShortcutConfig, ShortcutPreset } from '../../types'
import { STANDARD_SHORTCUTS, SAFARI_SHORTCUTS, BRAVE_SHORTCUTS } from '../../types'

interface ShortcutsTabProps {
    generalSettings: GeneralSettings;
    shortcutSettings?: ShortcutSettings;
    onShortcutChange?: (settings: ShortcutSettings) => void;
    onImmediateApply?: () => void; // Triggers immediate save to apply shortcuts
}

const SHORTCUT_LABELS: Record<keyof ShortcutConfig, string> = {
    newTab: 'New Tab',
    closeTab: 'Close Tab',
    reloadTab: 'Reload Tab',
    forceReloadTab: 'Force Reload Tab',
    nextTab: 'Next Tab',
    prevTab: 'Previous Tab',
    reopenClosedTab: 'Reopen Closed Tab',
    downloads: 'Open Downloads',
    quickSearch: 'Quick Search'
};

const PRESET_LABELS: Record<ShortcutPreset, string> = {
    standard: 'Standard (Chrome/Firefox/Edge)',
    safari: 'Safari',
    brave: 'Brave',
    custom: 'Custom'
};

function getShortcutsForPreset(preset: ShortcutPreset): ShortcutConfig {
    switch (preset) {
        case 'safari':
            return { ...SAFARI_SHORTCUTS };
        case 'brave':
            return { ...BRAVE_SHORTCUTS };
        case 'standard':
        case 'custom':
        default:
            return { ...STANDARD_SHORTCUTS };
    }
}

function getDefaultShortcutSettings(): ShortcutSettings {
    return {
        preset: 'standard',
        custom: { ...STANDARD_SHORTCUTS }
    };
}

/**
 * ShortcutsTab - Display and configure keyboard shortcuts with browser presets
 */
export default function ShortcutsTab({ generalSettings, shortcutSettings, onShortcutChange, onImmediateApply }: ShortcutsTabProps) {
    const [settings, setSettings] = useState<ShortcutSettings>(
        shortcutSettings || getDefaultShortcutSettings()
    );
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [recordingKey, setRecordingKey] = useState<keyof ShortcutConfig | null>(null);

    useEffect(() => {
        if (shortcutSettings) {
            setSettings(shortcutSettings);
        }
    }, [shortcutSettings]);

    // Use generalSettings with fallback defaults
    const globalSettings = {
        hideShortcut: generalSettings.hideShortcut || 'CommandOrControl+Shift+M',
        alwaysOnTopShortcut: generalSettings.alwaysOnTopShortcut || 'CommandOrControl+Shift+A'
    };

    const formatShortcut = (shortcut: string): string => {
        return shortcut
            .replace(/CommandOrControl/g, 'Ctrl')
            .replace(/CmdOrCtrl/g, 'Ctrl')
            .replace(/Command/g, 'Cmd')
            .replace(/Control/g, 'Ctrl');
    };

    const getCurrentShortcuts = (): ShortcutConfig => {
        if (settings.preset === 'custom') {
            return settings.custom;
        }
        return getShortcutsForPreset(settings.preset);
    };

    const handlePresetChange = (preset: ShortcutPreset) => {
        const newSettings: ShortcutSettings = {
            preset,
            custom: preset === 'custom' ? settings.custom : getShortcutsForPreset(preset)
        };
        setSettings(newSettings);
        setIsDropdownOpen(false);
        onShortcutChange?.(newSettings);
        // Immediately apply to backend so menu accelerators update
        setTimeout(() => onImmediateApply?.(), 0);
    };

    const handleShortcutEdit = (key: keyof ShortcutConfig, newValue: string) => {
        // Auto-switch to custom when editing
        const newCustom = {
            ...getCurrentShortcuts(),
            [key]: newValue
        };
        const newSettings: ShortcutSettings = {
            preset: 'custom',
            custom: newCustom
        };
        setSettings(newSettings);
        onShortcutChange?.(newSettings);
        // Immediately apply to backend so menu accelerators update
        setTimeout(() => onImmediateApply?.(), 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent, key: keyof ShortcutConfig) => {
        if (recordingKey !== key) return;

        e.preventDefault();
        e.stopPropagation();

        const modifiers: string[] = [];
        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');
        if (e.metaKey) modifiers.push('Super');

        const keyName = e.key;
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(keyName)) {
            return; // Wait for actual key
        }

        const formattedKey = keyName.length === 1 ? keyName.toUpperCase() : keyName;

        if (modifiers.length > 0) {
            const shortcut = [...modifiers, formattedKey].join('+');
            handleShortcutEdit(key, shortcut);
            setRecordingKey(null);
        }
    };

    const handleResetToDefault = () => {
        const newSettings = getDefaultShortcutSettings();
        setSettings(newSettings);
        onShortcutChange?.(newSettings);
    };

    const currentShortcuts = getCurrentShortcuts();
    // All shortcuts are always editable - editing auto-switches to custom
    const isEditable = true;

    const ShortcutRow = ({
        shortcutKey,
        value,
        editable = false
    }: {
        shortcutKey: keyof ShortcutConfig;
        value: string;
        editable?: boolean;
    }) => {
        const isRecording = recordingKey === shortcutKey;

        return (
            <div className="flex items-center justify-between py-3 px-4 bg-[#1e1e1e] rounded-lg">
                <div className="flex-1">
                    <p className="text-sm text-white">{SHORTCUT_LABELS[shortcutKey]}</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={isRecording ? 'Press keys...' : formatShortcut(value)}
                        readOnly
                        onFocus={() => setRecordingKey(shortcutKey)}
                        onBlur={() => setRecordingKey(null)}
                        onKeyDown={(e) => handleKeyDown(e, shortcutKey)}
                        className={`px-3 py-1.5 bg-[#2a2a2b] border rounded text-xs text-gray-300 font-mono text-center w-36 cursor-pointer focus:outline-none ${isRecording
                            ? 'border-violet-500 ring-2 ring-violet-500/50'
                            : 'border-[#3e3e42] hover:border-violet-500/50'
                            }`}
                    />
                </div>
            </div>
        );
    };

    const DisplayOnlyRow = ({ keys, description }: { keys: string; description: string }) => (
        <div className="flex items-center justify-between py-3 px-4 bg-[#1e1e1e] rounded-lg">
            <div className="flex-1">
                <p className="text-sm text-white">{description}</p>
            </div>
            <kbd className="px-3 py-1.5 bg-[#2a2a2b] border border-[#3e3e42] rounded text-xs text-gray-300 font-mono">
                {keys}
            </kbd>
        </div>
    );

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Keyboard size={20} className="text-violet-400" />
                        Keyboard Shortcuts
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                        Configure keyboard shortcuts for tab navigation
                    </p>
                </div>
                <button
                    onClick={handleResetToDefault}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-[#3e3e42] rounded-lg transition-colors"
                    title="Reset to Standard (Chrome)"
                >
                    <RotateCcw size={14} />
                    Reset
                </button>
            </div>

            {/* Preset Selector */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42]">
                <div className="px-5 py-4">
                    <label className="text-sm text-gray-400 block mb-2">Shortcut Preset</label>
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full flex items-center justify-between px-4 py-2.5 bg-[#1e1e1e] border border-[#3e3e42] rounded-lg text-sm text-white hover:border-violet-500/50 transition-colors"
                        >
                            <span>{PRESET_LABELS[settings.preset]}</span>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-[#2a2a2b] border border-[#3e3e42] rounded-lg shadow-xl z-50 overflow-hidden">
                                {(['standard', 'safari', 'brave', 'custom'] as ShortcutPreset[]).map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => handlePresetChange(preset)}
                                        className={`w-full px-4 py-2.5 text-sm text-left hover:bg-[#3e3e42] transition-colors ${settings.preset === preset ? 'text-violet-400 bg-violet-500/10' : 'text-white'
                                            }`}
                                    >
                                        {PRESET_LABELS[preset]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        {settings.preset === 'custom'
                            ? 'Click on any shortcut below to customize it'
                            : 'Select a preset or modify any shortcut to create a custom configuration'}
                    </p>
                </div>
            </div>

            {/* Tab Navigation Shortcuts (Configurable) */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b] flex items-center justify-between">
                    <h3 className="text-white font-medium text-sm">Tab Navigation</h3>
                    {isEditable && (
                        <span className="text-xs text-violet-400">Click to edit</span>
                    )}
                </div>
                <div className="p-5 space-y-2">
                    {(Object.keys(SHORTCUT_LABELS) as (keyof ShortcutConfig)[]).map((key) => (
                        <ShortcutRow
                            key={key}
                            shortcutKey={key}
                            value={currentShortcuts[key]}
                            editable={isEditable}
                        />
                    ))}
                </div>
            </div>

            {/* Global Shortcuts (Editable in General tab) */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">Global Shortcuts</h3>
                    <p className="text-xs text-gray-500 mt-1">These shortcuts work system-wide (edit in General tab)</p>
                </div>
                <div className="p-5 space-y-2">
                    <DisplayOnlyRow
                        keys={formatShortcut(globalSettings.hideShortcut || 'Not set')}
                        description="Hide/Show MashAI"
                    />
                    {globalSettings.alwaysOnTopShortcut && (
                        <DisplayOnlyRow
                            keys={formatShortcut(globalSettings.alwaysOnTopShortcut)}
                            description="Toggle Always-on-Top"
                        />
                    )}
                </div>
            </div>

            {/* Window Management (Fixed) */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">Window & Zoom</h3>
                    <p className="text-xs text-gray-500 mt-1">System defaults (cannot be changed)</p>
                </div>
                <div className="p-5 space-y-2">
                    <DisplayOnlyRow keys="Ctrl + =" description="Zoom In" />
                    <DisplayOnlyRow keys="Ctrl + -" description="Zoom Out" />
                    <DisplayOnlyRow keys="Ctrl + 0" description="Reset Zoom" />
                    <DisplayOnlyRow keys="F11" description="Toggle Fullscreen" />
                    <DisplayOnlyRow keys="Alt + F4" description="Close Window / Quit" />
                </div>
            </div>

            {/* Info Note */}
            <div className="bg-[#1e2a1e] rounded-lg border border-[#3a523a] p-4">
                <p className="text-xs text-gray-400">
                    <span className="text-green-400 font-medium">Tip:</span> Changes are applied immediately.
                    No restart required.
                </p>
            </div>
        </div>
    );
}
