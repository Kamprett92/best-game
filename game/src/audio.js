// Synthesized sound only: every effect is an oscillator (or a burst of filtered
// noise) through the Web Audio API, so the game ships no audio files at all. The
// context is created on the first user gesture and resumed on later ones, because
// browsers will not let a page start audio before the player has touched it.

const CATCH_BASE = 523.25; // C5; the catch chime climbs a semitone per combo step.
const CATCH_TOP = 1046.5; // C6: the chime never climbs past this.

function midiToFreq(semitones) {
  return CATCH_BASE * 2 ** (semitones / 12);
}

export function createAudio() {
  let context = null;
  let master = null;
  let padNodes = null;

  function ensure() {
    if (context !== null) {
      if (context.state === 'suspended') void context.resume();
      return true;
    }
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (AudioContext === undefined) return false;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.5;
    master.connect(context.destination);
    return true;
  }

  /** A single note: an oscillator with a quick attack and an exponential fade. */
  function tone(freq, start, length, type, volume) {
    if (context === null || master === null) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + length + 0.05);
  }

  /** A short burst of noise through a low-pass filter: the hit thud and the dash whoosh. */
  function noise(start, length, filterFreq, volume) {
    if (context === null || master === null) return;
    const frames = Math.max(1, Math.floor(context.sampleRate * length));
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  /** A soft two-note pad that hums under the game once it has started. */
  function startPad() {
    if (context === null || master === null || padNodes !== null) return;
    const padGain = context.createGain();
    padGain.gain.value = 0.05;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    padGain.connect(filter);
    filter.connect(master);
    const notes = [110, 164.81, 220];
    const oscillators = notes.map((freq) => {
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() - 0.5) * 6;
      osc.connect(padGain);
      osc.start();
      return osc;
    });
    // A slow swell so the pad breathes instead of sitting flat.
    const lfo = context.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = context.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(padGain.gain);
    lfo.start();
    padNodes = { oscillators, lfo };
  }

  return {
    /** Call from any user gesture (start, key press, click): builds the context if needed. */
    unlock() {
      if (ensure()) startPad();
    },

    /** The catch chime: a bright pluck that climbs with the combo multiplier. */
    catch(combo) {
      if (!ensure()) return;
      const now = context.currentTime;
      const steps = Math.min(12, (combo - 1) * 2);
      const freq = Math.min(CATCH_TOP, midiToFreq(steps));
      tone(freq, now, 0.28, 'sine', 0.32);
      tone(freq * 2, now, 0.16, 'triangle', 0.1);
    },

    /** A low thud plus noise when a cinder lands on the keeper. */
    hit() {
      if (!ensure()) return;
      const now = context.currentTime;
      tone(82, now, 0.3, 'sine', 0.55);
      tone(55, now + 0.02, 0.35, 'sawtooth', 0.18);
      noise(now, 0.18, 320, 0.4);
    },

    /** The shield popping: a bright ping instead of the thud. */
    shieldPop() {
      if (!ensure()) return;
      const now = context.currentTime;
      tone(880, now, 0.2, 'triangle', 0.3);
      tone(1318.5, now + 0.06, 0.3, 'sine', 0.22);
    },

    /** A rising three-note arpeggio when a power-up is caught. */
    powerUp() {
      if (!ensure()) return;
      const now = context.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        tone(freq, now + i * 0.07, 0.3, 'triangle', 0.26);
      });
    },

    /** A short fanfare when a new level begins. */
    levelUp() {
      if (!ensure()) return;
      const now = context.currentTime;
      [392, 523.25, 659.25, 783.99].forEach((freq, i) => {
        tone(freq, now + i * 0.09, 0.34, 'square', 0.1);
        tone(freq * 2, now + i * 0.09, 0.2, 'sine', 0.08);
      });
    },

    /** A soft whoosh for the dash. */
    dash() {
      if (!ensure()) return;
      noise(context.currentTime, 0.16, 1400, 0.16);
    },

    /** A descending phrase for game over. */
    gameOver() {
      if (!ensure()) return;
      const now = context.currentTime;
      [392, 329.63, 261.63, 196].forEach((freq, i) => {
        tone(freq, now + i * 0.16, 0.4, 'triangle', 0.24);
      });
    },
  };
}
