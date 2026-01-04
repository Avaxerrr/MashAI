import { useEffect } from 'react'
import { Check, X, AlertTriangle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    type?: ToastType;
    duration?: number; // in milliseconds, default 2500
}

const toastConfig: Record<ToastType, { bg: string; border: string; iconBg: string; iconColor: string; Icon: typeof Check }> = {
    success: {
        bg: 'bg-green-600',
        border: 'border-green-500',
        iconBg: 'bg-white',
        iconColor: 'text-green-600',
        Icon: Check
    },
    error: {
        bg: 'bg-red-600',
        border: 'border-red-500',
        iconBg: 'bg-white',
        iconColor: 'text-red-600',
        Icon: X
    },
    warning: {
        bg: 'bg-amber-500',
        border: 'border-amber-400',
        iconBg: 'bg-white',
        iconColor: 'text-amber-500',
        Icon: AlertTriangle
    },
    info: {
        bg: 'bg-blue-600',
        border: 'border-blue-500',
        iconBg: 'bg-white',
        iconColor: 'text-blue-600',
        Icon: Info
    }
};

export default function Toast({
    message,
    isVisible,
    onClose,
    type = 'success',
    duration = 2500
}: ToastProps) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose()
            }, duration)
            return () => clearTimeout(timer)
        }
    }, [isVisible, onClose, duration])

    if (!isVisible) return null

    const config = toastConfig[type];
    const { Icon } = config;

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-slideDown">
            <div className={`${config.bg} text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 border ${config.border}`}>
                <div className={`w-5 h-5 ${config.iconBg} rounded-full flex items-center justify-center`}>
                    <Icon size={14} className={config.iconColor} strokeWidth={3} />
                </div>
                <span className="font-medium text-sm">{message}</span>
            </div>
        </div>
    )
}
