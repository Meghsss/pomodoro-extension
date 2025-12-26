// ============================================
// Pomodoro Timer Service Worker (MV3)
// - Owns the timer state and lifecycle (alarms + notifications)
// - Persists state in chrome.storage
// - Communicates with popup via chrome.runtime.onMessage
// ============================================

// ============================================
// Constants & Storage Keys
// ============================================
const ALARM_END = 'pomodoro_end';
const ALARM_BADGE = 'pomodoro_badge';
const STORAGE_KEYS = {
  state: 'pomodoroState',
  settings: 'pomodoroSettings'
};

// ============================================
// Default Settings
// ============================================
const DEFAULT_SETTINGS = {
  focus: 25 * 60,       // seconds
  shortBreak: 5 * 60,   // seconds
  longBreak: 15 * 60,   // seconds
  longBreakEvery: 4,    // after 4 focus sessions
  autoStartBreaks: true,
  autoStartFocus: false
};

// ============================================
// State Schema
// ============================================
// {
//   mode: 'focus' | 'short_break' | 'long_break',
//   isRunning: boolean,
//   startTime: number | null,   // ms epoch
//   endTime: number | null,     // ms epoch
//   remainingSeconds: number,   // fallback for pause/resume
//   cycleCount: number,         // completed focus in current set (0..longBreakEvery-1)
//   completedToday: number,     // completed focus count for today
//   dateKey: string             // e.g., '2025-12-25'
// }

// ============================================
// Date Helpers & Default State
// ============================================
function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDefaults() {
  return {
    mode: 'focus',
    isRunning: false,
    startTime: null,
    endTime: null,
    remainingSeconds: DEFAULT_SETTINGS.focus,
    cycleCount: 0,
    completedToday: 0,
    dateKey: todayKey()
  };
}

async function getSettings() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...(data[STORAGE_KEYS.settings] || {}) };
}

// ============================================
// Settings Accessors
// ============================================
async function setSettings(patch) {
  const current = await getSettings();
  const updated = { ...current, ...patch };
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: updated });
  return updated;
}

// ============================================
// State Accessors & Persistence
// ============================================
async function getState() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.state);
  let state = data[STORAGE_KEYS.state] || getDefaults();

  // Daily reset for completedToday
  const tk = todayKey();
  if (state.dateKey !== tk) {
    state = { ...state, dateKey: tk, completedToday: 0, cycleCount: 0 };
    await chrome.storage.local.set({ [STORAGE_KEYS.state]: state });
  }
  return state;
}

async function setState(patchOrNext) {
  const current = await getState();
  const next = typeof patchOrNext === 'function' ? patchOrNext(current) : { ...current, ...patchOrNext };
  await chrome.storage.local.set({ [STORAGE_KEYS.state]: next });
  return next;
}

// ============================================
// Alarms
// ============================================
async function clearAlarms() {
  await chrome.alarms.clear(ALARM_END);
  await chrome.alarms.clear(ALARM_BADGE);
}

function scheduleEndAlarm(endTimeMs) {
  const when = Math.max(endTimeMs, Date.now() + 1000);
  chrome.alarms.create(ALARM_END, { when });
}

function scheduleBadgeAlarm() {
  // Update badge every minute while running
  chrome.alarms.create(ALARM_BADGE, { periodInMinutes: 1 });
}

// ============================================
// Action Badge
// ============================================
async function setBadge(state) {
  try {
    if (!state.isRunning || !state.endTime) {
      await chrome.action.setBadgeText({ text: '' });
      return;
    }
    const seconds = Math.max(0, Math.round((state.endTime - Date.now()) / 1000));
    const mins = Math.floor(seconds / 60);
    const text = String(mins).padStart(2, '0');
    await chrome.action.setBadgeText({ text });
    const color = state.mode === 'focus' ? '#d9534f' : (state.mode === 'short_break' ? '#5bc0de' : '#5cb85c');
    await chrome.action.setBadgeBackgroundColor({ color });
  } catch (e) {
    // Ignore badge errors in non-UI contexts
  }
}

// ============================================
// Notifications
// ============================================
async function notify(title, message) {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title,
      message,
      priority: 2
    });
  } catch (e) {
    // If icons are missing, fallback text-only notification (Chrome may still require an icon)
    try {
      await chrome.notifications.create({ type: 'basic', title, message, iconUrl: '' });
    } catch (_) {}
  }
}

// ============================================
// Timer Controls (start/pause/reset/switch)
// ============================================
async function startTimer(durationSeconds) {
  const start = Date.now();
  const end = start + durationSeconds * 1000;
  await setState({ isRunning: true, startTime: start, endTime: end, remainingSeconds: durationSeconds });
  scheduleEndAlarm(end);
  scheduleBadgeAlarm();
  const state = await getState();
  await setBadge(state);
}

async function pauseTimer() {
  await clearAlarms();
  const state = await getState();
  const remaining = state.endTime ? Math.max(0, Math.round((state.endTime - Date.now()) / 1000)) : state.remainingSeconds;
  const next = await setState({ isRunning: false, startTime: null, endTime: null, remainingSeconds: remaining });
  await setBadge(next);
}

async function resetTimer() {
  await clearAlarms();
  const settings = await getSettings();
  const next = await setState({
    mode: 'focus',
    isRunning: false,
    startTime: null,
    endTime: null,
    remainingSeconds: settings.focus
  });
  await setBadge(next);
}

async function switchMode(nextMode) {
  const settings = await getSettings();
  const durations = { focus: settings.focus, short_break: settings.shortBreak, long_break: settings.longBreak };
  await setState({ mode: nextMode, isRunning: false, startTime: null, endTime: null, remainingSeconds: durations[nextMode] });
  await clearAlarms();
  const state = await getState();
  await setBadge(state);
}

async function beginCurrentOrNew() {
  const settings = await getSettings();
  const state = await getState();
  const remaining = state.remainingSeconds ?? (state.mode === 'focus' ? settings.focus : state.mode === 'short_break' ? settings.shortBreak : settings.longBreak);
  await startTimer(remaining);
}

// ============================================
// Session Transition
// ============================================
async function onSessionEnd() {
  const settings = await getSettings();
  const state = await getState();

  if (state.mode === 'focus') {
    // Increment daily completed and cycle
    const newCycle = (state.cycleCount + 1) % settings.longBreakEvery;
    const completedToday = state.completedToday + 1;
    await notify('Focus complete', newCycle === 0 ? 'Time for a long break.' : 'Great job! Take a short break.');

    // Decide next mode
    const nextMode = newCycle === 0 ? 'long_break' : 'short_break';

    await setState({
      mode: nextMode,
      cycleCount: newCycle,
      completedToday,
      isRunning: false,
      startTime: null,
      endTime: null,
      remainingSeconds: nextMode === 'long_break' ? settings.longBreak : settings.shortBreak
    });

    if (settings.autoStartBreaks) {
      await startTimer(nextMode === 'long_break' ? settings.longBreak : settings.shortBreak);
    } else {
      await setBadge(await getState());
    }
  } else {
    // Break ended
    await notify('Break finished', 'Let\'s get back to focus.');
    await setState({ mode: 'focus', isRunning: false, startTime: null, endTime: null, remainingSeconds: settings.focus });
    if (settings.autoStartFocus) {
      await startTimer(settings.focus);
    } else {
      await setBadge(await getState());
    }
  }
}



// ============================================
// Lifecycle: Install & Startup Initialization
// ============================================
chrome.runtime.onInstalled.addListener(async () => {
  // Initialize settings/state if missing
  const data = await chrome.storage.local.get([STORAGE_KEYS.settings, STORAGE_KEYS.state]);
  if (!data[STORAGE_KEYS.settings]) {
    await chrome.storage.local.set({ [STORAGE_KEYS.settings]: DEFAULT_SETTINGS });
  }
  if (!data[STORAGE_KEYS.state]) {
    await chrome.storage.local.set({ [STORAGE_KEYS.state]: getDefaults() });
  }
  await setBadge(await getState());
});

// ============================================
// Alarm Handlers
// ============================================
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_END) {
    await onSessionEnd();
  } else if (alarm.name === ALARM_BADGE) {
    await setBadge(await getState());
  }
});

// ============================================
// Message Router (popup ↔ service worker)
// ============================================
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      switch (message?.type) {
        case 'GET_STATE':
          sendResponse({ state: await getState(), settings: await getSettings() });
          break;
        case 'START':
          await beginCurrentOrNew();
          sendResponse({ ok: true, state: await getState() });
          break;
        case 'PAUSE':
          await pauseTimer();
          sendResponse({ ok: true, state: await getState() });
          break;
        case 'RESET':
          await resetTimer();
          sendResponse({ ok: true, state: await getState() });
          break;
        case 'SWITCH_MODE':
          await switchMode(message.mode);
          sendResponse({ ok: true, state: await getState() });
          break;
        case 'UPDATE_SETTINGS':
          await setSettings(message.settings || {});
          // If not running, update remainingSeconds to reflect new duration for current mode
          const s = await getState();
          if (!s.isRunning) {
            const updated = await getSettings();
            const durations = { focus: updated.focus, short_break: updated.shortBreak, long_break: updated.longBreak };
            await setState({ remainingSeconds: durations[s.mode] });
          }
          sendResponse({ ok: true, settings: await getSettings(), state: await getState() });
          break;
        default:
          sendResponse({ ok: false, error: 'Unknown message type' });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e?.message || String(e) });
    }
  })();
  return true; // keep the message channel open for async
});
