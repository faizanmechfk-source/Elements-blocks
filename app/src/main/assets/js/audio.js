(function (global) {
  'use strict';

  const EB = (global.EB = global.EB || {});

  const ELEMENT_PITCH = {
    fire: { base: 330, accent: 495, wave: 'sawtooth', filter: 1600 },
    water: { base: 392, accent: 587, wave: 'sine', filter: 2400 },
    earth: { base: 220, accent: 330, wave: 'triangle', filter: 1100 },
    air: { base: 523.25, accent: 784, wave: 'sine', filter: 3200 }
  };

  // Musical progressions per mood (frequencies in Hz)
  const MOOD_DATA = {
    menu: {
      stepMs: 560,
      chords: [
        [261.63, 311.13, 392.0, 523.25], // Cm7
        [207.65, 261.63, 311.13, 392.0], // Abmaj7
        [311.13, 392.0, 466.16, 587.33], // Ebmaj7
        [233.08, 293.66, 349.23, 466.16] // Bb
      ],
      bass: [130.81, 103.83, 155.56, 116.54]
    },
    gameplay: {
      stepMs: 420,
      chords: [
        [261.63, 329.63, 392.0, 493.88], // Cmaj7
        [220.0, 261.63, 329.63, 392.0],  // Am7
        [174.61, 220.0, 261.63, 349.23], // Fmaj7
        [196.0, 246.94, 293.66, 392.0]   // G
      ],
      bass: [130.81, 110.0, 87.31, 98.0]
    },
    combo: {
      stepMs: 320,
      chords: [
        [293.66, 349.23, 440.0, 523.25], // Dm7
        [246.94, 293.66, 392.0, 493.88], // G/B
        [261.63, 329.63, 392.0, 523.25], // C
        [220.0, 277.18, 329.63, 440.0]   // A
      ],
      bass: [146.83, 123.47, 130.81, 110.0]
    },
    tension: {
      stepMs: 300,
      chords: [
        [220.0, 261.63, 311.13, 392.0],  // Am(b5) feel
        [196.0, 233.08, 293.66, 349.23], // Gm7
        [185.0, 220.0, 277.18, 329.63],  // F#dim7
        [164.81, 207.65, 246.94, 329.63] // E7
      ],
      bass: [110.0, 98.0, 92.5, 82.41]
    },
    powerup: {
      stepMs: 260,
      chords: [
        [329.63, 392.0, 493.88, 659.25], // Em7
        [349.23, 440.0, 523.25, 659.25]  // Fmaj7
      ],
      bass: [164.81, 174.61]
    }
  };

  const AudioSystem = {
    ctx: null,
    masterGain: null,
    musicTimer: null,
    musicStep: 0,
    musicMood: 'menu',
    musicIntensity: 1,
    isPaused: false,

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = global.AudioContext || global.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    },

    vibrate(type) {
      if (global.AndroidBridge && typeof global.AndroidBridge.vibrate === 'function') {
        try {
          global.AndroidBridge.vibrate(type);
        } catch (_) {}
      }
    },

    tone(freq, endFreq, duration, type = 'sine', gainVal = 0.14, delay = 0, filterFreq = 0) {
      const settings = EB.Storage && EB.Storage.settings;
      if (!settings || !settings.soundEnabled) return;

      const ctx = this.ensureContext();
      if (!ctx || !this.masterGain) return;

      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, freq), now);
      if (endFreq !== freq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
      }

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainVal, now + Math.min(0.015, duration * 0.25));
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      if (filterFreq > 0) {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, now);
        osc.connect(filter);
        filter.connect(gain);
      } else {
        osc.connect(gain);
      }

      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.03);
    },

    noiseBurst(duration = 0.25, gainVal = 0.18, filterFreq = 800, filterType = 'lowpass', delay = 0) {
      const settings = EB.Storage && EB.Storage.settings;
      if (!settings || !settings.soundEnabled) return;

      const ctx = this.ensureContext();
      if (!ctx || !this.masterGain) return;

      const now = ctx.currentTime + delay;
      const bufferSize = Math.max(128, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.4);
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.setValueAtTime(filterFreq, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start(now);
    },

    play(effect, opts = {}) {
      const el = opts.element && ELEMENT_PITCH[opts.element] ? ELEMENT_PITCH[opts.element] : ELEMENT_PITCH.water;
      const mult = Math.max(1, opts.multiplier || 1);
      const lines = Math.max(1, opts.lines || 1);
      const pitchShift = 1 + Math.min(0.45, (mult - 1) * 0.045);

      switch (effect) {
        case 'click':
          this.tone(580, 760, 0.055, 'triangle', 0.085, 0, 2600);
          this.vibrate('tap');
          break;

        case 'back':
          this.tone(520, 340, 0.07, 'triangle', 0.08, 0, 2000);
          this.vibrate('tap');
          break;

        case 'gameStart':
          this.tone(261.63, 329.63, 0.14, 'triangle', 0.12, 0);
          this.tone(329.63, 392.0, 0.14, 'triangle', 0.12, 0.07);
          this.tone(392.0, 523.25, 0.22, 'sine', 0.14, 0.14);
          this.tone(659.25, 783.99, 0.24, 'sine', 0.1, 0.2);
          this.vibrate('place');
          break;

        case 'pickup':
          if (opts.element === 'fire') {
            this.tone(300, 480, 0.08, 'sawtooth', 0.07, 0, 1400);
            this.noiseBurst(0.05, 0.05, 2200, 'bandpass');
          } else if (opts.element === 'water') {
            this.tone(380, 620, 0.09, 'sine', 0.11);
          } else if (opts.element === 'earth') {
            this.tone(180, 260, 0.08, 'triangle', 0.13, 0, 900);
          } else {
            this.tone(500, 740, 0.09, 'sine', 0.09);
          }
          this.vibrate('pickup');
          break;

        case 'snapHover':
          if (opts.previewClear) {
            this.tone(760, 980, 0.045, 'sine', 0.055);
          } else {
            this.tone(420, 460, 0.028, 'triangle', 0.032, 0, 1400);
          }
          break;

        case 'place':
          // Tactile base lock thud + elemental character note
          this.tone(175, 95, 0.085, 'triangle', 0.16, 0, 900);
          this.tone(el.base, el.accent, 0.11, el.wave, 0.085, 0.015, el.filter);
          if (opts.element === 'air') {
            this.noiseBurst(0.06, 0.035, 3200, 'highpass', 0.01);
          }
          this.vibrate('place');
          break;

        case 'invalid':
          this.tone(195, 140, 0.12, 'sawtooth', 0.09, 0, 1100);
          this.tone(155, 110, 0.14, 'sawtooth', 0.08, 0.08, 950);
          this.vibrate('invalid');
          break;

        case 'clear': {
          const b = 440 * pitchShift;
          this.tone(b, b * 1.25, 0.14, 'triangle', 0.13);
          this.tone(b * 1.25, b * 1.5, 0.18, 'sine', 0.13, 0.055);
          this.tone(b * 2, b * 2, 0.2, 'sine', 0.09, 0.1);
          this.noiseBurst(0.11, 0.05, 3000, 'highpass', 0.02);
          this.vibrate('clear');
          break;
        }

        case 'multiClear': {
          const b = 440 * pitchShift;
          const chordSteps = lines >= 4 ? [1, 1.25, 1.5, 2, 2.5] : lines === 3 ? [1, 1.25, 1.5, 2] : [1, 1.25, 1.5];
          chordSteps.forEach((ratio, idx) => {
            this.tone(b * ratio, b * ratio * 1.04, 0.22, idx % 2 === 0 ? 'triangle' : 'sine', 0.13, idx * 0.055);
          });
          this.noiseBurst(0.16, 0.07, 3400, 'highpass', 0.04);
          this.vibrate('combo');
          break;
        }

        case 'multiplierUp':
          this.tone(523.25 * pitchShift, 783.99 * pitchShift, 0.16, 'sine', 0.09, 0.06);
          break;

        case 'star':
          this.tone(784, 1046.5, 0.1, 'sine', 0.13);
          this.tone(1046.5, 1318.5, 0.12, 'sine', 0.12, 0.06);
          this.tone(1567.98, 1567.98, 0.22, 'triangle', 0.11, 0.12);
          this.vibrate('clear');
          break;

        case 'powerupSelect':
          this.tone(360, 620, 0.12, 'triangle', 0.11);
          this.tone(620, 840, 0.1, 'sine', 0.09, 0.06);
          this.vibrate('pickup');
          break;

        case 'hammer':
          this.tone(150, 58, 0.16, 'triangle', 0.22, 0, 850);
          this.tone(620, 280, 0.11, 'square', 0.07, 0.01, 1800);
          this.noiseBurst(0.14, 0.16, 1400, 'lowpass');
          this.vibrate('explosion');
          break;

        case 'shuffle':
          [320, 420, 540, 680].forEach((f, idx) => {
            this.tone(f, f * 1.15, 0.07, 'triangle', 0.09, idx * 0.045);
          });
          this.noiseBurst(0.15, 0.05, 2600, 'bandpass');
          this.vibrate('place');
          break;

        case 'dynamite':
          this.noiseBurst(0.45, 0.28, 700, 'lowpass');
          this.noiseBurst(0.28, 0.15, 2200, 'bandpass', 0.03);
          this.tone(150, 38, 0.42, 'sawtooth', 0.2, 0, 500);
          this.tone(95, 32, 0.46, 'sine', 0.22);
          this.vibrate('explosion');
          break;

        case 'lightning':
          this.noiseBurst(0.22, 0.18, 3400, 'bandpass');
          this.tone(1180, 260, 0.2, 'sawtooth', 0.13, 0, 3600);
          this.tone(1480, 480, 0.16, 'square', 0.07, 0.04, 2800);
          this.tone(240, 90, 0.22, 'triangle', 0.14, 0.06);
          this.vibrate('lightning');
          break;

        case 'purchase':
          this.tone(659.25, 659.25, 0.08, 'triangle', 0.12);
          this.tone(880, 880, 0.1, 'triangle', 0.12, 0.07);
          this.tone(1318.51, 1318.51, 0.2, 'sine', 0.14, 0.14);
          this.vibrate('clear');
          break;

        case 'achievement':
        case 'streakBonus':
        case 'newBest':
          this.tone(523.25, 523.25, 0.1, 'triangle', 0.13);
          this.tone(659.25, 659.25, 0.1, 'triangle', 0.13, 0.085);
          this.tone(783.99, 783.99, 0.12, 'triangle', 0.14, 0.17);
          this.tone(1046.5, 1046.5, 0.3, 'sine', 0.16, 0.26);
          this.vibrate('achievement');
          break;

        case 'pause':
          this.tone(440, 293.66, 0.14, 'sine', 0.1, 0, 1500);
          break;

        case 'resume':
          this.tone(293.66, 440, 0.14, 'sine', 0.1, 0, 1800);
          break;

        case 'gameover':
          this.tone(392.0, 349.23, 0.22, 'triangle', 0.14);
          this.tone(349.23, 293.66, 0.24, 'triangle', 0.13, 0.19);
          this.tone(293.66, 233.08, 0.26, 'triangle', 0.13, 0.38);
          this.tone(220.0, 146.83, 0.48, 'sine', 0.16, 0.58);
          this.vibrate('gameover');
          break;

        default:
          break;
      }
    },

    setMusicMood(mood, intensity = 1) {
      const validMood = MOOD_DATA[mood] ? mood : 'menu';
      this.musicMood = validMood;
      this.musicIntensity = Math.max(1, intensity);
    },

    playMusicNote(freq, duration, type, gainVal, filterFreq) {
      const ctx = this.ctx;
      if (!ctx || !this.masterGain || ctx.state !== 'running') return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainVal, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.04);
    },

    playMusicTick() {
      const ctx = this.ctx;
      if (!ctx || !this.masterGain || ctx.state !== 'running') return;
      const bufferSize = Math.floor(ctx.sampleRate * 0.03);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const out = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        out[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(4800, ctx.currentTime);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.015, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
      src.connect(hp);
      hp.connect(g);
      g.connect(this.masterGain);
      src.start();
    },

    scheduleNextMusicStep() {
      const s = EB.Storage && EB.Storage.settings;
      if (!s || !s.musicEnabled || this.isPaused || this.musicMood === 'muted') {
        this.musicTimer = null;
        return;
      }

      const moodCfg = MOOD_DATA[this.musicMood] || MOOD_DATA.menu;
      const chordIdx = Math.floor(this.musicStep / 4) % moodCfg.chords.length;
      const noteIdx = this.musicStep % 4;
      const chord = moodCfg.chords[chordIdx];
      const bassNote = moodCfg.bass[chordIdx];

      if (this.ctx && this.ctx.state === 'running') {
        // Bass pulse on beat 0 & 2
        if (noteIdx === 0 || (this.musicMood !== 'menu' && noteIdx === 2)) {
          this.playMusicNote(bassNote, 0.36, 'triangle', 0.032, 420);
        }

        // Melodic arpeggio voice
        const arpNote = chord[noteIdx];
        const arpGain = this.musicMood === 'menu' ? 0.02 : 0.024;
        this.playMusicNote(arpNote, 0.42, 'sine', arpGain, 1600);

        // Warm octave shimmer on high multiplier or power-up mode
        if (this.musicIntensity >= 3 && noteIdx % 2 === 1) {
          this.playMusicNote(arpNote * 2, 0.25, 'sine', 0.012, 2400);
        }

        // Light arcade percussion tick in active gameplay/tension/powerup
        if (this.musicMood !== 'menu' && noteIdx % 2 === 1) {
          this.playMusicTick();
        }
      }

      this.musicStep++;
      const speedBoost = Math.min(80, (this.musicIntensity - 1) * 14);
      const delayMs = Math.max(220, moodCfg.stepMs - speedBoost);
      this.musicTimer = setTimeout(() => this.scheduleNextMusicStep(), delayMs);
    },

    startMusic() {
      const settings = EB.Storage && EB.Storage.settings;
      if (!settings || !settings.musicEnabled || this.isPaused) return;
      if (this.musicTimer) return;
      this.scheduleNextMusicStep();
    },

    stopMusic() {
      if (this.musicTimer) {
        clearTimeout(this.musicTimer);
        this.musicTimer = null;
      }
    },

    syncMusicSetting() {
      const settings = EB.Storage && EB.Storage.settings;
      if (settings && settings.musicEnabled && !this.isPaused && this.musicMood !== 'muted') {
        this.ensureContext();
        this.startMusic();
      } else {
        this.stopMusic();
      }
    },

    onPause() {
      this.isPaused = true;
      this.stopMusic();
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    },

    onResume() {
      this.isPaused = false;
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.syncMusicSetting();
    }
  };

  EB.Audio = AudioSystem;
})(window);
