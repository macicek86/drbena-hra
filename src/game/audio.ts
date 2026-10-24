const D4 = 293.66;

const PHRASES = [
  [0, 4, 7, 9, 7, 5, 4, 7, 12, 11, 9, 7, 0, 4, 7, 9, 5, 0, 2, 7, 5, 4, 2, 0],
  [12, 9, 7, 7, 9, 11, 12, 9, 5, 7, 4, 0, 2, 4, 5, 7, 9, 7, 5, 4, 2, 0, 4, 7],
  [7, 12, 14, 12, 11, 9, 7, 9, 11, 12, 9, 7, 5, 9, 12, 4, 7, 11, 2, 4, 0, 4, 2, 0],
];

const CHAINS = [
  ["D", "G", "D", "A", "D", "G", "A", "D"],
  ["D", "Bm", "G", "D", "Em", "A", "G", "D"],
  ["D", "G", "A", "D", "G", "D", "A", "D"],
];

const CHORDS: Record<string, number[]> = {
  D: [0, 4, 7],
  G: [5, 9, 12],
  A: [7, 11, 14],
  Bm: [9, 12, 16],
  Em: [2, 5, 9],
};

function pitch(semi: number) {
  return D4 * 2 ** (semi / 12);
}

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private nextNote = 0;
  private step = 0;
  private held = false;
  private noise: AudioBuffer | null = null;
  private musicOscs: OscillatorNode[] = [];
  private musicHits: AudioBufferSourceNode[] = [];
  muted = false;

  unlock() {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!this.ctx) {
      this.ctx = new Ctx({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.2;
      this.sfxBus.gain.value = 0.85;
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.master.gain.value = this.muted ? 0 : 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.03);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  tick(running: boolean, energy = 0) {
    if (!this.ctx || !this.musicBus) return;
    if (!running) {
      if (!this.held) {
        this.hush();
        this.held = true;
      }
      return;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    const now = this.ctx.currentTime;
    if (this.held || this.nextNote < now + 0.02) {
      this.nextNote = now + 0.05;
      this.held = false;
    }
    const beat = 60 / (102 + Math.min(1, Math.max(0, energy)) * 14);
    const horizon = now + 0.32;
    while (this.nextNote < horizon) {
      this.playBeat(this.nextNote, this.step, energy);
      this.step += 1;
      this.nextNote += beat;
    }
  }

  jump() {
    this.sweep(420, 720, 0.09, "sine", 0.22);
  }

  land() {
    this.sweep(180, 90, 0.06, "triangle", 0.12);
  }

  collect(combo: number) {
    const base = 620 + Math.min(combo, 8) * 40;
    this.blip(base, undefined, 0.07, "sine", 0.2);
    this.blip(base * 1.5, (this.ctx?.currentTime ?? 0) + 0.05, 0.09, "sine", 0.16);
  }

  hurt() {
    this.sweep(240, 70, 0.22, "sawtooth", 0.16);
  }

  fact() {
    [523, 659, 784, 1046].forEach((f, i) => {
      this.blip(f, (this.ctx?.currentTime ?? 0) + i * 0.07, 0.12, "triangle", 0.16);
    });
  }

  private playBeat(when: number, step: number, energy: number) {
    const phrase = this.phrase(step, energy);
    const place = step % 24;
    const bar = Math.floor(place / 3);
    const beat = place % 3;
    const chord = CHORDS[CHAINS[phrase]![bar]!] ?? CHORDS.D!;
    const note = PHRASES[phrase]![place]!;
    const level = Math.min(1, Math.max(0, energy));

    this.voice(pitch(note), when, 0.34, "triangle", 0.34 + level * 0.1, 1700, 0.018, true);
    if (beat === 0) {
      this.voice(pitch(chord[0]! - 12), when, 0.42, "sine", 0.32, 280, 0.02, false);
    } else if (level > 0.18) {
      this.voice(pitch(chord[1]!), when, 0.16, "sine", 0.11, 980, 0.012, false);
      this.voice(pitch(chord[2]! - 12), when, 0.16, "triangle", 0.09, 760, 0.012, false);
    }
    if (level > 0.62 && beat === 0 && bar % 2 === 0) {
      this.voice(pitch(note - 12), when, 0.28, "sine", 0.08, 900, 0.03, false);
    }
    if (level > 0.5 && beat !== 0) this.brush(when, 0.045 + (level - 0.5) * 0.04);
    if (level > 0.45 && place === 23) {
      this.voice(pitch(note + 12), when + 0.09, 0.14, "sine", 0.08, 2200, 0.01, false);
    }
  }

  private phrase(step: number, energy: number) {
    const round = Math.floor(step / 24);
    if (energy < 0.34) return 0;
    if (energy < 0.68) return round % 2;
    return [0, 1, 0, 2][round % 4]!;
  }

  private voice(
    freq: number,
    when: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    cutoff: number,
    attack: number,
    lift: boolean,
  ) {
    if (!this.ctx || !this.musicBus) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(lift ? freq * 1.012 : freq, when);
    if (lift) osc.frequency.exponentialRampToValueAtTime(freq, when + 0.09);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, when);
    filter.Q.value = 0.7;
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(gain, when + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(filter);
    filter.connect(amp);
    amp.connect(this.musicBus);
    osc.start(when);
    osc.stop(when + dur + 0.04);
    this.musicOscs.push(osc);
    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      amp.disconnect();
      this.musicOscs = this.musicOscs.filter((item) => item !== osc);
    };
  }

  private brush(when: number, gain: number) {
    if (!this.ctx || !this.musicBus) return;
    const buffer = this.noiseBuffer();
    if (!buffer) return;
    const src = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const amp = this.ctx.createGain();
    src.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.value = 1800;
    amp.gain.setValueAtTime(gain, when);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(this.musicBus);
    src.start(when);
    src.stop(when + 0.06);
    this.musicHits.push(src);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      amp.disconnect();
      this.musicHits = this.musicHits.filter((item) => item !== src);
    };
  }

  private noiseBuffer() {
    if (!this.ctx) return null;
    if (this.noise) return this.noise;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    this.noise = buffer;
    return buffer;
  }

  private hush() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const osc of this.musicOscs) {
      try {
        osc.stop(now);
      } catch {
        /* already stopped */
      }
    }
    for (const hit of this.musicHits) {
      try {
        hit.stop(now);
      } catch {
        /* already stopped */
      }
    }
    this.musicOscs = [];
    this.musicHits = [];
  }

  private blip(
    freq: number,
    when: number | undefined,
    dur: number,
    type: OscillatorType,
    gain: number,
    bus?: GainNode | null,
  ) {
    if (!this.ctx || !this.sfxBus) return;
    const t = when ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(bus ?? this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  private sweep(from: number, to: number, dur: number, type: OscillatorType, gain: number) {
    if (!this.ctx || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }
}
