// Sonido ambiente generado con Web Audio API.
// PomodoroFlight - Sound design inspired by PomodoroFlight project.

import type { AmbienceType } from "./types";

let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentGain: GainNode | null = null;

function AudioCtor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  );
}

function initAudio(): AudioContext | null {
  const Ctor = AudioCtor();
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

function createPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    output[i] *= 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

function createBrownNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);

  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    output[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = output[i];
    output[i] *= 0.15;
  }
  return buffer;
}

function createVinylCrackleBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 8;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    let sample = 0;
    if (Math.random() < 0.0008) {
      const crackleLen = Math.floor(Math.random() * ctx.sampleRate * 0.05);
      for (let c = 0; c < crackleLen && i + c < bufferSize; c++) {
        const decay = Math.exp(-c * 0.02);
        output[i + c] += (Math.random() * 2 - 1) * decay * 0.02;
      }
    }
    if (Math.random() < 0.00005) {
      const popLen = Math.floor(Math.random() * ctx.sampleRate * 0.02);
      for (let p = 0; p < popLen && i + p < bufferSize; p++) {
        const decay = Math.exp(-p * 0.05);
        output[i + p] += (Math.random() * 2 - 1) * decay * 0.05;
      }
    }
    const white = Math.random() * 2 - 1;
    sample += white * 0.003;
    output[i] += sample;
  }
  return buffer;
}

function createLoFiBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 8;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);

  const pink = createPinkNoiseBuffer(ctx);
  const pinkData = pink.getChannelData(0);
  const vinyl = createVinylCrackleBuffer(ctx);
  const vinylData = vinyl.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const t = i / ctx.sampleRate;
    const beat = Math.sin(2 * Math.PI * 1.5 * t) * 0.008;
    const subBass = Math.sin(2 * Math.PI * 60 * t) * 0.005;
    const chord = Math.sin(2 * Math.PI * 220 * t) * 0.003 + Math.sin(2 * Math.PI * 330 * t) * 0.002;
    
    output[i] = (pinkData[i] * 0.3 + vinylData[i] + beat + subBass + chord) * 0.4;
  }
  return buffer;
}

function createCoffeeShopBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 10;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);

  const pink = createPinkNoiseBuffer(ctx);
  const pinkData = pink.getChannelData(0);

  // Pasada 1: lecho de ruido de fondo + zumbido eléctrico.
  for (let i = 0; i < bufferSize; i++) {
    const t = i / ctx.sampleRate;
    const acHum = Math.sin(2 * Math.PI * 60 * t) * 0.002;
    output[i] = pinkData[i] * 0.15 + acHum;
  }

  // Pasada 2:events (tazas, voces, molino) mezclados encima.
  for (let i = 0; i < bufferSize; i++) {
    if (Math.random() < 0.0002) {
      const cupLen = Math.floor(Math.random() * ctx.sampleRate * 0.1);
      for (let c = 0; c < cupLen && i + c < bufferSize; c++) {
        const decay = Math.exp(-c * 0.03);
        output[i + c] += (Math.random() * 2 - 1) * decay * 0.01;
      }
    }
    if (Math.random() < 0.00008) {
      const voiceLen = Math.floor(Math.random() * ctx.sampleRate * 0.5);
      for (let v = 0; v < voiceLen && i + v < bufferSize; v++) {
        const decay = Math.exp(-v * 0.01);
        output[i + v] += Math.sin(2 * Math.PI * (150 + Math.random() * 200) * (v / ctx.sampleRate)) * decay * 0.003;
      }
    }
    if (Math.random() < 0.00003) {
      const grindLen = Math.floor(Math.random() * ctx.sampleRate * 0.3);
      for (let g = 0; g < grindLen && i + g < bufferSize; g++) {
        output[i + g] += (Math.random() * 2 - 1) * 0.02 * Math.exp(-g * 0.02);
      }
    }
  }
  return buffer;
}

function createFireplaceBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 8;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);

  // Lecho: rugido grave + crepitar fino.
  let b0 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = (b0 + 0.02 * white) / 1.02;
    const roar = Math.sin((2 * Math.PI * 30 * i) / ctx.sampleRate) * 0.01;
    output[i] = (b0 * 0.5 + white * 0.006 + roar) * 0.5;
  }

  // Chispas: se generan una vez y se suman (evita coste O(n) por muestra).
  const sparkCount = Math.floor(bufferSize / 900);
  for (let s = 0; s < sparkCount; s++) {
    const start = Math.floor(Math.random() * bufferSize);
    const len = Math.floor(ctx.sampleRate * (0.01 + Math.random() * 0.05));
    const amp = 0.01 + Math.random() * 0.02;
    for (let c = 0; c < len && start + c < bufferSize; c++) {
      const decay = Math.exp(-c * 0.01);
      output[start + c] += (Math.random() * 2 - 1) * decay * amp;
    }
  }

  return buffer;
}

function createFlightCabinBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 8;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    let pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    pink *= 0.08;
    b6 = white * 0.115926;

    const t = i / ctx.sampleRate;
    const engineTone = Math.sin(2 * Math.PI * 55 * t) * 0.02;
    const engineHarmonic = Math.sin(2 * Math.PI * 110 * t) * 0.01;
    const engineRumble = Math.sin(2 * Math.PI * 27.5 * t) * 0.015;
    const windMod = 0.8 + 0.2 * Math.sin(2 * Math.PI * 0.15 * t);

    output[i] = (pink + engineTone + engineHarmonic + engineRumble) * windMod;
  }
  return buffer;
}

function createRainBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 6;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    let sample = 0;
    for (let d = 0; d < 12; d++) {
      const dropTime = Math.random() * bufferSize;
      const decay = Math.exp(-(i - dropTime) * 0.003);
      if (i > dropTime && decay > 0.001) {
        sample += (Math.random() * 2 - 1) * decay * 0.03;
      }
    }
    const white = Math.random() * 2 - 1;
    sample += white * 0.015;
    output[i] = sample;
  }
  return buffer;
}

function createWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = (Math.random() * 2 - 1) * 0.08;
  }
  return buffer;
}

function applyFilterChain(ctx: AudioContext, type: AmbienceType) {
  const filter1 = ctx.createBiquadFilter();
  const filter2 = ctx.createBiquadFilter();
  const filter3 = ctx.createBiquadFilter();

  switch (type) {
    case "cabin":
      filter1.type = "lowpass";
      filter1.frequency.value = 180;
      filter1.Q.value = 1.2;
      filter2.type = "lowpass";
      filter2.frequency.value = 400;
      filter2.Q.value = 0.8;
      filter3.type = "highpass";
      filter3.frequency.value = 40;
      filter3.Q.value = 0.7;
      return [filter1, filter2, filter3];
    case "rain":      filter1.type = "lowpass";
      filter1.frequency.value = 1200;
      filter1.Q.value = 0.7;
      filter2.type = "highpass";
      filter2.frequency.value = 200;
      filter2.Q.value = 0.5;
      return [filter1, filter2];
    case "white":
      filter1.type = "lowpass";
      filter1.frequency.value = 4000;
      filter1.Q.value = 0.5;
      return [filter1];
    case "brown":
      filter1.type = "lowpass";
      filter1.frequency.value = 150;
      filter1.Q.value = 0.7;
      return [filter1];
    case "lofi":
      filter1.type = "lowpass";
      filter1.frequency.value = 3000;
      filter1.Q.value = 0.8;
      filter2.type = "highpass";
      filter2.frequency.value = 80;
      filter2.Q.value = 0.5;
      return [filter1, filter2];
    case "coffee":
      filter1.type = "lowpass";
      filter1.frequency.value = 2000;
      filter1.Q.value = 0.6;
      filter2.type = "highpass";
      filter2.frequency.value = 100;
      filter2.Q.value = 0.5;
      return [filter1, filter2];
    case "fireplace":
      filter1.type = "lowpass";
      filter1.frequency.value = 800;
      filter1.Q.value = 0.7;
      filter2.type = "highpass";
      filter2.frequency.value = 60;
      filter2.Q.value = 0.5;
      return [filter1, filter2];
    default:
      return [];
  }
}

export function playBackgroundAudio(type: AmbienceType, volume: number) {
  stopBackgroundAudio();
  if (type === "none") return;

  const ctx = initAudio();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => undefined);
  }

  let buffer: AudioBuffer;
  switch (type) {
    case "cabin":
      buffer = createFlightCabinBuffer(ctx);
      break;
    case "rain":
      buffer = createRainBuffer(ctx);
      break;
    case "white":
      buffer = createWhiteNoiseBuffer(ctx);
      break;
    case "brown":
      buffer = createBrownNoiseBuffer(ctx);
      break;
    case "lofi":
      buffer = createLoFiBuffer(ctx);
      break;
    case "coffee":
      buffer = createCoffeeShopBuffer(ctx);
      break;
    case "fireplace":
      buffer = createFireplaceBuffer(ctx);
      break;
    default:
      buffer = createPinkNoiseBuffer(ctx);
  }

  const bufferSource = ctx.createBufferSource();
  const gainNode = ctx.createGain();
  const filters = applyFilterChain(ctx, type);

  bufferSource.buffer = buffer;
  bufferSource.loop = true;

  let lastNode: AudioNode = bufferSource;
  for (const filter of filters) {
    lastNode.connect(filter);
    lastNode = filter;
  }
  lastNode.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.value = volume * 0.35;

  bufferSource.start();

  currentSource = bufferSource;
  currentGain = gainNode;
}

export function updateAudioVolume(volume: number) {
  const ctx = initAudio();
  if (currentGain && ctx) {
    currentGain.gain.linearRampToValueAtTime(volume * 0.35, ctx.currentTime + 0.1);
  }
}

export function stopBackgroundAudio() {
  if (currentSource) {
    currentSource.stop();
    currentSource.disconnect();
    currentSource = null;
  }
  if (currentGain) {
    currentGain.disconnect();
    currentGain = null;
  }
}

export function playChimeSound(type: "complete" | "start" | "pause" = "complete") {
  try {
    const Ctx = AudioCtor();
    if (!Ctx) return;
    const ctx = new Ctx();
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => undefined);
    }
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    if (type === "complete") {
      const notes: Array<[number, number, number]> = [
        [523.25, 0, 0.4],
        [659.25, 0.15, 0.4],
        [783.99, 0.3, 0.5],
        [1046.5, 0.45, 0.6],
      ];
      for (const [freq, offset, dur] of notes) {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        noteGain.gain.setValueAtTime(0, now + offset);
        noteGain.gain.linearRampToValueAtTime(0.15, now + offset + 0.01);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + offset + dur);
        osc.connect(noteGain).connect(gain);
        osc.start(now + offset);
        osc.stop(now + offset + dur + 0.1);
      }
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    } else if (type === "start") {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 659.25;
      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(0.2, now + 0.01);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(noteGain).connect(gain);
      osc.start(now);
      osc.stop(now + 0.35);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    } else if (type === "pause") {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.value = 523.25;
      osc2.type = "sine";
      osc2.frequency.value = 415.3;
      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(0.18, now + 0.01);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(noteGain).connect(gain);
      osc2.connect(noteGain).connect(gain);
      osc1.start(now);
      osc1.stop(now + 0.3);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.35);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    }
  } catch {
    // Audio is a nice-to-have; never break the timer.
  }
}
