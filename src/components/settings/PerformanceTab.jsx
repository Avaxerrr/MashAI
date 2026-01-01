import { useState, useEffect } from 'react'
import { Zap, Gauge } from 'lucide-react'

/**
 * PerformanceTab - Memory and performance optimization settings
 */
export default function PerformanceTab({ performanceSettings, onPerformanceChange }) {
    // Local state with fallbacks to defaults
    const [settings, setSettings] = useState({
        tabLoadingStrategy: 'lastActiveOnly',
        autoSuspendEnabled: true,
        autoSuspendMinutes: 30,
        profileSwitchBehavior: 'suspend',
        ...performanceSettings
    })

    // Memory usage state
    const [memoryUsage, setMemoryUsage] = useState({ total: 0, tabCount: 0, suspendedCount: 0 })

    // Sync with parent when props change
    useEffect(() => {
        if (performanceSettings) {
            setSettings(prev => ({ ...prev, ...performanceSettings }))
        }
    }, [performanceSettings])

    // Fetch memory usage periodically
    useEffect(() => {
        const fetchMemory = async () => {
            if (window.api?.getMemoryUsage) {
                try {
                    const usage = await window.api.getMemoryUsage()
                    setMemoryUsage(usage)
                } catch (e) {
                    // API not available yet
                }
            }
        }
        fetchMemory()
        const interval = setInterval(fetchMemory, 5000)
        return () => clearInterval(interval)
    }, [])

    const updateSetting = (key, value) => {
        const newSettings = { ...settings, [key]: value }
        setSettings(newSettings)
        if (onPerformanceChange) {
            onPerformanceChange(newSettings)
        }
    }

    const RadioOption = ({ name, value, currentValue, onChange, label, recommended }) => (
        <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#3e3e42]/50 cursor-pointer transition-colors">
            <input
                type="radio"
                name={name}
                value={value}
                checked={currentValue === value}
                onChange={(e) => onChange(e.target.value)}
                className="w-4 h-4 accent-blue-500"
            />
            <span className="text-sm text-white">
                {label}
                {recommended && <span className="text-xs text-green-400 ml-2">(recommended)</span>}
            </span>
        </label>
    )

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Zap size={20} className="text-yellow-400" />
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
                        onChange={(v) => updateSetting('tabLoadingStrategy', v)}
                        label="Load all my tabs (uses more memory)"
                    />
                    <RadioOption
                        name="tabLoading"
                        value="activeProfile"
                        currentValue={settings.tabLoadingStrategy}
                        onChange={(v) => updateSetting('tabLoadingStrategy', v)}
                        label="Load tabs from my last profile"
                    />
                    <RadioOption
                        name="tabLoading"
                        value="lastActiveOnly"
                        currentValue={settings.tabLoadingStrategy}
                        onChange={(v) => updateSetting('tabLoadingStrategy', v)}
                        label="Load only my last tab"
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
                        onChange={(v) => updateSetting('profileSwitchBehavior', v)}
                        label="Keep other profile's tabs running"
                    />
                    <RadioOption
                        name="profileSwitch"
                        value="suspend"
                        currentValue={settings.profileSwitchBehavior}
                        onChange={(v) => updateSetting('profileSwitchBehavior', v)}
                        label="Pause other profile's tabs"
                        recommended
                    />
                    <RadioOption
                        name="profileSwitch"
                        value="close"
                        currentValue={settings.profileSwitchBehavior}
                        onChange={(v) => updateSetting('profileSwitchBehavior', v)}
                        label="Close other profile's tabs"
                    />
                </div>
            </div>

            {/* Auto-suspend Section */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="px-5 py-4 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.autoSuspendEnabled}
                            onChange={(e) => updateSetting('autoSuspendEnabled', e.target.checked)}
                            className="w-4 h-4 accent-blue-500 rounded"
                        />
                        <span className="text-sm text-white">Pause tabs I haven't used in</span>
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

                    <label className="flex items-center gap-3 cursor-pointer pl-7">
                        <input
                            type="checkbox"
                            checked={settings.excludeActiveProfile ?? true}
                            onChange={(e) => updateSetting('excludeActiveProfile', e.target.checked)}
                            disabled={!settings.autoSuspendEnabled}
                            className="w-4 h-4 accent-blue-500 rounded disabled:opacity-50"
                        />
                        <span className={`text-sm ${settings.autoSuspendEnabled ? 'text-gray-300' : 'text-gray-500'}`}>
                            Don't pause tabs in my current profile
                        </span>
                    </label>
                </div>
            </div>

            {/* Memory Usage Section */}
            <div className="bg-[#252526] rounded-xl border border-[#3e3e42] overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                    <Gauge size={16} className="text-purple-400" />
                    <h3 className="text-white font-medium text-sm">Memory usage</h3>
                </div>
                <div className="p-5">
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">{memoryUsage.total || '—'}</span>
                        <span className="text-sm text-gray-400">MB</span>
                        {memoryUsage.tabCount > 0 && (
                            <span className="text-xs text-gray-500 ml-2">
                                ({memoryUsage.tabCount} tab{memoryUsage.tabCount !== 1 ? 's' : ''} active
                                {memoryUsage.suspendedCount > 0 && `, ${memoryUsage.suspendedCount} paused`})
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
