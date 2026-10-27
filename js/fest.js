// The Damru '26 fest: main stage with LED wall, trusses, speakers and moving-head beams on the
// north ground; twenty food and game stalls on the middle ground; strings of fairy lights,
// paper lanterns and marigold garlands; the DAMRU '26 arch with the Damru logo on Gate 2; the dhol circle; the
// concert crowd; and fireworks. Static parts go into the shared StaticBuilder.
import * as THREE from 'three';
import { boxGeo, quadGeo, barGeo, groundGeo } from './builder.js';
import { canvasMaterial, logoSign, logoImage } from './materials.js';
import { STAGE, STALL_ROWS, STALL_X, STALLS, PASS_STALLS, DHOL, REG_DESK, WALL } from './layout.js';

const PI = Math.PI;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function festMaterials(M) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const glow = (c, i) => std({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 });
  M.truss = std({ color: 0xc9ccd0, metalness: 0.85, roughness: 0.3 });
  M.stageBlack = std({ color: 0x111214, roughness: 0.7 });
  M.stageFloor = std({ color: 0x1c1d20, roughness: 0.25, metalness: 0.2 });
  M.speaker = std({ color: 0x0c0c0d, roughness: 0.55 });
  M.parGlow = glow(0xffb36b, 4);
  M.headLens = glow(0xbfd8ff, 5);
  M.bulbWarm = glow(0xffc77a, 6);
  M.bulbAmber = glow(0xff8a2a, 6);
  M.bulbPink = glow(0xff4f9a, 5);
  M.bulbBlue = glow(0x4fa8ff, 5);
  M.bulbGreen = glow(0x58ff8a, 5);
  M.lanternOrange = glow(0xff7a1a, 2.4);
  M.lanternRed = glow(0xff2a2a, 2.2);
  M.lanternYellow = glow(0xffc21a, 2.4);
  M.marigold = std({ color: 0xff8c00, roughness: 0.8 });
  M.marigoldY = std({ color: 0xffc400, roughness: 0.8 });
  M.leafGreen = std({ color: 0x2f7d32, roughness: 0.8 });
  M.counterWood = std({ color: 0x8a5a33, roughness: 0.7 });
  M.cloth = std({ color: 0xf6f2ea, roughness: 0.9, side: THREE.DoubleSide });
  M.tableTop = std({ color: 0xe9e4da, roughness: 0.5 });
  M.balloonR = std({ color: 0xe53935, roughness: 0.3 });
  M.balloonY = std({ color: 0xfdd835, roughness: 0.3 });
  M.balloonB = std({ color: 0x1e88e5, roughness: 0.3 });
  M.balloonG = std({ color: 0x43a047, roughness: 0.3 });
  M.gold = std({ color: 0xffcf40, emissive: 0xffa500, emissiveIntensity: 1.6, metalness: 0.6, roughness: 0.3 });
}

/**
 * ctx: { B, C, M, solo, foot, anims, R, signMaterial, group }
 * Returns the moving parts: { update(t, dt, level), passes, regDesk, stageFront, obstacles }.
 */
export function buildFest(ctx, quality) {
  const { B, C, M, solo, foot, anims, R, signMaterial, group } = ctx;
  festMaterials(M);
  const bulbKeys = ['bulbWarm', 'bulbWarm', 'bulbAmber', 'bulbWarm', 'bulbPink', 'bulbWarm', 'bulbBlue', 'bulbAmber', 'bulbGreen'];
  const lanternKeys = ['lanternOrange', 'lanternRed', 'lanternYellow'];
  const dyn = new THREE.Group();          // animated pieces (kept out of the merged static meshes)
  dyn.name = 'fest';
  group.add(dyn);

  // ---------------------------------------------------------------- strings of lights
  const bulbGeo = () => new THREE.IcosahedronGeometry(0.065, 0);
  /** A sagging string of bulbs (and its wire) between two points. */
  function lights(a, b, { sag = 0.8, step = 0.55, keys = bulbKeys, lanterns = 0, wire = true } = {}) {
    const len = a.distanceTo(b), n = Math.max(2, Math.round(len / step));
    let prev = a.clone();
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = a.clone().lerp(b, t);
      p.y -= sag * 4 * t * (1 - t);
      if (wire && i > 0) B.add('cable', barGeo(prev, p, 0.012, 3));
      prev = p;
      if (i > 0 && i < n) B.add(keys[(((i + Math.floor(a.x * 7)) % keys.length) + keys.length) % keys.length], bulbGeo(), p.x, p.y - 0.07, p.z);
      if (lanterns && i % lanterns === Math.floor(lanterns / 2)) lantern(p.x, p.y, p.z, lanternKeys[(i / lanterns | 0) % 3]);
    }
  }
  function lantern(x, y, z, key) {
    B.add('cable', barGeo(V(x, y, z), V(x, y - 0.35, z), 0.01, 3));
    const g = new THREE.SphereGeometry(0.28, 12, 8);
    g.scale(1, 1.25, 1);
    B.add(key, g, x, y - 0.72, z);
    B.add('black', new THREE.CylinderGeometry(0.16, 0.16, 0.06, 10), x, y - 0.37, z);
    B.add('black', new THREE.CylinderGeometry(0.14, 0.14, 0.05, 10), x, y - 1.07, z);
  }
  /** Marigold garland: orange and yellow flowers on a string. */
  function garland(a, b, sag = 0.5) {
    const len = a.distanceTo(b), n = Math.max(2, Math.round(len / 0.11));
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = a.clone().lerp(b, t);
      p.y -= sag * 4 * t * (1 - t);
      B.add(i % 9 === 0 ? 'leafGreen' : (i % 2 ? 'marigold' : 'marigoldY'), new THREE.IcosahedronGeometry(0.075, 0), p.x, p.y, p.z);
    }
  }
  /** Hanging garland strands (toran) along a beam. */
  function strands(a, b, every = 0.5, len = 1.0) {
    const d = a.distanceTo(b), n = Math.floor(d / every);
    for (let i = 0; i <= n; i++) {
      const p = a.clone().lerp(b, i / n);
      garland(p, p.clone().add(V(0, -len, 0.001)), 0);
    }
  }

  // ---------------------------------------------------------------- truss
  /** Square box truss between two points (0.4 m), silver. */
  function truss(a, b, s = 0.4) {
    const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
    dir.normalize();
    const up = Math.abs(dir.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(dir, up).normalize().multiplyScalar(s / 2);
    const w = new THREE.Vector3().crossVectors(dir, u).normalize().multiplyScalar(s / 2);
    const corners = [u.clone().add(w), u.clone().sub(w), u.clone().negate().sub(w), u.clone().negate().add(w)];
    for (const c of corners) B.add('truss', barGeo(a.clone().add(c), b.clone().add(c), 0.025, 5));
    const n = Math.max(1, Math.round(len / s));
    for (let i = 0; i < n; i++) {
      const p0 = a.clone().lerp(b, i / n), p1 = a.clone().lerp(b, (i + 1) / n);
      for (let k = 0; k < 4; k++) {
        const c0 = corners[k], c1 = corners[(k + 1) % 4];
        B.add('truss', barGeo(p0.clone().add(i % 2 ? c0 : c1), p1.clone().add(i % 2 ? c1 : c0), 0.012, 3));
      }
    }
  }

  // ---------------------------------------------------------------- the main stage
  const S = STAGE, sx = S.x, sz = S.z, hw = S.w / 2, hd = S.d / 2, front = sz + hd, back = sz - hd;
  B.box('stageBlack', S.w, S.h, S.d, sx, S.h / 2, sz);
  B.box('stageFloor', S.w - 0.2, 0.05, S.d - 0.2, sx, S.h + 0.025, sz);
  C.rect(sx - hw, back, sx + hw, front, S.h);
  foot(sx - hw, back, sx + hw, front, '#222');
  for (const s of [-1, 1]) for (let k = 0; k < 8; k++) B.box('stageBlack', 2.4, S.h * (k + 0.5) / 8, 0.4, sx + s * (hw + 1.4), S.h * (k + 0.5) / 16, back + 1 + k * 0.4);
  const TH = 13.5;
  const towers = [[sx - hw - 0.4, front - 0.4], [sx + hw + 0.4, front - 0.4], [sx - hw - 0.4, back + 0.4], [sx + hw + 0.4, back + 0.4]];
  for (const [x, z] of towers) { truss(V(x, 0, z), V(x, TH, z)); B.box('stageBlack', 1.2, 0.2, 1.2, x, 0.1, z); C.rect(x - 0.4, z - 0.4, x + 0.4, z + 0.4, TH); }
  truss(V(sx - hw - 0.4, TH, front - 0.4), V(sx + hw + 0.4, TH, front - 0.4));
  truss(V(sx - hw - 0.4, TH, back + 0.4), V(sx + hw + 0.4, TH, back + 0.4));
  for (const x of [sx - hw - 0.4, sx, sx + hw + 0.4]) truss(V(x, TH, front - 0.4), V(x, TH, back + 0.4));
  truss(V(sx - hw - 0.4, TH - 3.5, front - 0.6), V(sx + hw + 0.4, TH - 3.5, front - 0.6));    // lighting bar
  for (const s of [-1, 1]) {
    const roof = boxGeo(S.w + 2, 0.12, S.d / 2 + 1);
    roof.rotateX(-s * 0.12);
    B.add('stageBlack', roof, sx, TH + 0.8, sz + s * (S.d / 4 + 0.3));
  }
  // LED wall and side screens (animated canvas)
  const led = document.createElement('canvas');
  led.width = 1024; led.height = 400;
  const lg = led.getContext('2d');
  const ledTex = new THREE.CanvasTexture(led);
  ledTex.colorSpace = THREE.SRGBColorSpace;
  const ledMat = new THREE.MeshBasicMaterial({ map: ledTex, toneMapped: false });
  ledMat.color.setScalar(1.6);
  const wall = solo(ledMat, quadGeo(26, 10.2), sx, S.h + 5.6, back + 0.35, 0, false);
  wall.userData.festLed = true;
  B.box('stageBlack', 27, 11, 0.3, sx, S.h + 5.6, back + 0.15);
  const sideMat = new THREE.MeshBasicMaterial({ map: ledTex, toneMapped: false });
  sideMat.color.setScalar(1.4);
  for (const s of [-1, 1]) {
    const x = sx + s * (hw + 7);
    truss(V(x - 3.4, 0, front - 2), V(x - 3.4, 12.5, front - 2));
    truss(V(x + 3.4, 0, front - 2), V(x + 3.4, 12.5, front - 2));
    truss(V(x - 3.4, 12.5, front - 2), V(x + 3.4, 12.5, front - 2));
    B.box('stageBlack', 6.6, 9, 0.3, x, 7.4, front - 2.2);
    const scr = solo(sideMat, quadGeo(6.2, 8.6), x, 7.4, front - 2.02, 0, false);
    scr.userData.festLed = true;
    for (const dx of [-3.4, 3.4]) C.rect(x + dx - 0.3, front - 2.3, x + dx + 0.3, front - 1.7, 12);
    // line-array speakers hanging beside the stage
    for (let k = 0; k < 8; k++) {
      const y = 12.4 - k * 0.62, tilt = k * 0.035;
      B.add('speaker', boxGeo(1.3, 0.55, 0.9), sx + s * (hw + 1.6), y, front - 0.2 + k * 0.015, 0, 1, 1, 1, tilt);
    }
    for (let k = 0; k < 3; k++) B.box('speaker', 1.2, 0.9, 1.0, sx + s * (hw - 1.5), S.h + 0.45 + k * 0.9, front - 1.2);
  }
  // fixtures on the lighting bar and PAR cans along the front edge
  const heads = [];
  for (let i = 0; i < 10; i++) {
    const x = sx - hw + 2 + i * (S.w - 4) / 9, y = TH - 4.1, z = front - 0.6;
    B.box('speaker', 0.45, 0.5, 0.45, x, y, z);
    B.add('headLens', new THREE.CylinderGeometry(0.14, 0.14, 0.04, 12), x, y - 0.27, z);
    heads.push(V(x, y - 0.3, z));
  }
  for (let i = 0; i < 16; i++) {
    const x = sx - hw + 1 + i * (S.w - 2) / 15;
    B.add('stageBlack', new THREE.CylinderGeometry(0.16, 0.16, 0.36, 10).rotateX(-0.9), x, S.h + 0.2, front - 0.3);
    B.add('parGlow', new THREE.CircleGeometry(0.14, 10).rotateX(-0.9 - PI / 2 + PI), x, S.h + 0.33, front - 0.18);
  }
  // band kit: drum riser, keyboards, mic stands, monitors
  B.box('stageBlack', 6, 0.6, 4, sx, S.h + 0.3, back + 3);
  for (const [dx, r] of [[-1.2, 0.35], [1.2, 0.35], [0, 0.55]]) B.add('white', new THREE.CylinderGeometry(r, r, 0.45, 16), sx + dx, S.h + 0.9, back + 3);
  B.box('black', 1.8, 0.12, 0.5, sx - 8, S.h + 1.0, back + 4); B.box('darkMetal', 0.06, 1.0, 0.06, sx - 8, S.h + 0.5, back + 4);
  for (const dx of [-4, 0, 4]) { B.add('darkMetal', new THREE.CylinderGeometry(0.015, 0.015, 1.6, 6), sx + dx, S.h + 0.8, front - 2.5); B.add('speaker', boxGeo(0.7, 0.35, 0.5), sx + dx, S.h + 0.2, front - 1.0, 0, 1, 1, 1, -0.5); }
  // crowd barrier, front-of-house tent, light towers
  for (let x = sx - hw - 1; x < sx + hw + 1; x += 2) {
    B.box('steel', 2.0, 0.06, 0.06, x + 1, 1.15, front + 2.6);
    B.box('steel', 2.0, 0.05, 0.05, x + 1, 0.3, front + 2.6);
    for (let k = 0; k < 6; k++) B.box('steel', 0.03, 0.85, 0.03, x + 0.2 + k * 0.33, 0.72, front + 2.6);
    B.box('steel', 0.05, 0.05, 1.2, x + 0.1, 0.03, front + 2.6);
  }
  C.rect(sx - hw - 1, front + 2.5, sx + hw + 1, front + 2.7, 1.2);
  {
    const fx = sx + 13, fz = -205;
    for (const [dx, dz] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) { B.add('darkMetal', new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), fx + dx, 1.3, fz + dz); C.circle(fx + dx, fz + dz, 0.1); }
    const r = new THREE.ConeGeometry(4.6, 1.2, 4, 1, true); r.rotateY(PI / 4); r.scale(1, 1, 0.7);
    B.add('tent', r, fx, 3.2, fz);
    B.box('black', 4.4, 0.9, 1.2, fx, 0.45, fz + 0.3);
    B.box('darkMetal', 4.0, 0.12, 1.0, fx, 1.0, fz + 0.2);
    C.rect(fx - 2.2, fz - 0.3, fx + 2.2, fz + 0.9, 1);
    foot(fx - 3, fz - 2, fx + 3, fz + 2, '#eee');
  }
  for (const x of [sx - 38, sx + 38]) {
    const z = -212;
    truss(V(x, 0, z), V(x, 10, z));
    B.box('truss', 2.4, 0.3, 0.4, x, 10, z);
    for (const dx of [-0.8, 0, 0.8]) { B.box('speaker', 0.4, 0.4, 0.5, x + dx, 9.7, z - 0.2); B.add('headLens', new THREE.CircleGeometry(0.14, 10).rotateY(PI), x + dx, 9.7, z - 0.46); }
    C.rect(x - 0.4, z - 0.4, x + 0.4, z + 0.4, 10);
  }
  // festoon poles and strings round the audience area
  {
    const x0 = sx - 40, x1 = sx + 40, z0 = -244, z1 = -186;
    const poles = [];
    for (let x = x0; x <= x1; x += 10) poles.push(V(x, 6, z1), V(x, 6, z0 + 6));
    for (let z = z0 + 6; z <= z1; z += 10) poles.push(V(x0, 6, z), V(x1, 6, z));
    const seen = new Set();
    for (const p of poles) {
      const k = `${p.x},${p.z}`; if (seen.has(k)) continue; seen.add(k);
      B.add('darkMetal', new THREE.CylinderGeometry(0.06, 0.08, 6, 6), p.x, 3, p.z);
      C.circle(p.x, p.z, 0.12);
    }
    for (let x = x0; x < x1; x += 10) { lights(V(x, 5.9, z1), V(x + 10, 5.9, z1)); lights(V(x, 5.9, z0 + 6), V(x + 10, 5.9, z0 + 6)); }
    for (let z = z0 + 6; z < z1; z += 10) { lights(V(x0, 5.9, z), V(x0, 5.9, z + 10)); lights(V(x1, 5.9, z), V(x1, 5.9, z + 10)); }
    // criss-cross strings over the crowd
    for (let x = x0; x < x1; x += 20) { lights(V(x, 5.9, z1), V(x + 20, 5.9, z0 + 6), { sag: 1.6 }); lights(V(x + 20, 5.9, z1), V(x, 5.9, z0 + 6), { sag: 1.6 }); }
  }

  // ---------------------------------------------------------------- food & game stalls
  const passes = [];
  const stallFronts = [];
  STALLS.forEach(([name, kind, colour], i) => {
    const row = STALL_ROWS[i < STALL_X.length ? 0 : 1];
    const x = STALL_X[i % STALL_X.length], z = row.z;
    const nz = -row.face;                 // the counter side, towards the aisle
    const yaw = nz < 0 ? PI : 0;
    const W = 7, D = 3.6, H = 2.6;
    const key = 'stall' + i;
    M[key] = canvasMaterial(256, 256, (g) => {
      for (let s = 0; s < 8; s++) { g.fillStyle = s % 2 ? '#fbf7ef' : colour; g.fillRect(s * 32, 0, 32, 256); }
    });
    // posts, back and side panels, counter
    for (const dx of [-W / 2, W / 2]) for (const dz of [-D / 2, D / 2]) B.add('darkMetal', new THREE.CylinderGeometry(0.05, 0.05, H + 0.4, 6), x + dx, (H + 0.4) / 2, z + dz);
    B.box('cloth', W, H, 0.05, x, H / 2, z - nz * D / 2);
    for (const dx of [-W / 2, W / 2]) B.box('cloth', 0.05, H - 0.2, D, x + dx, (H - 0.2) / 2, z);
    B.box('counterWood', W - 0.6, 1.0, 0.7, x, 0.5, z + nz * (D / 2 - 0.4));
    B.add(key, boxGeo(W - 0.6, 0.85, 0.02), x, 0.5, z + nz * (D / 2 - 0.04));
    // striped gable roof
    for (const s of [-1, 1]) {
      const r = boxGeo(W + 0.6, 0.05, D / 2 + 0.5);
      r.rotateX(s * 0.38);
      B.add(key, r, x, H + 0.55, z + s * (D / 4 + 0.15));
    }
    // sign board over the counter
    const sign = signMaterial(name.toUpperCase(), { w: 1024, h: 200, bg: colour, fg: '#ffffff', font: 'bold 116px "Avenir Next", Arial', emissive: 0.75 });
    solo(sign, quadGeo(5.2, 1.0), x, H + 0.35, z + nz * (D / 2 + 0.55), yaw, false);
    B.box('darkMetal', 5.4, 0.08, 0.08, x, H - 0.2, z + nz * (D / 2 + 0.55));
    // what's on the counter
    if (kind === 'food') {
      for (const dx of [-2, -0.7, 0.7, 2]) B.add(R() < 0.5 ? 'steel' : 'terracotta', new THREE.CylinderGeometry(0.22, 0.18, 0.32, 12), x + dx, 1.16, z + nz * (D / 2 - 0.45));
      B.add('steel', new THREE.CylinderGeometry(0.35, 0.35, 0.5, 14), x - 2.2, 1.0, z);
      B.box('white', 1.2, 0.8, 0.6, x + 2, 0.4, z - nz * 0.6);
    } else {
      for (let k = 0; k < 14; k++) B.add(['balloonR', 'balloonY', 'balloonB', 'balloonG'][k % 4], new THREE.SphereGeometry(0.16, 8, 6), x - 2.6 + (k % 7) * 0.85, 1.6 + Math.floor(k / 7) * 0.5, z - nz * (D / 2 - 0.12));
      for (let k = 0; k < 6; k++) B.box(['balloonR', 'balloonY', 'balloonB'][k % 3], 0.3, 0.3, 0.3, x - 1.5 + k * 0.6, 1.2, z + nz * (D / 2 - 0.45));
    }
    // bulbs along the front edge of the roof
    lights(V(x - W / 2, H + 0.2, z + nz * (D / 2 + 0.05)), V(x + W / 2, H + 0.2, z + nz * (D / 2 + 0.05)), { sag: 0.25, step: 0.4 });
    C.rect(x - W / 2, z - D / 2, x + W / 2, z + D / 2, H);
    foot(x - W / 2, z - D / 2, x + W / 2, z + D / 2, colour);
    stallFronts.push({ x, z: z + nz * (D / 2 + 1.2), name, kind, i });
    if (PASS_STALLS.includes(i)) {
      const card = solo(M.gold, boxGeo(0.5, 0.32, 0.03), x, 1.85, z + nz * (D / 2 - 0.4), 0, false);
      card.userData.noExport = true;
      card.visible = false;
      passes.push({ x, z: z + nz * (D / 2 + 1.0), mesh: card, name, got: false, i });
    }
  });
  // zig-zag strings and lanterns over the aisle, tables in the middle
  {
    const zs = STALL_ROWS[0].z - 1.85 - 0.2, zn = STALL_ROWS[1].z + 1.85 + 0.2;
    for (let k = 0; k < STALL_X.length; k++) {
      const x = STALL_X[k];
      lights(V(x - 3.5, 3.4, zs), V(x + 1, 3.4, zn), { sag: 1.0, lanterns: 9 });
      lights(V(x + 1, 3.4, zn), V(x + 5.5, 3.4, zs), { sag: 1.0, lanterns: 9 });
    }
    for (const [dx, dz] of [[-4, -3], [4, -3], [-4, 3], [4, 3], [0, 0]]) {
      const x = -63 + dx, z = (zs + zn) / 2 + dz;
      B.add('tableTop', new THREE.CylinderGeometry(0.7, 0.7, 0.05, 16), x, 0.75, z);
      B.add('darkMetal', new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6), x, 0.37, z);
      B.add('darkMetal', new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), x, 1.2, z);
      const um = new THREE.ConeGeometry(1.4, 0.5, 8, 1, true);
      B.add(dx === 0 ? 'cloth' : `stall${(dx + 4) / 2 | 0}`, um, x, 2.45, z);
      C.circle(x, z, 0.7);
    }
  }

  // ---------------------------------------------------------------- DAMRU '26 arch on Gate 2
  // marigold-wrapped pillars round the two brick gate posts, the banner across the gate above them
  {
    const z = 0, x0 = WALL.gateX0 - 0.7, x1 = WALL.gateX1 + 0.7;
    for (const x of [x0, x1]) {
      B.box('marigold', 1.5, 7.5, 1.5, x, 3.75, z);
      for (let y = 0.4; y < 7.4; y += 0.5) B.add('marigoldY', new THREE.TorusGeometry(0.82, 0.09, 6, 16).rotateX(PI / 2), x, y, z);
      C.rect(x - 0.75, z - 0.75, x + 0.75, z + 0.75, 7.5);
    }
    B.box('marigold', x1 - x0 + 1.5, 1.6, 0.6, 0, 8.0, z);
    const sign = signMaterial('RISHIHOOD UNIVERSITY', { w: 1024, h: 140, bg: '#7d1a22', fg: '#ffd27a', font: 'bold 84px "Avenir Next", Arial', emissive: 1.0 });
    solo(sign, quadGeo(13.6, 1.5), 0, 8.0, z + 0.32, 0, false);       // seen from the road outside
    solo(sign, quadGeo(13.6, 1.5), 0, 8.0, z - 0.32, PI, false);      // seen from inside the campus
    // the Damru logo on a crest above the beam, both sides
    const logo = logoSign({ w: 1024, h: 600, bg: '#fee6b6', logo: 'damru_logo_maroon.png', emissive: 0.45, box: [0.05, 0.05, 0.9, 0.9] });
    B.box('marigold', 8.3, 5.0, 0.5, 0, 11.25, z);
    for (const [dz, yaw] of [[0.27, 0], [-0.27, PI]]) solo(logo, quadGeo(7.8, 4.55), 0, 11.25, z + dz, yaw, false);
    lights(V(-4.15, 13.75, z), V(4.15, 13.75, z), { sag: 0.04, step: 0.3 });
    strands(V(x0 + 0.8, 7.1, z + 0.4), V(x1 - 0.8, 7.1, z + 0.4), 0.4, 1.1);
    strands(V(x0 + 0.8, 7.1, z - 0.4), V(x1 - 0.8, 7.1, z - 0.4), 0.4, 1.1);
    lights(V(x0, 8.85, z), V(x1, 8.85, z), { sag: 0.05, step: 0.3 });
    garland(V(-6.6, 3.3, -0.3), V(6.6, 3.3, -0.3), 0.6);
  }
  // registration desk for the wristbands
  {
    const [x, z] = REG_DESK;
    B.box('cloth', 3, 1.0, 0.8, x, 0.5, z);
    for (const [dx, dz] of [[-1.8, -1.2], [1.8, -1.2], [-1.8, 1.2], [1.8, 1.2]]) B.add('darkMetal', new THREE.CylinderGeometry(0.04, 0.04, 2.6, 6), x + dx, 1.3, z + dz);
    const r = new THREE.ConeGeometry(2.8, 0.8, 4, 1, true); r.rotateY(PI / 4); r.scale(1, 1, 0.75);
    B.add('stall4', r, x, 2.95, z);
    const sign = signMaterial('WRISTBANDS', { w: 1024, h: 200, bg: '#7d1a22', fg: '#ffd27a', font: 'bold 120px "Avenir Next", Arial', emissive: 0.9 });
    solo(sign, quadGeo(3, 0.6), x + 1.5, 2.3, z, PI / 2, false);
    C.rect(x - 1.5, z - 0.4, x + 1.5, z + 0.4, 1.0);
  }

  // ---------------------------------------------------------------- strings along the roads and the dhol circle
  const lampLine = (pts) => { for (let i = 0; i < pts.length - 1; i++) lights(pts[i], pts[i + 1], { sag: 0.9, lanterns: 14 }); };
  { const p = []; for (let x = -191.5; x < -16; x += 18) p.push(V(x, 7.6, -6.3)); lampLine(p); }
  { const p = []; for (let z = -30; z > -280; z -= 20) p.push(V(-7.2, 7.6, z)); lampLine(p); }
  { const p = []; for (let z = -100; z > -270; z -= 26) p.push(V(-128.8, 7.6, z)); lampLine(p); }
  // the plaza between Block B and Block C: warm bulbs zigzag between the staggered lamp posts, and a
  // second zigzag higher up between the two blocks under the skybridges
  {
    const posts = [];
    for (let k = 0; k < 13; k++) posts.push(V(-116 + k * 4.5, 4.05, k % 2 ? -58.7 : -45.3));
    for (let k = 0; k < posts.length - 1; k++) lights(posts[k], posts[k + 1], { sag: 0.45, keys: ['bulbWarm', 'bulbAmber', 'bulbWarm'] });
    for (let x = -86; x < -62; x += 6) lights(V(x, 6.6, -44.4), V(x + 3, 6.6, -59.6), { sag: 0.8, keys: ['bulbWarm', 'bulbPink', 'bulbAmber'] }), lights(V(x + 3, 6.6, -59.6), V(x + 6, 6.6, -44.4), { sag: 0.8, keys: ['bulbWarm', 'bulbBlue', 'bulbAmber'] });
  }
  // a string of bulbs along the edge of the Nescafé awning
  lights(V(-171.2, 2.9, -146.4), V(-158.8, 2.9, -146.4), { sag: 0.25, keys: ['bulbWarm', 'bulbAmber'] });
  {
    const [x, z] = DHOL;
    const rang = canvasMaterial(512, 512, (g) => {
      const c = 256, cols = ['#ff7a1a', '#ffd000', '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#ffffff'];
      for (let r = 7; r > 0; r--) {
        g.fillStyle = cols[r % cols.length];
        g.beginPath();
        for (let a = 0; a <= 64; a++) { const t = (a / 64) * PI * 2, rr = r * 34 + (r % 2 ? 10 : 6) * Math.cos(t * (r % 2 ? 8 : 12)); g.lineTo(c + Math.cos(t) * rr, c + Math.sin(t) * rr); }
        g.fill();
      }
      g.fillStyle = '#7d1a22'; g.beginPath(); g.arc(c, c, 26, 0, PI * 2); g.fill();
    }, { transparent: true });
    rang.alphaTest = 0.1;
    solo(rang, new THREE.CircleGeometry(3.2, 48).rotateX(-PI / 2), x, 0.07, z, 0, false).receiveShadow = true;
    for (let a = 0; a < 8; a++) {
      const t = (a / 8) * PI * 2, px = x + Math.cos(t) * 7, pz = z + Math.sin(t) * 7;
      B.add('darkMetal', new THREE.CylinderGeometry(0.05, 0.06, 4.5, 6), px, 2.25, pz);
      C.circle(px, pz, 0.1);
      const t2 = ((a + 1) / 8) * PI * 2;
      lights(V(px, 4.4, pz), V(x + Math.cos(t2) * 7, 4.4, z + Math.sin(t2) * 7), { sag: 0.5, lanterns: 6 });
      lights(V(px, 4.4, pz), V(x, 6.5, z), { sag: 0.4, keys: ['bulbAmber', 'bulbWarm', 'bulbPink'] });
    }
    B.add('darkMetal', new THREE.CylinderGeometry(0.06, 0.06, 6.6, 6), x + 0.01, 3.3, z + 0.01);
    for (const k of lanternKeys) lantern(x + (k === 'lanternRed' ? 0.5 : -0.4), 6.4, z + (k === 'lanternYellow' ? 0.5 : -0.3), k);
  }

  // ---------------------------------------------------------------- moving parts
  // stage beams: additive cones from the moving heads
  const beams = [];
  const beamGeo = new THREE.ConeGeometry(2.4, 26, 20, 1, true);
  beamGeo.translate(0, -13, 0);
  const beamCols = [0xff3d7f, 0x4fa8ff, 0xffc04a, 0x8a5bff, 0x3dffb0];
  if (quality !== 'low') heads.forEach((p, i) => {
    const m = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: beamCols[i % beamCols.length], transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.position.copy(p);
    m.userData.noExport = true;
    m.frustumCulled = false;
    dyn.add(m);
    beams.push(m);
  });
  // a few real lights: stage wash, stalls, dhol circle, the gate arch
  const plights = [];
  const addLight = (c, i, d, x, y, z) => { const l = new THREE.PointLight(c, i, d, 2); l.position.set(x, y, z); dyn.add(l); plights.push(l); return l; };
  const stageLight = quality === 'low' ? null : addLight(0xff6ab0, 900, 60, sx, 10, front + 6);
  if (quality !== 'low') {
    addLight(0xffb066, 90, 30, -88, 6, -121);
    addLight(0xffb066, 90, 30, -38, 6, -121);
    addLight(0xffa040, 50, 18, DHOL[0], 7, DHOL[1]);
    addLight(0xffb070, 40, 18, 0, 9, -2);
    // the B-C plaza and the Nescafé store (browser only; Unreal lights the lamp heads instead)
    for (const [x, z, i] of [[-102, -52, 60], [-74, -52, 60], [-165, -147, 35]]) {
      const l = new THREE.PointLight(0xffc27a, i, 24, 2); l.position.set(x, 5, z); dyn.add(l);
    }
  }
  // fireworks
  const fireworks = new Fireworks(dyn, quality);
  // concert crowd: simple instanced figures, densest at the barrier, with an aisle to the stage
  const crowd = concertCrowd(dyn, R, quality, front);

  // LED wall drawing
  let ledClock = 0, ledFrame = 0;
  const ledLogo = logoImage('damru_logo_gold.png');
  ledLogo.onload = () => drawLed(0, 0.2);
  function drawLed(t, level) {
    const W = led.width, H = led.height;
    const hue = (t * 25) % 360;
    const gr = lg.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, `hsl(${hue},80%,${12 + level * 10}%)`);
    gr.addColorStop(1, `hsl(${(hue + 120) % 360},85%,${8 + level * 8}%)`);
    lg.fillStyle = gr; lg.fillRect(0, 0, W, H);
    // equaliser bars
    const n = 48;
    for (let i = 0; i < n; i++) {
      const v = (0.3 + 0.7 * Math.abs(Math.sin(t * (2 + level * 4) + i * 0.7) * Math.sin(t * 1.3 + i * 0.23))) * (0.35 + level * 0.65);
      lg.fillStyle = `hsla(${(hue + i * 6) % 360},95%,60%,0.85)`;
      lg.fillRect(i * (W / n) + 2, H - v * H * 0.55, W / n - 4, v * H * 0.55);
    }
    lg.textAlign = 'center'; lg.textBaseline = 'middle';
    lg.shadowColor = '#000'; lg.shadowBlur = 18;
    const bob = Math.sin(t * 2) * 4 * level;
    if (ledLogo.complete && ledLogo.naturalWidth) {
      const lh = H * 0.62, lw = lh * ledLogo.naturalWidth / ledLogo.naturalHeight;
      lg.drawImage(ledLogo, (W - lw) / 2, H * 0.04 + bob, lw, lh);
    } else {
      lg.fillStyle = '#ffe2a8'; lg.font = 'bold 150px Georgia, serif';
      lg.fillText('DAMRU', W / 2, H * 0.36 + bob);
    }
    lg.font = 'bold 40px "Avenir Next", Arial'; lg.fillStyle = '#ffffff';
    lg.fillText(level > 0.6 ? 'LIVE IN CONCERT' : 'RISHIHOOD · LIVE TONIGHT', W / 2, H * 0.74);
    lg.shadowBlur = 0;
    ledTex.needsUpdate = true;
  }
  drawLed(0, 0.2);

  const bulbMats = ['bulbWarm', 'bulbAmber', 'bulbPink', 'bulbBlue', 'bulbGreen'].map((k) => M[k]);
  const lanternMats = lanternKeys.map((k) => M[k]);
  return {
    passes, stallFronts, crowd, fireworks, heads, lights: plights,
    stageFront: { x: sx, z: front + 8 },
    /** level: 0 quiet .. 1 full concert */
    update(t, dt, level, camPos) {
      bulbMats.forEach((m, i) => { m.emissiveIntensity = 3.0 + 0.6 * Math.sin(t * (1.3 + i * 0.37) + i * 1.7); });
      lanternMats.forEach((m, i) => { m.emissiveIntensity = 1.2 + 0.2 * Math.sin(t * 2.1 + i * 2); });
      M.parGlow.emissiveIntensity = 2 + level * 6 * (0.5 + 0.5 * Math.sin(t * 8));
      beams.forEach((b, i) => {
        const sp = 0.6 + level * 1.4;
        b.rotation.x = i % 2 ? -(2.45 + 0.3 * Math.sin(t * sp * 0.9 + i * 0.8)) : -(0.5 + 0.35 * Math.sin(t * sp * 0.9 + i * 0.8));
        b.rotation.z = 0.6 * Math.sin(t * sp * 0.7 + i * 1.3);
        b.material.opacity = (0.05 + level * 0.11) * (0.75 + 0.25 * Math.sin(t * 6 + i));
        b.visible = level > 0.05;
      });
      if (stageLight) {
        stageLight.color.setHSL(((t * 0.08) % 1), 0.8, 0.6);
        stageLight.intensity = 250 + level * 900 * (0.6 + 0.4 * Math.sin(t * 5));
      }
      for (const p of passes) if (p.mesh.visible) { p.mesh.rotation.y = t * 2.4; p.mesh.position.y = 1.85 + Math.sin(t * 3 + p.i) * 0.08; }
      ledClock += dt;
      if (ledClock > 1 / 15) { ledClock = 0; ledFrame++; if (!camPos || Math.hypot(camPos.x - sx, camPos.z - sz) < 260) drawLed(t, level); }
      fireworks.update(dt, level);
      crowd.update(t, level, camPos);
    },
  };
}

// -------------------------------------------------------------------- fireworks
class Fireworks {
  constructor(parent, quality) {
    this.N = quality === 'low' ? 1500 : 4000;
    const N = this.N;
    this.pos = new Float32Array(N * 3);
    this.vel = new Float32Array(N * 3);
    this.col = new Float32Array(N * 3);
    this.base = new Float32Array(N * 3);
    this.life = new Float32Array(N);
    this.max = new Float32Array(N);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const sg = sprite.getContext('2d');
    const gr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    sg.fillStyle = gr; sg.fillRect(0, 0, 64, 64);
    const mat = new THREE.PointsMaterial({ size: 1.7, map: new THREE.CanvasTexture(sprite), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.userData.noExport = true;
    parent.add(this.points);
    this.next = 0;
    this.cursor = 0;
    this.rockets = [];
    this.timer = 3;
    this.onBang = null;
  }
  spawn(x, y, z, vx, vy, vz, c, life) {
    const i = this.cursor; this.cursor = (this.cursor + 1) % this.N;
    this.pos.set([x, y, z], i * 3); this.vel.set([vx, vy, vz], i * 3); this.col.set(c, i * 3); this.base.set(c, i * 3);
    this.life[i] = life; this.max[i] = life;
  }
  launch() {
    const x = -63 + (Math.random() - 0.5) * 90, z = -282 + Math.random() * 10;
    this.rockets.push({ x, y: 2, z, vy: 34 + Math.random() * 10, fuse: 1.4 + Math.random() * 0.7 });
  }
  burst(x, y, z) {
    const palettes = [[1, 0.35, 0.1], [1, 0.85, 0.3], [0.3, 0.6, 1], [1, 0.25, 0.6], [0.4, 1, 0.5], [1, 1, 1], [0.8, 0.4, 1]];
    const c1 = palettes[Math.floor(Math.random() * palettes.length)], c2 = palettes[Math.floor(Math.random() * palettes.length)];
    const n = 180, sp = 13 + Math.random() * 8, ring = Math.random() < 0.3;
    for (let k = 0; k < n; k++) {
      let dx, dy, dz;
      if (ring) { const a = (k / n) * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a) * 0.3; dz = Math.sin(a); }
      else { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u); dx = r * Math.cos(a); dy = u; dz = r * Math.sin(a); }
      const s = sp * (0.85 + Math.random() * 0.25);
      this.spawn(x, y, z, dx * s, dy * s, dz * s, k % 3 ? c1 : c2, 2.0 + Math.random() * 1.2);
    }
    if (this.onBang) this.onBang(x, y, z);
  }
  update(dt, level) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.launch();
      if (level > 0.6 && Math.random() < 0.5) this.launch();
      this.timer = level > 0.6 ? 0.5 + Math.random() * 0.9 : 7 + Math.random() * 7;
    }
    for (let r = this.rockets.length - 1; r >= 0; r--) {
      const k = this.rockets[r];
      k.y += k.vy * dt; k.vy -= 9 * dt; k.fuse -= dt;
      this.spawn(k.x + (Math.random() - 0.5) * 0.2, k.y, k.z, (Math.random() - 0.5) * 1.5, -2, (Math.random() - 0.5) * 1.5, [1, 0.7, 0.3], 0.5);
      if (k.fuse <= 0) { this.burst(k.x, k.y, k.z); this.rockets.splice(r, 1); }
    }
    const p = this.pos, v = this.vel, c = this.col;
    for (let i = 0; i < this.N; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const j = i * 3;
      v[j + 1] -= 4.2 * dt;
      const drag = Math.exp(-1.1 * dt);
      v[j] *= drag; v[j + 1] *= drag; v[j + 2] *= drag;
      p[j] += v[j] * dt; p[j + 1] += v[j + 1] * dt; p[j + 2] += v[j + 2] * dt;
      if (this.life[i] <= 0) { p[j + 1] = -100; continue; }
      const f = Math.min(1, this.life[i] / this.max[i] * 1.6) * (0.7 + 0.3 * Math.random());
      const b = this.base;
      c[j] = b[j] * f; c[j + 1] = b[j + 1] * f * f; c[j + 2] = b[j + 2] * f * f;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

// -------------------------------------------------------------------- concert crowd
function concertCrowd(parent, R, quality, stageFront) {
  // Jointed figures (legs, body, head, arms and hands as separate instanced parts), so every fan in
  // the crowd moves: they step and bob to the beat, sway, nod, clap, wave, pump their fists, film on
  // their phones and jump when the concert is on.
  const n = quality === 'low' ? 160 : quality === 'medium' ? 320 : 480;
  const part = (geo, x, y, z, col) => {
    geo.translate(x, y, z);
    const c = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < c.length; i += 3) c.set(col, i);
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'color'].includes(k)) geo.deleteAttribute(k);
    return geo.index ? geo.toNonIndexed() : geo;
  };
  const merge = (list) => {
    let count = 0; for (const g of list) count += g.attributes.position.count;
    const out = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'color']) {
      const arr = new Float32Array(count * 3); let o = 0;
      for (const g of list) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
      out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
    }
    return out;
  };
  const trouser = [0.07, 0.08, 0.12], skin = [0.62, 0.42, 0.3], hair = [0.04, 0.035, 0.03], shoe = [0.05, 0.05, 0.05], W1 = [1, 1, 1];
  const limb = (r0, r1, len) => new THREE.CylinderGeometry(r0, r1, len, 7);
  // each part is built round its own joint
  const HIP = 0.86, NECK = 0.58, SHOULDER = 0.52, SH_X = 0.225, LEG_X = 0.09;   // joints (body space, metres)
  const torsoGeo = (() => {
    const pts = [[0.15, 0.82], [0.165, 0.95], [0.18, 1.12], [0.2, 1.3], [0.19, 1.37], [0.12, 1.42], [0.05, 1.44]].map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(pts, 12);
    g.scale(1, 1, 0.62);
    return merge([part(g, 0, -HIP, 0, W1)]);                                     // joint: the hips
  })();
  const legGeo = merge([
    part(limb(0.075, 0.06, 0.84), 0, -0.42, 0, trouser),
    part(new THREE.SphereGeometry(0.075, 8, 5).scale(0.9, 0.5, 1.6), 0, -0.82, 0.04, shoe),
  ]);                                                                            // joint: the hip
  const headGeo = (long) => merge([
    part(new THREE.SphereGeometry(0.105, 12, 10).scale(0.92, 1.12, 1), 0, 0.16, 0.01, skin),
    part(new THREE.CylinderGeometry(0.05, 0.055, 0.12, 8), 0, 0.03, 0, skin),
    part(new THREE.SphereGeometry(0.112, 12, 6, 0, PI * 2, 0, PI * 0.52).scale(0.95, 1.1, 1.04), 0, 0.18, -0.006, hair),
    ...(long ? [part(new THREE.CylinderGeometry(0.1, 0.12, 0.34, 10, 1, true, PI * 0.3, PI * 1.4), 0, 0.06, -0.02, hair)] : []),
  ]);                                                                            // joint: the neck
  const armGeo = merge([part(limb(0.055, 0.045, 0.6), 0, -0.3, 0, W1)]);         // joint: the shoulder
  const handGeo = merge([part(new THREE.SphereGeometry(0.047, 6, 5), 0, -0.63, 0, skin)]);
  const mBase = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  const mShirt = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });

  const people = [];
  const shirts = [0xf2efe8, 0x7d1a22, 0x2f6fae, 0xe2b33c, 0x3a3d42, 0x4f7f52, 0xd9d4c8, 0xa33c2e, 0x1f2a44, 0xff7043, 0xffffff, 0xc2185b, 0x111111];
  const skinTones = [0xffd9c2, 0xf0c4a4, 0xe0ac88, 0xc68a64, 0xa86c4c];
  for (let i = 0; i < n; i++) {
    // more people close to the barrier; keep an aisle in the middle for walking to the stage
    let x, z;
    for (let tries = 0; tries < 20; tries++) {
      x = -100 + R() * 74;
      z = stageFront + 3.2 + Math.pow(R(), 1.7) * 52;
      if (Math.abs(x + 63) > 2.6 && !(Math.abs(x + 50) < 4.5 && z > -209 && z < -201)) break;
    }
    // dance styles: 0 wave both arms, 1 clap, 2 fist pump, 3 groove, 4 film on a phone
    const rs = R();
    const style = rs < 0.24 ? 0 : rs < 0.46 ? 1 : rs < 0.64 ? 2 : rs < 0.92 ? 3 : 4;
    people.push({
      x, z, yaw: Math.atan2(-63 - x, stageFront - z) + (R() - 0.5) * 0.6, s: 0.9 + R() * 0.16,
      ph: R() * 2, off: (R() - 0.5) * 0.18, energy: 0.7 + R() * 0.6, style, jump: R(),
      long: R() < 0.38, c: new THREE.Color(shirts[Math.floor(R() * shirts.length)]),
      tone: new THREE.Color(skinTones[Math.floor(R() * skinTones.length)]).multiplyScalar(1.45),
    });
  }
  const long = people.filter((p) => p.long), short = people.filter((p) => !p.long);
  const mk = (geo, mat, count) => {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, count));
    m.castShadow = false; m.receiveShadow = false; m.frustumCulled = false; m.userData.noExport = true;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    parent.add(m);
    return m;
  };
  const meshTorso = mk(torsoGeo, mShirt, n);
  const meshLegL = mk(legGeo, mBase, n), meshLegR = mk(legGeo, mBase, n);
  const meshHeadS = mk(headGeo(false), mBase, short.length), meshHeadL = mk(headGeo(true), mBase, long.length);
  const meshArmL = mk(armGeo, mShirt, n), meshArmR = mk(armGeo, mShirt, n);
  const meshHandL = mk(handGeo, mBase, n), meshHandR = mk(handGeo, mBase, n);
  const all = [meshTorso, meshLegL, meshLegR, meshHeadS, meshHeadL, meshArmL, meshArmR, meshHandL, meshHandR];
  people.forEach((p, i) => {
    for (const m of [meshTorso, meshArmL, meshArmR]) m.setColorAt(i, p.c);
    for (const m of [meshHandL, meshHandR]) m.setColorAt(i, p.tone);
    for (const m of [meshLegL, meshLegR]) m.setColorAt(i, WHITE);
  });
  short.forEach((p, i) => meshHeadS.setColorAt(i, p.tone));
  long.forEach((p, i) => meshHeadL.setColorAt(i, p.tone));
  for (const m of all) if (m.instanceColor) m.instanceColor.needsUpdate = true;

  const obstacles = people.map((p) => ({ x: p.x, z: p.z, r: 0.28 }));
  const base = new THREE.Matrix4(), torsoM = new THREE.Matrix4(), out = new THREE.Matrix4(), loc = new THREE.Matrix4();
  const q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  // a joint's transform: parent x translate(jx, jy, jz) x rotate(rx, ry, rz)
  const joint = (parentM, jx, jy, jz, rx, ry, rz) => {
    e.set(rx, ry, rz, 'XYZ');
    loc.makeRotationFromEuler(e).setPosition(jx, jy, jz);
    return out.multiplyMatrices(parentM, loc);
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  const BPS = 116 / 60;    // the concert's tempo, beats per second
  function place(level, t) {
    const live = Math.min(1, Math.max(0, (level - 0.3) / 0.6));    // 0 warm-up .. 1 concert
    let ishort = 0, ilong = 0;
    people.forEach((p, i) => {
      const b = t * BPS + p.off;                        // this fan's beat (a little ahead or behind)
      const en = p.energy * (0.35 + 0.65 * live);
      const beatUp = Math.abs(Math.sin(PI * b));         // 0 on the beat, 1 between
      // the whole body: bob, jump, sway, twist
      let y = beatUp * 0.05 * en;
      const jumper = p.jump < 0.3 && live > 0.5;
      if (jumper) y = Math.max(0, Math.sin(PI * b * 0.5 + p.ph)) * 0.32 * live;
      const sway = Math.sin(PI * b * 0.5 + p.ph) * 0.07 * en;
      const twist = Math.sin(PI * b * 0.25 + p.ph) * 0.18 * en;
      q.setFromAxisAngle(up, p.yaw + twist);
      base.compose(ps.set(p.x, y, p.z), q, sc.set(p.s, p.s, p.s));
      // legs: stepping from foot to foot, both tucked a little when jumping
      const step = jumper ? 0 : Math.sin(PI * b + p.ph) * 0.2 * en;
      const tuck = jumper ? -0.25 * Math.max(0, Math.sin(PI * b * 0.5 + p.ph)) : 0;
      meshLegL.setMatrixAt(i, joint(base, -LEG_X, HIP, 0, step + tuck, 0, 0.03));
      meshLegR.setMatrixAt(i, joint(base, LEG_X, HIP, 0, -step + tuck, 0, -0.03));
      // body leaning with the sway, head nodding on the beat
      torsoM.copy(joint(base, 0, HIP, 0, 0.05 + beatUp * 0.04 * en, 0, sway));
      meshTorso.setMatrixAt(i, torsoM);
      const head = joint(torsoM, 0, NECK, 0, -0.05 + Math.sin(2 * PI * b) * 0.1 * en, Math.sin(PI * b * 0.25 + p.ph * 2) * 0.25, -sway * 0.6);
      if (p.long) meshHeadL.setMatrixAt(ilong++, head); else meshHeadS.setMatrixAt(ishort++, head);
      // arms: [x (forward/back), z (out to the side)] for the left and right arm; at rest they hang
      const swing = Math.sin(PI * b + p.ph) * 0.12;
      let L = [swing, -0.12], Rr = [-swing, 0.12], k = live;
      if (p.style === 0) {                                // both arms up, waving side to side
        const w = Math.sin(PI * b * 0.5 + p.ph) * 0.35;
        L = [-0.2, -(2.55 + w)]; Rr = [-0.2, 2.55 - w];
      } else if (p.style === 1) {                         // clapping in front, on every beat
        const c = 0.5 + 0.5 * Math.cos(2 * PI * b);
        L = [-1.25, 0.12 + 0.3 * c]; Rr = [-1.25, -(0.12 + 0.3 * c)];
        k = Math.max(k, 0.55);                            // people clap during the warm-up too
      } else if (p.style === 2) {                         // fist pumping on the beat
        const pump = Math.max(0, Math.sin(2 * PI * b));
        Rr = [-(2.2 + 0.55 * pump), 0.3]; L = [swing * 1.5, -0.18];
      } else if (p.style === 3) {                         // grooving: arms swinging, elbows out
        L = [Math.sin(PI * b + p.ph) * 0.55, -0.32]; Rr = [-Math.sin(PI * b + p.ph) * 0.55, 0.32];
        k = Math.max(k, 0.45);
      } else {                                            // filming the stage on a phone
        Rr = [-1.9 + Math.sin(t * 0.7 + p.ph) * 0.05, 0.12]; L = [0.05, -0.1];
        k = Math.max(k, 0.8);
      }
      const ax = lerp(swing, L[0], k), az = lerp(-0.12, L[1], k), bx = lerp(-swing, Rr[0], k), bz = lerp(0.12, Rr[1], k);
      const armL = joint(torsoM, -SH_X, SHOULDER, 0, ax, 0, az);
      meshArmL.setMatrixAt(i, armL); meshHandL.setMatrixAt(i, armL);
      const armR = joint(torsoM, SH_X, SHOULDER, 0, bx, 0, bz);
      meshArmR.setMatrixAt(i, armR); meshHandR.setMatrixAt(i, armR);
    });
    for (const m of all) m.instanceMatrix.needsUpdate = true;
  }
  place(0, 0);
  let clock = 0;
  return {
    obstacles, people,
    update(t, level, camPos) {
      clock += 1;
      const far = camPos && Math.hypot(camPos.x + 63, camPos.z + 215) > 180;
      if (!far && clock % 2 === 0) place(level, t);
    },
  };
}
const WHITE = new THREE.Color(1, 1, 1);
