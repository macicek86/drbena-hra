import { INTRO, INTRO_DUR, LOOP, LOOP_DUR } from "@/game/esmeraldaScore";

type Note = readonly [number, number, number, number, number];
type SongId = "intro" | "loop";
type Live = {
  when: number;
  gain: GainNode;
  oscs: OscillatorNode[];
  srcs: AudioBufferSourceNode[];
  nodes: AudioNode[];
};

const MIDI = 440;

function freq(pitch: number) {
  return MIDI * 2 ** ((pitch - 69) / 12);
}

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private clarinetWave: PeriodicWave | null = null;
  private brassWave: PeriodicWave | null = null;
  private stringWave: PeriodicWave | null = null;
  private live: Live[] = [];
  private song: SongId | null = null;
  private notes: readonly Note[] = [];
  private dur = 0;
  private looping = false;
  private index = 0;
  private wrap = 0;
  private anchorSong = 0;
  private anchorAudio = 0;
  private tempo = 1;
  private held = true;
  private introDone = false;
  private restartLoop = false;
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
      air.frequency.value = 4800;
      air.Q.value = 0.35;
      this.musicBus.gain.value = 0.5;
      this.sfxBus.gain.value = 0.85;
      this.musicBus.connect(air);
      air.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.master.gain.value = this.muted ? 0 : 1;
      this.clarinetWave = this.ctx.createPeriodicWave(
        new Float32Array([0, 1, 0.05, 0.38, 0.04, 0.14, 0.02, 0.06]),
        new Float32Array(8),
      );
      this.brassWave = this.ctx.createPeriodicWave(
        new Float32Array([0, 1, 0.55, 0.32, 0.18, 0.1, 0.05, 0.03]),
        new Float32Array(8),
      );
      this.stringWave = this.ctx.createPeriodicWave(
        new Float32Array([0, 1, 0.42, 0.16, 0.08, 0.04]),
        new Float32Array(6),
      );
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
    this.restartLoop = true;
    this.introDone = false;
    this.suspend();
  }

  stopMusic() {
    this.suspend();
  }

  tick(mode: "off" | "intro" | "loop", tempo = 1) {
    if (!this.ctx || !this.musicBus) return;
    if (!mode || mode === "off" || this.muted) {
      this.suspend();
      return;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    if (mode === "loop" && (this.restartLoop || this.song !== "loop")) {
      this.restartLoop = false;
      this.useSong("loop");
    } else if (mode === "intro") {
      if (this.introDone) return;
      if (this.song !== "intro") this.useSong("intro");
    }
    this.pump(Math.min(1.12, Math.max(0.94, tempo)));
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

  private useSong(id: SongId) {
    this.hush();
    this.song = id;
    this.notes = id === "intro" ? INTRO : LOOP;
    this.dur = id === "intro" ? INTRO_DUR : LOOP_DUR;
    this.looping = true;
    this.index = 0;
    this.wrap = 0;
    this.anchorSong = 0;
    this.anchorAudio = (this.ctx?.currentTime ?? 0) + 0.04;
    this.tempo = 1;
    this.held = false;
  }

  private songNow(now: number) {
    return this.anchorSong + Math.max(0, now - this.anchorAudio) * this.tempo;
  }

  private suspend() {
    if (!this.ctx || this.held) return;
    const now = this.ctx.currentTime;
    let at = this.songNow(now);
    if (this.looping && this.dur > 0) at %= this.dur;
    this.anchorSong = at;
    this.wrap = 0;
    this.index = this.seek(at);
    this.hush();
    this.held = true;
  }

  private seek(time: number) {
    let lo = 0;
    let hi = this.notes.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.notes[mid]![0] / 1000 < time - 0.005) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private pump(tempo: number) {
    const ctx = this.ctx;
    if (!ctx || !this.song) return;
    const now = ctx.currentTime;
    if (this.held) {
      this.anchorAudio = now + 0.03;
      this.held = false;
      this.index = this.seek(this.anchorSong);
    } else if (Math.abs(tempo - this.tempo) > 0.008) {
      let at = this.songNow(now);
      if (this.looping && this.dur > 0) at %= this.dur;
      this.anchorSong = at;
      this.anchorAudio = now;
      this.wrap = 0;
      this.tempo = tempo;
      this.index = this.seek(at);
    }
    const songNow = this.songNow(now);
    if (!this.looping && songNow >= this.dur) {
      this.introDone = true;
      this.hush();
      this.held = true;
      return;
    }
    let horizon = songNow + 0.22 * this.tempo;
    let guard = 0;
    while (guard++ < 500) {
      if (this.index >= this.notes.length) {
        if (!this.looping || horizon < this.dur + this.wrap) break;
        this.wrap += this.dur;
        this.index = 0;
        continue;
      }
      const note = this.notes[this.index]!;
      const start = note[0] / 1000 + this.wrap;
      if (start >= horizon) break;
      const when = this.anchorAudio + (start - this.anchorSong) / this.tempo;
      if (when >= now - 0.03) this.play(note, when, Math.max(0.04, note[1] / 1000 / this.tempo));
      this.index += 1;
    }
  }

  private play(note: Note, when: number, dur: number) {
    const vel = 0.5 + (note[4] / 127) * 0.5;
    const pitch = note[3];
    switch (note[2]) {
      case 0:
        this.toned(this.clarinetWave, freq(pitch), when, dur, 0.012, 0.15 * vel, 1900);
        break;
      case 1:
        this.toned(this.brassWave, freq(pitch), when, dur, 0.01, 0.12 * vel, 2600);
        break;
      case 2:
        this.toned(this.brassWave, freq(pitch), when, dur, 0.02, 0.11 * vel, 1600);
        break;
      case 3:
        this.toned(this.brassWave, freq(pitch), when, dur, 0.016, 0.13 * vel, 1400);
        break;
      case 4:
        this.toned(this.brassWave, freq(pitch), when, dur, 0.012, 0.07 * vel, 2000);
        break;
      case 5:
        this.toned(this.stringWave, freq(pitch), when, dur, Math.min(0.04, dur * 0.25), 0.09 * vel, 1800);
        break;
      case 6:
        this.toned(this.clarinetWave, freq(pitch), when, Math.min(dur, 0.45), 0.006, 0.08 * vel, 2200);
        break;
      default:
        this.drum(pitch, when, vel);
    }
  }

  private toned(wave: PeriodicWave | null, frequency: number, when: number, dur: number, attack: number, peak: number, cutoff: number) {
    if (!this.ctx || !this.musicBus || !wave) return;
    const amp = this.envelope(when, dur, attack, peak);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.55;
    filter.frequency.setValueAtTime(Math.max(400, cutoff * 0.72), when);
    filter.frequency.linearRampToValueAtTime(cutoff, when + attack + 0.02);
    const osc = this.ctx.createOscillator();
    osc.setPeriodicWave(wave);
    osc.frequency.setValueAtTime(frequency, when);
    osc.connect(filter);
    filter.connect(amp);
    osc.start(when);
    osc.stop(when + dur + 0.03);
    this.keep(when, amp, [osc], [], [filter]);
  }

  private drum(pitch: number, when: number, vel: number) {
    if (pitch <= 36) this.kick(when, 0.85 * vel);
    else if (pitch <= 40) this.snare(when, 0.7 * vel);
    else if (pitch === 46) this.hat(when, 0.09 * vel, 0.16);
    else if (pitch >= 49) this.hat(when, 0.07 * vel, 0.28);
    else this.hat(when, 0.045 * vel, 0.04);
  }

  private kick(when: number, peak: number) {
    if (!this.ctx || !this.musicBus) return;
    const amp = this.envelope(when, 0.14, 0.004, 0.42 * peak);
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, when);
    osc.frequency.exponentialRampToValueAtTime(48, when + 0.09);
    osc.connect(amp);
    osc.start(when);
    osc.stop(when + 0.16);
    this.keep(when, amp, [osc], [], []);
    this.noiseHit(when, 0.02, "highpass", 800, 0.04 * peak);
  }

  private snare(when: number, peak: number) {
    if (!this.ctx || !this.musicBus) return;
    this.noiseHit(when, 0.09, "bandpass", 1700, 0.12 * peak);
    const amp = this.envelope(when, 0.06, 0.004, 0.07 * peak);
    const body = this.ctx.createOscillator();
    body.type = "sine";
    body.frequency.setValueAtTime(190, when);
    body.frequency.exponentialRampToValueAtTime(110, when + 0.05);
    body.connect(amp);
    body.start(when);
    body.stop(when + 0.08);
    this.keep(when, amp, [body], [], []);
  }

  private hat(when: number, peak: number, dur: number) {
    this.noiseHit(when, dur, "highpass", 3800, peak);
  }

  private noiseHit(when: number, dur: number, type: BiquadFilterType, frequency: number, peak: number) {
    if (!this.ctx || !this.musicBus) return;
    const buffer = this.noiseBuffer();
    if (!buffer) return;
    const src = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const amp = this.envelope(when, dur, 0.003, peak);
    src.buffer = buffer;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = type === "bandpass" ? 0.65 : 0.4;
    src.connect(filter);
    filter.connect(amp);
    src.start(when);
    src.stop(when + dur + 0.02);
    this.keep(when, amp, [], [src], [filter]);
  }

  private envelope(when: number, dur: number, attack: number, peak: number) {
    const amp = this.ctx!.createGain();
    const tail = Math.max(attack + 0.02, dur);
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + tail);
    amp.connect(this.musicBus!);
    return amp;
  }

  private keep(when: number, gain: GainNode, oscs: OscillatorNode[], srcs: AudioBufferSourceNode[], nodes: AudioNode[]) {
    const voice: Live = { when, gain, oscs, srcs, nodes };
    this.live.push(voice);
    const last = oscs[oscs.length - 1] ?? srcs[srcs.length - 1];
    if (last) last.onended = () => this.release(voice);
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
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.2), this.ctx.sampleRate);
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
      gain.setValueAtTime(Math.max(0.0001, gain.value), now);
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
    freqNote: number,
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
    osc.frequency.setValueAtTime(freqNote, t);
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
