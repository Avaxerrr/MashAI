<div align="center">

# MashAI

### Your Unified AI Workspace

**A multi-profile desktop browser for accessing all your AI assistants in one place**

[![Electron](https://img.shields.io/badge/Electron-39.2-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

---

## What is MashAI?

**MashAI** is your all-in-one desktop workspace for artificial intelligence. It consolidates all your AI tools—cloud-based services like ChatGPT, Claude, and Gemini—into a single, privacy-focused environment with built-in ad blocking.

### The Problem It Solves

- **Fragmented Workflow** – Stop jumping between browser tabs and different apps.
- **Privacy Concerns** – Block ads and trackers that harvest your data.
- **Resource Hogging** – Intelligent tab management keeps your system running smooth.
- **Context Switching** – Separate profiles for Work, Personal, and Research.

---

## Features

### Multi-AI Provider Support
Access all major AI assistants from one window:
- **Perplexity** – AI-powered search
- **Gemini** – Google's AI assistant
- **ChatGPT** – OpenAI's conversational AI
- **Claude** – Anthropic's helpful assistant
- **Grok** – xAI's real-time AI
- **Custom Providers** – Add any web-based AI service

### Built-in Ad Blocking
Privacy-first browsing powered by Ghostery's adblocker:
- Blocks ads and trackers automatically
- Per-tab blocked request counts
- Toggle on/off from settings

### Profile System
Organize your AI workflows by context:
- Create unlimited profiles (Work, Personal, Research, etc.)
- Each profile maintains its own tab sessions and cookies
- Custom icons and colors for quick identification
- Remembers your last active tab per profile

### Advanced Tab Management
Browser-like experience with power-user features:
- Drag-and-drop tab reordering
- Duplicate, reload, and reopen closed tabs
- Close tabs to the right / close other tabs
- Real-time memory usage per tab
- Parent tab navigation (close child returns to parent)

### Performance & Memory Optimization
Stay productive without slowing down your system:
- **Lazy Loading** – Only load tabs when needed
- **Auto-Suspend** – Inactive tabs are suspended after configurable timeout
- **Profile Switch Behavior** – Choose to keep, suspend, or close tabs when switching profiles
- **Hardware Acceleration** – Toggle on/off based on your system

### System Integration
Native desktop experience:
- **System Tray** – Minimize to tray, quick access menu
- **Global Shortcuts** – Toggle visibility from anywhere
- **Session Persistence** – Tabs and window position restored on restart
- **Launch at Startup** – Start with your system
- **Always-on-Top** – Keep MashAI visible over other windows

### Download Manager
Built-in download handling:
- View and manage downloads
- Toast notifications for completed downloads
- Configurable download location

### Modern UI/UX
Clean, focused interface:
- Dark theme with violet accent colors
- Custom frameless window with native controls
- Native context menus
- Comprehensive settings panel

---

## Roadmap

Features planned for future releases:

- 🔜 **Bring Your Own Keys** – Use your own API keys for direct API access
- 🔜 **Local AI Support** – Integration with Ollama, LM Studio, and other local LLM runners
- 🔜 **Unified Chat Interface** – Single interface for all AI providers via API

---

## Getting Started

### Prerequisites
- **Node.js** 18.x or higher
- **npm** 9.x or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/Avaxerrr/MashAI.git
cd MashAI

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```bash
# Build for current platform
npm run build:electron

# Build for specific platform
npm run build:win     # Windows (NSIS installer + portable)
npm run build:mac     # macOS (DMG + ZIP)
npm run build:linux   # Linux (AppImage + deb)
```

The built application will be available in the `release` directory.

---

## Configuration

MashAI stores its configuration in your user data directory:
- **Windows:** `%APPDATA%/mash-ai/`
- **macOS:** `~/Library/Application Support/mash-ai/`
- **Linux:** `~/.config/mash-ai/`

### Settings Overview

| Category | Options |
|----------|---------|
| **General** | Hardware acceleration, launch at startup, always-on-top, tray behavior |
| **Profiles** | Create/edit/delete profiles, custom icons and colors |
| **AI Providers** | Add/remove/reorder AI services, set default provider |
| **Performance** | Tab loading strategy, auto-suspend timeout, profile switch behavior |
| **Privacy** | Ad blocking toggle, download settings |

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Electron 39** | Cross-platform desktop framework |
| **React 18** | UI component library |
| **TypeScript** | Type-safe JavaScript |
| **Vite** | Fast development and build tool |
| **Tailwind CSS** | Utility-first styling |
| **Ghostery Adblocker** | Privacy protection |

### Architecture Highlights

- **Modular Main Process** – Separated managers for tabs, profiles, settings, sessions, tray, and menus
- **TypeScript Throughout** – Full type safety in both main and renderer processes
- **IPC Communication** – Clean separation between main and renderer processes
- **Session Persistence** – Automatic save/restore of tabs and window state
- **Favicon Caching** – Pre-fetched and cached as base64 for instant display

---

## Project Structure

```
MashAI/
├── electron/              # Electron main process (TypeScript)
│   ├── main.ts            # Application entry point
│   ├── preload.ts         # Preload script for IPC
│   ├── TabManager.ts      # Tab lifecycle management
│   ├── ProfileManager.ts
│   ├── SettingsManager.ts
│   ├── SessionManager.ts
│   ├── MenuBuilder.ts
│   ├── TrayManager.ts
│   ├── AdBlockManager.ts
│   ├── DownloadManager.ts
│   └── ipc/               # IPC handlers by domain
├── src/                   # React renderer process (TypeScript)
│   ├── App.tsx            # Main application component
│   ├── components/        # UI components
│   │   ├── TitleBar.tsx
│   │   └── settings/      # Settings tab components
│   └── index.css          # Global styles (Tailwind)
├── tools/                 # Build utilities
│   └── png_to_icns.py     # macOS icon generator
└── dist/                  # Production build output
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close tab |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `Ctrl+R` | Reload active tab |
| `Ctrl+Shift+T` | Reopen closed tab |
| `Ctrl+J` | Open downloads |
| `Ctrl+Shift+A` | Toggle always-on-top |

---

## License

All Rights Reserved © 2026 Avaxerrr

This software is proprietary. Unauthorized copying, distribution, or modification is prohibited.

---

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI powered by [React](https://reactjs.org/) and [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)
- Ad blocking by [Ghostery](https://github.com/nickvidal/AdblockerElectron)

---

<div align="center">

**Made with care for AI enthusiasts**

</div>
