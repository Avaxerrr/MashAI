import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import SettingsApp from './SettingsApp'

// Simple hash routing: render SettingsApp if hash is #/settings
const isSettings = window.location.hash === '#/settings'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        {isSettings ? <SettingsApp /> : <App />}
    </StrictMode>,
)
