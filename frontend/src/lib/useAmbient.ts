import { useEffect, useRef, useState } from "react";

/**
 * Authentic Acoustic Felt-Piano & Chamber Ambience (Web Audio API).
 *
 * Designed to sound like an intimate, felted classical grand piano in a quiet hall,
 * completely avoiding electronic or buzzy synthesizer artifacts.
 *
 * Acoustic modeling techniques:
 * 1. Multi-harmonic additive synthesis (fundamental + warm 2nd/3rd overtones).
 * 2. Soft felt hammer-strike transient (filtered physical impulse).
 * 3. Wood soundboard body resonance (biquad warm low-pass filter).
 * 4. Stereo algorithmic chamber reverb (synthetic impulse response).
 * 5. Humanized micro-timing and expressive velocity variation.
 *
 * Classical piece: Erik Satie / J.S. Bach inspired contemplative nocturne in G / C.
 */

// Classical chord progression: [Bass, Chord tones, Melody peak]
interface ClassicalVoicing {
  bass: number;        // Deep resonance (Hz)
  chord: number[];     // Warm mid-register piano chord (Hz)
  melody: number;      // Delicate high acoustic note (Hz)
  durationSec: number; // Time before next bar
}

const NOCTURNE: ClassicalVoicing[] = [
  // Bar 1: Gmaj7 (Satie Gymnopédie feel) - warm and comforting
  { bass: 98.00,  chord: [196.00, 246.94, 293.66, 369.99], melody: 493.88, durationSec: 3.8 },
  // Bar 2: D7sus2 / C
  { bass: 130.81, chord: [196.00, 220.00, 293.66, 329.63], melody: 440.00, durationSec: 3.8 },
  // Bar 3: Em9 (gentle melancholy, deep reflection)
  { bass: 82.41,  chord: [164.81, 246.94, 329.63, 392.00], melody: 493.88, durationSec: 3.8 },
  // Bar 4: Bm7 / D
  { bass: 110.00, chord: [146.83, 220.00, 293.66, 369.99], melody: 440.00, durationSec: 3.8 },
  // Bar 5: Cmaj9 (warm affirmation)
  { bass: 65.41,  chord: [164.81, 246.94, 329.63, 392.00], melody: 523.25, durationSec: 4.0 },
  // Bar 6: G/B (peaceful resolution)
  { bass: 123.47, chord: [196.00, 246.94, 293.66, 392.00], melody: 392.00, durationSec: 3.8 },
  // Bar 7: Am7 (tender forward motion)
  { bass: 110.00, chord: [174.61, 220.00, 261.63, 329.63], melody: 440.00, durationSec: 3.8 },
  // Bar 8: D9sus4 -> G (soft gentle close)
  { bass: 73.42,  chord: [146.83, 196.00, 246.94, 369.99], melody: 392.00, durationSec: 4.4 },
];

/** Generate a realistic, warm stereo acoustic hall impulse response */
function createHallReverbBuffer(ctx: AudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = rate * 2.8; // 2.8 second decay tail
  const buffer = ctx.createBuffer(2, length, rate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const decay = Math.exp(-i / (rate * 0.72));
    left[i] = (Math.random() * 2 - 1) * decay;
    right[i] = (Math.random() * 2 - 1) * decay;
  }
  return buffer;
}

/**
 * Synthesize a single acoustic piano tone with physical hammer strike and wood body resonance.
 */
function playAcousticPianoTone(
  ctx: AudioContext,
  reverbNode: ConvolverNode,
  masterGain: GainNode,
  frequency: number,
  startTime: number,
  velocity: number = 0.5,
  isBass: boolean = false
) {
  const now = startTime;
  const decayTime = isBass ? 3.6 : 2.4;

  // 1. Wood Soundboard Filter (removes any harsh/electronic highs)
  const soundboardFilter = ctx.createBiquadFilter();
  soundboardFilter.type = "lowpass";
  soundboardFilter.frequency.setValueAtTime(isBass ? 850 : 1300, now);
  soundboardFilter.Q.setValueAtTime(1.1, now);

  // Note Gain Envelope
  const noteGain = ctx.createGain();
  const peakVolume = velocity * (isBass ? 0.045 : 0.028);

  // Piano felt strike attack: instant attack (4ms) followed by natural exponential decay
  noteGain.gain.setValueAtTime(0.0001, now);
  noteGain.gain.linearRampToValueAtTime(peakVolume, now + 0.008);
  noteGain.gain.exponentialRampToValueAtTime(peakVolume * 0.35, now + 0.35);
  noteGain.gain.exponentialRampToValueAtTime(0.00001, now + decayTime);

  // 2. Fundamental string frequency
  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(frequency, now);

  // 3. Second harmonic (gives physical body and depth, decays faster)
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(frequency * 2, now);
  const osc2Gain = ctx.createGain();
  osc2Gain.gain.setValueAtTime(0.3, now);
  osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + (decayTime * 0.45));

  // 4. Subtle felt-hammer thump transient (organic percussive attack)
  const hammerNoise = ctx.createOscillator();
  hammerNoise.type = "sine";
  hammerNoise.frequency.setValueAtTime(frequency * 0.5, now);
  const hammerGain = ctx.createGain();
  hammerGain.gain.setValueAtTime(peakVolume * 0.4, now);
  hammerGain.gain.exponentialRampToValueAtTime(0.00001, now + 0.035);

  // Connections
  osc1.connect(noteGain);
  osc2.connect(osc2Gain);
  osc2Gain.connect(noteGain);
  hammerNoise.connect(hammerGain);
  hammerGain.connect(noteGain);

  noteGain.connect(soundboardFilter);

  // Route part dry to master, and part into the lush acoustic hall reverb
  const wetGain = ctx.createGain();
  wetGain.gain.setValueAtTime(0.48, now);

  const dryGain = ctx.createGain();
  dryGain.gain.setValueAtTime(0.72, now);

  soundboardFilter.connect(dryGain);
  dryGain.connect(masterGain);

  soundboardFilter.connect(wetGain);
  wetGain.connect(reverbNode);

  // Start & stop nodes
  osc1.start(now);
  osc2.start(now);
  hammerNoise.start(now);

  const stopTime = now + decayTime + 0.1;
  osc1.stop(stopTime);
  osc2.stop(stopTime);
  hammerNoise.stop(now + 0.05);
}

export function useAmbientMusic() {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const reverbRef = useRef<ConvolverNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const stopRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barIndex = useRef(0);

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopAll() {
    stopRef.current = true;
    clearTimer();
    setPlaying(false);
  }

  function scheduleBar(ctx: AudioContext, startTime: number) {
    if (stopRef.current || !reverbRef.current || !masterGainRef.current) return;

    const bar = NOCTURNE[barIndex.current % NOCTURNE.length];
    barIndex.current++;

    const reverb = reverbRef.current;
    const master = masterGainRef.current;

    // 1. Deep acoustic piano bass note on the downbeat
    playAcousticPianoTone(ctx, reverb, master, bar.bass, startTime, 0.75, true);

    // 2. Middle register felt chord: soft, slightly rolled (arpeggiated) like a real pianist's hand
    bar.chord.forEach((freq, idx) => {
      // Natural humanized timing offset (18-24ms between fingers)
      const fingerDelay = 0.35 + idx * 0.18 + (Math.random() * 0.02 - 0.01);
      const velocity = 0.42 + (Math.random() * 0.08 - 0.04);
      playAcousticPianoTone(ctx, reverb, master, freq, startTime + fingerDelay, velocity, false);
    });

    // 3. Delicate melodic peak note singing over the chord
    const melodyDelay = 1.35 + (Math.random() * 0.03);
    playAcousticPianoTone(ctx, reverb, master, bar.melody, startTime + melodyDelay, 0.58, false);

    // Subtle gentle secondary harmony note
    const secondEcho = 2.45;
    playAcousticPianoTone(ctx, reverb, master, bar.chord[1], startTime + secondEcho, 0.32, false);

    // Schedule next bar
    const nextStartTime = startTime + bar.durationSec;
    const waitMs = (nextStartTime - ctx.currentTime) * 1000 - 100;

    timerRef.current = setTimeout(() => {
      if (!stopRef.current && ctxRef.current) {
        scheduleBar(ctxRef.current, nextStartTime);
      }
    }, Math.max(0, waitMs));
  }

  async function toggle(): Promise<void> {
    if (playing) {
      stopAll();
      return;
    }

    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      ctxRef.current = ctx;

      // Master output gain
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.85, ctx.currentTime);
      master.connect(ctx.destination);
      masterGainRef.current = master;

      // Concert Hall Reverb convolver
      const convolver = ctx.createConvolver();
      convolver.buffer = createHallReverbBuffer(ctx);
      convolver.connect(master);
      reverbRef.current = convolver;
    }

    const ctx = ctxRef.current;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    stopRef.current = false;
    setPlaying(true);
    scheduleBar(ctx, ctx.currentTime + 0.08);
  }

  useEffect(() => () => stopAll(), []);

  return { playing, toggle };
}
