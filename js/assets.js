// Loads textures, models and sounds with one progress bar.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const manager = new THREE.LoadingManager();
const texLoader = new THREE.TextureLoader(manager);
const gltfLoader = new GLTFLoader(manager);
const cache = new Map();
let maxAniso = 4;

export function setAnisotropy(n) { maxAniso = n; }

/** A texture from assets/textures. colour = sRGB albedo (true) or data (false). */
export function tex(name, { colour = true, repeat = true, flipY = true } = {}) {
  const key = name + (colour ? ':c' : ':d') + (flipY ? '' : ':nf');
  if (cache.has(key)) return cache.get(key);
  const t = texLoader.load('assets/textures/' + name);
  t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso;
  t.flipY = flipY;
  cache.set(key, t);
  return t;
}

export function model(name) {
  if (window.RCR_EMBED_MODELS) {
    // hosts that cannot serve .glb files get each model as a small JS module holding base64
    const key = 'assets/models/' + name + '.js';
    manager.itemStart(key);
    return import('../' + key).then((m) => {
      const bin = atob(m.default);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return gltfLoader.parseAsync(bytes.buffer, 'assets/models/');
    }).finally(() => manager.itemEnd(key));
  }
  return gltfLoader.loadAsync('assets/models/' + name);
}

/** Raw bytes for the audio system (decoded later, after the player taps Start). */
export function bytes(path) {
  manager.itemStart(path);
  return fetch(path).then((r) => r.arrayBuffer()).finally(() => manager.itemEnd(path));
}
