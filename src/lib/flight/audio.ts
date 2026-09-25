// Sonido ambiente generado con Web Audio API.
// Portado de PomodoroFlight (src/utils/audio.ts): ruido rosa + filtro.

import type { AmbienceType } from "./types";

let audioCtx: AudioContext | null = null;
let currentOsc: AudioBufferSourceNode | null = null;
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
  const bufferSize = ctx.sampleRate * 2;
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

export function playBackgroundAudio(type: AmbienceType, volume: number) {
  stopBackgroundAudio();
  if (type === "none") return;

  const ctx = initAudio();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => undefined);
  }

  const bufferSource = ctx.createBufferSource();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  bufferSource.buffer = createPinkNoiseBuffer(ctx);
  bufferSource.loop = true;

  if (type === "engine") {
    filter.type = "lowpass";
    filter.frequency.value = 200;
  } else if (type === "rain") {
    filter.type = "lowpass";
    filter.frequency.value = 800;
  } else {
    filter.type = "lowpass";
    filter.frequency.value = 3000;
  }

  gainNode.gain.value = volume * 0.5;

  bufferSource.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  bufferSource.start();

  currentOsc = bufferSource;
  currentGain = gainNode;
}

export function updateAudioVolume(volume: number) {
  const ctx = initAudio();
  if (currentGain && ctx) {
    currentGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.1);
  }
}

export function stopBackgroundAudio() {
  if (currentOsc) {
    currentOsc.stop();
    currentOsc.disconnect();
    currentOsc = null;
  }
  if (currentGain) {
    currentGain.disconnect();
    currentGain = null;
  }
}