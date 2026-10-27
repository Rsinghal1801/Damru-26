// Sound: campus ambience, the cart's motor, the dhol
// troupe, the concert from the main stage, the crowd, fireworks, and chimes and beeps.
import { bytes } from './assets.js';
import { clamp } from './util.js';

export class GameAudio {
  constructor() {
    this.raw = {};
    this.ready = false;
    this.muted = false;
    this.loading = Promise.all(['campusambience', 'cartmotor'].map((n) =>
      bytes(`assets/audio/${n}.mp3`).then((b) => { this.raw[n] = b; }).catch(() => {})));
  }

  /** Must run inside a user gesture (the Start button). */
  async start() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(ctx.destination);
    await this.loading;
    const buf = {};
    for (const [n, b] of Object.entries(this.raw)) {
      try { buf[n] = await ctx.decodeAudioData(b.slice(0)); } catch (e) { /* skip */ }
    }
    const loop = (b, gain, trim = 0.06) => {
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      g.gain.value = gain;
      if (b) {
        src.buffer = b;
        src.loop = true;
        src.loopStart = trim; src.loopEnd = b.duration - trim;
        src.connect(g);
        src.start(0, trim);
      }
      g.connect(this.master);
      return { src, g };
    };
    this.amb = loop(buf.campusambience, 0.32);
    this.motor = loop(buf.cartmotor, 0, 0.08);
    // noise buffer for the drum slaps
    const n = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = n;
    this.drumBus = ctx.createGain();
    this.drumBus.gain.value = 0;
    this.drumBus.connect(this.master);
    this.nextBeat = ctx.currentTime + 0.2;
    this.beat = 0;
    // concert: drums, bass, chords and a lead line, all synthesised
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4;
    this.musicBus.connect(comp); comp.connect(this.master);
    this.nextStep = ctx.currentTime + 0.3;
    this.stepN = 0;
    // crowd murmur: a looped band of noise
    const cn = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const cd = cn.getChannelData(0);
    let last = 0;
    for (let i = 0; i < cd.length; i++) { last = last * 0.97 + (Math.random() * 2 - 1) * 0.03; cd[i] = last * 6; }
    const csrc = ctx.createBufferSource(); csrc.buffer = cn; csrc.loop = true;
    const cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 520; cf.Q.value = 0.5;
    this.crowdGain = ctx.createGain(); this.crowdGain.gain.value = 0;
    csrc.connect(cf); cf.connect(this.crowdGain); this.crowdGain.connect(this.master);
    csrc.start();
    this.ready = true;
    if (ctx.state === 'suspended') ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  chime() {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    [[880, 0], [1318.5, 0.12], [1760, 0.24]].forEach(([fr, dt]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = fr;
      g.gain.setValueAtTime(0, t + dt);
      g.gain.linearRampToValueAtTime(0.16, t + dt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + dt + 1.1);
      o.connect(g); g.connect(this.master);
      o.start(t + dt); o.stop(t + dt + 1.2);
    });
  }

  beep(freq = 880) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.3);
  }

  /** A firework going off `dist` metres away (sound arrives later). */
  bang(dist) {
    if (!this.ready || dist > 600) return;
    const ctx = this.ctx, t = ctx.currentTime + dist / 343;
    const vol = Math.min(0.5, 40 / (dist + 20));
    const s = ctx.createBufferSource(); s.buffer = this.noise;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.9);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, 0, 0.5);
    for (let k = 0; k < 6; k++) {
      const tk = t + 0.25 + Math.random() * 0.9;
      const c = ctx.createBufferSource(); c.buffer = this.noise;
      const hf = ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 3000;
      const cg = ctx.createGain(); cg.gain.setValueAtTime(vol * 0.25, tk); cg.gain.exponentialRampToValueAtTime(0.0005, tk + 0.05);
      c.connect(hf); hf.connect(cg); cg.connect(this.master); c.start(tk, Math.random() * 0.4, 0.06);
    }
  }

  tone(time, freq, dur, type, vol, cutoff = 2000) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, time);
    f.type = 'lowpass'; f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol, time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(f); f.connect(g); g.connect(this.musicBus);
    o.start(time); o.stop(time + dur + 0.05);
    return o;
  }

  /** One sixteenth-note step of the concert at `time`. level: 0.25 warm-up .. 1 concert. */
  musicStep(time, n, level) {
    const ctx = this.ctx, st = n % 16, bar = Math.floor(n / 16) % 4;
    const roots = [110, 87.31, 98, 82.41];                       // Am, F, G, Em
    const chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [164.8, 196, 246.9]];
    const full = level > 0.6;
    // kick
    if (st % 4 === 0 && (full || st % 8 === 0)) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(150, time); o.frequency.exponentialRampToValueAtTime(45, time + 0.12);
      g.gain.setValueAtTime(0.9, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
      o.connect(g); g.connect(this.musicBus); o.start(time); o.stop(time + 0.32);
    }
    // clap
    if (full && (st === 4 || st === 12)) {
      const s = ctx.createBufferSource(); s.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.8;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.5, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
      s.connect(f); f.connect(g); g.connect(this.musicBus); s.start(time, Math.random() * 0.3, 0.2);
    }
    // hats
    if (st % 2 === 0) {
      const s = ctx.createBufferSource(); s.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = ctx.createGain(); g.gain.setValueAtTime(st % 4 === 2 ? 0.16 : 0.07, time); g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      s.connect(f); f.connect(g); g.connect(this.musicBus); s.start(time, Math.random() * 0.4, 0.06);
    }
    // bass on a syncopated pattern
    if ([0, 3, 6, 8, 11, 14].includes(st)) this.tone(time, roots[bar] * (st === 14 ? 2 : 1), 0.22, 'sawtooth', full ? 0.32 : 0.18, 500);
    // chords at the start of each bar, off-beat stabs in the concert
    if (st === 0) for (const f of chords[bar]) this.tone(time, f, 2.0, 'sawtooth', 0.05, 1400);
    if (full && (st === 2 || st === 6 || st === 10 || st === 14)) for (const f of chords[bar]) this.tone(time, f * 2, 0.12, 'square', 0.025, 2600);
    // a shehnai-like lead line in the concert
    if (full && bar % 2 === 0 && st % 2 === 0) {
      const line = [440, 523.3, 587.3, 659.3, 587.3, 523.3, 440, 392];
      const o = this.tone(time, line[(st / 2) | 0] * (bar === 2 ? 1.5 : 1), 0.24, 'square', 0.06, 1800);
      o.frequency.setValueAtTime(o.frequency.value, time);
    }
  }

  drum(time, low, vol) {
    const ctx = this.ctx;
    if (low) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(130, time);
      o.frequency.exponentialRampToValueAtTime(55, time + 0.25);
      g.gain.setValueAtTime(vol, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
      o.connect(g); g.connect(this.drumBus);
      o.start(time); o.stop(time + 0.45);
    } else {
      const s = ctx.createBufferSource(); s.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol * 0.7, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
      s.connect(f); f.connect(g); g.connect(this.drumBus);
      s.start(time, Math.random() * 0.3, 0.1);
    }
  }

  /**
   * Per frame. mode: 'foot' | 'camel' | 'cart'. cartSpeed for the motor, stageDist in metres
   * for the concert. (No footstep sounds: no player footsteps and no camel footfalls.)
   */
  update(dt, { mode, cartSpeed, cartNear, dholDist, stageDist = 1e9, stallDist = 1e9, concert = 0.25 }) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    // electric motor whine
    const sv = Math.abs(cartSpeed);
    this.motor.g.gain.setTargetAtTime(mode === 'cart' ? 0.05 + sv * 0.035 : (sv > 0.2 ? 0.2 * cartNear : 0), t, 0.1);
    if (this.motor.src.buffer) this.motor.src.playbackRate.setTargetAtTime(0.6 + sv * 0.1, t, 0.1);
    // the concert from the main stage, heard across the campus
    const mv = clamp(1 - (stageDist - 20) / 220, 0, 1);
    this.musicBus.gain.setTargetAtTime(mv * mv * (0.25 + concert * 0.55), t, 0.3);
    if (mv > 0) {
      const sps = 60 / 116 / 4;
      while (this.nextStep < t + 0.2) { this.musicStep(this.nextStep, this.stepN++, concert); this.nextStep += sps; }
    } else this.nextStep = t + 0.1;
    // crowd murmur near the stage and the stalls, swelling in the concert
    const crowdV = Math.max(clamp(1 - (stageDist - 10) / 90, 0, 1) * (0.5 + concert * 0.5), clamp(1 - (stallDist - 5) / 50, 0, 1) * 0.6);
    this.crowdGain.gain.setTargetAtTime(crowdV * 0.22 * (1 + 0.4 * Math.sin(t * 0.7)), t, 0.4);
    // dhol from the troupe: schedule a little ahead
    const vol = clamp(1 - (dholDist - 10) / 90, 0, 1);
    this.drumBus.gain.setTargetAtTime(vol * vol * 0.55, t, 0.3);
    this.amb.g.gain.setTargetAtTime(0.32 * (1 - Math.max(vol, mv) * 0.5), t, 0.3);
    if (vol > 0) {
      const spb = 60 / 104 / 2; // eighth notes at 104 bpm
      const pattern = [1, 0, 2, 1, 0, 2, 1, 2, 1, 0, 2, 0, 1, 2, 2, 2];
      while (this.nextBeat < t + 0.15) {
        const p = pattern[this.beat % pattern.length];
        if (p === 1) this.drum(this.nextBeat, true, 0.9);
        else if (p === 2) this.drum(this.nextBeat, false, 0.6);
        this.nextBeat += spb;
        this.beat++;
      }
    } else {
      this.nextBeat = t + 0.1;
    }
  }
}
