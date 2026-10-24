// Skočná 2/4, 136 BPM, G dur. Forma 4×8 taktů: A – A' – B – A, pak se hladce opakuje.
// Doprovod (bas, harmonika, kopák, bubínek, tamburína) hraje pořád. Energy přidává jen ozdoby.

const BPM = 136;
const STEP = 60 / BPM / 4;
const G2 = 98;

type Note = readonly [number, number, number];

const MELODY: readonly Note[][] = [
  [
    [0, 0, 2], [2, 4, 2], [4, 7, 2], [6, 4, 2],
    [8, 7, 2], [10, 4, 2], [12, 0, 4],
    [16, -3, 2], [18, 0, 2], [20, -3, 2], [22, 5, 2],
    [24, 7, 2], [26, 4, 2], [28, 0, 4],
    [32, -1, 2], [34, 2, 2], [36, 7, 2], [38, 11, 2],
    [40, 4, 2], [44, 7, 1], [45, 4, 1], [46, 0, 2],
    [48, 7, 2], [50, 5, 2], [52, 2, 2], [54, -1, 2],
    [56, 0, 2], [58, 4, 2], [60, 0, 4],
  ],
  [
    [0, 0, 2], [2, 2, 1], [3, 4, 1], [4, 7, 2], [6, 4, 2],
    [8, 7, 2], [10, 4, 2], [12, 2, 2], [14, 0, 1], [15, 2, 1],
    [16, -3, 2], [18, 0, 2], [20, 5, 2], [22, 9, 2],
    [24, 7, 2], [26, 4, 2], [28, 0, 2],
    [32, -1, 2], [34, 2, 1], [35, -1, 1], [36, 2, 2], [38, 7, 2],
    [40, 4, 2], [42, 0, 2], [44, 7, 1], [45, 4, 1],
    [48, 5, 2], [50, 7, 2], [52, 2, 2], [54, -1, 2],
    [56, 0, 2], [58, -5, 2], [60, 0, 4],
  ],
  [
    [0, -3, 2], [2, 0, 2], [4, 5, 2], [6, 9, 2],
    [8, 7, 2], [10, 4, 2], [12, 0, 2], [14, -5, 2],
    [16, 2, 2], [18, 5, 2], [20, 9, 2], [22, 5, 2],
    [24, -1, 2], [26, 2, 2], [28, 7, 2], [30, 2, 2],
    [32, 0, 2], [34, -3, 2], [36, 5, 2], [38, 7, 2],
    [40, 4, 2], [42, 0, 2], [44, 7, 2], [46, 4, 2],
    [48, 2, 2], [50, -1, 2], [52, 7, 2], [54, 5, 2],
    [56, 4, 2], [58, 7, 2], [60, 0, 4],
  ],
];

const BARS = [
  ["G", "G", "C", "G", "D", "G", "D7", "G"],
  ["G", "G", "C", "G", "D", "G", "D7", "G"],
  ["C", "G", "Am", "D", "C", "G", "D7", "G"],
] as const;

const BASS: Record<string, readonly [number, number]> = {
  G: [0, 7],
  C: [5, 12],
  D: [7, 14],
  D7: [7, 14],
  Am: [2, 9],
};

const STAB: Record<string, readonly [number, number]> = {
  G: [16, 19],
  C: [17, 21],
  D: [11, 14],
  D7: [11, 17],
  Am: [17, 21],
};

function hz(semi: number) {
  return G2 * 2 ** (semi / 12);
}

type Live = {
  when: number;
  gain: GainNode;
  oscs: OscillatorNode[];
  srcs: AudioBufferSourceNode[];
  nodes: AudioNode[];
};

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private nextNote = 0;
  private step = 0;
  private held = false;
  private noise: AudioBuffer | null = null;
  private clarinetWave: PeriodicWave | null = null;
  private reedWave: PeriodicWave | null = null;
  private bassWave: PeriodicWave | null = null;
  private live: Live[] = [];
  muted = false;

  unlock() {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!this.ctx) {
      this.ctx = new Ctx({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      const air = this.ctx.createBiquadFilter();
      air.type = "lowpass";
      air.frequency.value = 5200;
      air.Q.value = 0.4;
      this.musicBus.gain.value = 0.46;
      this.sfxBus.gain.value = 0.85;
      this.musicBus.connect(air);
      air.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.master.gain.value = this.muted ? 0 : 1;
      this.clarinetWave = this.ctx.createPeriodicWave(
        new Float32Array([0, 1, 0.05, 0.4, 0.04, 0.16, 0.02, 0.07]),
        new Float32Array(8),
      );
      this.reedWave = this.ctx.createPeriodicWave(
        new Float32Array([0, 1, 0.46, 0.2, 0.08, 0.03]),
        new Float32Array(6),
      );
      this.bassWave = this.ctx.createPeriodicWave(new Float32Array([0, 1, 0.18, 0.04]), new Float32Array(4));
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

  restartMusic() {
    this.stopMusic();
    this.step = 0;
    this.nextNote = 0;
    this.held = true;
  }

  stopMusic() {
    this.hush();
    this.held = true;
  }

  tick(running: boolean, energy = 0) {
    if (!this.ctx || !this.musicBus) return;
    if (!running || this.muted) {
      if (!this.held) this.stopMusic();
      return;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    const now = this.ctx.currentTime;
    if (this.held || this.nextNote < now + 0.012) {
      this.nextNote = now + 0.04;
      this.held = false;
    }
    const level = Math.min(1, Math.max(0, energy));
    const horizon = now + 0.26;
    let guard = 0;
    while (this.nextNote < horizon && guard++ < 6) {
      this.schedule(this.nextNote, this.step, level);
      this.step += 1;
      this.nextNote += STEP;
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

  private schedule(when: number, step: number, energy: number) {
    const pos = step % 256;
    const section = Math.floor(pos / 64);
    const phrase = section === 1 ? 1 : section === 2 ? 2 : 0;
    const slot = pos % 64;
    const bar = Math.floor(slot / 8);
    const place = slot % 8;
    const name = BARS[phrase]?.[bar] ?? "G";
    const bass = BASS[name] ?? BASS.G!;
    const stab = STAB[name] ?? STAB.G!;
    const note = MELODY[phrase]?.find((item) => item[0] === slot);

    if (note) this.clarinet(hz(note[1] + 24), when, note[2] * STEP * (note[2] >= 4 ? 0.96 : 0.88), energy, note[2]);
    if (place === 0) {
      this.bass(hz(bass[0]), when, 0.2);
      this.kick(when);
    } else if (place === 4) {
      this.bass(hz(bass[1]), when, 0.16, 0.72);
      this.snare(when);
    } else if (place === 2 || place === 6) {
      this.harmonica(hz(stab[0]), hz(stab[1]), when);
      this.tambourine(when, 0.03);
    }
    if (energy > 0.62 && place === 7) this.tambourine(when, 0.016);
  }

  private clarinet(freq: number, when: number, dur: number, energy: number, sixteenths: number) {
    if (!this.ctx || !this.musicBus || !this.clarinetWave) return;
    const amp = this.envelope(when, dur, 0.012, 0.2);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.6;
    filter.frequency.setValueAtTime(1400, when);
    filter.frequency.linearRampToValueAtTime(2200, when + 0.04);
    filter.frequency.linearRampToValueAtTime(1650, when + dur);
    const osc = this.wave(this.clarinetWave, freq, when, dur, 0);
    osc.connect(filter);
    filter.connect(amp);
    const nodes: AudioNode[] = [filter];
    const oscs = [osc];
    if (energy > 0.72 && sixteenths >= 4) {
      const shade = this.wave(this.clarinetWave, freq / 2, when, dur * 0.9, 0);
      const shadeGain = this.ctx.createGain();
      shadeGain.gain.value = 0.22;
      shade.connect(shadeGain);
      shadeGain.connect(filter);
      oscs.push(shade);
      nodes.push(shadeGain);
    }
    this.keep(when, amp, oscs, [], nodes);
  }

  private harmonica(left: number, right: number, when: number) {
    if (!this.reedWave) return;
    const dur = 0.11;
    for (const freq of [left, right]) {
      const amp = this.envelope(when, dur, 0.008, 0.07);
      const a = this.wave(this.reedWave, freq, when, dur, -5);
      const b = this.wave(this.reedWave, freq, when, dur, 7);
      const soft = this.ctx!.createGain();
      soft.gain.value = 0.62;
      a.connect(amp);
      b.connect(soft);
      soft.connect(amp);
      this.keep(when, amp, [a, b], [], [soft]);
    }
  }

  private bass(freq: number, when: number, dur: number, amount = 1) {
    if (!this.bassWave) return;
    const amp = this.envelope(when, dur, 0.008, 0.3 * amount);
    const osc = this.wave(this.bassWave, freq * 1.03, when, dur, 0);
    osc.frequency.exponentialRampToValueAtTime(freq, when + 0.045);
    osc.connect(amp);
    this.keep(when, amp, [osc], [], []);
  }

  private kick(when: number) {
    if (!this.ctx || !this.musicBus) return;
    const amp = this.envelope(when, 0.14, 0.004, 0.4);
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, when);
    osc.frequency.exponentialRampToValueAtTime(52, when + 0.09);
    osc.connect(amp);
    osc.start(when);
    osc.stop(when + 0.16);
    this.noiseHit(when, 0.02, "highpass", 900, 0.05);
    this.keep(when, amp, [osc], [], []);
  }

  private snare(when: number) {
    if (!this.ctx || !this.musicBus) return;
    this.noiseHit(when, 0.1, "bandpass", 1600, 0.1);
    const amp = this.envelope(when, 0.07, 0.004, 0.08);
    const body = this.ctx.createOscillator();
    body.type = "sine";
    body.frequency.setValueAtTime(180, when);
    body.frequency.exponentialRampToValueAtTime(120, when + 0.05);
    body.connect(amp);
    body.start(when);
    body.stop(when + 0.08);
    this.keep(when, amp, [body], [], []);
  }

  private tambourine(when: number, gain: number) {
    this.noiseHit(when, 0.035, "highpass", 4200, gain);
  }

  private noiseHit(when: number, dur: number, type: BiquadFilterType, freq: number, gain: number) {
    if (!this.ctx || !this.musicBus) return null;
    const buffer = this.noiseBuffer();
    if (!buffer) return null;
    const src = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const amp = this.envelope(when, dur, 0.003, gain);
    src.buffer = buffer;
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = type === "bandpass" ? 0.7 : 0.4;
    src.connect(filter);
    filter.connect(amp);
    src.start(when);
    src.stop(when + dur + 0.02);
    this.keep(when, amp, [], [src], [filter]);
    return src;
  }

  private wave(wave: PeriodicWave, freq: number, when: number, dur: number, cents: number) {
    const osc = this.ctx!.createOscillator();
    osc.setPeriodicWave(wave);
    osc.frequency.setValueAtTime(freq, when);
    if (cents) osc.detune.setValueAtTime(cents, when);
    osc.start(when);
    osc.stop(when + dur + 0.03);
    return osc;
  }

  private envelope(when: number, dur: number, attack: number, peak: number) {
    const amp = this.ctx!.createGain();
    const tail = Math.max(0.02, dur);
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + tail);
    amp.connect(this.musicBus!);
    return amp;
  }

  private keep(when: number, gain: GainNode, oscs: OscillatorNode[], srcs: AudioBufferSourceNode[], nodes: AudioNode[]) {
    const voice: Live = { when, gain, oscs, srcs, nodes };
    this.live.push(voice);
    const done = () => this.release(voice);
    const last = oscs[oscs.length - 1] ?? srcs[srcs.length - 1];
    if (last) last.onended = done;
  }

  private release(voice: Live) {
    const index = this.live.indexOf(voice);
    if (index >= 0) this.live.splice(index, 1);
    for (const osc of voice.oscs) osc.disconnect();
    for (const src of voice.srcs) src.disconnect();
    for (const node of voice.nodes) node.disconnect();
    voice.gain.disconnect();
  }

  private noiseBuffer() {
    if (!this.ctx) return null;
    if (this.noise) return this.noise;
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.12), this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    this.noise = buffer;
    return buffer;
  }

  private hush() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const pending = this.live;
    this.live = [];
    for (const voice of pending) {
      if (voice.when > now + 0.004) {
        this.cut(voice, now);
        continue;
      }
      const gain = voice.gain.gain;
      gain.cancelScheduledValues(now);
      const level = Math.max(0.0001, gain.value);
      gain.setValueAtTime(level, now);
      gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      this.cut(voice, now + 0.05);
    }
  }

  private cut(voice: Live, when: number) {
    for (const osc of voice.oscs) {
      try {
        osc.stop(when);
      } catch {
        /* already stopped */
      }
    }
    for (const src of voice.srcs) {
      try {
        src.stop(when);
      } catch {
        /* already stopped */
      }
    }
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
