import { Info, Github, Coffee, Bug, RefreshCw } from 'lucide-react'
import MashAILogo from '../../assets/MashAI-logo.png'

/**
 * AboutTab - Application information and credits
 */
export default function AboutTab() {
    const appVersion = '1.0.0-beta'

    const openLink = (url: string) => {
        window.api.openExternal(url)
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Info size={20} className="text-violet-400" />
                    About MashAI
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                    Application information and credits
                </p>
            </div>

            {/* Main About Card */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="p-6 space-y-5">
                    {/* Logo & Version */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="logo-shine w-20 h-20 rounded-xl transition-all duration-300 hover:scale-[1.03] cursor-pointer">
                            <img
                                src={MashAILogo}
                                alt="MashAI Logo"
                                className="w-full h-full rounded-xl"
                            />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-white">MashAI</h3>
                            <p className="text-xs text-gray-500 font-mono">v{appVersion}</p>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-400 leading-relaxed text-center">
                        Your unified AI workspace. All your AI tools organized for work.<br />
                        Free and open-source.
                    </p>

                    {/* Action Buttons - Row 1 */}
                    <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={() => openLink('https://github.com/Avaxerrr/MashAI')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#2a2a2b] border border-[#3e3e42] rounded-lg text-xs text-white transition-colors"
                        >
                            <Github size={14} />
                            <span>GitHub</span>
                        </button>
                        <button
                            onClick={() => openLink('https://github.com/Avaxerrr/MashAI/issues')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#2a2a2b] border border-[#3e3e42] rounded-lg text-xs text-white transition-colors"
                        >
                            <Bug size={14} />
                            <span>Report Issue</span>
                        </button>
                        <button
                            onClick={() => openLink('https://ko-fi.com/O4O31RETV3')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 border border-violet-500 rounded-lg text-xs text-white transition-colors"
                        >
                            <Coffee size={14} />
                            <span>Buy Me a Coffee</span>
                        </button>
                    </div>

                    {/* Check for Updates */}
                    <div className="flex items-center justify-center">
                        <button
                            onClick={() => openLink('https://github.com/Avaxerrr/MashAI/releases')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#2a2a2b] border border-[#3e3e42] rounded-lg text-xs text-gray-400 hover:text-white transition-colors"
                        >
                            <RefreshCw size={14} />
                            <span>Check for Updates</span>
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-[#3e3e42]"></div>

                    {/* Developer & Copyright */}
                    <div className="text-center space-y-1">
                        <p className="text-sm text-gray-400">
                            Created by <span className="text-white font-medium">Avaxerrr</span>
                        </p>
                        <p className="text-xs text-gray-500">
                            Licensed under MPL 2.0
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
