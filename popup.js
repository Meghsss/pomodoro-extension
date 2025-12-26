// ============================================
// Popup UI Logic & Interactions
// ============================================

// Popup script: UI rendering + messaging to service worker

const timeEl = document.getElementById('time');
const modeLabelEl = document.getElementById('modeLabel');
const completedTodayEl = document.getElementById('completedToday');
const cycleInfoEl = document.getElementById('cycleInfo');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const modeButtons = Array.from(document.querySelectorAll('.mode-btn'));
const settingsBtn = document.getElementById('settingsBtn');
const dialog = document.getElementById('settingsDialog');

const focusInput = document.getElementById('focusInput');
const shortInput = document.getElementById('shortInput');
const longInput = document.getElementById('longInput');
const everyInput = document.getElementById('everyInput');
const autoBreaks = document.getElementById('autoBreaks');
const autoFocus = document.getElementById('autoFocus');
const saveSettings = document.getElementById('saveSettings');
const closeSettings = document.getElementById('closeSettings');
const soundToggleEl = document.getElementById('sound-toggle');

const CIRC = {
  length: 2 * Math.PI * 54, // r=54 (matches CSS stroke-dasharray)
  el: document.querySelector('.progress .fg')
};
let state = null;
let settings = null;
let tickTimer = null;

function send(msg) {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
}

function fmt(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
}

function setModeClass(mode) {
  document.body.classList.remove('mode-focus','mode-short_break','mode-long_break');
  document.body.classList.add(`mode-${mode}`);
}

function setModeButtonsActive(mode){
  modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
}

function updateUI() {
  if (!state || !settings) return;

  const now = Date.now();
  let remaining = state.remainingSeconds;
  if (state.isRunning && state.endTime) {
    remaining = Math.max(0, Math.round((state.endTime - now) / 1000));
  }

  // Update time label
  timeEl.textContent = fmt(remaining);

  // Update circle progress
  const total = state.mode === 'focus' ? settings.focus : (state.mode === 'short_break' ? settings.shortBreak : settings.longBreak);
  const pct = total > 0 ? (1 - remaining / total) : 0;
  const offset = CIRC.length * pct;
  CIRC.el.style.strokeDasharray = `${CIRC.length}`;
  CIRC.el.style.strokeDashoffset = `${offset}`;

  // Update labels, mode styles
  setModeClass(state.mode);
  setModeButtonsActive(state.mode);
  modeLabelEl.textContent = state.mode === 'focus' ? 'Focus' : (state.mode === 'short_break' ? 'Short break' : 'Long break');

  // Stats
  completedTodayEl.textContent = String(state.completedToday ?? 0);
  if (cycleInfoEl && settings?.longBreakEvery) {
    const cycleTotal = settings.longBreakEvery;
    const currentCycle = (state.cycleCount % cycleTotal) + 1;
    cycleInfoEl.textContent = `${currentCycle}/${cycleTotal}`;
  }

  // Buttons
  startBtn.disabled = state.isRunning;
  pauseBtn.disabled = !state.isRunning;
}

function startTick() {
  stopTick();
  tickTimer = setInterval(updateUI, 1000);
}

function stopTick() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;
}

function toMinuteDisplay(seconds) {
  const mins = (seconds || 0) / 60;
  // Limit to 2 decimals for display while keeping trailing zeros trimmed
  return Number.isFinite(mins) ? Number(mins.toFixed(2)).toString() : '0';
}

async function hydrate() {
  const res = await send({ type: 'GET_STATE' });
  if (res?.state) state = res.state;
  if (res?.settings) settings = res.settings;
  // Prefill settings UI with decimals preserved
  focusInput.value = toMinuteDisplay(settings.focus || 1500);
  shortInput.value = toMinuteDisplay(settings.shortBreak || 300);
  longInput.value = toMinuteDisplay(settings.longBreak || 900);
  everyInput.value = settings.longBreakEvery || 4;
  autoBreaks.checked = !!settings.autoStartBreaks;
  autoFocus.checked = !!settings.autoStartFocus;
  updateUI();
  startTick();
}

startBtn.addEventListener('click', async () => {
  await send({ type: 'START' });
  const res = await send({ type: 'GET_STATE' });
  state = res.state; settings = res.settings; updateUI();
});

pauseBtn.addEventListener('click', async () => {
  await send({ type: 'PAUSE' });
  const res = await send({ type: 'GET_STATE' });
  state = res.state; settings = res.settings; updateUI();
});

resetBtn.addEventListener('click', async () => {
  await send({ type: 'RESET' });
  const res = await send({ type: 'GET_STATE' });
  state = res.state; settings = res.settings; updateUI();
});

modeButtons.forEach(btn => btn.addEventListener('click', async () => {
  const next = btn.dataset.mode;
  await send({ type: 'SWITCH_MODE', mode: next });
  const res = await send({ type: 'GET_STATE' });
  state = res.state; settings = res.settings; updateUI();
}));

settingsBtn.addEventListener('click', () => dialog.showModal());
closeSettings.addEventListener('click', () => dialog.close());

function parseMinutes(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

const settingsError = document.getElementById('settingsError');

saveSettings.addEventListener('click', async (e) => {
  e.preventDefault();
  settingsError.textContent = '';

  const focusMin = parseMinutes(focusInput.value);
  const shortMin = parseMinutes(shortInput.value);
  const longMin = parseMinutes(longInput.value);
  const everyVal = Number(everyInput.value || 4);

  if (focusMin === null || shortMin === null || longMin === null || !Number.isFinite(everyVal) || everyVal < 2) {
    settingsError.textContent = 'Enter positive minutes (decimals allowed) and long break every ≥ 2.';
    return;
  }

  const patch = {
    focus: focusMin * 60,
    shortBreak: shortMin * 60,
    longBreak: longMin * 60,
    longBreakEvery: Math.max(2, Math.round(everyVal)),
    autoStartBreaks: !!autoBreaks.checked,
    autoStartFocus: !!autoFocus.checked
  };

  const res = await send({ type: 'UPDATE_SETTINGS', settings: patch });
  state = res.state; settings = res.settings; updateUI();
  dialog.close();
});

if (soundToggleEl) {
  chrome.storage.sync.get({ soundEnabled: true }, (res) => {
    soundToggleEl.checked = !!res.soundEnabled;
  });

  soundToggleEl.addEventListener('change', () => {
    chrome.storage.sync.set({ soundEnabled: soundToggleEl.checked });
  });
}

// Keep in sync if other contexts change storage (not strictly required for popup)
chrome.storage.onChanged.addListener((_changes, _area) => {
  // To avoid excessive work, just refresh state/settings when popup is open
  send({ type: 'GET_STATE' }).then(res => { if (res){ state = res.state; settings = res.settings; updateUI(); } });
});

// ============================================
// Audio Setup & Click Sound
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  const playClick = () => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 220;
    gain.gain.setValueAtTime(0.16, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  };

  const resumeAudio = () => {
    if (ctx.state === "suspended") ctx.resume();
  };

  // ============================================
  // Button Click Handlers
  // ============================================
  const bindClicks = () => {
    document.querySelectorAll(".btn, .mode-btn, .icon-btn").forEach((el) => {
      el.addEventListener("click", () => {
        resumeAudio();
        playClick();
      });
    });
  };

  // ============================================
  // Settings Dialog
  // ============================================
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsDialog = document.getElementById("settingsDialog");

  settingsBtn.addEventListener("click", () => {
    settingsDialog.showModal();
  });

  settingsDialog.addEventListener("click", (e) => {
    if (e.target === settingsDialog) settingsDialog.close();
  });

  // ============================================
  // Credits Dialog
  // ============================================
  const creditsBtn = document.getElementById("creditsBtn");
  const creditsDialog = document.getElementById("creditsDialog");
  const closeCreditsBtn = document.getElementById("closeCreditsBtn");

  creditsBtn.addEventListener("click", () => {
    creditsDialog.showModal();
  });

  closeCreditsBtn.addEventListener("click", () => {
    creditsDialog.close();
  });

  creditsDialog.addEventListener("click", (e) => {
    if (e.target === creditsDialog) creditsDialog.close();
  });

  // ============================================
  // Button Accent Color Picker
  // ============================================
  const THEME_KEY = "btnAccentColor";
  const DEFAULT_BTN_ACCENT = "#ef4444";
  const themeBtn = document.getElementById("themeBtn");
  const btnColorPicker = document.getElementById("btnColorPicker");

  const applyBtnAccent = (color) => {
    if (!color) return;
    document.documentElement.style.setProperty("--btn-accent", color);
    if (btnColorPicker) btnColorPicker.value = color;
  };

  const loadAccent = async () => {
    try {
      const data = await chrome.storage?.local?.get?.(THEME_KEY);
      applyBtnAccent(data?.[THEME_KEY] || DEFAULT_BTN_ACCENT);
    } catch (_) {
      applyBtnAccent(DEFAULT_BTN_ACCENT);
    }
  };

  themeBtn?.addEventListener("click", () => btnColorPicker?.click());

  btnColorPicker?.addEventListener("input", async (e) => {
    const color = e.target.value;
    applyBtnAccent(color);
    try { await chrome.storage?.local?.set?.({ [THEME_KEY]: color }); } catch (_) {}
  });

  // ============================================
  // Looping Sound Player
  // ============================================
  const playSoundBtn = document.getElementById("playSoundBtn");
  const loopAudio = new Audio(chrome.runtime.getURL("assets/audio/break_end.mp3"));
  loopAudio.loop = true;
  let isLooping = false;

  const updatePlaySoundBtn = () => {
    if (!playSoundBtn) return;
    playSoundBtn.textContent = isLooping ? "Stop Sound" : "Play Sound";
  };

  playSoundBtn?.addEventListener("click", async () => {
    resumeAudio();
    playClick();
    if (!isLooping) {
      try { await loopAudio.play(); } catch (_) {}
      isLooping = true;
    } else {
      loopAudio.pause();
      loopAudio.currentTime = 0;
      isLooping = false;
    }
    updatePlaySoundBtn();
  });

  // ============================================
  // Initialize
  // ============================================
  bindClicks();
  loadAccent?.();
});

// ============================================
// Initialize Popup
// ============================================
hydrate();
