import { Info, Github, Coffee, Bug, RefreshCw, Send, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import MashAILogo from '../../assets/MashAI-logo.png'

type FeedbackType = 'bug' | 'suggestion' | 'question' | 'other';

// Discord webhook URLs
const DISCORD_WEBHOOKS: Record<FeedbackType, string> = {
    bug: 'https://discord.com/api/webhooks/1461793527603396769/ojhR0hbikwZk-JXfwBmIDYls-zFrQ-JaJpUKnL2zGo6yOZqYm-flYKEOmom3brg4ApgG',
    suggestion: 'https://discord.com/api/webhooks/1461793469298118880/8SocdaputUYg-jIQQbyMm5hjGkV1ilSDY3aBPcND9ZZKj8mI-OXzu02qRXJ6D7EPz18q',
    question: 'https://discord.com/api/webhooks/1461793299802357831/UlK-0J8zmiWNOmMbehEyDFM6m5DVr1O9e_RbSwhbUS7icvHOSTo2xvKVvgYQ3VaDoYjG',
    other: 'https://discord.com/api/webhooks/1461793299802357831/UlK-0J8zmiWNOmMbehEyDFM6m5DVr1O9e_RbSwhbUS7icvHOSTo2xvKVvgYQ3VaDoYjG'
};

const WEB3FORMS_KEY = '79d73666-1e1a-474c-a484-5e985b162039';

const FEEDBACK_LABELS: Record<FeedbackType, { label: string; color: number; emoji: string }> = {
    bug: { label: 'Bug Report', color: 0xef4444, emoji: '🐛' },
    suggestion: { label: 'Suggestion', color: 0x8b5cf6, emoji: '💡' },
    question: { label: 'Question', color: 0x3b82f6, emoji: '❓' },
    other: { label: 'General Feedback', color: 0x6b7280, emoji: '💬' }
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

        setIsSubmitting(true)
        setSubmitStatus('idle')

        const feedbackInfo = FEEDBACK_LABELS[feedbackType]
        const osInfo = getOSInfo()

        try {
            // Send to Discord
            const discordPayload = {
                embeds: [{
                    title: `${feedbackInfo.emoji} ${feedbackInfo.label}`,
                    description: message,
                    color: feedbackInfo.color,
                    fields: [
                        { name: 'App Version', value: `v${appVersion}`, inline: true },
                        { name: 'OS', value: osInfo, inline: true },
                        ...(email ? [{ name: 'Email', value: email, inline: true }] : [])
                    ],
                    timestamp: new Date().toISOString()
                }]
            }

            await fetch(DISCORD_WEBHOOKS[feedbackType], {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(discordPayload)
            })

            // Send to Web3Forms as backup
            const web3Payload = {
                access_key: WEB3FORMS_KEY,
                subject: `[MashAI ${feedbackInfo.label}] App Feedback`,
                from_name: email || 'Anonymous User',
                email: email || 'noreply@mashai.app',
                message: `Type: ${feedbackInfo.label}\nVersion: v${appVersion}\nOS: ${osInfo}\n\n${message}`
            }

            await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(web3Payload)
            })

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
                            <span>GitHub Issues</span>
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

            {/* Feedback Form */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm flex items-center gap-2">
                        <MessageSquare size={14} className="text-violet-400" />
                        Send Feedback
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Report bugs, suggest features, or ask questions
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
                                    {FEEDBACK_LABELS[type].emoji} {FEEDBACK_LABELS[type].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Email (optional) */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-2">Email (optional, for follow-up)</label>
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
