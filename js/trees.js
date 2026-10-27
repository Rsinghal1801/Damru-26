// Trees and palms. ez-tree grows a few real branching trees at load time; each is then drawn
// many times with instancing, in map chunks so off-screen groups are skipped. Leaves sway.
import * as THREE from 'three';
import { Tree } from 'ez-tree';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './util.js';

export const wind = { value: 0 }; // shared time uniform

function windify(mat, amount) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = wind;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = instanceMatrix[3].xyz;
        #else
          vec3 ip = vec3(0.0);
        #endif
        float ph = dot(ip, vec3(0.13, 0.0, 0.17)) + position.y * 0.04;
        float sway = sin(uTime * 1.6 + ph) * 0.6 + sin(uTime * 3.7 + ph * 2.3) * 0.25;
        transformed.xz += uv.y * ${amount.toFixed(3)} * vec2(sway, cos(uTime * 1.2 + ph) * 0.5);`);
    // light both faces of a leaf alike (normals point out of the crown)
    sh.fragmentShader = sh.fragmentShader.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0');
  };
  mat.customProgramCacheKey = () => 'wind' + amount;
}

/** Grows one tree and returns normalised geometry + materials (height = 1). */
function grow(preset, seed, tweak) {
  const t = new Tree();
  t.loadPreset(preset);
  t.options.seed = seed;
  if (tweak) tweak(t.options);
  t.generate();
  const bark = t.branchesMesh.geometry, leaves = t.leavesMesh.geometry;
  bark.computeBoundingBox();
  leaves.computeBoundingBox();
  const box = bark.boundingBox.clone().union(leaves.boundingBox);
  const k = 1 / (box.max.y - Math.min(0, box.min.y));
  for (const g of [bark, leaves]) g.scale(k, k, k);
  // soft, rounded crown lighting: blend each leaf normal towards "out of the crown"
  leaves.computeBoundingBox();
  const c = leaves.boundingBox.getCenter(new THREE.Vector3());
  c.y -= (leaves.boundingBox.max.y - leaves.boundingBox.min.y) * 0.15;
  const p = leaves.attributes.position, n = leaves.attributes.normal, v = new THREE.Vector3(), o = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).sub(c).normalize();
    o.fromBufferAttribute(n, i);
    if (o.dot(v) < 0) o.negate();
    o.multiplyScalar(0.3).addScaledVector(v, 0.7).normalize();
    n.setXYZ(i, o.x, o.y, o.z);
  }
  const bm = t.branchesMesh.material, lm = t.leavesMesh.material;
  return { bark, leaves, barkMap: bm.map, barkNormal: bm.normalMap, barkColor: bm.color.clone(), leafMap: lm.map, leafColor: lm.color.clone(), alphaTest: lm.alphaTest };
}

const lite = (o) => {
  o.branch.segments = { 0: 7, 1: 5, 2: 3, 3: 3 };
  o.branch.sections = { 0: 8, 1: 5, 2: 3, 3: 2 };
};
const KINDS = {
  // the neem-like avenue trees
  ash: { preset: 'Ash Small', seeds: [11, 23], h: 8.5, tint: 0x9fb07a, tweak: (o) => { lite(o); o.leaves.count = 22; o.leaves.size *= 1.45; } },
  // broad shade trees (ficus / peepal-like)
  oak: { preset: 'Oak Small', seeds: [5, 77], h: 9.5, tint: 0x7f9a62, tweak: (o) => { lite(o); o.leaves.count = Math.round(o.leaves.count * 1.3); o.leaves.size *= 1.15; } },
  // young trees on the lawns, with stakes
  sapling: { preset: 'Aspen Small', seeds: [3], h: 3.4, tint: 0xa9bf7d, tweak: (o) => { lite(o); o.bark.type = 'oak'; o.leaves.type = 'ash'; o.leaves.tint = 0xffffff; o.leaves.count = Math.round(o.leaves.count * 1.4); } },
  // cheap distant trees
  far: { preset: 'Oak Small', seeds: [9], h: 11, tint: 0x7d935d, tweak: (o) => { lite(o); o.branch.levels = 2; o.leaves.billboard = 'single'; o.leaves.count = 26; o.leaves.size *= 2.2; } },
};

export function buildTrees(scene, spots, palms, quality) {
  const group = new THREE.Group();
  group.name = 'trees';
  scene.add(group);
  const R = rng(9);
  const low = quality === 'low';
  const variants = {};
  for (const [kind, K] of Object.entries(KINDS)) {
    const seeds = low ? K.seeds.slice(0, 1) : K.seeds;
    variants[kind] = seeds.map((seed) => {
      const g = grow(K.preset, seed, (o) => { K.tweak(o); if (low) { o.leaves.count = Math.round(o.leaves.count * 0.65); o.leaves.size *= 1.2; } });
      const barkMat = new THREE.MeshStandardMaterial({ map: g.barkMap, normalMap: g.barkNormal, color: 0xcfc4b5, roughness: 0.95 });
      const leafMat = new THREE.MeshStandardMaterial({ map: g.leafMap, color: K.tint, alphaTest: Math.max(0.4, g.alphaTest), side: THREE.DoubleSide, roughness: 0.82 });
      windify(leafMat, kind === 'sapling' ? 0.012 : 0.006);
      return { ...g, barkMat, leafMat };
    });
  }

  // sort trees into 96 m chunks
  const chunks = new Map();
  for (const t of spots) {
    if (low && t.far && R() < 0.5) continue;
    const kind = t.far ? 'far' : t.kind;
    const list = variants[kind];
    const v = Math.floor(R() * list.length);
    const key = `${kind}:${v}:${Math.floor(t.x / 96)}:${Math.floor(t.z / 96)}`;
    if (!chunks.has(key)) chunks.set(key, { kind, v, items: [] });
    chunks.get(key).items.push(t);
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color();
  const Y = new THREE.Vector3(0, 1, 0);
  let count = 0;
  for (const { kind, v, items } of chunks.values()) {
    const V = variants[kind][v];
    const bark = new THREE.InstancedMesh(V.bark, V.barkMat, items.length);
    const leaves = new THREE.InstancedMesh(V.leaves, V.leafMat, items.length);
    items.forEach((t, i) => {
      const h = KINDS[kind].h * (t.s || 1) * (0.9 + R() * 0.2);
      q.setFromAxisAngle(Y, R() * Math.PI * 2);
      m.compose(pos.set(t.x, t.y || 0, t.z), q, s.set(h, h, h));
      bark.setMatrixAt(i, m);
      leaves.setMatrixAt(i, m);
      col.setHSL(0.24 + (R() - 0.5) * 0.05, 0.25 + R() * 0.2, 0.42 + R() * 0.14);
      leaves.setColorAt(i, col.multiplyScalar(2.2));
    });
    for (const mesh of [bark, leaves]) {
      mesh.castShadow = !(kind === 'far') && !low;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
    count += items.length;
  }
  // stakes for the saplings
  const stakeGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.6, 5);
  stakeGeo.translate(0.18, 0.8, 0);
  const saps = spots.filter((t) => t.kind === 'sapling');
  const stakes = new THREE.InstancedMesh(stakeGeo, new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.9 }), saps.length);
  saps.forEach((t, i) => { m.makeTranslation(t.x, 0, t.z); stakes.setMatrixAt(i, m); });
  stakes.computeBoundingSphere();
  group.add(stakes);

  buildPalms(group, palms);
  return { group, count, colliders: spots.filter((t) => !t.far).map((t) => ({ x: t.x, z: t.z, r: t.kind === 'sapling' ? 0.12 : 0.3 * (t.s || 1) })) };
}

// ---------------------------------------------------------------- palms
function frondTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  const R = rng(4);
  g.clearRect(0, 0, 256, 512);
  for (let i = 0; i < 70; i++) {
    const t = i / 70;               // 0 at the base (v=0 bottom of the canvas), 1 at the tip
    const y = 512 - t * 500 - 6;
    const len = (1 - t) * 0.6 * 128 + 22;
    for (const side of [-1, 1]) {
      const hue = 80 + R() * 25, light = 32 + R() * 16;
      g.strokeStyle = `hsl(${hue},45%,${light}%)`;
      g.lineWidth = 7 - t * 3;
      g.beginPath();
      g.moveTo(128, y);
      g.quadraticCurveTo(128 + side * len * 0.5, y - len * 0.25, 128 + side * len, y - len * 0.7);
      g.stroke();
    }
  }
  g.strokeStyle = '#6c6a3a';
  g.lineWidth = 6;
  g.beginPath(); g.moveTo(128, 512); g.lineTo(128, 6); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function trunkTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#8a7a60'; g.fillRect(0, 0, 128, 512);
  const R = rng(8);
  for (let y = 0; y < 512; y += 12 + R() * 6) {
    g.fillStyle = `rgba(60,48,35,${0.35 + R() * 0.3})`;
    g.fillRect(0, y, 128, 3 + R() * 3);
    g.fillStyle = `rgba(200,185,160,${0.15 + R() * 0.15})`;
    g.fillRect(0, y + 4, 128, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function palmGeometry(H, seed) {
  const R = rng(seed);
  const lean = new THREE.Vector3((R() - 0.5) * 0.6, 0, (R() - 0.5) * 0.6);
  const trunkParts = [];
  const N = 10;
  const at = (t) => new THREE.Vector3(lean.x * t * t, H * t, lean.z * t * t);
  for (let i = 0; i < N; i++) {
    const a = at(i / N), b = at((i + 1) / N);
    const r0 = 0.2 - 0.06 * (i / N), r1 = 0.2 - 0.06 * ((i + 1) / N);
    const g = new THREE.CylinderGeometry(r1, r0, a.distanceTo(b) + 0.02, 10, 1, true);
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setY(k, (i + uv.getY(k)) / N * (H / 2.5));
    const dir = b.clone().sub(a).normalize();
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    trunkParts.push(g);
  }
  // the knobbly crown shaft where the fronds start
  const top = at(1);
  const cap = new THREE.SphereGeometry(0.22, 10, 8);
  cap.scale(1, 1.4, 1);
  cap.translate(top.x, top.y, top.z);
  trunkParts.push(cap);
  const trunk = mergeGeometries(trunkParts.map((g) => g.toNonIndexed()));

  const fronds = [];
  const F = 15;
  for (let i = 0; i < F; i++) {
    const yaw = (i / F) * Math.PI * 2 + R() * 0.3;
    const up = i % 3 === 0 ? 0.9 : i % 3 === 1 ? 0.35 : -0.1; // some fronds rise, some droop
    const L = 2.6 + R() * 0.9, W = 1.25;
    const segs = 8;
    const pos = [], uvs = [], idx = [];
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const d = t * L;
      const hx = d * Math.cos(up * 0.6);
      const hy = d * Math.sin(up * 0.6) - 0.55 * d * d / L - (up < 0 ? d * 0.2 : 0);
      for (const u of [-1, 0, 1]) {
        const w = u * W * 0.5 * (1 - t * 0.6);
        pos.push(w, hy + Math.abs(u) * 0.12 * (1 - t), hx);
        uvs.push((u + 1) / 2, t);
      }
      if (s < segs) {
        const b = s * 3;
        idx.push(b, b + 3, b + 1, b + 1, b + 3, b + 4, b + 1, b + 4, b + 2, b + 2, b + 4, b + 5);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    // normals mostly up so the crown reads as one canopy
    const n = g.attributes.normal;
    for (let k = 0; k < n.count; k++) { const ny = Math.abs(n.getY(k)); n.setXYZ(k, n.getX(k) * 0.4, ny + 0.6, n.getZ(k) * 0.4); }
    g.rotateY(yaw);
    g.translate(top.x, top.y + 0.1, top.z);
    fronds.push(g.toNonIndexed());
  }
  const crown = mergeGeometries(fronds);
  crown.normalizeNormals();
  return { trunk, crown, H };
}

function buildPalms(group, palms) {
  if (!palms.length) return;
  const trunkMat = new THREE.MeshStandardMaterial({ map: trunkTexture(), roughness: 0.95 });
  const frondMat = new THREE.MeshStandardMaterial({ map: frondTexture(), alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.75, color: 0xe6efd2 });
  windify(frondMat, 0.25);
  const kinds = [palmGeometry(6, 1), palmGeometry(7.5, 2)];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const R = rng(15);
  kinds.forEach((K, ki) => {
    const list = palms.filter((_, i) => i % 2 === ki);
    if (!list.length) return;
    const tm = new THREE.InstancedMesh(K.trunk, trunkMat, list.length);
    const cm = new THREE.InstancedMesh(K.crown, frondMat, list.length);
    list.forEach((pl, i) => {
      const k = (pl.h || K.H) / K.H;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), R() * Math.PI * 2);
      m.compose(p.set(pl.x, pl.base || 0, pl.z), q, s.set(k, k, k));
      tm.setMatrixAt(i, m); cm.setMatrixAt(i, m);
    });
    for (const mesh of [tm, cm]) { mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere(); group.add(mesh); }
  });
}
