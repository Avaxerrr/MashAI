import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import SettingsApp from './SettingsApp'
import DownloadsWindow from './DownloadsWindow'

// Simple hash routing
const hash = window.location.hash
const isSettings = hash === '#/settings'
const isDownloads = hash === '#/downloads'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        {isSettings ? <SettingsApp /> : isDownloads ? <DownloadsWindow /> : <App />}
    </StrictMode>,
)

