// Damru '26 Fest Ride: sets up the renderer and the orange dusk light, loads everything, and
// runs the game loop (walking, riding the camel, driving the e-cart, fest missions, the race,
// finding places).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Missions } from './missions.js';
import { manager, setAnisotropy } from './assets.js';
import { makeMaterials } from './materials.js';
import { buildWorld, addCarMaterials } from './world.js';
import { buildTrees, wind } from './trees.js';
import { loadPeople, applySeat } from './characters.js';
import { Camel, pushOut } from './camel.js';
import { Cart } from './cart.js';
import { Input } from './input.js';
import { Hud } from './hud.js';
import { GameAudio } from './audio.js';
import { Crowd } from './npc.js';
import { SPAWN, PLACES, DHOL, STAGE, MIDDLE_GROUND } from './layout.js';
import { clamp, damp, dampAngle, isTouch } from './util.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
};

// ---------------------------------------------------------------- quality
const qualityChoice = store.get('rcr-quality') || params.get('q') || 'auto';
const touch = isTouch();
function pickQuality(choice) {
  if (choice !== 'auto') return choice;
  if (touch) {
    const mem = navigator.deviceMemory; // not reported by Safari
    return Math.min(screen.width, screen.height) >= 700 && (mem === undefined || mem >= 6) ? 'medium' : 'low';
  }
  return 'high';
}
const Q = pickQuality(qualityChoice);
$('quality').value = qualityChoice;
if (touch) {
  document.querySelector('.intro-controls').innerHTML =
    '<div><b>Move</b> left stick · <b>Look</b> drag the screen</div>' +
    '<div><b>Get on / off</b> the E button · <b>Run</b> the Run button</div>' +
    '<div><b>Map</b> top-right · turn your phone sideways for a wider view</div>';
}
$('quality').addEventListener('change', (e) => {
  store.set('rcr-quality', e.target.value);
  location.reload();
});

// ---------------------------------------------------------------- renderer, sky, light
const canvas = $('view');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: Q !== 'low', powerPreference: 'high-performance' });
} catch (e) {
  $('loadtext').textContent = "This browser can't show 3D graphics (WebGL 2 is off or missing). Try an up-to-date Chrome, Safari, Edge or Firefox.";
  $('startbtn').textContent = 'Not supported';
  throw e;
}
const maxRatio = Q === 'high' ? 2 : Q === 'medium' ? 1.5 : 1;
let pixelRatio = Math.min(devicePixelRatio || 1, Math.min(maxRatio, 1.5));
renderer.setPixelRatio(pixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = Q !== 'low';
renderer.shadowMap.type = Q === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
setAnisotropy(Math.min(renderer.capabilities.getMaxAnisotropy(), Q === 'high' ? 8 : 4));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2600);
// night: a deep blue sky with stars and a bright moon high in the south-east, a faint warm glow from
// the town along the horizon, and enough cool moonlight and sky light that every building, path and
// person stays easy to see; the lamps, windows and fest lights glow
const fogColour = new THREE.Color().setRGB(0.075, 0.085, 0.14);
scene.fog = new THREE.FogExp2(fogColour, 0.0013);
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 40), THREE.MathUtils.degToRad(35));   // the moon
function nightSky(radius) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uMoon: { value: sunDir.clone() }, uTime: { value: 0 } },
    vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform vec3 uMoon; uniform float uTime; varying vec3 vDir;
      float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 zen = vec3(0.012, 0.022, 0.065), mid = vec3(0.04, 0.07, 0.16), hor = vec3(0.12, 0.14, 0.24);
        vec3 col = mix(hor, mid, smoothstep(0.0, 0.2, h));
        col = mix(col, zen, smoothstep(0.2, 0.8, h));
        col += vec3(0.16, 0.08, 0.035) * exp(-max(h, 0.0) * 16.0);              // town glow on the horizon
        if (h < 0.0) col = mix(hor * 0.8 + vec3(0.1, 0.05, 0.02), vec3(0.03, 0.03, 0.045), clamp(-h * 5.0, 0.0, 1.0));
        vec3 g = d * 220.0, c = floor(g);
        float s = hash(c), r = length(fract(g) - 0.5);
        float star = step(0.993, s) * smoothstep(0.22, 0.0, r) * smoothstep(0.06, 0.3, h);
        col += vec3(0.85, 0.9, 1.0) * star * (0.75 + 0.25 * sin(uTime * 1.7 + s * 90.0)) * (0.5 + fract(s * 37.0) * 1.2);
        float m = dot(d, normalize(uMoon));
        col += vec3(1.0, 0.97, 0.88) * smoothstep(0.99952, 0.99972, m) * 1.8;   // the moon
        col += vec3(0.18, 0.22, 0.34) * pow(max(m, 0.0), 300.0) + vec3(0.05, 0.065, 0.11) * pow(max(m, 0.0), 12.0);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), mat);
  dome.frustumCulled = false;
  return dome;
}
const sky = nightSky(2200);
scene.add(sky);
{
  const pm = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(nightSky(100));
  const g = new THREE.Mesh(new THREE.CircleGeometry(90, 24), new THREE.MeshBasicMaterial({ color: 0x2a2a30 }));
  g.rotation.x = -Math.PI / 2; g.position.y = -2;
  envScene.add(g);
  scene.environment = pm.fromScene(envScene, 0.02, 0.1, 400).texture;
  scene.environmentIntensity = 0.6;
}
// cool sky light from above, a little warm bounce from the lamps below, and the moon for shadows
const hemi = new THREE.HemisphereLight(0x9fb4e6, 0x4a3e30, 1.45);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xc4d4ff, 0.95);
sun.castShadow = Q !== 'low';
const SH = Q === 'high' ? 70 : 50;
sun.shadow.mapSize.setScalar(Q === 'high' ? 4096 : 2048);
Object.assign(sun.shadow.camera, { left: -SH, right: SH, top: SH, bottom: -SH, near: 1, far: 420 });
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

// bloom makes the fairy lights, lanterns, LED wall and fireworks glow
let composer = null, bloom = null;
if (Q !== 'low') {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), Q === 'high' ? 0.5 : 0.42, 0.35, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
}

function resize() {
  const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
  renderer.setSize(w, h, false);
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
  camera.aspect = w / h;
  camera.fov = w < h ? 72 : 60;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- loading
const loadFill = $('loadfill'), loadText = $('loadtext'), startBtn = $('startbtn');
let fileProgress = 0, stepProgress = 0;
const showProgress = () => { loadFill.style.width = `${Math.round((fileProgress * 0.7 + stepProgress * 0.3) * 100)}%`; };
manager.onProgress = (url, done, total) => { fileProgress = done / total; showProgress(); };
const step = (text, p) => { loadText.textContent = text; stepProgress = p; showProgress(); return new Promise((r) => setTimeout(r, 30)); };

const audio = new GameAudio();
const G = { mode: 'foot', pending: null, started: false, time: 0, playTime: 0 };

// night: brighter lamp heads and windows, and soft pools of lamplight on the ground under every lamp
function nightLights(M, world) {
  if (M.lampGlow) M.lampGlow.emissiveIntensity = 3.4;
  if (M.winLit) M.winLit.emissiveIntensity = 1.8;
  if (M.downlight) M.downlight.emissiveIntensity = 3.4;
  const spots = world.lampSpots || [];
  if (!spots.length) return;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.5)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({
    map: tex, color: new THREE.Color().setRGB(0.4, 0.26, 0.12), transparent: true, depthWrite: false, fog: false,
    blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  const pools = new THREE.InstancedMesh(new THREE.CircleGeometry(0.5, 32).rotateX(-Math.PI / 2), mat, spots.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  spots.forEach((sp, i) => { m4.makeScale(sp.r * 2, 1, sp.r * 2); m4.setPosition(sp.x, 0.13, sp.z); pools.setMatrixAt(i, m4); pools.setColorAt(i, col.setScalar(sp.k)); });
  pools.frustumCulled = false;
  pools.renderOrder = 2;
  scene.add(pools);
}

async function load() {
  await step('Laying out the campus…', 0.1);
  const M = makeMaterials(Q);
  addCarMaterials(M);
  const world = buildWorld(scene, M, Q);
  G.world = world;
  nightLights(M, world);
  G.C = world.C;
  // drop any tree that landed inside a building or on a wall
  const free = (t) => G.C.heightAt(t.x, t.z) === 0;
  world.trees = world.trees.filter(free);
  world.palms = world.palms.filter((p) => p.base || free(p));

  await step('Growing the trees…', 0.35);
  const trees = buildTrees(scene, world.trees, world.palms, Q);
  for (const c of trees.colliders) G.C.circle(c.x, c.z, c.r);
  for (const p of world.palms) if (!p.base) G.C.circle(p.x, p.z, 0.25);

  await step('Bringing in the people and the camel…', 0.55);
  const [people, camel] = await Promise.all([loadPeople(), Camel.load()]);
  G.people = people;
  G.player = people.man(0);
  scene.add(G.player.object);
  G.player.object.position.set(SPAWN.player[0], 0, SPAWN.player[1]);
  G.heading = SPAWN.player[2];
  G.player.object.rotation.y = G.heading;
  G.speed = 0;

  G.camel = camel;
  camel.pos.set(SPAWN.camel[0], 0, SPAWN.camel[1]);
  camel.heading = SPAWN.camel[2];
  scene.add(camel.object);

  G.cart = new Cart();
  G.cart.pos.set(SPAWN.cart[0], 0, SPAWN.cart[1]);
  G.cart.heading = SPAWN.cart[2];
  G.cart.object.rotation.y = G.cart.heading;
  scene.add(G.cart.object);

  await step('Students arriving…', 0.75);
  G.crowd = new Crowd(scene, people, Q);
  G.hud = new Hud(world.map);
  G.input = new Input(canvas);
  G.fest = world.fest;
  G.missions = new Missions(scene, G.hud, world.fest, audio);
  // everyone the player and the vehicles bump into
  G.obstacles = G.crowd.obstacles.concat(world.fest.crowd.obstacles);
  world.fest.fireworks.onBang = (x, y, z) => { const p = playerPos(); audio.bang(Math.hypot(x - p.x, y, z - p.z)); };
  await step('Compiling shaders…', 0.9);
  try { renderer.compile(scene, camera); } catch (e) { /* not fatal */ }
  await audio.loading;
}

function whenFilesDone() {
  return new Promise((resolve) => {
    const check = () => (fileProgress >= 1 || !manager.itemsTotal ? resolve() : setTimeout(check, 100));
    manager.onLoad = resolve;
    check();
  });
}
// three's LoadingManager does not expose totals; track them for the check above
const _start = manager.itemStart.bind(manager), _end = manager.itemEnd.bind(manager);
manager.itemsTotal = 0;
manager.itemStart = (u) => { manager.itemsTotal++; _start(u); };
manager.itemEnd = (u) => { _end(u); };

load().then(whenFilesDone).then(() => {
  stepProgress = 1; fileProgress = 1; showProgress();
  loadText.textContent = "Ready. The fest is on.";
  startBtn.disabled = false;
  startBtn.textContent = 'Start';
  if (params.has('auto')) start();
}).catch((e) => {
  console.error(e);
  loadText.textContent = 'Something went wrong while loading: ' + (e && e.message ? e.message : e);
});

startBtn.addEventListener('click', start);
function start() {
  if (G.started) return;
  G.started = true;
  $('intro').hidden = true;
  $('hud').hidden = false;
  if (touch) $('touch').hidden = false;
  audio.start().catch(() => {});
  G.hud.toast(touch ? 'Drag to look · stick to move · E to ride' : 'WASD to move · drag to look · E to ride', 5);
  G.hud.banner("DAMRU '26", 'The fest is on', 'Pick up your wristband at the desk inside Gate 2, then follow the orange beacon. Ride the camel or the e-cart into the blue ring for the race.', 8);
  canvas.focus();
}
$('againbtn').addEventListener('click', () => location.reload());
$('btnmap').addEventListener('click', () => toggleMap());
$('btnsound').addEventListener('click', () => toggleSound());
$('btnfull').addEventListener('click', () => {
  const el = document.documentElement;
  if (document.fullscreenElement) document.exitFullscreen?.();
  else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
});
if (!(document.fullscreenEnabled || document.webkitFullscreenEnabled)) $('btnfull').hidden = true;
function toggleMap() { G.mapOpen = G.hud.toggleMap(); }
function toggleSound() {
  audio.setMuted(!audio.muted);
  $('btnsound').textContent = audio.muted ? 'Sound off' : 'Sound on';
}

// ---------------------------------------------------------------- camera
const cam = { yaw: Math.PI, pitch: 0.26, dist: 4.2, scale: 1, target: new THREE.Vector3(), cur: 4.2, first: true };
const camScales = [1, 0.6, 1.6];
let camScaleI = 0;
const DIST = { foot: 4.8, camel: 7.4, cart: 7.6 };
const HEIGHT = { foot: 1.55, camel: 3.0, cart: 1.75 };
const tmp = new THREE.Vector3();

function updateCamera(dt, focus, heading, moving) {
  const look = G.input.consumeLook();
  cam.yaw -= look.x * 0.0055;
  cam.pitch = clamp(cam.pitch + look.y * 0.004, -0.15, 1.25);
  if (look.zoom) cam.scale = clamp(cam.scale * (look.zoom > 0 ? 1.1 : 0.9), 0.45, 2.2);
  if (moving && performance.now() - G.input.lastLook > 1600) cam.yaw = dampAngle(cam.yaw, heading, 1.8, dt);
  if (cam.first) { cam.target.copy(focus); cam.first = false; }
  cam.target.x = damp(cam.target.x, focus.x, 14, dt);
  cam.target.y = damp(cam.target.y, focus.y, 8, dt);
  cam.target.z = damp(cam.target.z, focus.z, 14, dt);
  const want = DIST[G.mode] * cam.scale * camScales[camScaleI] * (camera.aspect < 1 ? 1.3 : 1);
  const dir = tmp.set(-Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), -Math.cos(cam.yaw) * Math.cos(cam.pitch));
  // pull in when a building is between the camera and the player
  let d = want;
  const steps = 14;
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * want;
    const x = cam.target.x + dir.x * t, y = cam.target.y + dir.y * t, z = cam.target.z + dir.z * t;
    if (G.C.heightAt(x, z, 0.25) > y - 0.4) { d = Math.max(0.6, t - want / steps); break; }
  }
  cam.cur = d < cam.cur ? d : damp(cam.cur, d, 2.5, dt);
  camera.position.copy(cam.target).addScaledVector(dir, cam.cur);
  camera.position.y = Math.max(0.35, camera.position.y);
  camera.lookAt(cam.target.x, cam.target.y + 0.45 * Math.min(1, cam.cur / 3), cam.target.z);
}

// ---------------------------------------------------------------- player, riding
const fwdOf = (h) => [Math.sin(h), Math.cos(h)];

function playerPos() {
  if (G.mode === 'camel') return G.camel.pos;
  if (G.mode === 'cart') return G.cart.pos;
  return G.player.object.position;
}
function playerHeading() {
  if (G.mode === 'camel') return G.camel.heading;
  if (G.mode === 'cart') return G.cart.heading;
  return G.heading;
}

function vehicleCircles() {
  const c = G.camel, k = G.cart, out = [];
  if (G.mode !== 'camel') {
    const [fx, fz] = fwdOf(c.heading);
    out.push({ x: c.pos.x + fx * 0.85, z: c.pos.z + fz * 0.85, r: 0.55 }, { x: c.pos.x - fx * 0.75, z: c.pos.z - fz * 0.75, r: 0.55 });
  }
  if (G.mode !== 'cart') {
    const [fx, fz] = fwdOf(k.heading);
    for (const o of [1.2, 0, -1.2]) out.push({ x: k.pos.x + fx * o, z: k.pos.z + fz * o, r: 0.72 });
  }
  return out;
}

function walk(dt) {
  const input = G.input, m = input.move;
  const p = G.player.object.position;
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
  let dx = fx * m.y - fz * m.x, dz = fz * m.y + fx * m.x;
  const mag = Math.min(1, Math.hypot(m.x, m.y));
  const target = mag * (m.run ? 5.0 : 1.55);
  G.speed = damp(G.speed, target, target > G.speed ? 6 : 10, dt);
  if (mag > 0.05) {
    const l = Math.hypot(dx, dz);
    dx /= l; dz /= l;
    G.heading = dampAngle(G.heading, Math.atan2(dx, dz), 10, dt);
    G.moveDir = [dx, dz];
  }
  if (G.speed > 0.01 && G.moveDir) {
    p.x += G.moveDir[0] * G.speed * dt;
    p.z += G.moveDir[1] * G.speed * dt;
  }
  G.C.resolve(p, 0.33);
  pushOut(p, 0.33, G.obstacles);
  pushOut(p, 0.33, vehicleCircles());
  G.player.object.rotation.y = G.heading;
  G.player.locomote(G.speed);
}

function mountCamel() {
  G.mode = 'camel';
  G.pending = null;
  const o = G.player.object;
  G.camel.seat.add(o);
  o.position.set(0, -0.83, 0.02);
  o.rotation.set(0, 0, 0);
  G.player.play('Seat', 0.2);
  G.camel.kneelTarget = 0;
  G.hud.setMode('Riding the camel');
  G.hud.toast(touch ? 'Stick forward to walk · Run to trot' : 'W to walk · Shift to trot · A/D to steer', 4);
}
function dismountCamel() {
  const c = G.camel, o = G.player.object;
  scene.attach(o);
  const [fx, fz] = fwdOf(c.heading);
  o.position.set(c.pos.x + fz * 1.5, 0, c.pos.z - fx * 1.5);
  o.rotation.set(0, c.heading, 0);
  G.heading = c.heading;
  G.speed = 0;
  G.C.resolve(o.position, 0.33);
  G.mode = 'foot';
  G.pending = null;
  c.kneelTarget = 0;
  G.hud.setMode('On foot');
}
function enterCart() {
  const k = G.cart, o = G.player.object;
  k.object.add(o);
  o.position.set(k.seatDriver.x, k.seatDriver.y - 0.86, k.seatDriver.z - 0.02);
  o.rotation.set(0, 0, 0);
  G.player.play('Seat', 0.2);
  G.mode = 'cart';
  G.hud.setMode('Driving the e-cart');
  G.hud.toast(touch ? 'Stick up to drive · down to brake and reverse' : 'W to drive · S to brake/reverse · A/D to steer', 4);
}
function leaveCart() {
  const k = G.cart, o = G.player.object;
  scene.attach(o);
  const [fx, fz] = fwdOf(k.heading);
  // driver sits on the right: step out to the right
  o.position.set(k.pos.x - fz * 1.4 + fx * 0.3, 0, k.pos.z + fx * 1.4 + fz * 0.3);
  o.rotation.set(0, k.heading, 0);
  G.heading = k.heading;
  G.speed = 0;
  G.C.resolve(o.position, 0.33);
  G.mode = 'foot';
  G.hud.setMode('On foot');
}

function interact(dt) {
  const input = G.input, use = input.hit('KeyE') || input.hit('Enter');
  const key = touch ? 'Tap <kbd>E</kbd>' : 'Press <kbd>E</kbd>';
  let prompt = '';
  if (G.mode === 'foot' && !G.pending) {
    const p = G.player.object.position;
    const dc = Math.hypot(p.x - G.camel.pos.x, p.z - G.camel.pos.z);
    const dk = Math.hypot(p.x - G.cart.pos.x, p.z - G.cart.pos.z);
    if (dc < 3.8 && dc <= dk) {
      prompt = `${key} to ride the camel`;
      if (use) { G.pending = 'camel'; G.camel.kneelTarget = 1; }
    } else if (dk < 3.4 && Math.abs(G.cart.speed) < 0.5) {
      prompt = `${key} to drive the e-cart`;
      if (use) enterCart();
    }
  } else if (G.pending === 'camel') {
    prompt = 'The camel is sitting down for you…';
    const p = G.player.object.position;
    G.heading = dampAngle(G.heading, Math.atan2(G.camel.pos.x - p.x, G.camel.pos.z - p.z), 6, dt);
    G.player.object.rotation.y = G.heading;
    if (G.camel.isDown()) mountCamel();
  } else if (G.mode === 'camel') {
    if (G.pending === 'off') {
      prompt = 'The camel is sitting down…';
      if (G.camel.isDown()) dismountCamel();
    } else if (!G.camel.isUp()) {
      prompt = 'Hold on, the camel is standing up…';
    } else {
      prompt = Math.abs(G.camel.speed) < 0.6 ? `${key} to get off` : '';
      if (use && Math.abs(G.camel.speed) < 0.6) { G.pending = 'off'; G.camel.kneelTarget = 1; }
    }
  } else if (G.mode === 'cart') {
    prompt = Math.abs(G.cart.speed) < 1 ? `${key} to get out` : '';
    if (use && Math.abs(G.cart.speed) < 1) leaveCart();
  }
  G.hud.prompt(G.started && !G.mapOpen ? prompt : '');
}

// ---------------------------------------------------------------- main loop
const clock = new THREE.Clock();
let frameAvg = 16, adaptTimer = 0, frames = 0;
const focus = new THREE.Vector3();

const TEST = params.has('test');
function frame() {
  if (!TEST) requestAnimationFrame(frame);
  const raw = clock.getDelta();
  tick(Math.min(raw, 0.05), raw, true);
}
function tick(dt, raw, draw) {
  if (!G.player || !G.input || !G.missions) { return; }
  frames++;
  G.time += dt;
  if (G.started && !G.finished) G.playTime += dt;
  wind.value += dt;
  const input = G.input;
  if (G.started) {
    if (input.hit('KeyM')) toggleMap();
    if (input.hit('KeyN')) toggleSound();
    if (input.hit('KeyC')) camScaleI = (camScaleI + 1) % camScales.length;
    if (input.hit('Escape') && G.mapOpen) toggleMap();
  }
  const active = G.started && !G.mapOpen;
  const others = [{ ...G.player.object.getWorldPosition(new THREE.Vector3()), r: 0.4 }];
  // vehicles
  const drive = active ? input.drive : { fwd: 0, turn: 0, run: false };
  G.camel.update(dt, G.mode === 'camel' && !G.pending ? drive : null, G.C, G.obstacles);
  G.cart.update(dt, G.mode === 'cart' ? drive : null, G.C, G.obstacles);
  others.push({ x: G.camel.pos.x, z: G.camel.pos.z, r: 1.2 }, { x: G.cart.pos.x, z: G.cart.pos.z, r: 1.6 });
  // player
  if (G.mode === 'foot') {
    if (active && !G.pending) walk(dt);
    else { G.speed = damp(G.speed, 0, 10, dt); G.player.locomote(G.speed); }
    G.player.update(dt);
  } else {
    G.player.update(dt);
    applySeat(G.player, G.mode);
  }
  interact(dt);
  // students
  G.crowd.update(dt, camera.position, others);
  // camera
  const pos = playerPos(), heading = playerHeading();
  focus.set(pos.x, HEIGHT[G.mode] + (G.mode === 'camel' ? -0.9 * G.camel.kneel : 0), pos.z);
  const moving = G.mode === 'foot' ? G.speed > 0.5 : Math.abs(G.mode === 'camel' ? G.camel.speed : G.cart.speed) > 0.5;
  if (G.debugCam) { camera.position.copy(G.debugCam.pos); camera.lookAt(G.debugCam.look); }
  else updateCamera(dt, focus, heading, moving);
  // sun and shadows follow the player (snapped to shadow texels to stop shimmering)
  const texel = (SH * 2) / sun.shadow.mapSize.x;
  const sx = Math.round(pos.x / texel) * texel, sz = Math.round(pos.z / texel) * texel;
  sun.target.position.set(sx, 0, sz);
  sun.position.set(sx + sunDir.x * 200, sunDir.y * 200, sz + sunDir.z * 200);
  // places
  if (G.started) {
    const fresh = G.hud.checkPlaces(pos.x, pos.z);
    if (fresh) {
      audio.chime();
      if (G.hud.found.size === PLACES.length && !G.finished) {
        G.finished = true;
        const mins = Math.floor(G.playTime / 60), secs = Math.round(G.playTime % 60);
        setTimeout(() => G.hud.finish(`You found all ${PLACES.length} places in ${mins} min ${secs} s. Happy Damru '26!`), 2500);
      }
    }
    G.missions.update(dt, pos, G.mode);
    G.hud.update(dt);
    const things = [{ x: G.camel.pos.x, z: G.camel.pos.z, c: '#c58b4c', label: 'Camel' }, { x: G.cart.pos.x, z: G.cart.pos.z, c: '#f2f2f2', label: 'E-cart' }, ...G.missions.markers()];
    if (frames % 2 === 0) G.hud.drawMini(pos.x, pos.z, heading, things);
    if (G.mapOpen) G.hud.drawBig(pos.x, pos.z, heading, things);
  }
  // world animation (flags, the fest) and sound
  for (const a of G.world.anims) a(G.time);
  const concert = G.missions ? G.missions.concert : 0.25;
  G.fest.update(G.time, dt, concert, camera.position);
  sky.material.uniforms.uTime.value = G.time;   // the stars twinkle
  const cp = G.camel.pos, kp = G.cart.pos;
  audio.update(dt, {
    mode: G.mode,
    walkSpeed: G.mode === 'foot' ? G.speed : 0,
    camelSpeed: G.camel.speed,
    camelNear: G.mode === 'camel' ? 1 : clamp(1 - Math.hypot(cp.x - pos.x, cp.z - pos.z) / 30, 0, 1),
    cartSpeed: G.cart.speed,
    cartNear: clamp(1 - Math.hypot(kp.x - pos.x, kp.z - pos.z) / 30, 0, 1),
    dholDist: Math.hypot(pos.x - DHOL[0], pos.z - DHOL[1]),
    stageDist: Math.hypot(pos.x - STAGE.x, pos.z - STAGE.z),
    stallDist: Math.hypot(pos.x - (MIDDLE_GROUND.x0 + MIDDLE_GROUND.x1) / 2, (pos.z - (MIDDLE_GROUND.z0 + MIDDLE_GROUND.z1) / 2) * 1.8),
    concert,
  });
  input.endFrame();
  if (draw) { if (composer) composer.render(); else renderer.render(scene, camera); }
  // adaptive resolution: keep phones and older laptops smooth
  frameAvg = frameAvg * 0.95 + raw * 1000 * 0.05;
  adaptTimer += raw;
  if (G.started && adaptTimer > 2) {
    adaptTimer = 0;
    if (frameAvg > 38 && pixelRatio > 0.6) { pixelRatio = Math.max(0.6, pixelRatio - 0.15); renderer.setPixelRatio(pixelRatio); resize(); }
    else if (frameAvg < 20 && pixelRatio < Math.min(devicePixelRatio || 1, maxRatio)) { pixelRatio = Math.min(maxRatio, pixelRatio + 0.1); renderer.setPixelRatio(pixelRatio); resize(); }
    // still slow at the lowest resolution: drop the bloom
    if (frameAvg > 45 && pixelRatio <= 0.6 && composer) { composer = null; }
  }
}
if (TEST) {
  // headless checks drive the loop by hand
  const wait = setInterval(() => { if (G.player && G.started) { clearInterval(wait); window.DONE = true; } }, 200);
} else frame();

// for testing from the console / headless checks
window.GAME = {
  G, camera, scene, renderer, cam,
  look(px, py, pz, lx, ly, lz) { G.debugCam = { pos: new THREE.Vector3(px, py, pz), look: new THREE.Vector3(lx, ly, lz) }; },
  setView(x, z, yaw, pitch = 0.26) { G.debugCam = null; G.player.object.position.set(x, 0, z); G.heading = yaw; cam.yaw = yaw; cam.pitch = pitch; cam.first = true; },
  step(n = 30, dt = 1 / 30) { for (let i = 0; i < n; i++) tick(dt, dt, i === n - 1); },
  key(code, on = true) { if (on) { G.input.keys.add(code); G.input.pressed.add(code); } else G.input.keys.delete(code); },
};
