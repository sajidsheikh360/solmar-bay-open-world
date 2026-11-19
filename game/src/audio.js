// Synthesised sound for Solmar Bay — WebAudio only, no audio files.
// Engine hum, two-tone sirens, gunshots, pickup blips and mission jingles.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenHigh = false;
    this._sirenTimer = 0;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'square';
    this.sirenOsc.frequency.value = 700;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.ctx.destination);
    this.sirenOsc.start();
  }

  setEngine(speed, inCar) {
    if (!this.ctx || this.muted) return;
    const target = inCar ? 0.05 + Math.min(0.09, Math.abs(speed) * 0.003) : 0;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    this.engineOsc.frequency.setTargetAtTime(55 + Math.abs(speed) * 4, this.ctx.currentTime, 0.1);
  }

  updateSiren(dt, wanted) {
    if (!this.ctx || this.muted) return;
    if (wanted <= 0) {
      this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      return;
    }
    this._sirenTimer += dt;
    if (this._sirenTimer > 0.45) {
      this._sirenTimer = 0;
      this.sirenHigh = !this.sirenHigh;
      this.sirenOsc.frequency.value = this.sirenHigh ? 950 : 700;
    }
    this.sirenGain.gain.setTargetAtTime(0.02, this.ctx.currentTime, 0.1);
  }

  blip(freq, dur, type = 'sine', vol = 0.12) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  shot() {
    if (!this.ctx || this.muted) return;
    const len = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.25;
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
  }

  pickup() {
    this.blip(880, 0.12);
    window.setTimeout(() => this.blip(1320, 0.18), 70);
  }

  jingle() {
    [523, 659, 784, 1046].forEach((freq, i) => {
      window.setTimeout(() => this.blip(freq, 0.22, 'triangle', 0.14), i * 110);
    });
  }

  busted() {
    [392, 330, 262].forEach((freq, i) => {
      window.setTimeout(() => this.blip(freq, 0.3, 'triangle', 0.14), i * 160);
    });
  }
}
