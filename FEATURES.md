# MashAI Features

> Comprehensive feature list for the MashAI desktop application.

---

## Core Features

### 🤖 Multi-AI Provider Support
Access all major AI assistants from a single window:
- **ChatGPT** – OpenAI's conversational AI
- **Claude** – Anthropic's helpful assistant
- **Gemini** – Google's AI assistant
- **Perplexity** – AI-powered search
- **Grok** – xAI's real-time AI
- **DeepSeek** – Advanced reasoning AI
- **Custom Providers** – Add any web-based AI service with custom URLs

### 👤 Profile System
Organize your AI workflows by context:
- Create unlimited profiles (Work, Personal, Research, etc.)
- Each profile maintains its own tab sessions and cookies
- Custom icons and colors for quick identification
- Automatic session persistence per profile
- Complete data cleanup on profile deletion

### 🗂️ Advanced Tab Management
Browser-like experience with power-user features:
- Drag-and-drop tab reordering
- Duplicate, reload, and reopen closed tabs
- Close tabs to the right / close other tabs
- Real-time favicon caching
- Right-click context menu with rich options
- Tab navigation history (child tabs return to parent)

---

## Performance & Memory

### ⚡ Smart Tab Suspension
Intelligent memory management inspired by Chrome's Memory Saver:
- **Auto-suspend inactive tabs** after configurable timeout (1-120 minutes)
- **Media-aware protection** – Tabs playing audio/video are never suspended
- **Manual exclusion** – Right-click any tab → "Never Suspend This Tab"
- **Profile exclusion** – Option to protect all tabs in current profile
- Suspended tabs reload instantly when clicked

### 🚀 Startup Optimization
Choose how tabs load when the app starts:
- **Load all tabs** – For power users with lots of RAM
- **Load active profile only** – Balance speed and memory
- **Load last active tab only** – Fastest startup (recommended)

### 🔄 Profile Switch Behavior
Control what happens to tabs when switching profiles:
- **Keep running** – Tabs stay active in background
- **Suspend** – Free memory but keep session
- **Close** – Remove tabs completely (use with caution)

### 🔋 Tray Optimization
Save resources when app is minimized:
- Suspend all tabs when hidden to tray
- Configurable delay before suspension
- Option to keep last active tab loaded

---

## Side Panel

### 📌 Pin to Side Panel
Work with two AI assistants simultaneously:
- Pin any tab to left or right side panel
- Draggable divider to resize panels
- Swap panel sides with one click
- Visual indicator for pinned tabs in tab bar
- Persists across sessions

---

## Privacy & Security

### 🛡️ Built-in Ad Blocking
Privacy-first browsing powered by Ghostery:
- Blocks ads, trackers, and analytics automatically
- Per-tab blocked request counter
- Cosmetic filtering for cleaner pages
- Toggle on/off from settings
- **Custom filter lists** – Add your own EasyList-compatible URLs
- **Site whitelist** – Disable blocking for specific domains
- Cached locally for fast startup

### 🔒 Isolated Profiles
Each profile has its own:
- Browser session and cookies
- Local storage and cache
- Complete data isolation between profiles

---

## Quick Search

### 🔍 Quick Search Overlay (Ctrl+K)
Fast navigation and web access:
- **URL detection** – Type a URL to navigate directly (e.g., `github.com`)
- **Multi-engine search** – Google, Perplexity, Bing, DuckDuckGo, Brave, Yahoo
- **Tab to cycle** – Switch between search engines with Tab key
- **Smart detection** – Visual indicator shows URL vs search mode
- Supports localhost, IP addresses, and common TLDs
- Floating interface accessible anywhere

---

## System Integration

### 📥 System Tray
Native desktop integration:
- Minimize to system tray
- Quick access context menu
- Double-click to restore
- Global shortcut to toggle visibility

### ⌨️ Global Shortcuts
Customizable keyboard shortcuts:
- Toggle app visibility from anywhere
- Toggle always-on-top mode
- All shortcuts configurable in settings

### 💾 Session Persistence
Never lose your work:
- Tabs automatically saved and restored
- Window position and size remembered
- Profile state preserved across restarts

### 🖥️ Desktop Experience
Native app feel:
- Launch at system startup
- Always-on-top mode
- Hardware acceleration (toggleable)
- Custom frameless window with native controls

---

## Download Manager

### 📂 Built-in Downloads
Manage downloads without leaving the app:
- Download history with status
- Toast notifications on completion
- Configurable download location
- Open file or folder from manager

---

## User Interface

### 🎨 Modern Design
Clean, focused interface:
- Dark theme with violet accents
- Custom frameless window
- Responsive tab bar
- Native context menus
- Toast notifications

### 💬 Built-in Feedback System
Quick way to reach the developer:
- Report bugs, suggest features, or ask questions
- Smart routing – Email replies via email, anonymous via Discord
- No GitHub account required
- One-click access from About page

### ⚙️ Comprehensive Settings
Full control over your experience:
- **General** – Hardware acceleration, startup, tray behavior
- **Profiles** – Create, edit, delete, customize
- **AI Providers** – Add, remove, reorder, set defaults
- **Performance** – Suspension, memory, loading strategies
- **Shortcuts** – Customize all keyboard shortcuts
- **Privacy** – Ad blocking, security settings

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
| `Ctrl+K` | Quick Search |
| `Ctrl+Shift+A` | Toggle always-on-top |

*All shortcuts are customizable in Settings → Shortcuts*

---

## Coming Soon

- 🔜 **Bring Your Own Keys** – Use your own API keys for direct API access
- 🔜 **Local AI Support** – Integration with Ollama, LM Studio, and local LLMs
- 🔜 **Unified Chat Interface** – Single interface for all AI providers via API

---

## Platform Support

| Platform | Status |
|----------|--------|
| Windows 10/11 | ✅ Supported |
| macOS | 🔜 Coming Soon |
| Linux | 🔜 Coming Soon |
