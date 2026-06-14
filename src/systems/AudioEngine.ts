/**
 * Procedural audio for Pale Thirst — no asset files. All sounds are synthesized
 * with the Web Audio API so they stay tiny, loop forever, and are tunable by
 * ear via the numbers below. A single shared instance is exported as `audio`.
 *
 * Browsers start an AudioContext suspended until a user gesture; `attachUnlock`
 * resumes it on the first pointer/key input.
 */
class AudioEngine {
  private ctx?: AudioContext;
  private master?: GainNode;
  private noiseBuf?: AudioBuffer;
  private ambient?: {
    gain: GainNode;
    nodes: AudioScheduledSourceNode[];
    drone: OscillatorNode[];
    timers: number[];
    chordIndex: number;
  };
  private unlocked = false;
  muted = false;

  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /** Resume the audio context on the first user gesture (autoplay policy). */
  attachUnlock(): void {
    if (this.unlocked) return;
    const unlock = () => {
      const ctx = this.ensure();
      if (ctx.state === "suspended") void ctx.resume();
      this.unlocked = true;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.04);
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private noise(): AudioBuffer {
    const ctx = this.ensure();
    if (!this.noiseBuf) {
      const len = ctx.sampleRate * 0.5;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    }
    return this.noiseBuf;
  }

  /** A filtered burst of noise — the basis for impacts and squelches. */
  private noiseHit(o: {
    dur: number;
    freq: number;
    q?: number;
    type?: BiquadFilterType;
    vol: number;
    sweepTo?: number;
  }): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise();
    const filt = ctx.createBiquadFilter();
    filt.type = o.type ?? "lowpass";
    filt.frequency.setValueAtTime(o.freq, t);
    filt.Q.value = o.q ?? 1;
    if (o.sweepTo) filt.frequency.exponentialRampToValueAtTime(o.sweepTo, t + o.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(filt).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + o.dur);
  }

  private tone(o: {
    freq: number;
    dur: number;
    vol: number;
    type?: OscillatorType;
    sweepTo?: number;
    attack?: number;
  }): void {
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.sweepTo) osc.frequency.exponentialRampToValueAtTime(o.sweepTo, t + o.dur);
    const g = ctx.createGain();
    const atk = o.attack ?? 0.006;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g).connect(this.master!);
    osc.start(t);
    osc.stop(t + o.dur);
  }

  // --- Gameplay sounds -------------------------------------------------------

  /** Claw swipe through the air. */
  claw(): void {
    if (this.muted) return;
    this.noiseHit({ dur: 0.16, freq: 1600, q: 0.7, type: "bandpass", vol: 0.1, sweepTo: 500 });
  }

  /** A claw connecting and staggering prey. */
  hitEnemy(): void {
    if (this.muted) return;
    this.noiseHit({ dur: 0.1, freq: 320, vol: 0.16 });
    this.tone({ freq: 150, sweepTo: 80, dur: 0.12, vol: 0.12, type: "square" });
  }

  /** A wet, low squelch as the vampire drains a victim. */
  bite(): void {
    if (this.muted) return;
    this.noiseHit({ dur: 0.3, freq: 800, sweepTo: 110, q: 3, vol: 0.18 });
    this.tone({ freq: 220, sweepTo: 70, dur: 0.32, vol: 0.12, type: "sine" });
  }

  /** The vampire taking a hit from a guard. */
  hurt(): void {
    if (this.muted) return;
    this.noiseHit({ dur: 0.22, freq: 600, sweepTo: 160, vol: 0.22 });
    this.tone({ freq: 140, sweepTo: 60, dur: 0.22, vol: 0.14, type: "sawtooth" });
  }

  /** Death — a long descending toll. */
  death(): void {
    if (this.muted) return;
    this.tone({ freq: 200, sweepTo: 40, dur: 1.3, vol: 0.22, type: "sawtooth" });
    this.noiseHit({ dur: 1.0, freq: 500, sweepTo: 80, vol: 0.12 });
  }

  /** Surviving a night — a soft rising shimmer. */
  survive(): void {
    if (this.muted) return;
    this.tone({ freq: 294, sweepTo: 392, dur: 0.7, vol: 0.1, type: "triangle", attack: 0.08 });
    this.tone({ freq: 440, sweepTo: 587, dur: 0.7, vol: 0.07, type: "sine", attack: 0.12 });
  }

  /** Choosing an upgrade — a resonant confirmation. */
  upgrade(): void {
    if (this.muted) return;
    this.tone({ freq: 196, sweepTo: 392, dur: 0.26, vol: 0.14, type: "triangle" });
  }

  /** A villager crying out after witnessing the vampire feed. */
  alarm(): void {
    if (this.muted) return;
    this.tone({ freq: 680, sweepTo: 1020, dur: 0.16, vol: 0.13, type: "square" });
    this.tone({ freq: 900, dur: 0.24, vol: 0.07, type: "triangle", attack: 0.02 });
  }

  // --- Ambient ---------------------------------------------------------------

  /** Low roots of a slow, melancholic minor progression (i–VI–III–VII in Am). */
  private static readonly CHORD_ROOTS = [55, 43.65, 65.41, 49];
  /** A-natural-minor notes (one octave) for the sparse melody bells. */
  private static readonly MELODY = [220, 246.94, 261.63, 293.66, 329.63, 349.23, 392, 440];

  /**
   * Start the ambient bed: a consonant root+fifth+octave drone that drifts
   * through a minor chord progression, with occasional soft bell notes so it
   * breathes and feels mournful rather than monotone. Idempotent.
   */
  startAmbient(): void {
    if (this.ambient) return;
    const ctx = this.ensure();
    const t = ctx.currentTime;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 3);

    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 420;
    filt.Q.value = 0.8; // gentler than before — less horror-drone
    filt.connect(gain).connect(this.master!);

    // Very slow filter sweep for a breathing quality.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.04;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain).connect(filt.frequency);
    lfo.start(t);

    const root = AudioEngine.CHORD_ROOTS[0];
    const drone: OscillatorNode[] = [];
    const nodes: AudioScheduledSourceNode[] = [lfo];
    [
      [root, "sine", 0.9],
      [root * 1.5, "sine", 0.55],
      [root * 2, "triangle", 0.35],
    ].forEach(([freq, type, vol]) => {
      const osc = ctx.createOscillator();
      osc.type = type as OscillatorType;
      osc.frequency.value = freq as number;
      osc.detune.value = (Math.random() - 0.5) * 6;
      const og = ctx.createGain();
      og.gain.value = vol as number;
      osc.connect(og).connect(filt);
      osc.start(t);
      drone.push(osc);
      nodes.push(osc);
    });

    // Drift through the chord progression and sprinkle melody notes.
    const chordTimer = window.setInterval(() => this.nextChord(), 13000);
    const scheduleBell = () => {
      if (!this.ambient) return;
      if (Math.random() < 0.7) {
        const chordRoot = AudioEngine.CHORD_ROOTS[this.ambient.chordIndex];
        const note = AudioEngine.MELODY[Math.floor(Math.random() * AudioEngine.MELODY.length)];
        // Drop the melody an octave over the lowest roots so it stays mournful.
        this.bell(note * (chordRoot < 50 ? 0.75 : 1));
      }
      const id = window.setTimeout(scheduleBell, 4000 + Math.random() * 6000);
      this.ambient?.timers.push(id);
    };

    this.ambient = { gain, nodes, drone, timers: [chordTimer], chordIndex: 0 };
    const firstBell = window.setTimeout(scheduleBell, 3500);
    this.ambient.timers.push(firstBell);
  }

  /** Glide the drone to the next chord root in the progression. */
  private nextChord(): void {
    if (!this.ambient || !this.ctx) return;
    this.ambient.chordIndex =
      (this.ambient.chordIndex + 1) % AudioEngine.CHORD_ROOTS.length;
    const root = AudioEngine.CHORD_ROOTS[this.ambient.chordIndex];
    const t = this.ctx.currentTime;
    const targets = [root, root * 1.5, root * 2];
    this.ambient.drone.forEach((osc, i) => {
      osc.frequency.setTargetAtTime(targets[i], t, 1.5);
    });
  }

  /** A soft, slowly-decaying bell — the melodic colour over the drone. */
  private bell(freq: number): void {
    if (this.muted) return;
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() - 0.5) * 1.2;
    osc.connect(g).connect(pan).connect(this.master!);
    osc.start(t);
    osc.stop(t + 1.9);
  }

  stopAmbient(): void {
    if (!this.ambient || !this.ctx) return;
    const t = this.ctx.currentTime;
    for (const id of this.ambient.timers) {
      window.clearInterval(id);
      window.clearTimeout(id);
    }
    this.ambient.gain.gain.exponentialRampToValueAtTime(0.0001, t + 1);
    for (const n of this.ambient.nodes) n.stop(t + 1.1);
    this.ambient = undefined;
  }
}

export const audio = new AudioEngine();
