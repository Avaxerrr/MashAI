import { useEffect } from 'react'
import { Check } from 'lucide-react'

interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
}

export default function Toast({ message, isVisible, onClose }: ToastProps) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose()
            }, 2500)
            return () => clearTimeout(timer)
        }
    }, [isVisible, onClose])

    if (!isVisible) return null

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-slideDown">
            <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 border border-green-500">
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                    <Check size={14} className="text-green-600" strokeWidth={3} />
                </div>
                <span className="font-medium text-sm">{message}</span>
            </div>
        </div>
    )
}
