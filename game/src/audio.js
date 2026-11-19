// Solmar Bay sound: all WebAudio synthesis, no audio files, no network.
// Engine hum, sirens, gunshots, punches, pickup jingles and a soft bass loop.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOn = false;
  let sirenTimer = null;
  let musicTimer = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.connect(g); g.connect(master);
      o.start(); o.stop(ctx.currentTime + dur);
    } catch { /* audio is best-effort */ }
  }

  function noise(dur, vol) {
    if (!ensure() || muted) return;
    try {
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = vol || 0.3;
      src.connect(g); g.connect(master);
      src.start();
    } catch { /* ignore */ }
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setEngine(speed01, driving) {
      if (!ensure()) return;
      try {
        engineGain.gain.value = driving ? 0.05 + speed01 * 0.09 : 0.015;
        engineOsc.frequency.value = 55 + speed01 * 140;
      } catch { /* ignore */ }
    },
    shoot() { noise(0.12, 0.5); tone(180, 0.08, 'square', 0.25, 60); },
    punch() { noise(0.08, 0.35); tone(90, 0.1, 'sine', 0.3, 50); },
    pickup() { tone(660, 0.12, 'sine', 0.25); setTimeout(() => tone(880, 0.18, 'sine', 0.25), 90); },
    cash() { tone(523, 0.1, 'triangle', 0.25); setTimeout(() => tone(659, 0.1, 'triangle', 0.25), 80); setTimeout(() => tone(784, 0.22, 'triangle', 0.28), 160); },
    crash() { noise(0.25, 0.5); tone(70, 0.25, 'sawtooth', 0.3, 40); },
    siren(on) {
      sirenOn = on;
      if (on && !sirenTimer) {
        let high = true;
        sirenTimer = setInterval(() => { if (!muted) tone(high ? 950 : 700, 0.28, 'sine', 0.07); high = !high; }, 300);
      } else if (!on && sirenTimer) { clearInterval(sirenTimer); sirenTimer = null; }
    },
    startMusic() {
      if (musicTimer || !ensure()) return;
      const bass = [55, 55, 65.4, 49, 55, 55, 82.4, 73.4];
      let i = 0;
      musicTimer = setInterval(() => {
        if (muted) return;
        tone(bass[i % bass.length], 0.5, 'triangle', 0.08);
        if (i % 4 === 2) tone(bass[i % bass.length] * 4, 0.2, 'sine', 0.04);
        i += 1;
      }, 420);
    },
    toggleMute() { muted = !muted; return muted; },
  };
}
