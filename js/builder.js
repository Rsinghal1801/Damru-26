// Collects thousands of static pieces and merges them into one mesh per material, so the
// whole campus draws in a few dozen calls. Geometry UVs are in metres (see materials.js).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();

/** Box with UVs in metres on every face. */
export function boxGeo(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // face order: +x, -x, +y, -y, +z, -z (4 verts each)
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * dims[f][0], uv.getY(k) * dims[f][1]);
    }
  }
  return g;
}

/** Flat rectangle on the ground (y up) with UVs in metres. */
export function groundGeo(w, d) {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d);
  return g;
}

/** Vertical rectangle facing +z with UVs 0..1 (pictures) or in metres. */
export function quadGeo(w, h, metres = false) {
  const g = new THREE.PlaneGeometry(w, h);
  if (metres) {
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
  }
  return g;
}

/** Cylinder between two points. */
export function barGeo(a, b, r, sides = 8) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r, r, len, sides, 1, true);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  g.applyQuaternion(q);
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

export class StaticBuilder {
  constructor() {
    this.parts = new Map(); // material key -> geometries
  }

  /** Adds geometry (taken over, not copied) at x,y,z with yaw (radians) and scale. */
  add(key, geo, x = 0, y = 0, z = 0, yaw = 0, sx = 1, sy = 1, sz = 1, pitch = 0, roll = 0) {
    tmpE.set(pitch, yaw, roll, 'YXZ');
    tmpQ.setFromEuler(tmpE);
    tmpM.compose(tmpP.set(x, y, z), tmpQ, tmpS.set(sx, sy, sz));
    geo.applyMatrix4(tmpM);
    this.push(key, geo);
    return geo;
  }

  push(key, geo) {
    if (geo.index) geo = geo.toNonIndexed();
    for (const name of Object.keys(geo.attributes)) {
      if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
    }
    if (!geo.attributes.uv) {
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    }
    if (!this.parts.has(key)) this.parts.set(key, []);
    this.parts.get(key).push(geo);
  }

  box(key, w, h, d, x, y, z, yaw = 0) {
    return this.add(key, boxGeo(w, h, d), x, y, z, yaw);
  }

  /** Builds the merged meshes into `parent`. noShadow: material keys that should not cast. */
  build(parent, materials, { noCast = [], noReceive = [] } = {}) {
    const meshes = {};
    for (const [key, list] of this.parts) {
      const mat = materials[key];
      if (!mat) { console.warn('missing material', key); continue; }
      // merge in chunks so no single buffer gets enormous
      for (let i = 0; i < list.length; i += 4000) {
        const merged = mergeGeometries(list.slice(i, i + 4000), false);
        if (!merged) continue;
        merged.computeBoundingSphere();
        const mesh = new THREE.Mesh(merged, mat);
        mesh.castShadow = !noCast.includes(key);
        mesh.receiveShadow = !noReceive.includes(key);
        mesh.matrixAutoUpdate = false;
        mesh.name = 'static:' + key;
        parent.add(mesh);
        meshes[key] = mesh;
      }
    }
    this.parts.clear();
    return meshes;
  }
}
