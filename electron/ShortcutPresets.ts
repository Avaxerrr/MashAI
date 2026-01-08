/**
 * Keyboard Shortcut Presets for MashAI
 * 
 * Provides preset shortcut configurations for different browser styles:
 * - Standard: Chrome/Firefox/Edge/Brave style (default)
 * - Safari: macOS Safari style
 * - Custom: User-defined shortcuts
 */

import type { ShortcutPreset, ShortcutConfig, ShortcutSettings } from './types';

// Re-export types for convenience
export type { ShortcutPreset, ShortcutConfig, ShortcutSettings };

/**
 * Standard preset (Chrome/Firefox/Edge/Brave style)
 * This is the default and most common shortcut configuration
 */
export const STANDARD_SHORTCUTS: ShortcutConfig = {
    newTab: 'CmdOrCtrl+T',
    closeTab: 'CmdOrCtrl+W',
    reloadTab: 'CmdOrCtrl+R',
    forceReloadTab: 'CmdOrCtrl+Shift+R',
    nextTab: 'Ctrl+Tab',
    prevTab: 'Ctrl+Shift+Tab',
    reopenClosedTab: 'CmdOrCtrl+Shift+T',
    downloads: 'CmdOrCtrl+J'
};

/**
 * Safari preset (macOS Safari style)
 * Main difference is the Downloads shortcut
 */
export const SAFARI_SHORTCUTS: ShortcutConfig = {
    newTab: 'CmdOrCtrl+T',
    closeTab: 'CmdOrCtrl+W',
    reloadTab: 'CmdOrCtrl+R',
    forceReloadTab: 'CmdOrCtrl+Shift+R',
    nextTab: 'Ctrl+Tab',
    prevTab: 'Ctrl+Shift+Tab',
    reopenClosedTab: 'CmdOrCtrl+Shift+T',
    downloads: 'CmdOrCtrl+Alt+L'  // Safari uses Cmd+Option+L
};

/**
 * Brave preset
 * Main difference: uses F5 for reload instead of Ctrl+R
 */
export const BRAVE_SHORTCUTS: ShortcutConfig = {
    newTab: 'CmdOrCtrl+T',
    closeTab: 'CmdOrCtrl+W',
    reloadTab: 'F5',
    forceReloadTab: 'Shift+F5',
    nextTab: 'Ctrl+Tab',
    prevTab: 'Ctrl+Shift+Tab',
    reopenClosedTab: 'CmdOrCtrl+Shift+T',
    downloads: 'CmdOrCtrl+J'
};

/**
 * Get shortcuts for a specific preset
 * For 'custom', this returns the standard shortcuts as base
 */
export function getShortcutsForPreset(preset: ShortcutPreset): ShortcutConfig {
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

/**
 * Get display-friendly name for a preset
 */
export function getPresetDisplayName(preset: ShortcutPreset): string {
    switch (preset) {
        case 'standard':
            return 'Standard (Chrome/Firefox/Edge)';
        case 'safari':
            return 'Safari';
        case 'brave':
            return 'Brave';
        case 'custom':
            return 'Custom';
        default:
            return 'Standard';
    }
}

/**
 * Validate shortcut format for Electron accelerators
 * Returns true if valid, false otherwise
 */
export function isValidShortcut(shortcut: string): boolean {
    if (!shortcut || shortcut.trim() === '') return false;

    // Valid modifiers in Electron
    const validModifiers = [
        'Command', 'Cmd', 'Control', 'Ctrl', 'CommandOrControl', 'CmdOrCtrl',
        'Alt', 'Option', 'AltGr', 'Shift', 'Super', 'Meta'
    ];

    // Valid key codes include letters, numbers, F-keys, and special keys
    const validKeys = /^[A-Za-z0-9]$|^F\d{1,2}$|^(Plus|Space|Tab|Capslock|Numlock|Scrolllock|Backspace|Delete|Insert|Return|Enter|Up|Down|Left|Right|Home|End|PageUp|PageDown|Escape|Esc|VolumeUp|VolumeDown|VolumeMute|MediaNextTrack|MediaPreviousTrack|MediaStop|MediaPlayPause|PrintScreen)$/;

    const parts = shortcut.split('+');
    if (parts.length < 2) return false; // Need at least modifier + key

    const key = parts[parts.length - 1];
    const modifiers = parts.slice(0, -1);

    // Check if all modifiers are valid
    if (!modifiers.every(mod => validModifiers.includes(mod))) return false;

    // Check if key is valid
    if (!validKeys.test(key)) return false;

    return true;
}

/**
 * Default shortcut settings
 */
export function getDefaultShortcutSettings(): ShortcutSettings {
    return {
        preset: 'standard',
        custom: { ...STANDARD_SHORTCUTS }
    };
}
