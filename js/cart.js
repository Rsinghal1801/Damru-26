// The campus e-cart: a six-seat electric buggy with a roof, built from rounded parts.
// Simple bicycle-model driving: throttle, brake, reverse, speed-sensitive steering.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clamp, damp } from './util.js';
import { pushOut } from './camel.js';

const WHEELBASE = 2.3;

export class Cart {
  constructor() {
    this.object = new THREE.Group();
    this.object.name = 'cart';
    this.pos = this.object.position;
    this.heading = 0;
    this.speed = 0;
    this.steer = 0;
    this.wheelSpin = 0;
    this.build();
  }

  build() {
    const std = (o) => new THREE.MeshStandardMaterial(o);
    const paint = std({ color: 0xf3f3f0, metalness: 0.3, roughness: 0.3 });
    const maroon = std({ color: 0x7d1a22, metalness: 0.2, roughness: 0.4 });
    const black = std({ color: 0x1a1b1d, roughness: 0.55 });
    const seat = std({ color: 0x222326, roughness: 0.45 });
    const chrome = std({ color: 0xc8ccd0, metalness: 0.9, roughness: 0.25 });
    const tyre = std({ color: 0x151515, roughness: 0.9 });
    const glass = std({ color: 0xbfd6e0, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.25 });
    const lamp = std({ color: 0xffffff, emissive: 0xfff3d6, emissiveIntensity: 0.8 });
    const o = this.object;
    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, parent = o) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
      m.castShadow = true; m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    const rb = (w, h, d, r = 0.06) => new RoundedBoxGeometry(w, h, d, 3, r);
    // chassis and floor
    add(rb(1.32, 0.22, 3.5, 0.08), black, 0, 0.36, 0);
    add(rb(1.3, 0.06, 2.9, 0.03), black, 0, 0.5, -0.15);
    // front cowl with lights and a maroon stripe
    add(rb(1.36, 0.62, 0.75, 0.16), paint, 0, 0.72, 1.45);
    add(rb(1.38, 0.08, 0.77, 0.03), maroon, 0, 0.62, 1.45);
    for (const x of [-0.45, 0.45]) add(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 16), lamp, x, 0.85, 1.83, Math.PI / 2);
    add(rb(1.4, 0.16, 0.12, 0.05), black, 0, 0.42, 1.86);       // bumper
    add(rb(1.4, 0.16, 0.12, 0.05), black, 0, 0.42, -1.86);
    // dashboard and steering (driver on the right, as in India)
    add(rb(1.3, 0.12, 0.45, 0.04), black, 0, 1.0, 1.08);
    const column = add(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), black, -0.33, 1.1, 0.88, -0.5);
    column.castShadow = false;
    this.wheel = new THREE.Group();
    this.wheel.position.set(-0.33, 1.3, 0.76);
    this.wheel.rotation.x = -0.95;
    o.add(this.wheel);
    add(new THREE.TorusGeometry(0.18, 0.02, 8, 24), black, 0, 0, 0, 0, 0, 0, this.wheel);
    add(new THREE.BoxGeometry(0.34, 0.025, 0.03), black, 0, 0, 0, 0, 0, 0, this.wheel);
    // body sides behind the cowl
    for (const x of [-0.66, 0.66]) add(rb(0.06, 0.32, 2.75, 0.02), paint, x, 0.66, -0.3);
    // three benches: front (driver + 1), middle, rear (facing back)
    const bench = (z, back, facing = 1) => {
      add(rb(1.2, 0.14, 0.5, 0.05), seat, 0, 0.78, z);
      add(rb(1.2, 0.48, 0.1, 0.05), seat, 0, 1.07, z - facing * 0.27, -facing * 0.12);
      add(rb(1.24, 0.32, 0.44, 0.03), paint, 0, 0.56, z);
      if (back) add(rb(1.26, 0.05, 0.1, 0.02), chrome, 0, 1.32, z - facing * 0.3);
    };
    bench(0.35, true);
    bench(-0.55, true);
    bench(-1.25, false, -1);
    this.seatDriver = new THREE.Vector3(-0.3, 0.85, 0.35);
    // roof on four posts, with the university's name
    for (const [x, z] of [[-0.6, 1.0], [0.6, 1.0], [-0.6, -1.45], [0.6, -1.45]]) {
      add(new THREE.CylinderGeometry(0.025, 0.025, 1.45, 8), chrome, x, 1.7, z, z > 0 ? -0.08 : 0);
    }
    add(rb(1.42, 0.08, 2.75, 0.04), paint, 0, 2.43, -0.22);
    add(rb(1.46, 0.12, 2.79, 0.04), maroon, 0, 2.36, -0.22);
    const label = canvasLabel('RISHIHOOD UNIVERSITY');
    for (const s of [-1, 1]) {
      const m = add(new THREE.PlaneGeometry(2.0, 0.11), label, s * 0.735, 2.36, -0.22, 0, s * Math.PI / 2, 0);
      m.castShadow = false;
    }
    // windscreen
    const ws = add(new THREE.PlaneGeometry(1.2, 0.95), glass, 0, 1.75, 1.03, -0.08);
    ws.castShadow = false;
    // wheels
    this.wheels = [];
    for (const [x, z, front] of [[-0.6, 1.15, true], [0.6, 1.15, true], [-0.6, -1.15, false], [0.6, -1.15, false]]) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.29, z);
      o.add(pivot);
      const spin = new THREE.Group();
      pivot.add(spin);
      const tg = new THREE.CylinderGeometry(0.29, 0.29, 0.2, 22); tg.rotateZ(Math.PI / 2);
      add(tg, tyre, 0, 0, 0, 0, 0, 0, spin);
      const hg = new THREE.CylinderGeometry(0.16, 0.16, 0.21, 12); hg.rotateZ(Math.PI / 2);
      add(hg, chrome, 0, 0, 0, 0, 0, 0, spin);
      const bar = add(new THREE.BoxGeometry(0.22, 0.05, 0.3), black, 0, 0, 0, 0, 0, 0, spin);
      bar.castShadow = false;
      this.wheels.push({ pivot, spin, front });
    }
  }

  get forward() { return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading)); }

  /** ctl: {fwd, turn} while driven, else null (parked: rolls to a stop). */
  update(dt, ctl, C, obstacles) {
    const fwd = ctl ? ctl.fwd : 0, turn = ctl ? ctl.turn : 0;
    const max = ctl && ctl.run ? 9 : 6.5;
    if (fwd > 0.1) {
      this.speed += (this.speed < 0 ? 7 : 2.8) * fwd * dt;
      this.speed = Math.min(this.speed, max);
    } else if (fwd < -0.1) {
      if (this.speed > 0.15) this.speed -= 7 * dt;
      else this.speed = Math.max(-2.8, this.speed - 2.2 * dt);
    } else {
      const drag = 1.4 * dt;
      this.speed = Math.abs(this.speed) < drag ? 0 : this.speed - Math.sign(this.speed) * drag;
    }
    if (this.speed > max) this.speed = damp(this.speed, max, 2, dt);
    const lim = 0.6 - 0.32 * clamp(Math.abs(this.speed) / 9, 0, 1);
    this.steer = damp(this.steer, turn * lim, 6, dt);
    this.heading += (this.speed / WHEELBASE) * Math.tan(this.steer) * dt;
    const f = this.forward;
    this.pos.x += f.x * this.speed * dt;
    this.pos.z += f.z * this.speed * dt;
    for (const off of [1.2, 0, -1.2]) {
      const p = { x: this.pos.x + f.x * off, z: this.pos.z + f.z * off };
      const hit = C.resolve(p, 0.72) || pushOut(p, 0.72, obstacles);
      if (hit) {
        this.pos.x = p.x - f.x * off;
        this.pos.z = p.z - f.z * off;
        const into = -(hit.x * f.x + hit.z * f.z) * Math.sign(this.speed);
        if (into > 0.3) { this.bump = Math.abs(this.speed); this.speed *= -0.15; }
      }
    }
    this.object.rotation.y = this.heading;
    // visuals: wheel spin, steering, a little body roll
    this.wheelSpin += (this.speed / 0.29) * dt;
    for (const w of this.wheels) {
      w.spin.rotation.x = this.wheelSpin;
      if (w.front) w.pivot.rotation.y = this.steer;
    }
    this.wheel.rotation.z = -this.steer * 2.2;
  }
}

function canvasLabel(text) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 56;
  const g = c.getContext('2d');
  g.fillStyle = '#7d1a22'; g.fillRect(0, 0, 1024, 56);
  g.fillStyle = '#ffffff'; g.font = 'bold 40px "Avenir Next", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 512, 30);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, side: THREE.DoubleSide });
}
