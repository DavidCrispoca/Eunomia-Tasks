// Motor de sonido ambiente de Eunomia — Web Audio API, 100% procedural.
//
// Las capas por eventos (gotas, truenos, crepitar, grillos y viento) están
// adaptadas de Noisebox, licencia MIT (references/noisebox/js/audio.js y
// references/noisebox/package.json). No se usa ningún archivo de audio:
// todo se sintetiza en tiempo real.
//
// Honestidad de diseño: lluvia, tormenta, chimenea y bosque nocturno son
// recreaciones plausibles; cabina, cafetería y Lo-Fi son aproximaciones
// sintéticas, no grabaciones reales.

import type { AmbienceType } from "./types";

const MASTER_GAIN_FACTOR = 0.35;

let audioCtx: AudioContext | null = null;
let currentScene: Scene | null = null;

// ---------------------------------------------------------------- utilidades

type NoiseFill = (data: Float32Array, length: number) => void;

function AudioCtor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  );
}

function getAudioCtx(): AudioContext | null {
  const Ctor = AudioCtor();
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

function fillWhite(data: Float32Array, length: number) {
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
}

/** Paul Kellet (refinado), con la misma normalización que Noisebox. */
function fillPink(data: Float32Array, length: number) {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
}

/** Ruido marrón (paseo aleatorio). `scale` fija la amplitud resultante. */
function fillBrown(scale: number): NoiseFill {
  return (data, length) => {
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * scale;
    }
  };
}

function createNoiseBuffer(
  ctx: AudioContext,
  seconds: number,
  fill: NoiseFill,
  channels = 1,
): AudioBuffer {
  const length = Math.ceil(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(channels, length, ctx.sampleRate);
  for (let ch = 0; ch < channels; ch++) fill(buffer.getChannelData(ch), length);
  return buffer;
}

function loopBuffer(
  ctx: AudioContext,
  destination: AudioNode,
  buffer: AudioBuffer,
): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(destination);
  source.start();
  return source;
}

function stopSources(sources: AudioScheduledSourceNode[]) {
  for (const source of sources) {
    try {
      source.stop();
    } catch {
      // Nunca detenido: ignorar.
    }
    try {
      source.disconnect();
    } catch {
      // Ya desconectado: ignorar.
    }
  }
  sources.length = 0;
}

function levelGain(ctx: AudioContext, destination: AudioNode, level: number) {
  const gain = ctx.createGain();
  gain.gain.value = level;
  gain.connect(destination);
  return gain;
}

interface Layer {
  stop: () => void;
}

interface Scene {
  type: AmbienceType;
  master: GainNode;
  compressor: DynamicsCompressorNode;
  layers: Layer[];
}

// ------------------------------------------------- capas por eventos

function buildRainLayer(ctx: AudioContext, dest: AudioNode): Layer {
  const sources: AudioScheduledSourceNode[] = [];
  let dropletTimer: number | null = null;
  let running = true;

  const bed = createNoiseBuffer(ctx, 6, fillWhite);

  const rainGain = ctx.createGain();
  rainGain.gain.value = 0.7;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 5000;
  band.Q.value = 0.3;
  rainGain.connect(band).connect(dest);
  sources.push(loopBuffer(ctx, rainGain, bed));

  const sizzleGain = ctx.createGain();
  sizzleGain.gain.value = 0.2;
  const high = ctx.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = 9000;
  sizzleGain.connect(high).connect(dest);
  sources.push(loopBuffer(ctx, sizzleGain, bed));

  const scheduleDroplet = () => {
    if (!running) return;
    const t = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const frequency = 2000 + Math.random() * 4000;
    oscillator.frequency.setValueAtTime(frequency, t);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.4, t + 0.04);
    gain.gain.setValueAtTime(Math.max(0.001, 0.03 * Math.random()), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    oscillator.connect(gain).connect(dest);
    oscillator.start(t);
    oscillator.stop(t + 0.07);
    dropletTimer = window.setTimeout(scheduleDroplet, 20 + Math.random() * 80);
  };
  scheduleDroplet();

  return {
    stop() {
      running = false;
      if (dropletTimer !== null) {
        window.clearTimeout(dropletTimer);
        dropletTimer = null;
      }
      stopSources(sources);
    },
  };
}

function buildThunderLayer(ctx: AudioContext, dest: AudioNode): Layer {
  let running = true;
  let timer: number | null = null;
  const active: AudioScheduledSourceNode[] = [];

  const schedule = () => {
    if (!running) return;
    const t = ctx.currentTime;
    const duration = 2 + Math.random() * 3;

    const rumble = ctx.createBufferSource();
    rumble.buffer = createNoiseBuffer(ctx, duration, fillBrown(3.5));
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 150 + Math.random() * 100;
    const rumbleGain = ctx.createGain();
    const intensity = 0.5 + Math.random() * 0.5;
    rumbleGain.gain.setValueAtTime(0.001, t);
    rumbleGain.gain.linearRampToValueAtTime(intensity, t + 0.1);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    rumble.connect(low).connect(rumbleGain).connect(dest);
    rumble.start(t);
    rumble.stop(t + duration + 0.1);

    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = 30 + Math.random() * 20;
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.001, t);
    subGain.gain.linearRampToValueAtTime(0.3 * intensity, t + 0.15);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.8);
    sub.connect(subGain).connect(dest);
    sub.start(t);
    sub.stop(t + duration);

    active.length = 0;
    active.push(rumble, sub);

    timer = window.setTimeout(schedule, 8000 + Math.random() * 25000);
  };

  timer = window.setTimeout(schedule, 3000 + Math.random() * 5000);

  return {
    stop() {
      running = false;
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      stopSources(active);
    },
  };
}

function buildFireLayer(ctx: AudioContext, dest: AudioNode): Layer {
  const sources: AudioScheduledSourceNode[] = [];
  let crackleTimer: number | null = null;
  let running = true;

  const bed = createNoiseBuffer(ctx, 4, fillBrown(3.0));
  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.25;
  const low = ctx.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 500;
  bedGain.connect(low).connect(dest);
  sources.push(loopBuffer(ctx, bedGain, bed));

  const scheduleCrackle = () => {
    if (!running) return;
    const t = ctx.currentTime;
    const duration = 0.01 + Math.random() * 0.04;

    const crackle = ctx.createBufferSource();
    crackle.buffer = createNoiseBuffer(ctx, duration, fillWhite);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 800 + Math.random() * 3000;
    band.Q.value = 1 + Math.random() * 3;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05 + Math.random() * 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration + 0.02);
    crackle.connect(band).connect(gain).connect(dest);
    crackle.start(t);
    crackle.stop(t + duration + 0.05);

    if (Math.random() < 0.08) {
      const popDuration = 0.02 + Math.random() * 0.03;
      const pop = ctx.createBufferSource();
      pop.buffer = createNoiseBuffer(ctx, popDuration, fillWhite);
      const popBand = ctx.createBiquadFilter();
      popBand.type = "bandpass";
      popBand.frequency.value = 300 + Math.random() * 500;
      popBand.Q.value = 2;
      const popGain = ctx.createGain();
      popGain.gain.setValueAtTime(0.3, t);
      popGain.gain.exponentialRampToValueAtTime(0.001, t + popDuration + 0.05);
      pop.connect(popBand).connect(popGain).connect(dest);
      pop.start(t);
      pop.stop(t + popDuration + 0.1);
    }

    crackleTimer = window.setTimeout(scheduleCrackle, 30 + Math.random() * 120);
  };
  scheduleCrackle();

  return {
    stop() {
      running = false;
      if (crackleTimer !== null) {
        window.clearTimeout(crackleTimer);
        crackleTimer = null;
      }
      stopSources(sources);
    },
  };
}

function buildCricketsLayer(ctx: AudioContext, dest: AudioNode): Layer {
  let running = true;
  const timers: (number | null)[] = [null, null, null];
  const voices: AudioScheduledSourceNode[][] = [[], [], []];

  const startCricket = (index: number) => {
    if (!running) return;
    const t = ctx.currentTime;
    const duration = 0.5 + Math.random() * 2;

    const carrier = ctx.createOscillator();
    carrier.type = "sine";
    carrier.frequency.value = 4000 + Math.random() * 2000;

    const modulator = ctx.createOscillator();
    modulator.type = "square";
    modulator.frequency.value = 12 + Math.random() * 8;

    const modulated = ctx.createGain();
    modulated.gain.value = 0;

    const depth = ctx.createGain();
    const depthLevel = 0.06 + Math.random() * 0.04;

    modulator.connect(modulated.gain);
    carrier.connect(modulated).connect(depth);

    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 2 - 1;
    depth.connect(pan).connect(dest);

    depth.gain.setValueAtTime(0.001, t);
    depth.gain.linearRampToValueAtTime(depthLevel, t + 0.05);
    depth.gain.setValueAtTime(depthLevel, t + Math.max(0.1, duration - 0.05));
    depth.gain.linearRampToValueAtTime(0.001, t + duration);

    modulator.start(t);
    carrier.start(t);
    modulator.stop(t + duration);
    carrier.stop(t + duration);

    voices[index].length = 0;
    voices[index].push(modulator, carrier);

    const pause = 300 + Math.random() * 2000;
    timers[index] = window.setTimeout(
      () => startCricket(index),
      duration * 1000 + pause,
    );
  };

  for (let index = 0; index < 3; index++) startCricket(index);

  return {
    stop() {
      running = false;
      for (const timer of timers) {
        if (timer !== null) window.clearTimeout(timer);
      }
      timers[0] = null;
      timers[1] = null;
      timers[2] = null;
      for (const voice of voices) stopSources(voice);
    },
  };
}

function buildWindLayer(ctx: AudioContext, dest: AudioNode): Layer {
  const nodes: AudioScheduledSourceNode[] = [];

  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 800;
  band.Q.value = 0.5;

  const sweep = ctx.createOscillator();
  sweep.type = "sine";
  sweep.frequency.value = 0.04 + Math.random() * 0.04;
  const sweepGain = ctx.createGain();
  sweepGain.gain.value = 500;
  sweep.connect(sweepGain).connect(band.frequency);
  sweep.start();
  nodes.push(sweep);

  const gust = ctx.createOscillator();
  gust.type = "sine";
  gust.frequency.value = 0.025;
  const gustDepth = ctx.createGain();
  gustDepth.gain.value = 0.2;
  const mainGain = ctx.createGain();
  mainGain.gain.value = 0.7;
  gust.connect(gustDepth).connect(mainGain.gain);
  gust.start();
  nodes.push(gust);

  mainGain.connect(band).connect(dest);
  nodes.push(loopBuffer(ctx, mainGain, createNoiseBuffer(ctx, 6, fillWhite)));

  return {
    stop() {
      stopSources(nodes);
    },
  };
}

// ------------------------------------- capas estáticas (bucle + filtros)

function createFilterChain(
  ctx: AudioContext,
  type: "cabin" | "white" | "brown" | "lofi" | "coffee",
): BiquadFilterNode[] {
  const first = ctx.createBiquadFilter();
  const second = ctx.createBiquadFilter();
  const third = ctx.createBiquadFilter();

  switch (type) {
    case "cabin":
      first.type = "lowpass";
      first.frequency.value = 180;
      first.Q.value = 1.2;
      second.type = "lowpass";
      second.frequency.value = 400;
      second.Q.value = 0.8;
      third.type = "highpass";
      third.frequency.value = 40;
      third.Q.value = 0.7;
      return [first, second, third];
    case "white":
      first.type = "lowpass";
      first.frequency.value = 4000;
      first.Q.value = 0.5;
      return [first];
    case "brown":
      first.type = "lowpass";
      first.frequency.value = 150;
      first.Q.value = 0.7;
      return [first];
    case "lofi":
      first.type = "lowpass";
      first.frequency.value = 3000;
      first.Q.value = 0.8;
      second.type = "highpass";
      second.frequency.value = 80;
      second.Q.value = 0.5;
      return [first, second];
    case "coffee":
      first.type = "lowpass";
      first.frequency.value = 2000;
      first.Q.value = 0.6;
      second.type = "highpass";
      second.frequency.value = 100;
      second.Q.value = 0.5;
      return [first, second];
    default:
      return [];
  }
}

function buildStaticLayer(
  ctx: AudioContext,
  dest: AudioNode,
  buffer: AudioBuffer,
  filters: BiquadFilterNode[],
): Layer {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const gain = ctx.createGain();
  gain.gain.value = 1;

  let node: AudioNode = source;
  for (const filter of filters) {
    node.connect(filter);
    node = filter;
  }
  node.connect(gain).connect(dest);
  source.start();

  return {
    stop() {
      stopSources([source]);
      try {
        gain.disconnect();
      } catch {
        // Ya desconectado: ignorar.
      }
    },
  };
}

// ----------------------------------------------------------- bafúferes

function createPinkNoiseBuffer(ctx: AudioContext, seconds = 4): AudioBuffer {
  return createNoiseBuffer(ctx, seconds, fillPink);
}

function createBrownNoiseBuffer(
  ctx: AudioContext,
  seconds = 4,
  scale = 0.15,
): AudioBuffer {
  return createNoiseBuffer(ctx, seconds, fillBrown(scale));
}

function createWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
  return createNoiseBuffer(ctx, 2, (data, length) => {
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * 0.08;
  });
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
    sample += (Math.random() * 2 - 1) * 0.003;
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
    const chord =
      Math.sin(2 * Math.PI * 220 * t) * 0.003 +
      Math.sin(2 * Math.PI * 330 * t) * 0.002;

    output[i] =
      (pinkData[i] * 0.3 + vinylData[i] + beat + subBass + chord) * 0.4;
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

  // Pasada 2: eventos (tazas, voces, molino) mezclados encima.
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
        output[i + v] +=
          Math.sin(2 * Math.PI * (150 + Math.random() * 200) * (v / ctx.sampleRate)) *
          decay *
          0.003;
      }
    }
    if (Math.random() < 0.00003) {
      const grindLen = Math.floor(Math.random() * ctx.sampleRate * 0.3);
      for (let g = 0; g < grindLen && i + g < bufferSize; g++) {
        output[i + g] +=
          (Math.random() * 2 - 1) * 0.02 * Math.exp(-g * 0.02);
      }
    }
  }
  return buffer;
}

function createFlightCabinBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 8;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);

  const pink = createPinkNoiseBuffer(ctx);
  const pinkData = pink.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    const t = i / ctx.sampleRate;
    const engineTone = Math.sin(2 * Math.PI * 55 * t) * 0.02;
    const engineHarmonic = Math.sin(2 * Math.PI * 110 * t) * 0.01;
    const engineRumble = Math.sin(2 * Math.PI * 27.5 * t) * 0.015;
    const windMod = 0.8 + 0.2 * Math.sin(2 * Math.PI * 0.15 * t);

    output[i] = (pinkData[i] + engineTone + engineHarmonic + engineRumble) * windMod;
  }
  return buffer;
}

// ------------------------------------------------------------- escenas

function buildScene(
  ctx: AudioContext,
  master: GainNode,
  type: AmbienceType,
): Layer[] {
  const layers: Layer[] = [];

  switch (type) {
    case "storm":
      layers.push(buildRainLayer(ctx, levelGain(ctx, master, 0.9)));
      layers.push(buildThunderLayer(ctx, levelGain(ctx, master, 0.7)));
      layers.push(buildWindLayer(ctx, levelGain(ctx, master, 0.5)));
      break;
    case "rain":
      layers.push(buildRainLayer(ctx, levelGain(ctx, master, 0.9)));
      layers.push(buildWindLayer(ctx, levelGain(ctx, master, 0.3)));
      break;
    case "fireplace":
      layers.push(buildFireLayer(ctx, levelGain(ctx, master, 1.0)));
      break;
    case "forest-night":
      layers.push(buildCricketsLayer(ctx, levelGain(ctx, master, 1.0)));
      layers.push(buildWindLayer(ctx, levelGain(ctx, master, 0.5)));
      layers.push(
        buildStaticLayer(
          ctx,
          levelGain(ctx, master, 0.12),
          createBrownNoiseBuffer(ctx, 4, 3.5),
          [],
        ),
      );
      break;
    case "cabin":
      layers.push(
        buildStaticLayer(
          ctx,
          master,
          createFlightCabinBuffer(ctx),
          createFilterChain(ctx, "cabin"),
        ),
      );
      break;
    case "coffee":
      layers.push(
        buildStaticLayer(
          ctx,
          master,
          createCoffeeShopBuffer(ctx),
          createFilterChain(ctx, "coffee"),
        ),
      );
      break;
    case "lofi":
      layers.push(
        buildStaticLayer(
          ctx,
          master,
          createLoFiBuffer(ctx),
          createFilterChain(ctx, "lofi"),
        ),
      );
      break;
    case "white":
      layers.push(
        buildStaticLayer(
          ctx,
          master,
          createWhiteNoiseBuffer(ctx),
          createFilterChain(ctx, "white"),
        ),
      );
      break;
    case "brown":
      layers.push(
        buildStaticLayer(
          ctx,
          master,
          createBrownNoiseBuffer(ctx),
          createFilterChain(ctx, "brown"),
        ),
      );
      break;
    default:
      break;
  }

  return layers;
}

// ------------------------------------------------------------------ API

function setMasterVolume(volume: number, ctx: AudioContext) {
  if (!currentScene) return;
  currentScene.master.gain.setTargetAtTime(
    volume * MASTER_GAIN_FACTOR,
    ctx.currentTime,
    0.05,
  );
}

export function playBackgroundAudio(type: AmbienceType, volume: number) {
  if (type === "none") {
    stopBackgroundAudio();
    return;
  }

  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => undefined);
  }

  // La misma escena ya suena: solo refresca el volumen (evita duplicados).
  if (currentScene && currentScene.type === type) {
    setMasterVolume(volume, ctx);
    return;
  }

  stopBackgroundAudio();

  const master = ctx.createGain();
  master.gain.value = volume * MASTER_GAIN_FACTOR;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 30;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
  master.connect(compressor);
  compressor.connect(ctx.destination);

  const layers = buildScene(ctx, master, type);
  if (layers.length === 0) {
    master.disconnect();
    compressor.disconnect();
    return;
  }

  currentScene = { type, master, compressor, layers };
}

export function updateAudioVolume(volume: number) {
  const ctx = getAudioCtx();
  if (!ctx || !currentScene) return;
  setMasterVolume(volume, ctx);
}

export function stopBackgroundAudio() {
  if (!currentScene) return;
  const scene = currentScene;
  currentScene = null;
  for (const layer of scene.layers) layer.stop();
  try {
    scene.master.disconnect();
  } catch {
    // Ya desconectado: ignorar.
  }
  try {
    scene.compressor.disconnect();
  } catch {
    // Ya desconectado: ignorar.
  }
}

export function playChimeSound(type: "complete" | "start" | "pause" = "complete") {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
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
      for (const [frequency, offset, duration] of notes) {
        const oscillator = ctx.createOscillator();
        const noteGain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        noteGain.gain.setValueAtTime(0, now + offset);
        noteGain.gain.linearRampToValueAtTime(0.15, now + offset + 0.01);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + offset + duration);
        oscillator.connect(noteGain).connect(gain);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + duration + 0.1);
      }
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    } else if (type === "start") {
      const oscillator = ctx.createOscillator();
      const noteGain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 659.25;
      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(0.2, now + 0.01);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      oscillator.connect(noteGain).connect(gain);
      oscillator.start(now);
      oscillator.stop(now + 0.35);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    } else {
      const first = ctx.createOscillator();
      const second = ctx.createOscillator();
      const noteGain = ctx.createGain();
      first.type = "sine";
      first.frequency.value = 523.25;
      second.type = "sine";
      second.frequency.value = 415.3;
      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(0.18, now + 0.01);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      first.connect(noteGain).connect(gain);
      second.connect(noteGain);
      first.start(now);
      first.stop(now + 0.3);
      second.start(now + 0.05);
      second.stop(now + 0.35);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    }
  } catch {
    // Audio is a nice-to-have; never break the timer.
  }
}
