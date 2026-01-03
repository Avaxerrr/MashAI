import { Plus } from 'lucide-react'
import { useState, SyntheticEvent } from 'react'
import type { AIProvider } from '../types'

interface NewTabPopoverProps {
    providers?: AIProvider[];
    onSelectProvider: (profileId: string, url: string) => void;
    profileId: string;
}

export default function NewTabPopover({ providers = [], onSelectProvider, profileId }: NewTabPopoverProps) {
    const getHostnameSafe = (url: string): string | null => {
        try {
            return new URL(url).hostname
        } catch (e) {
            return null
        }
    }

    const [isOpen, setIsOpen] = useState(false)
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })

    const handleSelect = (provider: AIProvider) => {
        onSelectProvider(profileId, provider.url)
        setIsOpen(false)
    }

    const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
        window.api.hideWebView()
        setIsOpen(true)
    }

    const handleClose = () => {
        window.api.showWebView()
        setIsOpen(false)
    }

    return (
        <div className="relative" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button
                onClick={handleOpen}
                className="h-10 px-3 hover:bg-[#2a2a2a] transition-colors flex items-center flex-shrink-0 border-l border-[#1e1e1e]"
                title="New Tab (Ctrl+T)"
            >
                <Plus size={16} className="text-gray-300" />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={handleClose}
                    />

                    {/* Dropdown */}
                    <div
                        className="fixed bg-[#252526] border border-[#3e3e42] rounded-lg shadow-xl min-w-[200px] z-[9999] py-1 overflow-hidden"
                        style={{ top: dropdownPos.top, right: dropdownPos.right }}
                    >
                        <div className="px-3 py-2 text-xs text-gray-500 border-b border-[#3e3e42]">
                            Choose AI Provider
                        </div>
                        {providers.map(provider => (
                            <button
                                key={provider.id}
                                onClick={() => handleSelect(provider)}
                                className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-[#2a2d2e] text-white text-sm text-left transition-colors"
                            >
                                {(() => {
                                    if (provider.faviconDataUrl) {
                                        return (
                                            <img
                                                src={provider.faviconDataUrl}
                                                className="w-5 h-5"
                                                alt=""
                                                onError={(e: SyntheticEvent<HTMLImageElement>) => {
                                                    const hostname = getHostnameSafe(provider.url)
                                                    e.currentTarget.src = hostname
                                                        ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
                                                        : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="10"/></svg>'
                                                }}
                                            />
                                        )
                                    }
                                    const hostname = getHostnameSafe(provider.url)
                                    return (
                                        <img
                                            src={hostname
                                                ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
                                                : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="10"/></svg>'
                                            }
                                            className="w-5 h-5"
                                            alt=""
                                            onError={(e: SyntheticEvent<HTMLImageElement>) => {
                                                e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="10"/></svg>'
                                            }}
                                        />
                                    )
                                })()}
                                <span>{provider.name}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
