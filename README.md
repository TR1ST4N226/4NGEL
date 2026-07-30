<div align="center">

# 4NGEL

<img src="https://raw.githubusercontent.com/TR1ST4N226/4NGEL/main/assets/logo.png" alt="4NGEL Logo" width="200"/>

**CLI video downloader with a beautiful Terminal User Interface**

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

</div>

---

## ✨ Features

- 🎬 **Download videos** from YouTube, X, Instagram, Threads, TikTok
- 🎵 **Extract audio** as MP3
- 🎨 **Beautiful TUI** with keyboard navigation
- 📊 **Real-time progress bar**
- 📋 **Clipboard support** (auto-paste URL)
- 🌓 **Auto theme** (adapts to your terminal)
- 🚀 **1800+ sites supported** via yt-dlp
- 🖱️ **Mouse support** (click to select)
- 📁 **Downloads** to your `~/Downloads` folder

---

## 📸 Screenshots

### Main Interface
![Main Interface](screenshots/main.png)

### Quality Selection
![Quality Selection](screenshots/picking.png)

### Download Progress
![Download Progress](screenshots/downloading.png)

### Download Complete
![Download Complete](screenshots/done.png)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))

### Installation

```bash
# Clone the repository
git clone https://github.com/TR1ST4N226/4NGEL.git
cd 4NGEL

# Install dependencies
npm install

# Build the project
npm run build
```

### Usage

Double-click `4ngel.bat` (Windows) or run:

```bash
# With a URL directly
4ngel.bat https://youtube.com/watch?v=...

# Without a URL (you'll be prompted)
4ngel.bat
```

---

## 🎮 Keyboard Shortcuts

| Key          | Action                        |
|--------------|--------------------------------|
| ↑ / ↓        | Navigate through formats       |
| ↵ (Enter)    | Download / Select              |
| Esc          | Go back / Cancel               |
| Ctrl+C       | Quit                           |

---

## 📦 Supported Sites

YouTube · X (Twitter) · Instagram · Threads · TikTok · Vimeo · Twitch · Facebook · Reddit · Dailymotion · VK · Bilibili · SoundCloud · Bandcamp · **+1800 more**

> Powered by [yt-dlp](https://github.com/yt-dlp/yt-dlp)

---

## 🛠️ Development

```bash
# Clone and install
git clone https://github.com/TR1ST4N226/4NGEL.git
cd 4NGEL
npm install

# Development mode (auto-rebuild)
npm run dev

# Build
npm run build

# Type check
npm run typecheck
```

### Project Structure

```
4NGEL/
├── src/
│   ├── app.tsx          # Main application
│   ├── cli.tsx           # CLI entry point
│   ├── theme.tsx          # Theme system
│   ├── components/        # UI components
│   └── lib/               # Core libraries
├── 4ngel.bat              # Windows launcher
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

---

## 🎯 Technologies Used

- [Ink](https://github.com/vadimdemedes/ink) — React for terminal UI
- [React](https://react.dev/) — UI framework
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — Video downloading
- [TypeScript](https://www.typescriptlang.org/) — Type safety
- [tsup](https://tsup.egoist.dev/) — Build tool

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Credits

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) for video downloading
- [Ink](https://github.com/vadimdemedes/ink) for the terminal UI
- Inspired by [yoinks](https://github.com)

<div align="center">

Made with ❤️ by **TR1ST4N226**

⭐ *Star this repo if you find it useful!*

</div>
