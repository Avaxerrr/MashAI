/**
 * GeneralTab - About section and tips for the settings modal
 */
export default function GeneralTab() {
    return (
        <div className="space-y-6 max-w-2xl">
            <div className="bg-[#252526] p-6 rounded-xl border border-[#3e3e42]">
                <h3 className="text-white font-semibold text-base mb-3">About MashAI</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                    A unified interface for all your AI assistants. Manage multiple AI providers and profiles in one place.
                </p>
                <div className="mt-6 pt-4 border-t border-[#3e3e42]">
                    <p className="text-xs text-gray-500">Version 1.0.0</p>
                </div>
            </div>
            <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-4">
                <p className="text-sm text-blue-300">
                    💡 <strong className="font-medium">Tip:</strong> Set your default AI provider in the "AI Providers" tab by clicking the star icon.
                </p>
            </div>
        </div>
    )
}
