# Pomodoro Timer (Chrome Extension, MV3)

A minimalist, distraction‑free Pomodoro timer that keeps running when the popup is closed. Uses Chrome alarms, storage, and notifications. Built with vanilla HTML/CSS/JS.

## Features
- 25/5 with 15‑minute long break after 4 focus sessions (defaults)
- Start / Pause / Reset controls
- Continues in background via service worker + alarms
- Desktop notifications when a session ends
- Daily completed Pomodoro count
- Optional: adjust durations, auto‑start next focus/break
- Dark‑mode friendly, circular progress
- Focus/short/long timer with auto-start options
- Glassmorphism UI with animated buttons
- Theme-able button accent color (palette button)
- Looping sound tester (Play Sound button)
- Session end notifications + ring tone
- Credits dialog with GitHub + PayPal link

## Project Structure
- `manifest.json` — MV3 configuration
- `service_worker.js` — background logic: timers, alarms, storage, notifications
- `popup.html` — UI markup
- `popup.css` — UI styles (minimal, dark‑friendly)
- `popup.js` — UI logic and messaging

## How It Works
- The service worker owns the state (mode, running, start/end times, remaining seconds) in `chrome.storage.local`.
- When you start a session, the worker schedules an end alarm and a minute badge update alarm.
- The popup reads state and renders a local ticking UI; it does not drive the timer.
- On alarm, the worker flips mode, increments counters, sends a notification, and (optionally) auto‑starts the next session.
- The popup and worker communicate via `chrome.runtime.sendMessage`.

## Load in Chrome
1. Open Chrome → go to `chrome://extensions/`.
2. Enable "Developer mode" (top‑right).
3. Click "Load unpacked" and select this folder.
4. Pin the extension and open the popup.

## Usage Tips
- Use the mode buttons (Focus/Short/Long) to switch modes when stopped.
- Click Settings (gear) to customize durations and auto‑start behavior.
- The badge shows minutes remaining while running.
- Pick mode (Focus/Short/Long) and start/pause/reset as needed.
- Use the 🎨 button to set button accent color (timer ring stays mode-colored).
- Click **Play Sound** to toggle the looped `assets/audio/break_end.mp3`.
- Open settings (⚙️) to adjust durations and auto‑start.
- View credits (🌐) or donate via PayPal link.

## Design Decisions
- **Single end alarm** for reliability; popup calculates its own ticking display based on `endTime`.
- **Minute badge alarm** keeps the badge useful without waking the service worker too often.
- **Daily reset** (by date key) maintains a simple "completed today" counter.
- **No external libraries** — everything is vanilla JS/CSS.

## Permissions
- `storage` — persist state and settings
- `alarms` — schedule session end / badge updates
- `notifications` — show end‑of‑session desktop notifications

## Extending
- Add blocking of distracting sites using `declarativeNetRequest` dynamic rules during focus mode.
- Add streaks/history by storing per‑day counts.
- Add sounds (requires bundling assets and playing from a visible page).

## Troubleshooting
- If notifications show without icons: MV3 can show basic notifications without packaged icons. You can add icons later and reference them in `manifest.json`.
- If timers don’t advance: ensure alarms are allowed and service worker is active in `chrome://extensions` → this extension → "Service Worker".
