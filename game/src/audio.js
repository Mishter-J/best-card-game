// Ember & Tide — all sounds are synthesised with WebAudio at run time.
// No audio files are shipped, so the game loads nothing over the network.

const SoundBank = {
  ctx: null,
  muted: false,
  _ensure() {
    if (this.ctx) return this.ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    } catch (e) {
      this.ctx = null;
    }
    return this.ctx;
  },
  _tone(freq, dur, type, vol, when, slideTo) {
    const ctx = this._ensure();
    if (!ctx || this.muted) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t0 = ctx.currentTime + (when || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  },
  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  },
  click() { this._tone(660, 0.07, 'triangle', 0.08); },
  select() { this._tone(520, 0.08, 'triangle', 0.09); this._tone(780, 0.08, 'triangle', 0.06, 0.05); },
  playCard() { this._tone(392, 0.1, 'triangle', 0.12); this._tone(523, 0.12, 'triangle', 0.1, 0.06); },
  attack() { this._tone(220, 0.14, 'sawtooth', 0.1, 0, 110); },
  damage() { this._tone(180, 0.22, 'sawtooth', 0.12, 0, 70); },
  heal() { this._tone(523, 0.14, 'sine', 0.1); this._tone(659, 0.14, 'sine', 0.1, 0.09); this._tone(784, 0.2, 'sine', 0.1, 0.18); },
  draw() { this._tone(880, 0.06, 'sine', 0.07); this._tone(1174, 0.07, 'sine', 0.06, 0.05); },
  turn() { this._tone(440, 0.09, 'triangle', 0.09); this._tone(587, 0.09, 'triangle', 0.08, 0.07); },
  win() {
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((f, i) => this._tone(f, 0.22, 'triangle', 0.12, i * 0.11));
  },
  lose() {
    const notes = [392, 330, 262, 196];
    notes.forEach((f, i) => this._tone(f, 0.3, 'sine', 0.11, i * 0.16));
  },
};
