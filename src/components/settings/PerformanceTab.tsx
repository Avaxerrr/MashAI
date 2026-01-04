import { useState, useEffect, ReactNode } from 'react'
import { Gauge } from 'lucide-react'
import type { PerformanceSettings } from '../../types'

interface PerformanceTabProps {
    performanceSettings: PerformanceSettings;
    onPerformanceChange: (settings: PerformanceSettings) => void;
}

interface MemoryUsage {
    total: number;
    tabCount: number;
    suspendedCount: number;
}

interface RadioOptionProps {
    name: string;
    value: string;
    currentValue: string;
    onChange: (value: string) => void;
    label: string;
    description?: ReactNode;
    recommended?: boolean;
}

/**
 * PerformanceTab - Memory and performance optimization settings
 */
export default function PerformanceTab({ performanceSettings, onPerformanceChange }: PerformanceTabProps) {
    const [settings, setSettings] = useState<PerformanceSettings>({
        ...{
            tabLoadingStrategy: 'lastActiveOnly',
            autoSuspendEnabled: true,
            autoSuspendMinutes: 30,
            profileSwitchBehavior: 'keep',
        },
        ...performanceSettings
    })

    const [memoryUsage, setMemoryUsage] = useState<MemoryUsage>({ total: 0, tabCount: 0, suspendedCount: 0 })

    useEffect(() => {
        if (performanceSettings) {
            setSettings(prev => ({ ...prev, ...performanceSettings }))
        }
    }, [performanceSettings])

    useEffect(() => {
        const fetchMemory = async () => {
            if (window.api?.getMemoryUsage) {
                try {
                    const usage = await window.api.getMemoryUsage()
                    setMemoryUsage({
                        total: usage.totalKB, // Already in MB from backend
                        tabCount: usage.tabsMemory.filter(t => t.loaded).length,
                        suspendedCount: usage.tabsMemory.filter(t => !t.loaded).length
                    })
                } catch (e) {
                    // API not available yet
                }
            }
        }
        fetchMemory()
        const interval = setInterval(fetchMemory, 5000)
        return () => clearInterval(interval)
    }, [])

    const updateSetting = <K extends keyof PerformanceSettings>(key: K, value: PerformanceSettings[K]) => {
        const newSettings = { ...settings, [key]: value }
        setSettings(newSettings)
        if (onPerformanceChange) {
            onPerformanceChange(newSettings)
        }
    }

    const RadioOption = ({ name, value, currentValue, onChange, label, description, recommended }: RadioOptionProps) => (
        <label className="flex items-start gap-3 p-3 hover:bg-[#3e3e42]/50 cursor-pointer transition-colors">
            <input
                type="radio"
                name={name}
                value={value}
                checked={currentValue === value}
                onChange={(e) => onChange(e.target.value)}
                className="w-4 h-4 accent-violet-500 mt-0.5"
            />
            <div className="flex-1">
                <span className="text-sm text-white">
                    {label}
                    {recommended && <span className="text-xs text-green-400 ml-2">(recommended)</span>}
                </span>
                {description && (
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
                )}
            </div>
        </label>
    )

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Gauge size={20} className="text-violet-400" />
                    Performance
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                    Control how MashAI manages memory and tabs to keep things running smoothly.
                </p>
            </div>

            {/* App Startup Section */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">When the app starts</h3>
                </div>
                <div className="divide-y divide-[#3e3e42]">
                    <RadioOption
                        name="tabLoading"
                        value="all"
                        currentValue={settings.tabLoadingStrategy}
                        onChange={(v) => updateSetting('tabLoadingStrategy', v as PerformanceSettings['tabLoadingStrategy'])}
                        label="Load all my tabs (uses more memory)"
                        description="Opens every tab from all your profiles right away. Great if you have lots of RAM and want instant access to everything."
                    />
                    <RadioOption
                        name="tabLoading"
                        value="activeProfile"
                        currentValue={settings.tabLoadingStrategy}
                        onChange={(v) => updateSetting('tabLoadingStrategy', v as PerformanceSettings['tabLoadingStrategy'])}
                        label="Load tabs from my last profile"
                        description="Only opens tabs from the profile you were using last. Balances speed and memory usage."
                    />
                    <RadioOption
                        name="tabLoading"
                        value="lastActiveOnly"
                        currentValue={settings.tabLoadingStrategy}
                        onChange={(v) => updateSetting('tabLoadingStrategy', v as PerformanceSettings['tabLoadingStrategy'])}
                        label="Load only my last tab"
                        description="Opens just the single tab you had open last. Fastest startup with minimal memory usage."
                        recommended
                    />
                </div>
            </div>

            {/* Profile Switching Section */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <h3 className="text-white font-medium text-sm">When I switch profiles</h3>
                </div>
                <div className="divide-y divide-[#3e3e42]">
                    <RadioOption
                        name="profileSwitch"
                        value="keep"
                        currentValue={settings.profileSwitchBehavior}
                        onChange={(v) => updateSetting('profileSwitchBehavior', v as PerformanceSettings['profileSwitchBehavior'])}
                        label="Keep other profile's tabs running"
                        description="Tabs stay active in the background. Uses more memory but switching back is instant with no reload."
                        recommended
                    />
                    <RadioOption
                        name="profileSwitch"
                        value="suspend"
                        currentValue={settings.profileSwitchBehavior}
                        onChange={(v) => updateSetting('profileSwitchBehavior', v as PerformanceSettings['profileSwitchBehavior'])}
                        label="Suspend other profile's tabs"
                        description="Suspends tabs to free up memory while keeping your session. Tabs reload when you switch back."
                    />
                    <RadioOption
                        name="profileSwitch"
                        value="close"
                        currentValue={settings.profileSwitchBehavior}
                        onChange={(v) => updateSetting('profileSwitchBehavior', v as PerformanceSettings['profileSwitchBehavior'])}
                        label="Close other profile's tabs"
                        description={
                            <span className="text-red-400 font-medium">
                                Warning: Permanently deletes all tabs when you leave a profile. Tabs and conversations cannot be recovered when you switch back.
                            </span>
                        }
                    />
                </div>
            </div>

            {/* Auto-suspend Section */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-4 space-y-4">
                    <div className="space-y-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.autoSuspendEnabled}
                                onChange={(e) => updateSetting('autoSuspendEnabled', e.target.checked)}
                                className="w-4 h-4 accent-violet-500 rounded"
                            />
                            <span className="text-sm text-white">Suspend tabs I haven't used in</span>
                            <input
                                type="number"
                                min="1"
                                max="120"
                                value={settings.autoSuspendMinutes}
                                onChange={(e) => updateSetting('autoSuspendMinutes', parseInt(e.target.value) || 30)}
                                disabled={!settings.autoSuspendEnabled}
                                className="w-16 px-2 py-1 text-sm bg-[#1e1e1e] border border-[#3e3e42] rounded text-white text-center disabled:opacity-50"
                            />
                            <span className="text-sm text-gray-400">minutes</span>
                        </label>
                        <p className="text-xs text-gray-500 pl-7 leading-relaxed">
                            Automatically suspends inactive tabs to save memory. Suspended tabs will reload when you click on them.
                        </p>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer pl-7">
                        <input
                            type="checkbox"
                            checked={settings.excludeActiveProfile ?? true}
                            onChange={(e) => updateSetting('excludeActiveProfile', e.target.checked)}
                            disabled={!settings.autoSuspendEnabled}
                            className="w-4 h-4 accent-violet-500 rounded disabled:opacity-50"
                        />
                        <span className={`text-sm ${settings.autoSuspendEnabled ? 'text-gray-300' : 'text-gray-500'}`}>
                            Don't suspend tabs in my current profile
                        </span>
                    </label>
                </div>
            </div>

            {/* Memory Usage Section */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <Gauge size={16} className="text-violet-400" />
                    <h3 className="text-white font-medium text-sm">Memory usage</h3>
                </div>
                <div className="p-5 space-y-3">
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">{memoryUsage.total || '—'}</span>
                        <span className="text-sm text-gray-400">MB</span>
                        {memoryUsage.tabCount > 0 && (
                            <span className="text-xs text-gray-500 ml-2">
                                ({memoryUsage.tabCount} tab{memoryUsage.tabCount !== 1 ? 's' : ''} active
                                {memoryUsage.suspendedCount > 0 && `, ${memoryUsage.suspendedCount} suspended`})
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        May differ slightly from Task Manager due to how memory is measured across platforms.
                    </p>
                </div>
            </div>
        </div>
    )
}
