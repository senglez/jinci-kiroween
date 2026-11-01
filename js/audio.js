// All sound is synthesized with the Web Audio API, so there is no third-party music to license.

export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  // Must be called from a user gesture (browser autoplay policy).
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.enabled = false; return; }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.startDrone();
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.1);
  }

  startDrone() {
    const { ctx } = this;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    const gain = ctx.createGain();
    gain.gain.value = 0.07;
    filter.connect(gain).connect(this.master);
    // A low open fifth, slightly detuned, slowly breathing.
    [55, 55.4, 82.4].forEach((f) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(filter);
      o.start();
    });
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
  }

  // Temple bell: inharmonic partials with long decay.
  bell(base = 220, vol = 0.25) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [[1, 1], [2.4, 0.5], [3.9, 0.3], [5.3, 0.15]].forEach(([ratio, amp]) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = base * ratio;
      g.gain.setValueAtTime(vol * amp, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5 / ratio + 0.5);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 4.5);
    });
  }

  noise(duration, { type = 'bandpass', freq = 800, q = 1, vol = 0.3, sweepTo } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * duration), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + duration);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  whoosh() { this.noise(1.6, { freq: 200, sweepTo: 2400, q: 0.8, vol: 0.25 }); }
  wind() { this.noise(2.5, { type: 'lowpass', freq: 900, sweepTo: 200, vol: 0.35 }); }
  knock() { this.noise(0.12, { freq: 320, q: 6, vol: 0.6 }); }
  buzz() { this.noise(0.25, { freq: 120, q: 3, vol: 0.4 }); }

  // Pentatonic arpeggio for the success screen.
  fanfare() {
    if (!this.ctx) return;
    [261.6, 293.7, 329.6, 392, 440, 523.3, 659.3].forEach((f, i) => {
      setTimeout(() => this.bell(f, 0.18), i * 150);
    });
  }
}
