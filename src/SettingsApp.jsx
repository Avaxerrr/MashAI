import { useState, useEffect } from 'react'
import SettingsModal from './components/SettingsModal'

function SettingsApp() {
    const [settings, setSettings] = useState(null)

    useEffect(() => {
        // Load initial settings from main process
        const loadSettings = async () => {
            const data = await window.api.getSettings()
            setSettings(data)
        }
        loadSettings()
    }, [])

    const handleSave = async (newSettings) => {
        await window.api.saveSettings(newSettings)
        // Don't auto-close - let the modal component decide when to close
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
