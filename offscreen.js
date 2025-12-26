const ctx = new (window.AudioContext || window.webkitAudioContext)();

function playRingTone() {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.linearRampToValueAtTime(660, now + 0.6);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.6);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'PLAY_RING') {
    if (ctx.state === 'suspended') ctx.resume();
    playRingTone();
    sendResponse({ ok: true });
  }
});
