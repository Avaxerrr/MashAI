/**
 * Shared constants for the React frontend
 */

// Window dimensions (must match Electron constants)
export const TITLEBAR_HEIGHT = 36;

// Default AI provider
export const DEFAULT_PROVIDER_ID = 'perplexity';

// Available profile icons
export interface ProfileIcon {
    name: string;
    label: string;
}

export const PROFILE_ICONS: ProfileIcon[] = [
    { name: 'briefcase', label: 'Briefcase' },
    { name: 'user', label: 'User' },
    { name: 'home', label: 'Home' },
    { name: 'zap', label: 'Zap' },
    { name: 'code', label: 'Code' },
    { name: 'globe', label: 'Globe' }
];

// Default colors
export const DEFAULT_PROFILE_COLOR = '#8b5cf6';
export const DEFAULT_PROVIDER_COLOR = '#191A1A';

// Provider default colors (for reset functionality)
export const PROVIDER_DEFAULT_COLORS: Record<string, string> = {
    'perplexity': '#191A1A',
    'gemini': '#000000',
    'chatgpt': '#212121',
    'claude': '#262624',
    'grok': '#000000'
};
