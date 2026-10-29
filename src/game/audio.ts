import { INTRO, INTRO_DUR, LOOP, LOOP_DUR } from "@/game/esmeraldaScore";
import { MINI, MINI_DUR } from "@/game/minigameScore";
import { STAG, STAG_DUR } from "@/game/stagScore";

type Note = readonly [number, number, number, number, number];
type SongId = "intro" | "loop" | "mini" | "stag";
export type MusicMode = "off" | "intro" | "loop" | "mini" | "stag";
type Live = {
  when: number;
  gain: GainNode;
  oscs: OscillatorNode[];
  srcs: AudioBufferSourceNode[];
  nodes: AudioNode[];
};

const MIDI = 440;
/** Hlasitost hudby; vložené skladby (minihry, jelen) se prolínají ztlumením a náběhem. */
const MUSIC_GAIN = 0.42;
const FADE_OUT = 0.45;
const FADE_IN = 0.9;

function episode(id: SongId | MusicMode | null) {
  return id === "mini" || id === "stag";
}

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
  private hornWave: PeriodicWave | null = null;
  private stringWave: PeriodicWave | null = null;
  private pianoWave: PeriodicWave | null = null;
  private hatClosed: AudioBuffer | null = null;
  private hatOpen: AudioBuffer | null = null;
  private cymbal: AudioBuffer | null = null;
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
  /** Kde se hlavní smyčka zastavila kvůli minihře: po minihře hraje dál odtud, ne od začátku. */
  private loopResume: number | null = null;
  /** Probíhá ztlumení před přepnutím na tuhle skladbu (konec ztlumení `fadeAt`). */
  private fadeTo: SongId | null = null;
  private fadeAt = 0;
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
      air.frequency.value = 9000;
      air.Q.value = 0.35;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 10;
      comp.ratio.value = 2.6;
      comp.attack.value = 0.004;
      comp.release.value = 0.14;
      this.musicBus.gain.value = MUSIC_GAIN;
      this.sfxBus.gain.value = 0.85;
      this.musicBus.connect(comp);
      comp.connect(air);
      air.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.master.gain.value = this.muted ? 0 : 1;
      this.clarinetWave = this.ctx.createPeriodicWave(
        new Float32Array([0, 1, 0.04, 0.62, 0.05, 0.34, 0.03, 0.18, 0.02, 0.1, 0.015, 0.05]),
        new Float32Array(12),
      );
      this.brassWave = this.ctx.createPeriodicWave(
        new Float32Array([0, 0.85, 1, 0.92, 0.7, 0.48, 0.32, 0.2, 0.12, 0.07, 0.04, 0.025]),
        new Float32Array(12),
      );
      this.hornWave = this.ctx.createPeriodicWave(
        new Float32Array([0, 1, 0.58, 0.28, 0.12, 0.05, 0.02]),
        new Float32Array(7),
      );
      this.stringWave = this.ctx.createPeriodicWave(
        new Float32Array([0, 1, 0.52, 0.34, 0.24, 0.16, 0.11, 0.07, 0.045, 0.03]),
        new Float32Array(10),
      );
      this.pianoWave = this.ctx.createPeriodicWave(
        new Float32Array([0, 1, 0.38, 0.18, 0.09, 0.045, 0.02]),
        new Float32Array(7),
      );
      this.hatClosed = this.metalBuffer(0.07, [3120, 4570, 5410, 6730], 0.018);
      this.hatOpen = this.metalBuffer(0.22, [2860, 4210, 5380, 6940], 0.07);
      this.cymbal = this.metalBuffer(0.42, [2100, 2780, 3460, 4330, 5120, 6400], 0.12);
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
    this.fadeTo = null;
    this.rampMusic(MUSIC_GAIN, 0);
    this.introDone = false;
    this.suspend();
  }

  stopMusic() {
    this.suspend();
  }

  tick(mode: MusicMode, tempo = 1) {
    if (!this.ctx || !this.musicBus) return;
    if (!mode || mode === "off" || this.muted) {
      this.suspend();
      return;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    const now = this.ctx.currentTime;
    // Plynulý přechod mezi hlavní hudbou a vloženou skladbou: stará se nejdřív ztlumí, nová pak nabíhá.
    const target = mode === "intro" ? null : mode;
    let fadeIn = false;
    if (this.fadeTo && target === this.song) {
      // Rozmyšleno (fáze se vrátila dřív, než ztlumení doběhlo): hudba zase zesílí.
      this.fadeTo = null;
      this.rampMusic(MUSIC_GAIN, FADE_IN * 0.5);
    }
    if (target && this.song && target !== this.song && !this.restartLoop && (episode(target) || episode(this.song))) {
      if (!this.held) {
        if (this.fadeTo !== target) {
          this.fadeTo = target;
          this.fadeAt = now + FADE_OUT;
          this.rampMusic(0.0001, FADE_OUT);
        }
        if (now < this.fadeAt) {
          this.pump(this.song === "loop" ? this.tempo : 1);
          return;
        }
      }
      this.fadeTo = null;
      fadeIn = true;
    } else if (!this.fadeTo && target && target !== this.song) {
      this.rampMusic(MUSIC_GAIN, 0);
    }
    if (fadeIn) this.musicBus.gain.setValueAtTime(0.0001, now);
    if (mode === "loop" && (this.restartLoop || this.song !== "loop")) {
      const resume = this.restartLoop ? null : this.loopResume;
      this.restartLoop = false;
      this.useSong("loop");
      if (resume !== null) this.startAt(resume);
    } else if (mode === "mini" || mode === "stag") {
      // Minihry (ryba, erbovní hádanka) mají smyčku Strejček Škrhola, rozhovor s bílým jelenem Modlitbu.
      if (this.song !== mode) this.useSong(mode);
      if (fadeIn) this.rampMusic(MUSIC_GAIN, FADE_IN);
      this.pump(1);
      return;
    } else if (mode === "intro") {
      if (this.introDone) return;
      if (this.song !== "intro") {
        this.fadeTo = null;
        this.rampMusic(MUSIC_GAIN, 0);
        this.useSong("intro");
      }
    }
    if (fadeIn) this.rampMusic(MUSIC_GAIN, FADE_IN);
    this.pump(Math.min(1.12, Math.max(0.94, tempo)));
  }

  /** Plynulá změna hlasitosti hudby na `to` za `seconds` (0 = hned). */
  private rampMusic(to: number, seconds: number) {
    if (!this.ctx || !this.musicBus) return;
    const g = this.musicBus.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.0001, g.value), now);
    if (seconds <= 0) g.setValueAtTime(to, now);
    else g.linearRampToValueAtTime(Math.max(0.0001, to), now + seconds);
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

  prize() {
    const now = this.ctx?.currentTime ?? 0;
    [659, 784, 988, 1175, 1568].forEach((f, i) => {
      this.blip(f, now + i * 0.05, 0.14, "sine", 0.18);
    });
    this.blip(1976, now + 0.26, 0.22, "triangle", 0.09);
  }

  private useSong(id: SongId) {
    if (this.song === "loop" && id !== "loop" && this.ctx && this.dur > 0) {
      this.loopResume = (this.held ? this.anchorSong : this.songNow(this.ctx.currentTime)) % this.dur;
    } else if (id === "loop") {
      this.loopResume = null;
    }
    this.hush();
    this.song = id;
    this.notes = id === "intro" ? INTRO : id === "mini" ? MINI : id === "stag" ? STAG : LOOP;
    this.dur = id === "intro" ? INTRO_DUR : id === "mini" ? MINI_DUR : id === "stag" ? STAG_DUR : LOOP_DUR;
    this.looping = true;
    this.index = 0;
    this.wrap = 0;
    this.anchorSong = 0;
    this.anchorAudio = (this.ctx?.currentTime ?? 0) + 0.04;
    this.tempo = 1;
    this.held = false;
  }

  /** Hrát právě nastavenou píseň od času `at` (sekundy). */
  private startAt(at: number) {
    this.anchorSong = at;
    this.index = this.seek(at);
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
        this.reed(freq(pitch), when, dur, 0.16 * vel);
        break;
      case 1:
        this.brass(freq(pitch), when, dur, 0.13 * vel, 2400, 0.012, 8);
        break;
      case 2:
        this.brass(freq(pitch), when, dur, 0.12 * vel, 1400, 0.04, 5, this.hornWave);
        break;
      case 3:
        this.brass(freq(pitch), when, dur, 0.14 * vel, 1200, 0.028, 6, this.hornWave);
        break;
      case 4:
        this.brass(freq(pitch), when, dur, 0.07 * vel, 1800, 0.02, 12);
        break;
      case 5:
        this.strings(freq(pitch), when, dur, 0.1 * vel);
        break;
      case 6:
        this.piano(freq(pitch), when, dur, 0.1 * vel);
        break;
      default:
        this.drum(pitch, when, vel);
    }
  }

  private reed(frequency: number, when: number, dur: number, peak: number) {
    this.layered(this.clarinetWave, frequency, when, dur, {
      attack: 0.016,
      peak,
      cutoff: 2100,
      hold: 0.88,
      release: 0.06,
      detune: 0,
      slide: 1,
    });
    this.noiseHit(when, 0.028, "bandpass", 1700, peak * 0.18);
  }

  private brass(
    frequency: number,
    when: number,
    dur: number,
    peak: number,
    cutoff: number,
    attack: number,
    detune: number,
    wave?: PeriodicWave | null,
  ) {
    this.layered(wave ?? this.brassWave, frequency, when, dur, {
      attack,
      peak,
      cutoff,
      hold: 0.9,
      release: 0.05,
      detune,
      slide: 0.982,
    });
    this.noiseHit(when, 0.02, "bandpass", Math.min(1800, cutoff), peak * 0.12);
  }

  private strings(frequency: number, when: number, dur: number, peak: number) {
    this.layered(this.stringWave, frequency, when, dur, {
      attack: Math.min(0.07, Math.max(0.03, dur * 0.28)),
      peak,
      cutoff: 1700,
      hold: 0.92,
      release: 0.08,
      detune: 9,
      slide: 1,
    });
  }

  private piano(frequency: number, when: number, dur: number, peak: number) {
    this.layered(this.pianoWave, frequency, when, Math.min(dur, 0.55), {
      attack: 0.005,
      peak,
      cutoff: 2400,
      hold: 0.28,
      release: 0.12,
      detune: 3,
      slide: 1,
    });
    this.noiseHit(when, 0.012, "highpass", 2200, peak * 0.1);
  }

  private layered(
    wave: PeriodicWave | null,
    frequency: number,
    when: number,
    dur: number,
    tone: { attack: number; peak: number; cutoff: number; hold: number; release: number; detune: number; slide: number },
  ) {
    if (!this.ctx || !this.musicBus || !wave || frequency < 30) return;
    const { amp, stop } = this.body(when, dur, tone.attack, tone.peak, tone.hold, tone.release);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.85;
    const open = Math.max(frequency * 2.4, tone.cutoff);
    filter.frequency.setValueAtTime(Math.max(160, open * 0.28), when);
    filter.frequency.exponentialRampToValueAtTime(open, when + tone.attack + 0.01);
    filter.frequency.exponentialRampToValueAtTime(Math.max(180, open * 0.55), when + dur);
    const oscs = [this.partial(wave, frequency, when, stop, tone.slide, 0)];
    if (tone.detune) oscs.push(this.partial(wave, frequency, when, stop, tone.slide, tone.detune));
    const mix = this.ctx.createGain();
    mix.gain.value = tone.detune ? 0.72 : 1;
    for (const osc of oscs) osc.connect(mix);
    mix.connect(filter);
    filter.connect(amp);
    this.keep(when, amp, oscs, [], [filter, mix]);
  }

  private partial(wave: PeriodicWave, frequency: number, when: number, stop: number, slide: number, cents: number) {
    const osc = this.ctx!.createOscillator();
    osc.setPeriodicWave(wave);
    const start = frequency * slide;
    osc.frequency.setValueAtTime(Math.max(30, start), when);
    if (slide !== 1) osc.frequency.exponentialRampToValueAtTime(frequency, when + 0.04);
    if (cents) osc.detune.setValueAtTime(cents, when);
    osc.start(when);
    osc.stop(stop);
    return osc;
  }

  private drum(pitch: number, when: number, vel: number) {
    if (pitch <= 36) this.kick(when, 0.85 * vel);
    else if (pitch <= 40) this.snare(when, 0.7 * vel);
    else if (pitch === 46) this.hat(when, this.hatOpen, 0.16 * vel);
    else if (pitch >= 49) this.hat(when, this.cymbal, 0.13 * vel);
    else this.hat(when, this.hatClosed, 0.1 * vel);
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

  private hat(when: number, buffer: AudioBuffer | null, peak: number) {
    if (!buffer) return;
    this.bufferHit(buffer, when, peak);
  }

  private bufferHit(buffer: AudioBuffer, when: number, peak: number) {
    if (!this.ctx || !this.musicBus) return;
    const src = this.ctx.createBufferSource();
    const amp = this.ctx.createGain();
    src.buffer = buffer;
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + 0.004);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + buffer.duration);
    src.connect(amp);
    amp.connect(this.musicBus);
    src.start(when);
    src.stop(when + buffer.duration + 0.02);
    this.keep(when, amp, [], [src], []);
  }

  private metalBuffer(seconds: number, partials: number[], decay: number) {
    if (!this.ctx) return null;
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = this.ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      const t = i / rate;
      const env = Math.exp(-t / decay);
      let sample = (Math.random() * 2 - 1) * 0.22;
      for (const partial of partials) sample += Math.sin(2 * Math.PI * partial * t);
      data[i] = (sample / (partials.length + 0.22)) * env * 0.9;
    }
    return buffer;
  }

  private body(when: number, dur: number, attack: number, peak: number, hold: number, release: number) {
    const amp = this.ctx!.createGain();
    const a = Math.max(0.004, Math.min(attack, Math.max(0.004, dur * 0.45)));
    const off = when + Math.max(dur, a + 0.015);
    const rel = Math.max(0.035, release);
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + a);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * hold), off);
    amp.gain.exponentialRampToValueAtTime(0.0001, off + rel);
    amp.connect(this.musicBus!);
    return { amp, stop: off + rel + 0.02 };
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

  alarmThud() {
    this.sweep(120, 55, 0.14, "triangle", 0.16);
    this.blip(78, undefined, 0.09, "sine", 0.1);
  }

  alarmBleat() {
    this.sweep(460, 250, 0.16, "triangle", 0.09);
    this.blip(320, (this.ctx?.currentTime ?? 0) + 0.08, 0.1, "sine", 0.05);
  }

  alarmHonk() {
    this.sweep(620, 360, 0.16, "triangle", 0.07);
  }

  alarmKeeper() {
    const now = this.ctx?.currentTime ?? 0;
    this.blip(294, now, 0.09, "triangle", 0.08);
    this.blip(392, now + 0.09, 0.11, "triangle", 0.07);
  }

  alarmFanfare() {
    const now = this.ctx?.currentTime ?? 0;
    [523, 659, 784].forEach((tone, index) => this.blip(tone, now + index * 0.09, 0.16, "triangle", 0.1));
  }

  alarmStumble() {
    this.sweep(200, 90, 0.16, "sine", 0.07);
  }

  alarmCricket() {
    this.blip(2800, undefined, 0.025, "sine", 0.025);
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
