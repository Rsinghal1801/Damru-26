// Builds the Rishihood campus on the hand-drawn map: walls, Gate 2 and its tower, the ring road,
// Blocks A, B and C round the flag circle, Residency 1, 2 and 3, Residency-4, the courts, the
// Learners Arena and the two big grounds. Static pieces are merged per material.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { StaticBuilder, boxGeo, groundGeo, quadGeo, barGeo } from './builder.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { Colliders } from './collide.js';
import { canvasMaterial, logoSign } from './materials.js';
import { tex } from './assets.js';
import { makeGround } from './ground.js';
import { WALL, BUILDINGS, PAVING, SAND_GROUND, COURTS, FLAG_CIRCLE, GARDEN, R as MR, P as MP } from './layout.js';
import { rng } from './util.js';
import { buildFest } from './fest.js';

const PI = Math.PI;

// lumpy, smooth-shaded shrub shapes (a few variants, cloned) with UVs in metres
const BUSHES = [];
function bush(r) {
  if (!BUSHES.length) {
    const R = rng(5);
    for (let v = 0; v < 4; v++) {
      let g = new THREE.IcosahedronGeometry(1, 2);
      g.deleteAttribute('normal'); g.deleteAttribute('uv');
      g = mergeVertices(g);
      const p = g.attributes.position, n = new THREE.Vector3();
      const ph = [R() * 6, R() * 6, R() * 6];
      for (let i = 0; i < p.count; i++) {
        n.fromBufferAttribute(p, i);
        const k = 1 + 0.13 * Math.sin(n.x * 5 + ph[0]) * Math.sin(n.y * 4 + ph[1]) + 0.1 * Math.sin(n.z * 6 + ph[2]) + (R() - 0.5) * 0.08;
        p.setXYZ(i, n.x * k, n.y * k * 0.85, n.z * k);
      }
      g.computeVertexNormals();
      BUSHES.push(g);
    }
  }
  const g = BUSHES[Math.floor(Math.random() * BUSHES.length)].clone();
  g.scale(r, r, r);
  const p = g.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) + p.getZ(i) * 0.7; uv[i * 2 + 1] = p.getY(i) + p.getZ(i) * 0.3; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** The four outside faces of a rectangle: start point, along direction, outward normal, yaw. */
function faces(b) {
  return {
    s: { px: b.x0, pz: b.z1, ux: 1, uz: 0, nx: 0, nz: 1, len: b.x1 - b.x0, yaw: 0 },
    n: { px: b.x1, pz: b.z0, ux: -1, uz: 0, nx: 0, nz: -1, len: b.x1 - b.x0, yaw: PI },
    e: { px: b.x1, pz: b.z1, ux: 0, uz: -1, nx: 1, nz: 0, len: b.z1 - b.z0, yaw: PI / 2 },
    w: { px: b.x0, pz: b.z0, ux: 0, uz: 1, nx: -1, nz: 0, len: b.z1 - b.z0, yaw: -PI / 2 },
  };
}
const at = (f, t, off) => [f.px + f.ux * t + f.nx * off, f.pz + f.uz * t + f.nz * off];

function signMaterial(text, { w = 1024, h = 256, bg = '#f4f1ea', fg = '#7d1a22', font = 'bold 150px "Avenir Next", Arial', emissive = 0, sub = null, subFont = 'bold 64px Arial', border = null } = {}) {
  return canvasMaterial(w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    if (border) { g.strokeStyle = border; g.lineWidth = 14; g.strokeRect(10, 10, w - 20, h - 20); }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = font;
    g.fillText(text, w / 2, sub ? h * 0.4 : h / 2);
    if (sub) { g.font = subFont; g.fillText(sub, w / 2, h * 0.74); }
  }, { emissive });
}

/** A repeating canvas texture material; `metres` is the size one canvas covers. */
function tiledCanvas(size, metres, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / metres, 1 / metres);
  t.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, ...opts });
}

function extraMaterials(M) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const R = rng(3);
  // light grey slabs with dark grey bands (the forecourt inside Gate 2)
  M.forecourt = tiledCanvas(256, 4, (g, s) => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const v = 168 + R() * 18;
      g.fillStyle = `rgb(${v + 3},${v + 1},${v - 3})`;
      g.fillRect(x * 64 + 1, y * 64 + 1, 62, 62);
    }
    g.fillStyle = '#5d6064';
    g.fillRect(0, 0, s, 10);
    g.fillRect(0, 128, s, 10);
  }, { roughness: 0.75 });
  // white and grey stripes of the drop-off point
  M.striped = tiledCanvas(256, 4, (g, s) => {
    g.fillStyle = '#d9dadb'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#7d8084';
    for (let x = 0; x < s; x += 128) g.fillRect(x, 0, 30, s);
    g.strokeStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < s; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke(); }
  }, { roughness: 0.7 });
  M.asphalt = tiledCanvas(256, 6, (g, s) => {
    g.fillStyle = '#4a4946'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 2500; i++) { const v = 50 + R() * 50; g.fillStyle = `rgb(${v},${v},${v - 4})`; g.fillRect(R() * s, R() * s, 2, 2); }
  }, { roughness: 0.95 });
  // corrugated white metal sheets of the construction fence
  M.sheet = tiledCanvas(128, 1.2, (g, s) => {
    for (let x = 0; x < s; x++) {
      const v = 200 + 40 * Math.sin((x / s) * PI * 2 * 6);
      g.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
      g.fillRect(x, 0, 1, s);
    }
    g.fillStyle = 'rgba(150,100,60,0.15)';
    g.fillRect(0, s * 0.85, s, s * 0.15);
  }, { roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide });
  M.tarp = std({ color: 0x2f8f5a, roughness: 0.8, side: THREE.DoubleSide });
  M.silver = std({ color: 0xcfd2d4, roughness: 0.4, metalness: 0.6 });
  M.redDoor = std({ color: 0xc0161c, roughness: 0.5 });
  M.nesRed = std({ color: 0x9e1219, roughness: 0.45 });
  M.nesCream = std({ color: 0xf1e4cc, roughness: 0.6 });
  M.nesUmbrella = std({ color: 0xb3141d, roughness: 0.7, side: THREE.DoubleSide });
  M.yellow = std({ color: 0xf2c200, roughness: 0.6 });
  M.gravelPink = std({ color: 0xb78a7f, roughness: 1, flatShading: true });
  M.gravelGrey = std({ color: 0x8d8c88, roughness: 1, flatShading: true });
  M.drum = std({ color: 0xd98a1c, roughness: 0.7 });
  M.dumpster = std({ color: 0x2f5d3a, roughness: 0.6, metalness: 0.3 });
  M.granite = std({ color: 0x1d1e20, roughness: 0.25, metalness: 0.1 });
  M.panel = std({ color: 0xb9bcbd, roughness: 0.5, metalness: 0.4 });
  M.greyMetal = std({ color: 0x55595d, roughness: 0.45, metalness: 0.6 });
  M.tensile = std({ color: 0xf6f4ee, roughness: 0.6, side: THREE.DoubleSide });
  M.brickRed = std({ color: 0x9a4a3a, roughness: 0.9 });
  M.tennis = std({ color: 0x2f5f8f, roughness: 0.8 });
  M.winLit = std({ color: 0x3a3226, emissive: 0xffc98a, emissiveIntensity: 1.25, roughness: 0.2, metalness: 0.3 });
  const lawn = tex('grass.jpg').clone();
  lawn.wrapS = lawn.wrapT = THREE.RepeatWrapping; lawn.repeat.set(3, 3); lawn.needsUpdate = true;
  M.lawnDisc = std({ map: lawn, color: 0xd8f0c0, roughness: 1 });
}

export function buildWorld(scene, M, quality) {
  extraMaterials(M);
  const B = new StaticBuilder();
  const C = new Colliders();
  const map = [];    // footprints for the mini-map: {x0, z0, x1, z1, c}
  const trees = [];  // {x, z, s, kind}
  const palms = [];  // {x, z, h}
  const anims = [];  // per-frame callbacks (flags, banners)
  const group = new THREE.Group();
  group.name = 'campus';
  scene.add(group);
  const R = rng(42);
  const solo = (mat, geo, x, y, z, yaw = 0, cast = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.rotation.y = yaw;
    m.castShadow = cast; m.receiveShadow = true;
    group.add(m);
    return m;
  };
  const foot = (x0, z0, x1, z1, c) => map.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), c });
  const footR = (r, c) => foot(r.x0, r.z0, r.x1, r.z1, c);

  // ------------------------------------------------------------ ground
  makeGround(scene, (g, toPx, px) => {
    const fill = (r, style) => {
      const [a, b] = toPx(r.x0, r.z0); const [c, d] = toPx(r.x1, r.z1);
      g.fillStyle = style; g.fillRect(a, b, c - a, d - b);
    };
    fill(SAND_GROUND, 'rgb(0,40,255)');
    // the fest grounds are worn by the crowd: dirt where people stand and queue
    const blot = (x, z, r, a) => {
      const [cx, cz] = toPx(x, z), rad = px(r);
      const gr = g.createRadialGradient(cx, cz, 0, cx, cz, rad);
      gr.addColorStop(0, `rgba(40,255,0,${a})`); gr.addColorStop(1, 'rgba(40,255,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cz, rad, 0, PI * 2); g.fill();
    };
    for (let i = 0; i < 60; i++) blot(-100 + R() * 74, -186 - R() * 58, 4 + R() * 7, 0.5 + R() * 0.4);
    for (let i = 0; i < 40; i++) blot(-114 + R() * 102, -114 - R() * 14, 3 + R() * 4, 0.6);
    fill(MR(-12, 20, -6, 84), 'rgba(40,200,0,0.35)');        // worn edge of the lawn by the east road
    fill(MR(-191, 92, -186, 272), 'rgba(40,255,0,0.6)');     // worn strip beside the residencies
  });
  foot(WALL.x0, WALL.z0, WALL.x1, WALL.z1, '#6f8150');
  footR(SAND_GROUND, '#d6c38f');

  // ------------------------------------------------------------ paving + kerbs
  const pcol = { checker: '#a08a88', pavers: '#a7a49e', plaza: '#c9c6bf', forecourt: '#b5b8bb', striped: '#d7d9db', concrete: '#bdbab3', asphalt: '#555' };
  PAVING.forEach(([mat, r], i) => {
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    const y = (mat === 'plaza' ? 0.06 : 0.035) + i * 0.0015;
    B.add(mat, groundGeo(w, d), (r.x0 + r.x1) / 2, y, (r.z0 + r.z1) / 2);
    if (mat !== 'asphalt' && (w < 14 || d < 14)) {
      if (d > w) for (const x of [r.x0, r.x1]) B.box('kerb', 0.18, 0.14, d, x, 0.07, (r.z0 + r.z1) / 2);
      else for (const z of [r.z0, r.z1]) B.box('kerb', w, 0.14, 0.18, (r.x0 + r.x1) / 2, 0.07, z);
    }
    footR(r, pcol[mat]);
  });

  // ------------------------------------------------------------ boundary wall with pipe rails
  const wallH = 2.2;
  const midX = (WALL.x0 + WALL.x1) / 2, midZ = (WALL.z0 + WALL.z1) / 2;
  const wallSeg = (x0, z0, x1, z1) => {
    const along = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const len = along ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, yaw = along ? 0 : PI / 2;
    B.add('brick', boxGeo(len, wallH, 0.36), cx, wallH / 2, cz, yaw);
    B.add('concrete', boxGeo(len + 0.1, 0.1, 0.46), cx, wallH + 0.05, cz, yaw);
    for (const h of [wallH + 0.45, wallH + 0.85]) B.add('darkMetal', boxGeo(len, 0.08, 0.08), cx, h, cz, yaw);
    // pipes along the inner face (towards the middle of the campus)
    const ix = along ? 0 : Math.sign(midX - cx) * 0.26, iz = along ? Math.sign(midZ - cz) * 0.26 : 0;
    for (const h of [0.9, 1.5]) B.add('darkMetal', boxGeo(len, 0.11, 0.14), cx + ix, h, cz + iz, yaw);
    for (let t = 0; t <= len; t += 3) {
      const x = along ? Math.min(x0, x1) + t : cx, z = along ? cz : Math.min(z0, z1) + t;
      B.add('darkMetal', boxGeo(0.07, 0.95, 0.07), x, wallH + 0.47, z);
    }
    C.rect(Math.min(x0, x1) - 0.25, Math.min(z0, z1) - 0.25, Math.max(x0, x1) + 0.25, Math.max(z0, z1) + 0.25, 3);
    foot(Math.min(x0, x1) - 0.5, Math.min(z0, z1) - 0.5, Math.max(x0, x1) + 0.5, Math.max(z0, z1) + 0.5, '#5a2d22');
  };
  wallSeg(WALL.x0, WALL.z0, WALL.x1, WALL.z0);
  wallSeg(WALL.x0, WALL.z0, WALL.x0, WALL.z1);
  wallSeg(WALL.x1, WALL.z0, WALL.x1, WALL.z1);
  wallSeg(WALL.x0, WALL.z1, WALL.gateX0 - 0.7, WALL.z1);
  wallSeg(WALL.gateX1 + 0.7, WALL.z1, WALL.x1, WALL.z1);

  // ------------------------------------------------------------ Gate 2: lattice gates swung open, tower, cabin
  for (const x of [WALL.gateX0 - 0.7, WALL.gateX1 + 0.7]) {
    B.box('brick', 1.3, 3.2, 1.3, x, 1.6, 0);
    B.box('concrete', 1.5, 0.2, 1.5, x, 3.3, 0);
    C.rect(x - 0.65, -0.65, x + 0.65, 0.65, 3.3);
  }
  for (const [hx, yaw] of [[WALL.gateX0, THREE.MathUtils.degToRad(80)], [WALL.gateX1, THREE.MathUtils.degToRad(100)]]) {
    const dx = Math.cos(yaw), dz = -Math.sin(yaw);
    solo(M.gate, quadGeo(5.9, 2.4), hx + dx * 2.95, 1.25, dz * 2.95, yaw);
    B.add('darkMetal', barGeo(V(hx, 2.45, 0), V(hx + dx * 5.9, 2.45, dz * 5.9), 0.04, 6));
    B.add('darkMetal', barGeo(V(hx, 0.08, 0), V(hx + dx * 5.9, 0.08, dz * 5.9), 0.04, 6));
  }
  gateTower(BUILDINGS.gateTower);
  {
    const c = BUILDINGS.cabin, cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2;
    B.box('brick', c.x1 - c.x0, c.h, c.z1 - c.z0, cx, c.h / 2, cz);
    B.box('concrete', c.x1 - c.x0 + 1.2, 0.18, c.z1 - c.z0 + 1.2, cx, c.h + 0.09, cz);
    B.add('glass', quadGeo(1.4, 1.0), cx + 1, 1.7, c.z1 + 0.02);
    B.add('frame', quadGeo(0.95, 2.1), c.x0 - 0.02, 1.05, cz, -PI / 2);
    solo(signMaterial('2', { w: 256, h: 256, bg: '#f4f1ea', fg: '#222', font: 'bold 190px Arial' }), quadGeo(0.5, 0.5), c.x0 + 0.6, 2.6, c.z1 + 0.03, 0, false);
    C.rect(c.x0, c.z0, c.x1, c.z1, c.h);
    footR(c, '#8c3f2e');
  }
  // the welcome board on the forecourt
  {
    const wb = logoSign({ w: 1024, h: 512, bg: '#fbfaf7', top: 'WELCOME TO', fg: '#555' });
    solo(wb, quadGeo(2.6, 1.3), 10.6, 1.25, -19.5, -PI / 2, false);
    B.box('white', 0.08, 1.4, 2.7, 10.72, 1.2, -19.5);
    B.box('redSign', 0.1, 0.12, 2.7, 10.6, 0.6, -19.5);
  }
  // garden circle with palms and a flag, outside the gate
  {
    const [cx, cz] = GARDEN.c, r = GARDEN.r;
    for (let a = 0; a < 30; a++) {
      const t = (a / 30) * PI * 2;
      B.add('hedge', bush(0.55), cx + Math.cos(t) * (r - 0.6), 0.5, cz + Math.sin(t) * (r - 0.6), R() * PI, 1.2, 0.8, 1.2);
    }
    B.add('kerb', new THREE.CylinderGeometry(r, r, 0.18, 40, 1, true), cx, 0.09, cz);
    for (const [dx, dz] of [[-2.5, -1], [2.5, 1.5], [0, 3.5], [-1, -4]]) palms.push({ x: cx + dx, z: cz + dz, h: 5.5 + R() * 2.5 });
    for (let i = 0; i < 18; i++) { const t = R() * PI * 2, rr = 1.5 + R() * 4.5; flowerBush(cx + Math.cos(t) * rr, cz + Math.sin(t) * rr, R() < 0.6 ? 'flowerYellow' : 'flowerPink'); }
    flagPole(cx + 4, cz - 3, 6, 'cmgga');
    C.circle(cx, cz, r - 0.2);
    foot(cx - r, cz - r, cx + r, cz + r, '#5d7d45');
  }

  // ------------------------------------------------------------ the avenue (south ring road)
  for (let x = -196; x < -16; x += 9) {
    trees.push({ x: x + (R() - 0.5) * 2, z: -3.4 + (R() - 0.5), s: 0.85 + R() * 0.3, kind: R() < 0.5 ? 'ash' : 'oak' });
    if (Math.round((x + 196) / 9) % 2 === 0) lamp(x + 4.5, -6.3, 0);
  }
  for (const x of [-40, -46, -150]) { B.box('panel', 0.9, 1.6, 0.45, x, 0.8, -5.6); C.rect(x - 0.45, -5.85, x + 0.45, -5.35, 1.6); }
  for (const x of [-30, -96]) B.box('redDoor', 0.7, 0.9, 0.3, x, 1.0, -5.8);
  hedgeRow(-16, -20.6, -54, -20.6, 0.8, true, 'flowerWhite');
  for (let x = -58; x > -118; x -= 2.6) pot(x, -21.2);
  for (let x = -142; x > -186; x -= 2.6) pot(x, -21.2);
  for (let x = -20; x > -52; x -= 4) flowerBush(x, -23, 'flowerWhite');   // frangipani
  // freestanding brick screen wall where the avenue turns north
  B.box('brick', 1.2, 3.4, 9, -207.5, 1.7, -11);
  B.box('concrete', 1.4, 0.15, 9.2, -207.5, 3.47, -11);
  C.rect(-208.1, -15.5, -206.9, -6.5, 3.4);
  foot(-208.1, -15.5, -206.9, -6.5, '#7a2f22');
  for (const x of [-160, -168, -176, -184]) parkedCar(x, -8.8, PI / 2);

  // ------------------------------------------------------------ Block A, Block B, Block C and the flag circle
  aBlock(BUILDINGS.blockA);
  jaliBlock(BUILDINGS.blockB, ['s', 'e'], 'n');
  jaliBlock(BUILDINGS.blockC, ['e', 'n'], 's');
  for (const [b, name] of [[BUILDINGS.blockA, 'BLOCK A'], [BUILDINGS.blockB, 'BLOCK B'], [BUILDINGS.blockC, 'BLOCK C']]) {
    const f = faces(b)[b === BUILDINGS.blockA ? 'e' : 'e'];
    const [x, z] = at(f, f.len * 0.2, 0.06);
    solo(signMaterial(name, { w: 1024, h: 180, bg: null, fg: '#f1ece2', font: 'bold 130px "Avenir Next", Arial' }), quadGeo(4.2, 0.74), x, 4.5, z, f.yaw, false);
  }
  // two skybridges between Block B and Block C, across the plaza
  {
    const bx0 = -86, bx1 = -62, zN = -60, zS = -44;
    for (const y of [7.8, 11.7]) {
      B.box('concrete', bx1 - bx0, 0.5, zS - zN, (bx0 + bx1) / 2, y, (zN + zS) / 2);
      B.box('concrete', bx1 - bx0, 0.4, zS - zN, (bx0 + bx1) / 2, y + 3.2, (zN + zS) / 2);
      for (const x of [bx0 + 0.6, bx1 - 0.6]) B.box('concrete', 0.5, 2.8, zS - zN, x, y + 1.65, (zN + zS) / 2);
      B.add('glass', quadGeo(bx1 - bx0 - 1.2, 2.6), (bx0 + bx1) / 2, y + 1.6, zS - 0.1, 0);
      B.add('glass', quadGeo(bx1 - bx0 - 1.2, 2.6), (bx0 + bx1) / 2, y + 1.6, zN + 0.1, PI);
      B.box('concreteDark', bx1 - bx0, 0.3, 0.35, (bx0 + bx1) / 2, y - 0.3, zS);
    }
  }
  dropoffCanopy(-47, -52);
  {
    const pick = signMaterial('PICK-UP &', { w: 512, h: 768, bg: '#ffffff', fg: '#c62828', font: 'bold 78px Arial', sub: 'DROP-OFF POINT', subFont: 'bold 56px Arial', border: '#c62828' });
    for (const [x, z] of [[-37, -39], [-37, -65]]) {
      solo(pick, quadGeo(0.8, 1.2), x, 1.2, z, PI / 2, false);
      for (const s of [-1, 1]) B.box('darkMetal', 0.04, 1.8, 0.04, x, 0.9, z + s * 0.42);
    }
    for (const z of [-36, -68]) {
      B.box('granite', 2.0, 0.9, 2.0, -54, 0.45, z);
      palms.push({ x: -54, z, h: 5.5 + R() * 2, base: 0.9 });
      C.rect(-55, z - 1, -53, z + 1, 0.9);
    }
  }
  // the flag circle: round lawn with the national flag, on the green between Block A and Block C
  {
    const [fx, fz] = FLAG_CIRCLE.c, r = FLAG_CIRCLE.r;
    B.add('lawnDisc', new THREE.CircleGeometry(r, 40).rotateX(-PI / 2), fx, 0.09, fz);
    B.add('kerb', new THREE.CylinderGeometry(r, r, 0.3, 40, 1, true), fx, 0.15, fz);
    for (let a = 0; a < 26; a++) { const t = (a / 26) * PI * 2; B.add('hedge', bush(0.45), fx + Math.cos(t) * (r - 0.5), 0.4, fz + Math.sin(t) * (r - 0.5), R() * PI, 1.1, 0.8, 1.1); }
    for (let i = 0; i < 12; i++) { const t = R() * PI * 2, rr = 1.6 + R() * 3; flowerBush(fx + Math.cos(t) * rr, fz + Math.sin(t) * rr, ['flowerYellow', 'flowerPink', 'flowerWhite'][i % 3]); }
    B.add('steel', new THREE.CylinderGeometry(0.09, 0.17, 24, 12), fx, 12, fz);
    B.add('stone', boxGeo(2.4, 0.6, 2.4), fx, 0.3, fz);
    const flagGeo = new THREE.PlaneGeometry(4.5, 3, 18, 6);
    flagGeo.translate(2.25, 0, 0);
    solo(M.flag, flagGeo, fx + 0.1, 22.4, fz, 0, false);
    const base = flagGeo.attributes.position.array.slice();
    anims.push((t) => {
      const p = flagGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3];
        p.setZ(i, Math.sin(x * 1.6 - t * 5) * 0.18 * (x / 4.5) + Math.sin(x * 3.1 - t * 7.3) * 0.05 * (x / 4.5));
      }
      p.needsUpdate = true;
      flagGeo.computeVertexNormals();
    });
    C.circle(fx, fz, r);
    foot(fx - r, fz - r, fx + r, fz + r, '#5d7d45');
  }
  // flag row and granite planters on the strip along Block A
  {
    const cols = ['flagBlue', 'flagRed', 'flagYellow', 'flagGreen', 'flagSaffron', 'flagBlue', 'flagRed', 'flagGreen'];
    cols.forEach((c, i) => flagPole(-131.5, -30 - i * 6, 8, c));
    for (const z of [-26, -78]) {
      B.box('granite', 2.4, 0.75, 5, -137, 0.38, z);
      B.add('hedge', boxGeo(2.1, 0.3, 4.7), -137, 0.85, z);
      palms.push({ x: -137, z: z - 1.2, h: 3.5 + R() * 2.5, base: 0.75 }, { x: -137, z: z + 1.4, h: 3.5 + R() * 2.5, base: 0.75 });
      C.rect(-138.2, z - 2.5, -135.8, z + 2.5, 0.8);
    }
    for (const z of [-40, -56, -68]) bench(-138.6, z, PI / 2);
    const ab = signMaterial('BLOCK A', { w: 512, h: 768, bg: '#ffffff', fg: '#c62828', font: 'bold 92px Arial', border: '#c62828' });
    solo(ab, quadGeo(0.8, 1.2), -131, 1.2, -24, PI / 2, false);
    for (const s of [-1, 1]) B.box('darkMetal', 0.04, 1.8, 0.04, -131, 0.9, -24 + s * 0.42);
  }
  // lawn east of Block B and Block C (kept, just narrower now): young trees and the walk to the east road
  for (let i = 0; i < 10; i++) {
    const x = -32 + R() * 22, z = -24 - R() * 58;
    if (Math.abs(z + 52) < 5) continue;
    trees.push({ x, z, s: 0.55 + R() * 0.4, kind: R() < 0.6 ? 'ash' : 'oak' });
  }
  hedgeRow(-34, -48.4, -10, -48.4, 0.7, true, 'flowerPink');
  hedgeRow(-34, -55.6, -10, -55.6, 0.7, true, 'flowerYellow');
  for (const [x, z] of [[-22, -70], [-28, -76], [-24, -33]]) bench(x, z, R() * PI);

  // the plaza between Block B and Block C, from the inner road to the drop-off: lamp posts down both
  // sides (staggered), low hedges and benches where it opens onto the lawns west of the blocks
  for (let x = -116; x <= -60; x += 9) plazaLamp(x, -45.3);
  for (let x = -111.5; x <= -60; x += 9) plazaLamp(x, -58.7);
  for (const z of [-43.3, -60.7]) { hedgeRow(-118, z, -106, z, 0.6, true, 'flowerYellow'); hedgeRow(-100, z, -90, z, 0.6, true, 'flowerPink'); }
  for (const [x, z, yaw] of [[-109, -47, 0], [-95, -47, 0], [-104, -57, PI], [-90, -57, PI]]) bench(x, z, yaw);
  // lawns west of the blocks, where they used to stand
  for (const [x, z] of [[-112, -30], [-100, -37], [-110, -39], [-95, -28], [-116, -64], [-92, -64], [-116, -81.5], [-92, -81.5]]) {
    trees.push({ x: x + (R() - 0.5) * 2, z: z + (R() - 0.5) * 2, s: 0.6 + R() * 0.35, kind: R() < 0.5 ? 'oak' : 'ash' });
  }
  bench(-104, -31, R() * PI);
  for (const x of [-113.5, -94.5]) bench(x, -72.5, PI / 2);   // facing the flag circle

  // ------------------------------------------------------------ Residency 1, 2 and 3 and the Nescafé store
  for (const k of ['res1', 'res2', 'res3']) residency(BUILDINGS[k]);
  nescafe(BUILDINGS.nescafe);
  for (const z of [-206]) trees.push({ x: -164 + R() * 14, z, s: 0.6 + R() * 0.3, kind: 'oak' });
  for (let z = -100; z > -268; z -= 26) lamp(-128.8, z, 1);
  // AC units on pads in the strip between the west wings and the west road
  for (let z = -104; z > -260; z -= 9) if (R() < 0.6) { B.box('concrete', 1.4, 0.25, 1.6, -188.4, 0.12, z); B.box('acUnit', 0.9, 1.3, 1.2, -188.4, 0.9, z); C.rect(-189.1, z - 0.8, -187.7, z + 0.8, 1.6); }

  // ------------------------------------------------------------ the west street: parking strip and kiosks
  for (let z = -24; z > -270; z -= 5.4) {
    if (Math.abs(z + 66) < 9 || Math.abs(z + 206) < 9) continue;
    if (z < -130 && z > -180 && R() < 0.6) { motorbike(-207.5, z, PI / 2 + (R() - 0.5) * 0.4); continue; }
    if (R() < 0.8) parkedCar(-207.6, z, R() < 0.5 ? 0 : PI);
  }
  for (let z = -40; z > -270; z -= 16) trees.push({ x: -210.6, z: z + R() * 3, s: 0.8 + R() * 0.3, kind: 'ash' });
  for (let z = -30; z > -272; z -= 26) lamp(-202.4, z, 1);
  smallBrick(BUILDINGS.kiosk1, false);
  smallBrick(BUILDINGS.kiosk2, true);
  {
    for (const z of [-96, -104]) { B.box('concrete', 1.2, 5, 1.2, -210.8, 2.5, z); C.rect(-211.4, z - 0.6, -210.2, z + 0.6, 5); }
    B.box('concrete', 1.6, 1.0, 9.6, -210.8, 5.5, -100);
    for (const z of [-97, -101]) stopBarrier(-206.5, z);
  }

  // ------------------------------------------------------------ north-west corner and the north wall
  for (const [x, z] of [[-196, -287], [-184, -287.5]]) cableDrum(x, z);
  for (const [x, z] of [[-172, -287], [-150, -287]]) brickPile(x, z);
  B.box('dumpster', 2.4, 1.3, 1.4, -160, 0.75, -287.3);
  C.rect(-161.3, -288.1, -158.7, -286.5, 1.4);
  for (let x = -130; x < 0; x += 9) trees.push({ x: x + R() * 2, z: -287.6, s: 0.55 + R() * 0.2, kind: 'ash' });
  for (let x = -190; x < 0; x += 30) lamp(x, -285.2, 0);

  // ------------------------------------------------------------ east side: Arena, courts, sand ground
  {
    const s = SAND_GROUND;
    chainFence(s.x0, s.z0, s.x1, s.z0, 3.5); chainFence(s.x0, s.z1, s.x1, s.z1, 3.5);
    chainFence(s.x0, s.z0, s.x0, s.z1 - 8, 3.5); chainFence(s.x1, s.z0, s.x1, s.z1, 3.5);
  }
  for (const [x, y] of [[20.5, 250], [20.5, 262]]) canopy(x, -y);
  smallBrick(BUILDINGS.pump, false, true);
  hydrant(48, -276);
  arena(BUILDINGS.arena);
  for (let z = -170; z > -276; z -= 12) lamp(8.8, z, 1);
  tennisVolley(COURTS);
  for (let z = -100; z > -270; z -= 10) trees.push({ x: -9 + (R() - 0.5), z, s: 0.8 + R() * 0.3, kind: R() < 0.5 ? 'oak' : 'ash' });
  for (let z = -30; z > -276; z -= 20) lamp(-7.2, z, 1);

  // ------------------------------------------------------------ Residency-4: tower, entrance and the long block
  res4Block(BUILDINGS.res4);
  {
    const t = BUILDINGS.res4Tower, b = BUILDINGS.res4Base;
    B.box('brick', b.x1 - b.x0, b.h, b.z1 - b.z0, (b.x0 + b.x1) / 2, b.h / 2, (b.z0 + b.z1) / 2);
    B.box('concreteDark', 6, 0.3, 4, b.x0 + 3, b.h + 0.15, b.z0 + 2);      // grey balcony slab
    B.box('darkMetal', 6, 1.0, 0.05, b.x0 + 3, b.h + 0.8, b.z0 + 0.02);
    const F = faces(b);
    for (const side of ['n', 'w']) {
      const f = F[side];
      for (const tt of [f.len * 0.25, f.len * 0.75]) { const [x, z] = at(f, tt, 0.03); B.add('frame', quadGeo(1.8, 2.4), x, 1.2, z, f.yaw); }
      const [sx, sz] = at(f, f.len * 0.5, 0.04);
      solo(signMaterial('RESIDENCY-4', { w: 1024, h: 140, bg: null, fg: '#efe9df', font: 'bold 104px "Avenir Next", Arial' }), quadGeo(3.6, 0.5), sx, 3.3, sz, f.yaw, false);
      for (let k = 0; k < 4; k++) { const [x, z] = at(f, 2 + k * (f.len - 4) / 3, 0.25); B.add('brick', boxGeo(0.8, b.h - 0.6, 0.5), x, (b.h - 0.6) / 2, z, f.yaw); }
    }
    C.rect(b.x0, b.z0, b.x1, b.z1, b.h);
    footR(b, '#8c3f2e');
    tower(t, { windowsTop: true });
    for (const [x, z] of [[8.5, -95], [9.5, -99]]) flowerBush(x, z, 'flowerWhite');
  }

  // ------------------------------------------------------------ the two big grounds: young trees round the edges
  for (let i = 0; i < 26; i++) {
    const side = i % 2, t = R();
    trees.push({ x: side ? -116 : -10, z: -160 - t * 108, s: 0.5 + R() * 0.3, kind: 'sapling' });
  }

  // ------------------------------------------------------------ outside: road, pylons, fields, parked cars
  for (const [x, z] of [[24, 30], [30, 30], [36, 30], [46, 31], [58, 30]]) parkedCar(x, z, PI / 2);
  pylons();
  for (let i = 0; i < 70; i++) {
    const side = i % 4, t = R();
    let x, z;
    if (side === 0) { x = -380 + t * 760; z = -310 - R() * 120; }
    else if (side === 1) { x = -380 + t * 760; z = 30 + R() * 120; if (Math.abs(x) < 20) continue; }
    else if (side === 2) { x = -232 - R() * 120; z = -400 + t * 420; }
    else { x = 86 + R() * 120; z = -400 + t * 420; }
    trees.push({ x, z, s: 1.0 + R() * 0.5, kind: R() < 0.5 ? 'oak' : 'ash', far: true });
  }
  // the long grey sheds visible beyond the wall from the avenue
  B.box('concreteDark', 90, 9, 22, -110, 4.5, 80);
  B.box('metal', 92, 0.6, 24, -110, 9.2, 80);

  // ------------------------------------------------------------ the Damru fest
  const fest = buildFest({ B, C, M, solo, foot, anims, R, signMaterial, group }, quality);

  // ------------------------------------------------------------ done: merge everything
  // keep reflections subtle: matte paving, roads and walls (no sky sheen on the ground), softer glass
  // and metal. envMapIntensity scales the sky reflection each material picks up.
  for (const k of ['forecourt', 'striped', 'asphalt', 'pavers', 'checker', 'plaza', 'stone', 'concrete', 'concreteDark', 'kerb',
    'court', 'courtGreen', 'courtLine', 'sand', 'brick', 'brickDark', 'granite', 'white', 'whitePaint', 'nesCream', 'tensile']) {
    const m = M[k];
    if (m && m.isMeshStandardMaterial) { m.roughness = Math.max(m.roughness, 0.93); m.metalness = 0; m.envMapIntensity = 0.3; }
  }
  for (const k of ['glass', 'glassLit', 'winLit', 'carGlass']) {
    const m = M[k];
    if (m && m.isMeshStandardMaterial) { m.metalness = Math.min(m.metalness, 0.35); m.roughness = Math.max(m.roughness, 0.32); m.envMapIntensity = 0.55; }
  }
  for (const m of Object.values(M)) if (m && m.isMeshStandardMaterial && m.envMapIntensity > 0.7) m.envMapIntensity = 0.7;
  const meshes = B.build(group, M, { noCast: ['bulbWarm', 'bulbAmber', 'bulbPink', 'bulbBlue', 'bulbGreen', 'lanternOrange', 'lanternRed', 'lanternYellow', 'marigold', 'marigoldY', 'leafGreen', 'parGlow', 'headLens', 'winLit', 'downlight', 'lampGlow', 'kerb', 'pavers', 'plaza', 'checker', 'forecourt', 'striped', 'asphalt', 'court', 'courtGreen', 'courtLine', 'glass', 'frame', 'jali', 'cable', 'redSign', 'flowerWhite', 'flowerYellow', 'flowerPink', 'sand'] });
  return { C, map, trees, palms, anims, group, meshes, fest };

  // ============================================================ building blocks
  function windowRow(f, y, opt = {}) {
    const bay = opt.bay || 3.6;
    const n = Math.max(1, Math.floor((f.len - 1) / bay));
    const margin = (f.len - n * bay) / 2;
    for (let i = 0; i < n; i++) {
      if (opt.skip && opt.skip(i, n)) continue;
      win(f, margin + bay * (i + 0.5), y, opt.w || 1.6, opt.h || 1.9);
    }
  }
  function win(f, t, y, w, h) {
    let [x, z] = at(f, t, 0.025);
    B.add('frame', quadGeo(w + 0.2, h + 0.2), x, y, z, f.yaw);
    [x, z] = at(f, t, 0.04);
    B.add(R() < 0.32 ? 'winLit' : 'glass', quadGeo(w, h), x, y, z, f.yaw);
    [x, z] = at(f, t, 0.055);
    B.add('frame', boxGeo(0.05, h, 0.02), x, y, z, f.yaw);
    B.add('frame', boxGeo(w, 0.05, 0.02), x, y + h * 0.18, z, f.yaw);
    [x, z] = at(f, t, 0.09);
    B.add('concrete', boxGeo(w + 0.3, 0.07, 0.18), x, y - h / 2 - 0.12, z, f.yaw);
  }
  function roof(b, H) {
    B.box('concrete', b.x1 - b.x0 + 0.4, 0.45, b.z1 - b.z0 + 0.4, (b.x0 + b.x1) / 2, H + 0.22, (b.z0 + b.z1) / 2);
    B.box('concreteDark', 3, 2.4, 4, (b.x0 + b.x1) / 2 + 3, H + 1.6, (b.z0 + b.z1) / 2);
  }
  function brickMass(b, H, mat = 'brick', mapColour = '#9a4b37') {
    B.box(mat, b.x1 - b.x0, H, b.z1 - b.z0, (b.x0 + b.x1) / 2, H / 2, (b.z0 + b.z1) / 2);
    C.rect(b.x0, b.z0, b.x1, b.z1, H);
    foot(b.x0, b.z0, b.x1, b.z1, mapColour);
  }

  function jaliBlock(b, jaliSides, entranceSide) {
    const H = b.floors * b.fh;
    brickMass(b, H, 'brick', '#b86a52');
    roof(b, H);
    const F = faces(b);
    for (const side of ['n', 's', 'e', 'w']) {
      const f = F[side];
      if (!jaliSides.includes(side)) {
        for (let fl = 0; fl < b.floors; fl++) windowRow(f, fl * b.fh + b.fh * 0.55);
        continue;
      }
      // windows behind white jali screens in a staggered pattern, as on the avenue facade
      const bay = 4.2, n = Math.floor(f.len / bay), m = (f.len - n * bay) / 2;
      for (let fl = 0; fl < b.floors; fl++) {
        for (let i = 0; i < n; i++) {
          const t = m + bay * (i + 0.5), y = fl * b.fh;
          if (side === entranceSide && fl === 0 && Math.abs(t - f.len / 2) < 6) continue;
          win(f, t, y + b.fh * 0.55, 1.8, 2.2);
          if (fl > 0 && (i + fl) % 2 === 0) {
            let [x, z] = at(f, t, 0.35);
            B.add('concrete', boxGeo(bay - 0.6, 0.15, 0.7), x, y + 0.6, z, f.yaw);
            [x, z] = at(f, t, 0.62);
            B.add('jali', quadGeo(bay - 1.0, b.fh * 0.78), x, y + b.fh * 0.52, z, f.yaw);
            [x, z] = at(f, t, 0.3);
            B.add('concrete', boxGeo(bay - 0.6, 0.15, 0.7), x, y + b.fh - 0.05, z, f.yaw);
          }
        }
      }
      if (side === entranceSide) {
        let [x, z] = at(f, f.len / 2, 0.06);
        B.add('glass', quadGeo(9, 3.2), x, 1.7, z, f.yaw);
        [x, z] = at(f, f.len / 2, 1.4);
        B.add('concrete', boxGeo(11, 0.3, 2.8), x, 3.7, z, f.yaw);
        for (let s = 0; s < 3; s++) { [x, z] = at(f, f.len / 2, 0.9 + s * 0.4); B.add('stone', boxGeo(9, 0.15, 0.4), x, 0.07 + (2 - s) * 0.15, z, f.yaw); }
      }
    }
  }

  function acadBlock(b) {
    const H = b.floors * b.fh;
    brickMass(b, H, 'brick', '#a5503a');
    roof(b, H);
    const F = faces(b);
    for (const side of ['n', 'e', 'w', 's']) {
      const f = F[side];
      for (let fl = 1; fl < b.floors; fl++) windowRow(f, fl * b.fh + b.fh * 0.55, { bay: 3.4, w: 1.4, h: 2.2 });
    }
    // south (avenue): tall brick piers with the ground floor set back, steps at the entrance
    const f = F.s;
    let [x, z] = at(f, f.len / 2, -1.5);
    B.add('glass', quadGeo(f.len - 2, 3.4), x, 1.9, z + 0.02, f.yaw);
    for (let t = 1; t < f.len; t += 4.5) { [x, z] = at(f, t, 0.3); B.add('brick', boxGeo(1.0, b.fh, 0.6), x, b.fh / 2, z, f.yaw); }
    for (let s = 0; s < 3; s++) { [x, z] = at(f, f.len * 0.65, 0.9 + s * 0.4); B.add('stone', boxGeo(6, 0.15, 0.4), x, 0.07 + (2 - s) * 0.15, z, f.yaw); }
    // north (plaza): beige stone and glass entrance
    const n = F.n;
    [x, z] = at(n, n.len / 2, 0.05);
    B.add('glass', quadGeo(14, 3.8), x, 2, z, n.yaw);
    for (const tt of [n.len / 2 - 8, n.len / 2 + 8]) { [x, z] = at(n, tt, 0.4); B.add('stone', boxGeo(2.2, b.fh * 2, 0.8), x, b.fh, z, n.yaw); }
  }

  function aBlock(b) {
    const H = b.floors * b.fh;
    brickMass(b, H, 'brick', '#b5735b');
    roof(b, H);
    const F = faces(b);
    for (const side of ['n', 'w', 's', 'e']) {
      const f = F[side];
      for (let fl = 1; fl < b.floors; fl++) windowRow(f, fl * b.fh + b.fh * 0.55, { bay: 3.6, w: 1.6, h: 2.4 });
      if (side === 'n' || side === 'w') { windowRow(f, b.fh * 0.5, { bay: 4, w: 1.6, h: 2.2 }); continue; }
      // glass ground floor between beige stone piers (plaza and avenue sides)
      const gh = b.fh;
      let [x, z] = at(f, f.len / 2, 0.05);
      B.add('glass', quadGeo(f.len - 1, gh - 0.3), x, gh / 2, z, f.yaw);
      for (let t = 0.6; t <= f.len - 0.6; t += 1.8) { const [mx, mz] = at(f, t, 0.08); B.add('frame', boxGeo(0.07, gh - 0.3, 0.08), mx, gh / 2, mz, f.yaw); }
      for (let t = 2; t < f.len; t += 12) { const [px, pz] = at(f, t, 0.45); B.add('stone', boxGeo(1.2, gh, 0.9), px, gh / 2, pz, f.yaw); }
      [x, z] = at(f, f.len / 2, 0.6);
      B.add('stone', boxGeo(f.len, 0.5, 1.2), x, gh + 0.25, z, f.yaw);
    }
    // beige stone corners on the plaza side
    for (const zc of [b.z1, b.z0]) B.box('stone', 2.4, H, 2.4, b.x1 - 1.0, H / 2, zc + (zc === b.z1 ? -1 : 1));
  }

  function beigeBlock(b) {
    const H = b.floors * b.fh;
    brickMass(b, H, 'stone', '#d9c7a4');
    roof(b, H);
    const F = faces(b);
    for (const side of ['n', 's', 'e', 'w']) for (let fl = 0; fl < b.floors; fl++) windowRow(F[side], fl * b.fh + b.fh * 0.55, { bay: 4, w: 2.4, h: 2.4 });
  }

  function residency(b) {
    const H = b.floors * b.fh;
    brickMass(b, H, 'brick', '#9c4a36');
    roof(b, H);
    const F = faces(b);
    const front = F[b.front];
    for (const side of ['n', 's', 'e', 'w']) {
      const f = F[side];
      const isFront = f === front;
      const bay = 3.4, n = Math.floor(f.len / bay), m = (f.len - n * bay) / 2;
      for (let i = 0; i < n; i++) {
        const t = m + bay * (i + 0.5);
        const strip = i % 6 === 2;
        const entrance = isFront && i % 9 === 4;
        if (strip) { const [sx, sz] = at(f, t, 0.12); B.add('concrete', boxGeo(bay * 0.9, H, 0.24), sx, H / 2, sz, f.yaw); }
        for (let fl = 0; fl < b.floors; fl++) {
          const y = fl * b.fh;
          if (fl === 0 && entrance) continue;
          win(f, t, y + b.fh * 0.56, 1.3, 1.6);
          if (!isFront && !strip && (i + fl) % 4 === 0) { const [ax, az] = at(f, t + 0.9, 0.2); B.add('acUnit', boxGeo(0.8, 0.55, 0.32), ax, y + 0.5, az, f.yaw); }
          if (isFront && fl > 0 && (i % 2 === 0)) {
            let [x, z] = at(f, t, 0.55);
            B.add('concreteDark', boxGeo(bay - 0.4, 0.16, 1.1), x, y + 0.08, z, f.yaw);
            [x, z] = at(f, t, 1.08);
            B.add('darkMetal', boxGeo(bay - 0.5, 0.05, 0.05), x, y + 1.05, z, f.yaw);
            for (let k = -1; k <= 1; k++) { const [rx, rz] = at(f, t + k * (bay - 0.6) / 2, 1.08); B.add('darkMetal', boxGeo(0.04, 1.0, 0.04), rx, y + 0.55, rz, f.yaw); }
            [x, z] = at(f, t, 0.35);
            B.add('concrete', boxGeo(bay - 0.6, 0.06, 0.7), x, y + b.fh - 0.3, z, f.yaw, 1, 1, 1, 0.18);
          }
          if (isFront && fl > 0 && i % 2 === 1 && fl % 2 === 0) { const [ax, az] = at(f, t + 0.9, 0.25); B.add('acUnit', boxGeo(0.8, 0.55, 0.32), ax, y + 0.45, az, f.yaw); }
        }
        if (entrance) {
          let [x, z] = at(f, t, 0.05);
          B.add('glass', quadGeo(2.6, 2.5), x, 1.3, z, f.yaw);
          [x, z] = at(f, t, 1.4);
          B.add('concreteDark', boxGeo(5.5, 0.9, 2.8), x, 3.2, z, f.yaw);
          [x, z] = at(f, t, 1.0);
          B.add('stone', boxGeo(4.2, 0.3, 1.6), x, 0.15, z, f.yaw);
          for (const s of [-1, 1]) { const [rx, rz] = at(f, t + s * 2.2, 1.4); B.add('darkMetal', boxGeo(0.05, 0.9, 1.6), rx, 0.75, rz, f.yaw); }
          if (b.label) {
            const [lx, lz] = at(f, t, 2.82);
            solo(signMaterial(b.label, { w: 1024, h: 160, bg: null, fg: '#e9e6df', font: 'bold 110px "Avenir Next", Arial' }), quadGeo(4.2, 0.65), lx, 3.2, lz, f.yaw, false);
          }
          for (const s of [-1, 1]) { const [px, pz] = at(f, t + s * 3.2, 1.0); pot(px, pz); }
        }
      }
    }
    // landscaped strip along the front
    const [hx0, hz0] = at(front, 1, 1.9), [hx1, hz1] = at(front, front.len - 1, 1.9);
    const fl = Math.hypot(hx1 - hx0, hz1 - hz0);
    for (let t = 2; t < fl; t += 3.5) {
      const x = hx0 + (hx1 - hx0) * t / fl, z = hz0 + (hz1 - hz0) * t / fl;
      if (R() < 0.7) flowerBush(x, z, R() < 0.5 ? 'flowerPink' : 'flowerYellow');
    }
  }

  function res4Block(b) {
    const H = b.floors * b.fh + 1.4;
    brickMass(b, H, 'brick', '#a5503a');
    roof(b, H);
    const F = faces(b);
    for (const side of ['n', 's', 'e', 'w']) {
      const f = F[side];
      for (let fl = 1; fl < b.floors; fl++) windowRow(f, 1.4 + fl * b.fh + b.fh * 0.5, { bay: 4.4, w: 1.2, h: 2.4, skip: (i) => i % 3 === 1 });
    }
    // west front: glass shopfronts behind brick piers, some bays draped in green tarp,
    // columns wrapped in silver sheet, grey metal canopy, steps and red hydrants
    const f = F.w, gh = 5.2;
    for (let t = 2; t < f.len; t += 6) {
      let [x, z] = at(f, t, 0.3);
      B.add('brick', boxGeo(1.1, gh, 0.6), x, gh / 2, z, f.yaw);
      const bayT = t + 3;
      if (bayT > f.len - 1) continue;
      [x, z] = at(f, bayT, 0.05);
      B.add('glass', quadGeo(4.8, gh - 0.3), x, gh / 2, z, f.yaw);
      if (R() < 0.45) { [x, z] = at(f, bayT, 0.5); B.add('tarp', quadGeo(4.6, gh - 1.2), x, (gh - 1.2) / 2 + 0.2, z, f.yaw, 1, 1, 1, 0.08); }
      if (R() < 0.5) { [x, z] = at(f, t, 0.8); B.add('silver', new THREE.CylinderGeometry(0.42, 0.42, gh - 0.8, 10), x, (gh - 0.8) / 2, z); }
    }
    let [x, z] = at(f, f.len / 2, 1.6);
    B.add('greyMetal', boxGeo(f.len, 0.45, 3.4), x, gh + 0.2, z, f.yaw);
    for (let t = 6; t < f.len; t += 14) { [x, z] = at(f, t, 1.4); B.add('stone', boxGeo(f.len > 0 ? 6 : 6, 0.3, 1.6), x, 0.15, z, f.yaw); }
    for (const t of [10, 40, 70]) { [x, z] = at(f, t, 0.9); hydrant(x, z); }
    for (let t = 4; t < f.len; t += 8) { [x, z] = at(f, t, 1.3); B.box('downlight', 0.35, 0.03, 0.35, x, gh - 0.03, z); }
  }

  function tower(b, { relief = false, windowsTop = false, balconies = false } = {}) {
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, w = b.x1 - b.x0, d = b.z1 - b.z0;
    B.box('brick', w, b.h, d, cx, b.h / 2, cz);
    B.box('concrete', w + 0.3, 0.4, d + 0.3, cx, b.h + 0.2, cz);
    const F = faces(b);
    if (windowsTop) {
      for (const side of ['n', 's', 'e', 'w']) {
        windowRow(F[side], b.h - 2.2, { bay: 1.8, w: 1.0, h: 1.4 });
        windowRow(F[side], b.h - 4.4, { bay: 1.8, w: 1.0, h: 1.4 });
        for (let y = 6; y < b.h - 7; y += 6.6) windowRow(F[side], y, { bay: 5, w: 0.9, h: 1.3, skip: (i) => i % 2 === 1 });
      }
    }
    if (relief) {
      const f = F.s;
      const [x, z] = at(f, f.len * 0.42, 0.03);
      solo(M.towerRelief, quadGeo(8.0, 17.4), x, 21, z, f.yaw);
      const [px, pz] = at(f, f.len * 0.85, 0.25);
      B.add('brick', boxGeo(2.0, b.h - 2, 0.5), px, (b.h - 2) / 2, pz, f.yaw);
    }
    if (balconies) {
      for (const y of [7.5, 11]) {
        B.box('concreteDark', 1.6, 0.25, 4, b.x0 - 0.8, y, cz);
        B.box('darkMetal', 0.05, 1.0, 4, b.x0 - 1.58, y + 0.6, cz);
      }
    }
    C.rect(b.x0, b.z0, b.x1, b.z1, b.h);
    foot(b.x0, b.z0, b.x1, b.z1, '#7a2f22');
  }
  function gateTower(b) { tower(b, { relief: true, balconies: true }); }

  function arena(b) {
    const H = b.h, base = b.base, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    const w = b.x1 - b.x0, d = b.z1 - b.z0;
    // brick upper storeys; beige stone ground floor set back under a black canopy on the west front
    B.box('brick', w, H - base, d, cx, base + (H - base) / 2, cz);
    B.box('stone', w - 1.6, base, d, cx + 0.8, base / 2, cz);
    roof(b, H);
    C.rect(b.x0 + 1.6, b.z0, b.x1, b.z1, H);
    foot(b.x0, b.z0, b.x1, b.z1, '#9a4b37');
    const F = faces(b);
    for (const side of ['w', 's', 'n']) {
      const f = F[side];
      for (const t of side === 'w' ? [f.len * 0.25, f.len * 0.72] : [f.len * 0.32]) {
        const [x, z] = at(f, t, 0.03);
        solo(M.arenaMural, quadGeo(20.4, 9.5), x, base + 0.5 + 4.75, z, f.yaw);
      }
      windowRow(f, base + 6.5, { bay: 9, w: 5, h: 2.6, skip: (i, n) => side === 'w' && (i === 1 || i === n - 2) });
    }
    windowRow(F.e, base + 4, { bay: 6, w: 1.6, h: 5.5 });
    windowRow(F.e, 2.6, { bay: 6, w: 1.6, h: 2.2 });
    const face = b.x0 + 1.6;
    solo(M.arenaCafe, quadGeo(15.4, base), face - 0.03, base / 2, b.z1 - 12, -PI / 2);
    solo(M.arenaCafe, quadGeo(15.4, base), face - 0.03, base / 2, b.z0 + 14, -PI / 2);
    B.add('glass', quadGeo(16, base - 0.6), face - 0.03, (base - 0.6) / 2, cz, -PI / 2);
    B.box('canopy', 6.4, 0.55, d, b.x0 - 1.6, base + 0.27, cz);
    B.box('canopy', 0.3, 0.75, d, b.x0 - 4.75, base + 0.2, cz);
    for (let z = b.z0 + 2.5; z < b.z1; z += 4) for (const dx of [0.5, -2.6]) B.box('downlight', 0.35, 0.03, 0.35, b.x0 + dx, base - 0.02, z);
    for (let z = b.z0 + 6; z < b.z1; z += 12) { B.box('stone', 1.1, base, 1.1, b.x0 - 4.2, base / 2, z); C.rect(b.x0 - 4.75, z - 0.55, b.x0 - 3.65, z + 0.55, base); }
    for (let s = 0; s < 3; s++) B.box('stone', 0.5, 0.16, 20, face - 0.5 - s * 0.5, 0.08 + (2 - s) * 0.16, cz);
    // LEARNERS ARENA in red letters on a white plinth at the south-west corner
    const sz = b.z1 - 3;
    B.box('white', 0.8, 1.0, 7.2, b.x0 - 2.6, 0.5, sz - 3.6);
    const arenaSign = signMaterial('LEARNERS ARENA', { w: 1024, h: 140, bg: null, fg: '#ff4a4a', font: 'bold 104px "Avenir Next", Arial', emissive: 1.2 });
    solo(arenaSign, quadGeo(6.8, 0.93), b.x0 - 3.02, 0.55, sz - 3.6, -PI / 2, false);
    C.rect(b.x0 - 3.0, sz - 7.2, b.x0 - 2.2, sz, 1);
  }

  function courts(c) {
    const w = c.x1 - c.x0, d = c.z1 - c.z0, cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2;
    B.add('courtGreen', groundGeo(w, d), cx, 0.05, cz);
    for (const off of [-d / 4, d / 4]) {
      B.add('court', groundGeo(w - 8, d / 2 - 4), cx, 0.06, cz + off);
      const lw = w - 10, ld = d / 2 - 6;
      for (const s of [-1, 1]) {
        B.add('courtLine', groundGeo(lw, 0.08), cx, 0.065, cz + off + s * ld / 2);
        B.add('courtLine', groundGeo(0.08, ld), cx + s * lw / 2, 0.065, cz + off);
        // basketball hoops at both ends
        const hx = cx + s * (lw / 2 - 0.4);
        B.add('darkMetal', new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8), hx + s * 1.2, 1.7, cz + off);
        B.box('white', 0.06, 1.05, 1.8, hx, 3.3, cz + off);
        B.add('redSign', new THREE.TorusGeometry(0.23, 0.02, 6, 16).rotateX(PI / 2), hx - s * 0.3, 3.05, cz + off);
      }
      B.add('courtLine', groundGeo(0.08, ld), cx, 0.065, cz + off);
    }
    const H = 4;
    const link = chainlink();
    const fenceSide = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), yaw = Math.abs(x1 - x0) > 0.1 ? 0 : PI / 2;
      solo(link, quadGeo(len, H, true), (x0 + x1) / 2, H / 2, (z0 + z1) / 2, yaw, false);
      for (let t = 0; t <= len; t += 3) {
        const x = x0 + (x1 - x0) * t / len, z = z0 + (z1 - z0) * t / len;
        B.add('darkMetal', new THREE.CylinderGeometry(0.04, 0.04, H, 6), x, H / 2, z);
      }
      B.add('darkMetal', barGeo(V(x0, H, z0), V(x1, H, z1), 0.035, 6));
    };
    fenceSide(c.x0, c.z0, c.x1, c.z0); fenceSide(c.x0, c.z1, c.x1, c.z1);
    fenceSide(c.x0, c.z0, c.x0, cz - 2); fenceSide(c.x0, cz + 2, c.x0, c.z1); fenceSide(c.x1, c.z0, c.x1, c.z1);
    C.rect(c.x0 - 0.1, c.z0 - 0.1, c.x1 + 0.1, c.z0 + 0.1, H); C.rect(c.x0 - 0.1, c.z1 - 0.1, c.x1 + 0.1, c.z1 + 0.1, H);
    C.rect(c.x0 - 0.1, c.z0, c.x0 + 0.1, cz - 2, H); C.rect(c.x0 - 0.1, cz + 2, c.x0 + 0.1, c.z1, H); C.rect(c.x1 - 0.1, c.z0, c.x1 + 0.1, c.z1, H);
    foot(c.x0, c.z0, c.x1, c.z1, '#9d4635');
    for (const [x, z] of [[c.x0, c.z0], [c.x1, c.z0], [c.x0, c.z1], [c.x1, c.z1], [c.x0, cz], [c.x1, cz]]) floodlight(x, z, 9);
  }

  function dropoffCanopy(x, z) {
    // two white membrane wings on a grey steel frame over the drop-off lane, on grey round columns
    const w = 13, d = 22, h = 5.4;
    for (const s of [-1, 1]) {
      const wing = boxGeo(w, 0.12, d / 2 - 0.4);
      wing.rotateX(s * 0.07);
      B.add('tensile', wing, x, h + 0.35, z + s * d / 4);
      B.add('greyMetal', boxGeo(w + 0.3, 0.28, 0.28), x, h + 0.35 + 0.37, z + s * (d / 2 - 0.3));
      B.add('greyMetal', boxGeo(w + 0.3, 0.3, 0.3), x, h + 0.2, z + s * 0.4);
      for (const dx of [-w / 2, w / 2]) B.add('greyMetal', boxGeo(0.25, 0.3, d / 2), x + dx, h + 0.3, z + s * d / 4);
      for (let k = -2; k <= 2; k++) B.add('greyMetal', boxGeo(0.12, 0.15, d / 2 - 0.6), x + k * w / 5, h + 0.18, z + s * d / 4);
    }
    for (const dx of [-w / 2 + 1.2, w / 2 - 1.2]) for (const dz of [-6, 6]) {
      B.add('greyMetal', new THREE.CylinderGeometry(0.28, 0.32, h, 16), x + dx, h / 2, z + dz);
      for (const sz of [-1, 1]) B.add('greyMetal', barGeo(V(x + dx, h - 1.6, z + dz), V(x + dx, h + 0.1, z + dz + sz * 2.6), 0.09, 8));
      C.circle(x + dx, z + dz, 0.35);
    }
    for (let k = 0; k < 6; k++) B.box('downlight', 0.35, 0.03, 0.35, x - 4 + (k % 3) * 4, h - 0.02, z + (k < 3 ? -4 : 4));
    foot(x - w / 2, z - d / 2, x + w / 2, z + d / 2, '#e8e6e0');
  }

  function tennisVolley(c) {
    // fenced hard courts: one tennis court and one volleyball court side by side, with floodlights
    const w = c.x1 - c.x0, d = c.z1 - c.z0, cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2;
    B.add('courtGreen', groundGeo(w, d), cx, 0.05, cz);
    const line = (x0, z0, x1, z1) => {
      const lw = Math.abs(x1 - x0) || 0.06, ld = Math.abs(z1 - z0) || 0.06;
      B.add('courtLine', groundGeo(lw, ld), (x0 + x1) / 2, 0.066, (z0 + z1) / 2);
    };
    // tennis: 10.97 x 23.77 m doubles court, net across the middle
    const tx = c.x0 + 11, tz = cz, hw = 10.97 / 2, hl = 23.77 / 2, sw = 8.23 / 2;
    B.add('tennis', groundGeo(18, 36), tx, 0.058, tz);
    for (const s of [-1, 1]) { line(tx + s * hw, tz - hl, tx + s * hw, tz + hl); line(tx + s * sw, tz - hl, tx + s * sw, tz + hl); line(tx - hw, tz + s * hl, tx + hw, tz + s * hl); line(tx - sw, tz + s * 6.4, tx + sw, tz + s * 6.4); }
    line(tx, tz - 6.4, tx, tz + 6.4);
    for (const s of [-1, 1]) { B.add('darkMetal', new THREE.CylinderGeometry(0.05, 0.05, 1.07, 8), tx + s * (hw + 0.9), 0.53, tz); C.circle(tx + s * (hw + 0.9), tz, 0.1); }
    const tnet = chainlink().clone();
    tnet.map = tnet.map.clone(); tnet.map.repeat.set(1 / 0.05, 1 / 0.05); tnet.map.needsUpdate = true;
    solo(tnet, quadGeo(2 * hw + 1.8, 0.9, true), tx, 0.5, tz, 0, false);
    B.box('whitePaint', 2 * hw + 1.8, 0.07, 0.03, tx, 0.95, tz);
    // volleyball: 9 x 18 m, net at 2.43 m
    const vx = c.x1 - 10, vz = cz;
    B.add('court', groundGeo(13, 24), vx, 0.058, vz);
    for (const s of [-1, 1]) { line(vx + s * 4.5, vz - 9, vx + s * 4.5, vz + 9); line(vx - 4.5, vz + s * 9, vx + 4.5, vz + s * 9); line(vx - 4.5, vz + s * 3, vx + 4.5, vz + s * 3); }
    line(vx - 4.5, vz, vx + 4.5, vz);
    for (const s of [-1, 1]) { B.add('whitePaint', new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), vx + s * 5.2, 1.3, vz); C.circle(vx + s * 5.2, vz, 0.12); }
    const vnet = chainlink().clone();
    vnet.map = vnet.map.clone(); vnet.map.repeat.set(1 / 0.1, 1 / 0.1); vnet.map.needsUpdate = true;
    solo(vnet, quadGeo(10.2, 1.0, true), vx, 2.0, vz, 0, false);
    B.box('whitePaint', 10.2, 0.06, 0.02, vx, 2.5, vz);
    // chain-link fence with a gate on the west side, floodlights at the corners
    const H = 4;
    chainFence(c.x0, c.z0, c.x1, c.z0, H); chainFence(c.x0, c.z1, c.x1, c.z1, H);
    chainFence(c.x0, c.z0, c.x0, cz - 2.5, H); chainFence(c.x0, cz + 2.5, c.x0, c.z1, H); chainFence(c.x1, c.z0, c.x1, c.z1, H);
    chainFence(cx + 1, c.z0, cx + 1, cz - 3, 2.5); chainFence(cx + 1, cz + 3, cx + 1, c.z1, 2.5);
    foot(c.x0, c.z0, c.x1, c.z1, '#3f6e52');
    for (const [x, z] of [[c.x0, c.z0], [c.x1, c.z0], [c.x0, c.z1], [c.x1, c.z1], [cx, c.z0], [cx, c.z1]]) floodlight(x, z, 10);
  }

  function chainlink() {
    if (chainlink.m) return chainlink.m;
    const mat = canvasMaterial(128, 128, (g) => {
      g.clearRect(0, 0, 128, 128);
      g.strokeStyle = 'rgba(70,74,78,1)'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(0, 64); g.lineTo(64, 0); g.lineTo(128, 64); g.lineTo(64, 128); g.closePath(); g.stroke();
    }, { transparent: true });
    mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
    mat.map.repeat.set(1 / 0.12, 1 / 0.12);
    mat.alphaTest = 0.3; mat.transparent = false; mat.metalness = 0.6;
    chainlink.m = mat;
    return mat;
  }
  function chainFence(x0, z0, x1, z1, H) {
    const len = Math.hypot(x1 - x0, z1 - z0), yaw = Math.abs(x1 - x0) > 0.1 ? 0 : PI / 2;
    solo(chainlink(), quadGeo(len, H, true), (x0 + x1) / 2, H / 2, (z0 + z1) / 2, yaw, false);
    for (let t = 0; t <= len; t += 3) {
      const x = x0 + (x1 - x0) * t / len, z = z0 + (z1 - z0) * t / len;
      B.add('darkMetal', new THREE.CylinderGeometry(0.04, 0.04, H, 6), x, H / 2, z);
    }
    B.add('darkMetal', barGeo(V(x0, H, z0), V(x1, H, z1), 0.035, 6));
    C.rect(Math.min(x0, x1) - 0.1, Math.min(z0, z1) - 0.1, Math.max(x0, x1) + 0.1, Math.max(z0, z1) + 0.1, H);
  }
  function sheetFence(x0, z0, x1, z1) {
    const H = 2.4, len = Math.hypot(x1 - x0, z1 - z0), yaw = Math.abs(x1 - x0) > 0.1 ? 0 : PI / 2;
    B.add('sheet', quadGeo(len, H, true), (x0 + x1) / 2, H / 2, (z0 + z1) / 2, yaw);
    for (let t = 0; t <= len; t += 2.5) {
      const x = x0 + (x1 - x0) * t / len, z = z0 + (z1 - z0) * t / len;
      B.add('brickRed', boxGeo(0.06, H + 0.1, 0.06), x, (H + 0.1) / 2, z);
    }
    C.rect(Math.min(x0, x1) - 0.1, Math.min(z0, z1) - 0.1, Math.max(x0, x1) + 0.1, Math.max(z0, z1) + 0.1, H);
  }

  function canopy(x, z) {
    // white tensile shelter on four white posts over a red brick seating platform
    const s = 7, h = 3.0;
    const roofGeo = new THREE.ConeGeometry(s * 0.72, 2.2, 4, 1, true);
    roofGeo.rotateY(PI / 4);
    B.add('tensile', roofGeo, x, h + 1.1, z);
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      B.add('whitePaint', new THREE.CylinderGeometry(0.08, 0.08, h + 0.2, 8), x + dx * s / 2, (h + 0.2) / 2, z + dz * s / 2);
      C.circle(x + dx * s / 2, z + dz * s / 2, 0.15);
    }
    for (const dz of [-1, 1]) B.add('whitePaint', boxGeo(s, 0.14, 0.14), x, h, z + dz * s / 2);
    for (const dx of [-1, 1]) B.add('whitePaint', boxGeo(0.14, 0.14, s), x + dx * s / 2, h, z);
    B.box('brickRed', s, 0.3, s, x, 0.15, z);
    B.box('brickRed', 0.6, 0.45, s - 1, x + s / 2 - 0.6, 0.52, z);
    foot(x - s / 2, z - s / 2, x + s / 2, z + s / 2, '#ece8de');
  }

  function volleyball(x, z) {
    B.add('sand', groundGeo(10, 18), x, 0.04, z);
    for (const s of [-1, 1]) {
      B.add('whitePaint', new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), x + s * 5.2, 1.3, z);
      C.circle(x + s * 5.2, z, 0.15);
    }
    const net = chainlink().clone();
    net.map = net.map.clone(); net.map.repeat.set(1 / 0.1, 1 / 0.1); net.map.needsUpdate = true;
    solo(net, quadGeo(10.2, 1.0, true), x, 2.0, z, 0, false);
    B.box('whitePaint', 10.2, 0.06, 0.02, x, 2.5, z);
    for (const [dx, dz] of [[-8, -11], [8, -11], [-8, 11], [8, 11]]) floodlight(x + dx, z + dz, 10);
    foot(x - 5, z - 9, x + 5, z + 9, '#d8c48e');
  }

  function floodlight(x, z, h) {
    B.add('darkMetal', new THREE.CylinderGeometry(0.08, 0.14, h, 8), x, h / 2, z);
    B.box('darkMetal', 1.2, 0.5, 0.3, x, h + 0.1, z);
    B.box('lampGlow', 1.0, 0.36, 0.05, x, h + 0.1, z + 0.17);
    C.circle(x, z, 0.25);
  }

  function plazaLamp(x, z) {
    // post-top lantern on a slim black post, for the plaza between Block B and Block C
    B.add('darkMetal', new THREE.CylinderGeometry(0.07, 0.11, 4.0, 8), x, 2.0, z);
    B.add('darkMetal', new THREE.CylinderGeometry(0.2, 0.26, 0.3, 8), x, 0.15, z);
    B.add('darkMetal', new THREE.CylinderGeometry(0.34, 0.2, 0.12, 8), x, 4.06, z);
    B.add('lampGlow', new THREE.CylinderGeometry(0.2, 0.2, 0.42, 8), x, 4.33, z);
    B.add('darkMetal', new THREE.ConeGeometry(0.36, 0.3, 8), x, 4.69, z);
    C.circle(x, z, 0.2);
  }

  function nescafe(b) {
    // the red Nescafé store: lit counter windows, glass door and the sign facing north to Residency 2,
    // a cream awning with downlights, and tables with red umbrellas out front
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, w = b.x1 - b.x0, d = b.z1 - b.z0, h = b.h;
    const zf = b.z0;   // the north (front) face
    B.box('nesRed', w, h, d, cx, h / 2, cz);
    B.box('nesCream', w + 0.3, 0.3, d + 0.3, cx, h + 0.15, cz);
    B.box('nesCream', w + 0.02, 0.5, d + 0.02, cx, 0.25, cz);
    for (const dx of [-3.4, 3.4]) {
      B.add('winLit', quadGeo(4.0, 1.5), cx + dx, 1.75, zf - 0.03, PI);
      B.box('nesCream', 4.3, 0.95, 0.55, cx + dx, 0.48, zf - 0.28);
      B.box('steel', 4.3, 0.05, 0.6, cx + dx, 0.98, zf - 0.3);
    }
    B.add('glass', quadGeo(1.5, 2.4), cx, 1.25, zf - 0.03, PI);
    B.box('darkMetal', 1.7, 0.08, 0.08, cx, 2.48, zf - 0.04);
    const sign = signMaterial('NESCAFÉ', { w: 1024, h: 220, bg: '#9e1219', fg: '#ffffff', font: 'bold 150px Georgia, serif', emissive: 0.8, sub: 'COFFEE · SNACKS', subFont: 'bold 34px "Avenir Next", Arial' });
    solo(sign, quadGeo(7.2, 1.55), cx, h - 0.42, zf - 0.06, PI, false);
    // awning with downlights
    B.box('nesCream', w, 0.14, 2.4, cx, 2.95, zf - 1.2);
    B.box('nesRed', w, 0.3, 0.08, cx, 2.85, zf - 2.4);
    for (let k = -2; k <= 2; k++) B.box('downlight', 0.32, 0.03, 0.32, cx + k * 2.6, 2.87, zf - 1.2);
    // wall lanterns either side of the door
    for (const dx of [-1.3, 1.3]) { B.box('darkMetal', 0.22, 0.34, 0.16, cx + dx, 2.1, zf - 0.1); B.box('lampGlow', 0.16, 0.26, 0.14, cx + dx, 2.1, zf - 0.18); }
    // a menu board and tables with red umbrellas between the store and the cross road
    const menu = signMaterial('MENU', { w: 512, h: 768, bg: '#1a1a1a', fg: '#f1e4cc', font: 'bold 90px Georgia, serif', sub: 'Cappuccino · Latte · Cold Coffee · Maggi · Sandwich', subFont: '30px Arial' });
    solo(menu, quadGeo(0.8, 1.2), cx + w / 2 - 0.8, 1.25, zf - 0.5, PI, false);
    for (const s of [-1, 1]) B.box('darkMetal', 0.04, 1.8, 0.04, cx + w / 2 - 0.8 + s * 0.42, 0.9, zf - 0.5);
    for (const [dx, dz] of [[-4.6, -4.1], [0, -4.5], [4.6, -4.1]]) cafeTable(cx + dx, zf + dz);
    C.rect(b.x0, b.z0, b.x1, b.z1, h);
    foot(b.x0, b.z0, b.x1, b.z1, '#9e1219');
  }

  function cafeTable(x, z) {
    B.add('nesCream', new THREE.CylinderGeometry(0.45, 0.45, 0.05, 16), x, 0.76, z);
    B.add('darkMetal', new THREE.CylinderGeometry(0.04, 0.05, 0.74, 6), x, 0.37, z);
    for (let k = 0; k < 4; k++) {
      const a = k * PI / 2 + PI / 4;
      B.add('darkMetal', new THREE.CylinderGeometry(0.17, 0.15, 0.46, 8), x + Math.cos(a) * 0.8, 0.23, z + Math.sin(a) * 0.8);
    }
    B.add('steel', new THREE.CylinderGeometry(0.025, 0.025, 2.4, 6), x, 1.2, z);
    const u = new THREE.ConeGeometry(1.25, 0.45, 8, 1, true);
    B.add('nesUmbrella', u, x, 2.42, z);
    C.circle(x, z, 0.55);
  }

  function smallBrick(b, redSign, pump = false) {
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, h = b.h;
    B.box('brick', b.x1 - b.x0, h, b.z1 - b.z0, cx, h / 2, cz);
    B.box('concrete', b.x1 - b.x0 + 0.5, 0.15, b.z1 - b.z0 + 0.5, cx, h + 0.07, cz);
    const doorX = pump ? b.x0 - 0.02 : b.x1 + 0.02, yaw = pump ? -PI / 2 : PI / 2;
    B.add(pump ? 'redDoor' : 'frame', quadGeo(1.1, 2.1), doorX, 1.05, cz, yaw);
    B.add('glass', quadGeo(1.2, 0.9), doorX, 1.8, cz + 2.4, yaw);
    if (redSign) solo(signMaterial('', { w: 256, h: 256, bg: '#c62828' }), quadGeo(0.7, 0.7), doorX, 2.7, cz - 1.4, yaw, false);
    C.rect(b.x0, b.z0, b.x1, b.z1, h);
    foot(b.x0, b.z0, b.x1, b.z1, '#8c3f2e');
  }

  // ------------------------------------------------------------ street furniture
  function lamp(x, z, dir) {
    B.add('darkMetal', new THREE.CylinderGeometry(0.06, 0.1, 8, 8), x, 4, z);
    const ax = dir === 1 ? 1 : 0, az = dir === 0 ? 1 : 0;
    B.add('darkMetal', barGeo(V(x, 7.8, z), V(x + ax * 1.4, 8.05, z + az * 1.4), 0.04, 6));
    B.box('lampGlow', 0.55, 0.12, 0.26, x + ax * 1.5, 8.0, z + az * 1.5);
    C.circle(x, z, 0.15);
  }
  function bench(x, z, yaw) {
    B.box('steel', 2.0, 0.07, 0.5, x, 0.46, z, yaw);
    for (const s of [-0.85, 0.85]) B.box('darkMetal', 0.06, 0.45, 0.5, x + Math.cos(yaw) * s, 0.22, z - Math.sin(yaw) * s, yaw);
    C.rect(x - 1, z - 1, x + 1, z + 1, 0.8);
  }
  function pot(x, z) {
    B.add('terracotta', new THREE.CylinderGeometry(0.26, 0.19, 0.45, 12), x, 0.22, z);
    B.add('hedge', bush(0.36), x, 0.66, z);
  }
  function hydrant(x, z) {
    B.add('redDoor', new THREE.CylinderGeometry(0.12, 0.14, 0.9, 10), x, 0.45, z);
    B.add('redDoor', new THREE.SphereGeometry(0.15, 10, 6), x, 0.92, z);
    B.add('redDoor', new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8).rotateZ(PI / 2), x, 0.65, z);
  }
  function stopBarrier(x, z) {
    B.box('yellow', 2.2, 0.35, 0.06, x, 0.85, z);
    for (const s of [-1, 1]) B.box('yellow', 0.06, 1.0, 0.5, x + s * 1.05, 0.5, z);
    solo(signMaterial('STOP', { w: 256, h: 128, bg: '#f2c200', fg: '#c62828', font: 'bold 90px Arial' }), quadGeo(0.6, 0.3), x, 0.85, z + 0.04, 0, false);
  }
  function flowerBush(x, z, flower) {
    const s = 0.5 + R() * 0.5;
    B.add('hedge', bush(s), x, s * 0.7, z, R() * PI, 1, 0.9, 1);
    for (let k = 0; k < 8; k++) {
      const a = R() * PI * 2, e = R() * 0.9 + 0.2;
      B.add(flower, new THREE.IcosahedronGeometry(0.07, 0), x + Math.cos(a) * s * 0.85 * Math.cos(e), s * 0.7 + Math.sin(e) * s * 0.75, z + Math.sin(a) * s * 0.85 * Math.cos(e));
    }
  }
  function hedgeRow(x0, z0, x1, z1, h, flowers, flower = 'flowerYellow') {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const yaw = Math.atan2(x1 - x0, z1 - z0);
    B.add('hedge', boxGeo(0.9, h, len), (x0 + x1) / 2, h / 2, (z0 + z1) / 2, yaw);
    for (let t = 0.6; t < len; t += 1.2) {
      const x = x0 + (x1 - x0) * t / len, z = z0 + (z1 - z0) * t / len;
      B.add('hedge', bush(0.55), x, h - 0.05, z, R() * PI, 1, 0.6, 1);
      if (flowers && R() < 0.8) {
        for (let k = 0; k < 4; k++) B.add(flower, new THREE.IcosahedronGeometry(0.065, 0), x + (R() - 0.5) * 0.9, h + 0.2 + R() * 0.12, z + (R() - 0.5) * 1.1);
      }
    }
    if (Math.abs(x1 - x0) < 0.01) C.rect(x0 - 0.45, Math.min(z0, z1), x0 + 0.45, Math.max(z0, z1), h);
    else if (Math.abs(z1 - z0) < 0.01) C.rect(Math.min(x0, x1), z0 - 0.45, Math.max(x0, x1), z0 + 0.45, h);
  }
  function flagPole(x, z, h, colourKey) {
    B.add('steel', new THREE.CylinderGeometry(0.05, 0.07, h, 8), x, h / 2, z);
    const colours = { flagRed: '#c62828', flagSaffron: '#ff9933', flagBlue: '#1e4fa8', flagGreen: '#2e7d32', flagYellow: '#f2c200' };
    const mat = canvasMaterial(256, 512, (g) => {
      if (colourKey === 'cmgga') {
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 512);
        g.fillStyle = '#c62828'; g.fillRect(0, 0, 256, 120); g.fillRect(0, 392, 256, 120);
      } else {
        g.fillStyle = colours[colourKey]; g.fillRect(0, 0, 256, 512);
      }
    });
    const fg = new THREE.PlaneGeometry(0.9, 1.8, 6, 1);
    fg.translate(0.45, 0, 0);
    const fm = solo(mat, fg, x + 0.06, h - 1.1, z, 0, false);
    anims.push((t) => { fm.rotation.y = Math.sin(t * 1.7 + x) * 0.35; });
    C.circle(x, z, 0.12);
  }
  function motorbike(x, z, yaw) {
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    for (const s of [-0.65, 0.65]) {
      const g = new THREE.TorusGeometry(0.3, 0.07, 8, 16); g.rotateY(PI / 2);
      B.add('black', g, x + sin * s, 0.32, z + cos * s, yaw);
    }
    B.add('black', boxGeo(0.25, 0.35, 1.0), x, 0.65, z, yaw);
    B.add('darkMetal', boxGeo(0.3, 0.15, 0.6), x - sin * 0.2, 0.86, z - cos * 0.2, yaw);
    B.add('steel', barGeo(V(x + sin * 0.55, 0.6, z + cos * 0.55), V(x + sin * 0.45, 1.05, z + cos * 0.45), 0.025));
    C.circle(x, z, 0.6);
  }
  function cableDrum(x, z) {
    const g = new THREE.CylinderGeometry(0.95, 0.95, 0.9, 20); g.rotateX(PI / 2);
    B.add('drum', g, x, 0.95, z);
    B.add('black', new THREE.CylinderGeometry(0.6, 0.6, 0.85, 16).rotateX(PI / 2), x, 0.95, z);
    C.circle(x, z, 0.95);
  }
  function brickPile(x, z) {
    for (let k = 0; k < 3; k++) B.box('terracotta', 2.0 - k * 0.3, 0.45, 1.2 - k * 0.15, x + (R() - 0.5) * 0.2, 0.22 + k * 0.45, z);
    C.rect(x - 1, z - 0.6, x + 1, z + 0.6, 1.4);
  }
  function heap(x, z, r, mat) {
    B.add(mat, new THREE.ConeGeometry(r, r * 0.55, 14, 2), x, r * 0.27, z, R() * PI);
    C.circle(x, z, r * 0.75);
  }
  function parkedCar(x, z, yaw) {
    const colours = ['carWhite', 'carWhite', 'carWhite', 'carSilver', 'carBlack', 'carGrey', 'carRed'];
    carParts(B, colours[Math.floor(R() * colours.length)], x, z, yaw);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    C.circle(x + s * 1.2, z + c * 1.2, 1.0); C.circle(x - s * 1.2, z - c * 1.2, 1.0);
  }
  function pylons() {
    const spots = [MP(-262, 150), MP(-90, 336), MP(40, 336), MP(112, 220), MP(40, -45)];
    const tips = [];
    spots.forEach(([px, pz], idx) => {
      const legs = [[-4, -4], [4, -4], [4, 4], [-4, 4]];
      const top = 40;
      for (let i = 0; i < 4; i++) {
        const [lx, lz] = legs[i];
        B.add('steel', barGeo(V(px + lx, 0, pz + lz), V(px + lx * 0.2, top, pz + lz * 0.2), 0.15, 5));
        for (let k = 0; k < 8; k++) {
          const t0 = k / 8, t1 = (k + 1) / 8, [nx, nz] = legs[(i + 1) % 4];
          const a = V(px + lx * (1 - 0.8 * t0), top * t0, pz + lz * (1 - 0.8 * t0));
          const b = V(px + nx * (1 - 0.8 * t1), top * t1, pz + nz * (1 - 0.8 * t1));
          B.add('steel', barGeo(a, b, 0.05, 4));
        }
      }
      // arms across the line direction
      const prev = spots[Math.max(0, idx - 1)], next = spots[Math.min(spots.length - 1, idx + 1)];
      let dx = next[0] - prev[0], dz = next[1] - prev[1];
      const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const ax = -dz, az = dx;
      const set = [];
      for (const [y, half] of [[27, 8], [33, 10], [39, 6]]) {
        const a = V(px - ax * half, y, pz - az * half), b = V(px + ax * half, y, pz + az * half);
        B.add('steel', barGeo(a, b, 0.12, 5));
        set.push(a.clone().setY(y - 0.8), b.clone().setY(y - 0.8));
      }
      tips.push(set);
    });
    for (let i = 0; i < tips.length - 1; i++) {
      for (let k = 0; k < tips[i].length; k++) {
        const a = tips[i][k], b = tips[i + 1][k];
        let prev = a;
        for (let s = 1; s <= 16; s++) {
          const t = s / 16;
          const p = a.clone().lerp(b, t); p.y -= 7 * (1 - (2 * t - 1) ** 2);
          B.add('cable', barGeo(prev, p, 0.03, 4));
          prev = p;
        }
      }
    }
  }
}

/** A parked car built from rounded boxes. Material keys: body colour, carGlass, tyre, rim, lights. */
export function carParts(B, body, x, z, yaw) {
  const add = (key, geo, lx, ly, lz) => {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    B.add(key, geo, x + lx * c + lz * s, ly, z - lx * s + lz * c, yaw);
  };
  add(body, new RoundedBoxGeometry(1.8, 0.72, 4.35, 2, 0.2), 0, 0.68, 0);
  add('carGlass', new RoundedBoxGeometry(1.62, 0.62, 2.3, 2, 0.16), 0, 1.25, -0.25);
  add(body, new RoundedBoxGeometry(1.58, 0.1, 1.9, 1, 0.04), 0, 1.57, -0.35);
  for (const sx of [-0.8, 0.8]) for (const sz of [-1.35, 1.35]) {
    const g = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12); g.rotateZ(PI / 2);
    add('tyre', g, sx, 0.34, sz);
    const r = new THREE.CylinderGeometry(0.2, 0.2, 0.25, 8); r.rotateZ(PI / 2);
    add('rim', r, sx * 1.01, 0.34, sz);
  }
  for (const sx of [-0.6, 0.6]) {
    add('carLight', boxGeo(0.42, 0.14, 0.08), sx, 0.82, 2.17);
    add('carTail', boxGeo(0.38, 0.12, 0.06), sx, 0.88, -2.17);
  }
}

export function addCarMaterials(M) {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  M.carWhite = std({ color: 0xf2f2ef, metalness: 0.35, roughness: 0.28 });
  M.carSilver = std({ color: 0xb8bcc0, metalness: 0.75, roughness: 0.3 });
  M.carBlack = std({ color: 0x15171a, metalness: 0.5, roughness: 0.25 });
  M.carGrey = std({ color: 0x5c6166, metalness: 0.6, roughness: 0.3 });
  M.carRed = std({ color: 0xa3131a, metalness: 0.45, roughness: 0.3 });
  M.carGlass = std({ color: 0x0f1418, metalness: 0.9, roughness: 0.08 });
  M.tyre = std({ color: 0x141414, roughness: 0.9 });
  M.rim = std({ color: 0xaab0b6, metalness: 0.9, roughness: 0.3 });
  M.carLight = std({ color: 0xffffff, emissive: 0xfff1d0, emissiveIntensity: 0.4, roughness: 0.2 });
  M.carTail = std({ color: 0x9a0f12, emissive: 0x6a0000, emissiveIntensity: 0.6, roughness: 0.3 });
}
