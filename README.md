<div align="center">

# MashAI

### Your Unified AI Workspace

**A multi-profile desktop browser for accessing all your AI assistants in one place**

[![Electron](https://img.shields.io/badge/Electron-33.2-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

---

## What is MashAI?

**MashAI** is a specialized desktop application that consolidates multiple AI chatbot services—ChatGPT, Claude, Gemini, Perplexity, Grok, and more—into a single, organized workspace. Instead of juggling browser tabs across different AI platforms, MashAI provides a focused environment with powerful features like profile-based organization and smart memory management.

### The Problem It Solves

- **Tab Chaos** – No more hunting through 20+ browser tabs to find your AI conversations
- **Memory Bloat** – Built-in tab suspension prevents AI tabs from eating your RAM
- **Context Switching** – Separate work and personal AI usage with profiles
- **Quick Access** – One-click access to any AI provider from a unified interface

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

### Profile System
Organize your AI workflows by context:
- Create unlimited profiles (Work, Personal, Research, etc.)
- Each profile maintains its own tab sessions
- Custom icons and colors for quick identification
- Remembers your last active tab per profile

### Advanced Tab Management
Browser-like experience with power-user features:
- Drag-and-drop tab reordering
- Duplicate, reload, and reopen closed tabs
- Close tabs to the right / close other tabs
- Real-time memory usage per tab

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

### Modern UI/UX
Clean, focused interface:
- Dark theme with VS Code-inspired aesthetics
- Custom frameless window with native controls
- Native context menus
- Comprehensive settings panel

---

## Getting Started

### Prerequisites
- **Node.js** 18.x or higher
- **npm** 9.x or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mashai.git
cd mashai

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```bash
# Build the app
npm run build:electron
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

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Electron** | Cross-platform desktop framework |
| **React 18** | UI component library |
| **Vite** | Fast development and build tool |
| **Tailwind CSS** | Utility-first styling |
| **WebContentsView** | Isolated browser views for each AI tab |

### Architecture Highlights

- **Modular Main Process** – Separated managers for tabs, profiles, settings, sessions, tray, and menus
- **IPC Communication** – Clean separation between main and renderer processes
- **Session Persistence** – Automatic save/restore of tabs and window state
- **Favicon Caching** – Pre-fetched and cached as base64 for instant display

---

## Project Structure

```
mashai/
├── electron/           # Electron main process
│   ├── main.cjs        # Application entry point
│   ├── preload.cjs     # Preload script for IPC
│   ├── TabManager.cjs  # Tab lifecycle management
│   ├── ProfileManager.cjs
│   ├── SettingsManager.cjs
│   ├── SessionManager.cjs
│   ├── MenuBuilder.cjs
│   ├── TrayManager.cjs
│   └── ipc/            # IPC handlers by domain
├── src/                # React renderer process
│   ├── App.jsx         # Main application component
│   ├── components/     # UI components
│   │   ├── TitleBar.jsx
│   │   ├── SettingsModal.jsx
│   │   └── settings/   # Settings tab components
│   └── index.css       # Global styles
├── public/             # Static assets
└── dist/               # Production build output
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
| `Ctrl+Shift+M` | Toggle window visibility (global) |
| `Ctrl+,` | Open settings |

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

License TBD - This project is currently unlicensed. A license will be added in a future release.

---

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI powered by [React](https://reactjs.org/) and [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)

---

<div align="center">

**Made with care for AI enthusiasts**

[Report Bug](https://github.com/yourusername/mashai/issues) · [Request Feature](https://github.com/yourusername/mashai/issues)

</div>
