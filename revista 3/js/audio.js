/**
 * MOTOR DE MÚSICA AMBIENTAL Y EFECTO DE PAPEL (Web Audio API + MP3 + IndexedDB)
 * Cumple con la Sección 7: Reproducción al abrir revista, fade-in/out suave,
 * pausa automática al reproducir videos de YouTube, carga de MP3 en Modo Editor
 * y sonido discreto opcional de hoja de papel al pasar páginas.
 */
(function () {
  class EditorialAudioEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.isPlaying = false;
      this.isMuted = false;
      this.wasPlayingBeforeVideo = false;
      this.volume = 0.35;
      this.paperSoundEnabled = true;
      this.currentTrackIndex = 0;
      this.synthTimer = null;
      this.activeNodes = [];
      this.audioElement = new Audio();
      this.audioElement.loop = true;
      this.audioElement.crossOrigin = "anonymous";

      this.tracks = [
        {
          id: "ambient-nocturne",
          name: "I. Nocturno Editorial en Re Menor (Ambient Piano)",
          type: "synth",
          tempo: 2600,
          chords: [
            [293.66, 349.23, 440.00, 587.33], // Dm
            [261.63, 329.63, 392.00, 523.25], // C
            [233.08, 293.66, 349.23, 466.16], // Bbmaj7
            [220.00, 277.18, 329.63, 440.00]  // A
          ]
        },
        {
          id: "ambient-clarity",
          name: "II. Preludio de Cámara · Lectura Académica",
          type: "synth",
          tempo: 3000,
          chords: [
            [261.63, 329.63, 392.00, 493.88], // Cmaj7
            [220.00, 261.63, 329.63, 440.00], // Am7
            [174.61, 220.00, 261.63, 349.23], // Fmaj7
            [196.00, 246.94, 293.66, 392.00]  // G
          ]
        },
        {
          id: "ambient-contemplation",
          name: "III. Adagio Minimalista · Reflexión Social",
          type: "synth",
          tempo: 3300,
          chords: [
            [246.94, 293.66, 369.99, 493.88], // Bm
            [196.00, 246.94, 293.66, 392.00], // G
            [293.66, 369.99, 440.00, 587.33], // D
            [220.00, 277.18, 329.63, 440.00]  // A
          ]
        }
      ];

      this.chordStep = 0;
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    }

    startWithFadeIn() {
      this.ensureContext();
      if (this.isPlaying) return;
      this.isPlaying = true;
      const track = this.tracks[this.currentTrackIndex];
      if (!track) return;

      if (track.type === "mp3" && track.url) {
        this.stopSynthLoop();
        this.audioElement.src = track.url;
        this.audioElement.volume = 0;
        this.audioElement.play().catch(() => {});
        this.fadeAudioElementTo(this.isMuted ? 0 : this.volume, 900);
      } else {
        this.audioElement.pause();
        if (this.ctx && this.masterGain) {
          const now = this.ctx.currentTime;
          const target = this.isMuted ? 0.0001 : Math.max(0.01, this.volume * 0.25);
          this.masterGain.gain.cancelScheduledValues(now);
          this.masterGain.gain.setValueAtTime(0.001, now);
          this.masterGain.gain.linearRampToValueAtTime(target, now + 1.4);
          this.startSynthLoop(track);
        }
      }
      this.updateUI();
    }

    pauseWithFadeOut() {
      if (!this.isPlaying) return;
      this.isPlaying = false;
      const track = this.tracks[this.currentTrackIndex];
      if (track && track.type === "mp3") {
        this.fadeAudioElementTo(0, 500, () => this.audioElement.pause());
      } else if (this.ctx && this.masterGain) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
        setTimeout(() => {
          if (!this.isPlaying) this.stopSynthLoop();
        }, 650);
      }
      this.updateUI();
    }

    togglePlay() {
      if (this.isPlaying) {
        this.pauseWithFadeOut();
      } else {
        this.startWithFadeIn();
      }
    }

    pauseForVideo() {
      if (this.isPlaying) {
        this.wasPlayingBeforeVideo = true;
        this.pauseWithFadeOut();
      } else {
        this.wasPlayingBeforeVideo = false;
      }
    }

    resumeAfterVideo() {
      if (this.wasPlayingBeforeVideo) {
        this.wasPlayingBeforeVideo = false;
        this.startWithFadeIn();
      }
    }

    setVolume(val) {
      this.volume = Math.max(0, Math.min(1, parseFloat(val) || 0));
      if (this.volume > 0 && this.isMuted) {
        this.isMuted = false;
      }
      this.applyCurrentVolume();
      this.updateUI();
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      this.applyCurrentVolume();
      this.updateUI();
    }

    applyCurrentVolume() {
      const track = this.tracks[this.currentTrackIndex];
      if (track && track.type === "mp3") {
        this.audioElement.volume = this.isMuted ? 0 : this.volume;
      } else if (this.ctx && this.masterGain) {
        const now = this.ctx.currentTime;
        const target = (!this.isPlaying || this.isMuted) ? 0.0001 : Math.max(0.005, this.volume * 0.25);
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.linearRampToValueAtTime(target, now + 0.25);
      }
    }

    selectTrack(index) {
      const idx = parseInt(index, 10);
      if (isNaN(idx) || idx < 0 || idx >= this.tracks.length) return;
      const wasRunning = this.isPlaying;
      if (wasRunning) {
        this.pauseWithFadeOut();
      }
      this.currentTrackIndex = idx;
      this.chordStep = 0;
      if (wasRunning) {
        setTimeout(() => this.startWithFadeIn(), 300);
      } else {
        this.updateUI();
      }
    }

    addCustomTrack(name, dataUrl) {
      const newTrack = {
        id: "custom-" + Date.now(),
        name: "MP3: " + name,
        type: "mp3",
        url: dataUrl
      };
      this.tracks.push(newTrack);
      this.renderTrackOptions();
      this.selectTrack(this.tracks.length - 1);
      if (!this.isPlaying) {
        this.startWithFadeIn();
      }
    }

    startSynthLoop(track) {
      this.stopSynthLoop();
      const playChord = () => {
        if (!this.isPlaying || !this.ctx) return;
        const chord = track.chords[this.chordStep % track.chords.length];
        this.chordStep++;
        const now = this.ctx.currentTime;

        chord.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const noteGain = this.ctx.createGain();
          osc.type = i === 0 ? "sine" : "triangle";
          osc.frequency.setValueAtTime(freq, now + i * 0.18);

          noteGain.gain.setValueAtTime(0.0001, now + i * 0.18);
          noteGain.gain.linearRampToValueAtTime(0.16 / chord.length, now + i * 0.18 + 0.45);
          noteGain.gain.exponentialRampToValueAtTime(0.0008, now + i * 0.18 + (track.tempo / 1000) * 0.95);

          osc.connect(noteGain);
          noteGain.connect(this.masterGain);
          osc.start(now + i * 0.18);
          osc.stop(now + i * 0.18 + (track.tempo / 1000));
        });
      };

      playChord();
      this.synthTimer = setInterval(playChord, track.tempo);
    }

    stopSynthLoop() {
      if (this.synthTimer) {
        clearInterval(this.synthTimer);
        this.synthTimer = null;
      }
    }

    fadeAudioElementTo(targetVol, durationMs, onComplete) {
      const startVol = this.audioElement.volume;
      const steps = 15;
      const stepTime = durationMs / steps;
      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        const ratio = currentStep / steps;
        this.audioElement.volume = Math.max(0, Math.min(1, startVol + (targetVol - startVol) * ratio));
        if (currentStep >= steps) {
          clearInterval(interval);
          if (onComplete) onComplete();
        }
      }, stepTime);
    }

    /* Sonido discreto y realista de roce de papel al voltear página */
    playPaperFlipSound() {
      if (!this.paperSoundEnabled) return;
      this.ensureContext();
      if (!this.ctx) return;

      const duration = 0.19;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const env = Math.sin((i / bufferSize) * Math.PI);
        data[i] = (Math.random() * 2 - 1) * env * 0.12;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1150, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.8, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.09, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    }

    togglePaperSound() {
      this.paperSoundEnabled = !this.paperSoundEnabled;
      this.updateUI();
      return this.paperSoundEnabled;
    }

    renderTrackOptions() {
      const sel = document.getElementById("audio-track-select");
      if (!sel) return;
      sel.innerHTML = this.tracks
        .map((t, idx) => `<option value="${idx}" ${idx === this.currentTrackIndex ? "selected" : ""}>${t.name}</option>`)
        .join("");
    }

    updateUI() {
      const playBtn = document.getElementById("audio-play-btn");
      const muteBtn = document.getElementById("audio-mute-btn");
      const paperBtn = document.getElementById("audio-paper-btn");
      const slider = document.getElementById("audio-volume-slider");

      if (playBtn) {
        playBtn.innerHTML = this.isPlaying
          ? `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
          : `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
        playBtn.title = this.isPlaying ? "Pausar música ambiental" : "Reproducir música ambiental";
      }

      if (muteBtn) {
        muteBtn.style.opacity = this.isMuted ? "0.45" : "1";
        muteBtn.title = this.isMuted ? "Activar sonido" : "Silenciar música";
      }

      if (paperBtn) {
        paperBtn.style.opacity = this.paperSoundEnabled ? "1" : "0.4";
        paperBtn.title = this.paperSoundEnabled
          ? "Sonido de papel al pasar páginas: ACTIVADO"
          : "Sonido de papel al pasar páginas: DESACTIVADO";
      }

      if (slider) {
        slider.value = this.isMuted ? 0 : this.volume;
      }
    }
  }

  window.EditorialAudio = new EditorialAudioEngine();
})();
