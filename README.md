<div align="center">

# ⏱️ Pomodoro Timer Extension

**A minimalist, distraction-free Pomodoro timer that keeps running even when the popup is closed**

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/dominhduy09/pomodoro-extension)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-orange.svg)](https://developer.chrome.com/docs/extensions/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Tech Stack](#-tech-stack) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [How It Works](#-how-it-works)
- [Installation](#-installation)
- [Usage](#-usage)
- [Configuration](#-configuration)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Support](#-support)
- [Author](#-author)
- [License](#-license)

---

## 🎯 Overview

Pomodoro Timer Extension is a Chrome extension (Manifest V3) designed for developers, students, and productivity enthusiasts who need a reliable timer that works in the background. Unlike traditional web-based timers, this extension continues running even when you close the popup, using Chrome's service worker architecture.

**Perfect for:**
- Developers practicing the Pomodoro Technique
- Students managing study sessions
- Remote workers tracking focus time
- Anyone seeking distraction-free productivity

---

## ✨ Features

### Core Functionality
- ⏰ **Background Persistence** — Timer runs via service worker, even when popup is closed
- 🔔 **Desktop Notifications** — Get notified when focus/break sessions end
- 🎵 **Audio Alerts** — Custom ring tone plays at session completion
- 📊 **Daily Statistics** — Track completed Pomodoros per day with automatic daily reset
- 🔄 **Auto-Start Options** — Automatically begin next focus or break session

### User Experience
- 🎨 **Customizable Theme** — Change button accent color while preserving timer colors
- 💎 **Glassmorphism UI** — Modern liquid glass design with backdrop blur
- ⚡ **Smooth Animations** — Interactive button states with hover/active effects
- 🎧 **Looping Sound Player** — Test and play ambient sounds from the popup
- 📱 **Responsive Design** — Clean, minimal interface that adapts to your needs

### Advanced Features
- ⚙️ **Flexible Settings** — Customize focus (1-180 min), short break (1-60 min), long break (1-60 min)
- 🔁 **Cycle Management** — Automatic long breaks after configurable focus sessions (default: 4)
- 💾 **Persistent State** — All settings and progress saved in Chrome storage
- 🏆 **Badge Counter** — Extension icon shows remaining minutes while running

---

## 🔧 How It Works
- The service worker owns the state (mode, running, start/end times, remaining seconds) in `chrome.storage.local`.
- When you start a session, the worker schedules an end alarm and a minute badge update alarm.
- The popup reads state and renders a local ticking UI; it does not drive the timer.
- On alarm, the worker flips mode, increments counters, sends a notification, and (optionally) auto‑starts the next session.
- The popup and worker communicate via `chrome.runtime.sendMessage`.

---

## 📥 Installation

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable "Developer mode" using the toggle in the top-right corner.
3. Click the "Load unpacked" button and select the extension's directory.
4. Pin the extension to the Chrome toolbar for easy access.

---

## 🚀 Usage

- **Start/Pause/Reset**: Use the popup controls to manage your timer.
- **Mode Selection**: Choose between Focus, Short Break, and Long Break modes.
- **Settings**: Click the gear icon to customize your timer durations and auto-start preferences.
- **Color Theme**: Press the 🎨 button to select your preferred button accent color.
- **Sound Alerts**: Use the **Play Sound** button to test the break end sound.

---

## ⚙️ Configuration

- **Focus Duration**: Set the length of your focus sessions (1-180 minutes).
- **Short Break Duration**: Configure the duration of short breaks (1-60 minutes).
- **Long Break Duration**: Adjust the length of long breaks (1-60 minutes).
- **Auto-Start**: Enable or disable automatic starting of the next session.

---

## 🛠️ Tech Stack

- **Chrome Extensions API**: For building the extension and interacting with the browser.
- **HTML/CSS/JavaScript**: Core technologies used to develop the extension.
- **Service Workers**: Background scripts that run independently of the extension's UI.

---

## 📂 Project Structure

- `manifest.json` — MV3 configuration
- `service_worker.js` — background logic: timers, alarms, storage, notifications
- `popup.html` — UI markup
- `popup.css` — UI styles (minimal, dark‑friendly)
- `popup.js` — UI logic and messaging

---

## 🚧 Roadmap

- [ ] Add customizable Pomodoro cycles (e.g., 50/10, 90/30)
- [ ] Implement task and goal tracking
- [ ] Provide detailed statistics and reports
- [ ] Introduce user accounts and cloud sync

---

## 🤝 Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 💖 Support

If you find this extension useful, consider supporting the project:

- ⭐ **Star this repository** on GitHub
- ☕ **Buy me a coffee** via [PayPal](https://paypal.me/dominhduy09)
- 🐛 **Report bugs** via [Issues](https://github.com/dominhduy09/pomodoro-extension/issues)
- 💬 **Share feedback** in [Discussions](https://github.com/dominhduy09/pomodoro-extension/discussions)

Your support helps maintain and improve this project!

---

## 👤 Author

Minh Duy Do

- GitHub: [dominhduy09](https://github.com/dominhduy09)
- Email: [dominhduy09@gmail.com](mailto:dominhduy09@gmail.com)

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🎉 Acknowledgments

- Inspired by the Pomodoro Technique
- Built using Chrome Extensions MV3
- Thanks to all contributors and supporters
