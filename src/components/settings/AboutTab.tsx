import { Info, Github, ExternalLink } from 'lucide-react'
import MashAILogo from '../../assets/MashAI-logo.png'

/**
 * AboutTab - Application information and credits
 */
export default function AboutTab() {
    const appVersion = '1.0.0'

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

            {/* App Info */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">Mash AI</h3>
                </div>
                <div className="p-5 space-y-4">
                    {/* Logo */}
                    <div className="flex justify-center">
                        <div className="logo-shine w-24 h-24 rounded-xl transition-all duration-300 hover:scale-[1.03] cursor-pointer">
                            <img
                                src={MashAILogo}
                                alt="Mash AI Logo"
                                className="w-full h-full rounded-xl"
                            />
                        </div>
                    </div>

                    <div>
                        <p className="text-sm text-gray-400 leading-relaxed text-center">
                            A unified interface for all your AI assistants. Manage multiple AI providers and profiles in one place.
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-4 pt-2">
                        <div className="text-center">
                            <p className="text-xs text-gray-500">Version</p>
                            <p className="text-sm text-white font-mono">{appVersion}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Developer Info */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">Developer</h3>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <p className="text-sm text-gray-400">Created by <span className="text-white font-medium">Avaxerrr</span></p>
                        <p className="text-xs text-gray-500 mt-1 italic">"Let's try build everything"</p>
                    </div>

                    <button
                        onClick={() => openLink('https://github.com/Avaxerrr')}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] hover:bg-[#2a2a2b] border border-[#3e3e42] rounded-lg text-sm text-white transition-colors"
                    >
                        <Github size={16} />
                        <span>github.com/Avaxerrr</span>
                        <ExternalLink size={14} className="text-gray-500 ml-auto" />
                    </button>
                </div>
            </div>

            {/* Built With */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">Built With</h3>
                </div>
                <div className="p-5">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-[#1e1e1e] rounded-lg p-3 text-center">
                            <p className="text-sm text-white font-medium">Electron</p>
                            <p className="text-xs text-gray-500 mt-1">Desktop framework</p>
                        </div>
                        <div className="bg-[#1e1e1e] rounded-lg p-3 text-center">
                            <p className="text-sm text-white font-medium">React</p>
                            <p className="text-xs text-gray-500 mt-1">UI library</p>
                        </div>
                        <div className="bg-[#1e1e1e] rounded-lg p-3 text-center">
                            <p className="text-sm text-white font-medium">Node.js</p>
                            <p className="text-xs text-gray-500 mt-1">Runtime</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* System Information */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">System Information</h3>
                </div>
                <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Platform</span>
                        <span className="text-white font-mono">Windows</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Electron</span>
                        <span className="text-white font-mono">34.x</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Chrome</span>
                        <span className="text-white font-mono">132.x</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Node.js</span>
                        <span className="text-white font-mono">20.x</span>
                    </div>
                </div>
            </div>

            {/* Links */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">Links</h3>
                </div>
                <div className="p-5 space-y-2">
                    <button
                        onClick={() => openLink('https://github.com/Avaxerrr/MashAI')}
                        className="w-full flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] hover:bg-[#2a2a2b] border border-[#3e3e42] rounded-lg text-sm text-white transition-colors"
                    >
                        <Github size={16} />
                        <span>View on GitHub</span>
                        <ExternalLink size={14} className="text-gray-500 ml-auto" />
                    </button>
                    <button
                        onClick={() => openLink('https://github.com/Avaxerrr/MashAI/issues')}
                        className="w-full flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] hover:bg-[#2a2a2b] border border-[#3e3e42] rounded-lg text-sm text-white transition-colors"
                    >
                        <Info size={16} />
                        <span>Report an Issue</span>
                        <ExternalLink size={14} className="text-gray-500 ml-auto" />
                    </button>
                </div>
            </div>

            {/* License */}
            <div className="bg-[#1e1e1e] rounded-lg border border-[#3e3e42] p-4">
                <p className="text-xs text-gray-500 text-center">
                    © 2026 Avaxerrr. All rights reserved.
                </p>
            </div>
        </div>
    )
}
