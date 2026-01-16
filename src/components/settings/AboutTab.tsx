import { Info, Github, Coffee, Bug, Send, MessageSquare, Lightbulb, HelpCircle, MessageCircle, ExternalLink } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import MashAILogo from '../../assets/MashAI-logo.png'

type FeedbackType = 'bug' | 'suggestion' | 'question' | 'other';

// Cloudflare Worker URL (from environment variable)
const FEEDBACK_API_URL = import.meta.env.VITE_FEEDBACK_API_URL || '';

const FEEDBACK_LABELS: Record<FeedbackType, { label: string; color: number; icon: ReactNode }> = {
    bug: { label: 'Bug Report', color: 0xef4444, icon: <Bug size={14} /> },
    suggestion: { label: 'Suggestion', color: 0x8b5cf6, icon: <Lightbulb size={14} /> },
    question: { label: 'Question', color: 0x3b82f6, icon: <HelpCircle size={14} /> },
    other: { label: 'General Feedback', color: 0x6b7280, icon: <MessageCircle size={14} /> }
};

/**
 * AboutTab - Application information, credits, and feedback form
 */
export default function AboutTab() {
    const appVersion = '1.0.0-beta'
    const [feedbackType, setFeedbackType] = useState<FeedbackType>('bug')
    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

    const openLink = (url: string) => {
        window.api.openExternal(url)
    }

    const getOSInfo = () => {
        const platform = navigator.platform.toLowerCase()
        if (platform.includes('win')) return 'Windows'
        if (platform.includes('mac')) return 'macOS'
        if (platform.includes('linux')) return 'Linux'
        return platform
    }

    const submitFeedback = async () => {
        if (!message.trim()) return

        if (!FEEDBACK_API_URL) {
            console.error('Feedback API URL not configured. Set VITE_FEEDBACK_API_URL in .env')
            setSubmitStatus('error')
            return
        }

        setIsSubmitting(true)
        setSubmitStatus('idle')

        const osInfo = getOSInfo()

        try {
            // Send to Cloudflare Worker (Secure Proxy)
            const payload = {
                type: feedbackType,
                message: message,
                email: email.trim() || undefined,
                version: `v${appVersion}`,
                os: osInfo
            }

            const response = await fetch(FEEDBACK_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Feedback server error:', errorData);
                throw new Error(`Server responded with ${response.status}: ${errorData.details || errorData.error || 'Unknown error'}`)
            }

            setSubmitStatus('success')
            setMessage('')
            setEmail('')

            // Reset status after 3 seconds
            setTimeout(() => setSubmitStatus('idle'), 3000)
        } catch (error) {
            console.error('Failed to submit feedback:', error)
            setSubmitStatus('error')
        } finally {
            setIsSubmitting(false)
        }
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
                    Application information and feedback
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

                    {/* Links - Vertical Cards */}
                    <div className="space-y-2">
                        <button
                            onClick={() => openLink('https://github.com/Avaxerrr/MashAI')}
                            className="w-full flex items-center gap-3 p-3 bg-[#1e1e1e] hover:bg-[#2a2a2b] border border-[#3e3e42] rounded-lg text-left transition-colors group"
                        >
                            <div className="flex-shrink-0 w-8 h-8 bg-[#2a2a2b] group-hover:bg-[#333] rounded-lg flex items-center justify-center">
                                <Github size={16} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white font-medium">GitHub</p>
                                <p className="text-xs text-gray-500">Source code, releases & updates</p>
                            </div>
                            <ExternalLink size={14} className="text-gray-500 group-hover:text-gray-400" />
                        </button>

                        <button
                            onClick={() => openLink('https://github.com/Avaxerrr/MashAI/issues')}
                            className="w-full flex items-center gap-3 p-3 bg-[#1e1e1e] hover:bg-[#2a2a2b] border border-[#3e3e42] rounded-lg text-left transition-colors group"
                        >
                            <div className="flex-shrink-0 w-8 h-8 bg-[#2a2a2b] group-hover:bg-[#333] rounded-lg flex items-center justify-center">
                                <Bug size={16} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white font-medium">Report an Issue</p>
                                <p className="text-xs text-gray-500">Public issue tracker on GitHub</p>
                            </div>
                            <ExternalLink size={14} className="text-gray-500 group-hover:text-gray-400" />
                        </button>

                        <button
                            onClick={() => openLink('https://ko-fi.com/O4O31RETV3')}
                            className="w-full flex items-center gap-3 p-3 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/30 rounded-lg text-left transition-colors group"
                        >
                            <div className="flex-shrink-0 w-8 h-8 bg-violet-600/20 group-hover:bg-violet-600/30 rounded-lg flex items-center justify-center">
                                <Coffee size={16} className="text-violet-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-violet-300 font-medium">Support the Project</p>
                                <p className="text-xs text-violet-400/60">Buy me a coffee (optional)</p>
                            </div>
                            <ExternalLink size={14} className="text-violet-400/50 group-hover:text-violet-400/70" />
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

            {/* Feedback Form */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm flex items-center gap-2">
                        <MessageSquare size={14} className="text-violet-400" />
                        Send Feedback
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Quick way to reach me — no GitHub account needed
                    </p>
                </div>
                <div className="p-5 space-y-4">
                    {/* Feedback Type */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-2">Feedback Type</label>
                        <div className="flex gap-2 flex-wrap">
                            {(Object.keys(FEEDBACK_LABELS) as FeedbackType[]).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFeedbackType(type)}
                                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${feedbackType === type
                                        ? 'bg-violet-600 text-white'
                                        : 'bg-[#1e1e1e] text-gray-400 hover:bg-[#2a2a2b] hover:text-white'
                                        }`}
                                >
                                    <span className="inline-flex items-center gap-1.5">{FEEDBACK_LABELS[type].icon} {FEEDBACK_LABELS[type].label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Email (optional) */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-2">Email (optional — add for a personal response)</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                        />
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-2">Message</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Describe the issue, suggestion, or question..."
                            rows={4}
                            className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                            v{appVersion} • {getOSInfo()}
                        </p>
                        <button
                            onClick={submitFeedback}
                            disabled={!message.trim() || isSubmitting}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-colors ${submitStatus === 'success'
                                ? 'bg-green-600 text-white'
                                : submitStatus === 'error'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-violet-600 hover:bg-violet-700 text-white disabled:bg-gray-700 disabled:cursor-not-allowed'
                                }`}
                        >
                            <Send size={14} />
                            {isSubmitting ? 'Sending...' :
                                submitStatus === 'success' ? 'Sent!' :
                                    submitStatus === 'error' ? 'Failed' : 'Send Feedback'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
