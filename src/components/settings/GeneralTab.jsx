import { Info } from 'lucide-react'

/**
 * GeneralTab - About section and general app settings
 */
export default function GeneralTab({ generalSettings, onGeneralChange }) {
    const settings = {
        rememberWindowPosition: true,
        hardwareAcceleration: true,
        ...generalSettings
    }

    const updateSetting = (key, value) => {
        if (onGeneralChange) {
            onGeneralChange({ ...settings, [key]: value })
        }
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Info size={20} className="text-blue-400" />
                    General
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                    Basic app settings and information.
                </p>
            </div>

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
                            className="w-4 h-4 accent-blue-500 rounded"
                        />
                        <span className="text-sm text-white">Remember window size and position</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.hardwareAcceleration}
                            onChange={(e) => updateSetting('hardwareAcceleration', e.target.checked)}
                            className="w-4 h-4 accent-blue-500 rounded"
                        />
                        <div>
                            <span className="text-sm text-white">Hardware acceleration</span>
                            <span className="text-xs text-gray-500 ml-2">(requires restart)</span>
                        </div>
                    </label>
                </div>
            </div>

            {/* About Section */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">About MashAI</h3>
                </div>
                <div className="p-5">
                    <p className="text-sm text-gray-400">
                        A unified interface for all your AI assistants. Manage multiple AI providers and profiles in one place.
                    </p>
                    <p className="text-xs text-gray-500 mt-3">Version 1.0.0</p>
                </div>
            </div>
        </div>
    )
}
