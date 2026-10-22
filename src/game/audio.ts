const MELODY = [523, 659, 784, 659, 440, 523, 659, 523, 587, 784, 698, 523, 494, 392, 440, 523];

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private nextNote = 0;
  private step = 0;
  muted = false;

  unlock() {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!this.ctx) {
      this.ctx = new Ctx({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.16;
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

  tick(running: boolean) {
    if (!this.ctx || !this.musicBus || !running) return;
    const beat = 60 / 128 / 2;
    const horizon = this.ctx.currentTime + 0.25;
    while (this.nextNote < horizon) {
      const freq = MELODY[this.step % MELODY.length]!;
      if (freq > 0) this.blip(freq, this.nextNote, 0.16, "triangle", 0.18, this.musicBus);
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
