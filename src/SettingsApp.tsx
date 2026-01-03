import { useState, useEffect } from 'react'
import SettingsModal from './components/SettingsModal'
import type { Settings } from './types'

function SettingsApp() {
    const [settings, setSettings] = useState<Settings | null>(null)

    useEffect(() => {
        const loadSettings = async () => {
            const data = await window.api.getSettings()
            setSettings(data)
        }
        loadSettings()
    }, [])

    const handleSave = async (newSettings: Settings) => {
        await window.api.saveSettings(newSettings)
    }

    const handleClose = () => {
        window.close()
    }

    if (!settings) return null

    return (
        <SettingsModal
            isOpen={true}
            onClose={handleClose}
            onSave={handleSave}
            initialSettings={settings}
        />
    )
}

export default SettingsApp
