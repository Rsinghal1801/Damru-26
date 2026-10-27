// The riding camel: a sculpted, skinned dromedary moved by code. It paces (both legs on one
// side together, as camels do), kneels front-first and rises hind-first, chews, flicks its tail.
import * as THREE from 'three';
import { model, tex } from './assets.js';
import { clamp, damp, lerp, dampAngle } from './util.js';

const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export class Camel {
  static async load() {
    const g = await model('camel.glb');
    return new Camel(g.scene);
  }

  constructor(root) {
    this.object = new THREE.Group();
    this.object.name = 'camel';
    this.object.add(root);
    const coat = tex('camel_coat.jpg');
    const cloth = tex('saddle_cloth.jpg');
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        o.material = o.name === 'CamelBody'
          ? new THREE.MeshStandardMaterial({ map: coat, vertexColors: true, roughness: 0.92 })
          : new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.85, side: THREE.DoubleSide });
      }
    });
    this.B = {};
    root.traverse((o) => { if (o.isBone) this.B[o.name] = o; });
    this.rest = {};
    for (const k in this.B) this.rest[k] = this.B[k].position.clone();
    this.addTack();

    this.pos = this.object.position;
    this.heading = 0;
    this.speed = 0;
    this.phase = 0;
    this.kneel = 0;         // 0 standing .. 1 lying on its knees
    this.kneelTarget = 0;
    this.t = Math.random() * 10;
    this.rider = null;
    this.radius = 0.6;
  }

  /** Wooden saddle frame, halter and a few tassels, all riding on the bones. */
  addTack() {
    const B = this.B;
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.7 });
    const rope = new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.9 });
    const red = new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.8 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xe0a526, roughness: 0.6, metalness: 0.3 });
    const body = B.body; // bone at (0, 1.42, 0)
    const seat = new THREE.Group();
    seat.position.set(0, 0.86, -0.05);
    body.add(seat);
    this.seat = seat;
    // front and back arches of the saddle frame
    for (const z of [0.36, -0.42]) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 6, 14, Math.PI), wood);
      arch.position.set(0, 0.36, z - 0.05);
      arch.scale.set(1, 0.75, 1);
      arch.castShadow = true;
      body.add(arch);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), wood);
      knob.position.set(0, 0.36 + 0.42 * 0.75 + 0.03, z - 0.05);
      body.add(knob);
    }
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.62), red);
    pad.position.set(0, 0.82, -0.05);
    body.add(pad);
    // tassels hanging off the cloth
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1;
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.14, 6), i % 3 ? gold : red);
      t.position.set(side * 0.47, 0.06 - (i >> 1) * 0.02, -0.4 + (i >> 1) * 0.36);
      t.rotation.x = Math.PI;
      body.add(t);
    }
    // halter round the muzzle and the lead rope back to the saddle
    const halter = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 6, 16), rope);
    halter.position.set(0, -0.12, 0.32);
    halter.rotation.x = Math.PI / 2 - 0.35;
    B.head.add(halter);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 16), rope);
    strap.position.set(0, 0.02, 0.05);
    strap.rotation.y = Math.PI / 2;
    B.head.add(strap);
    // bead necklace
    const beads = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 18), red);
    beads.position.set(0, 0.0, 0.0);
    beads.rotation.x = Math.PI / 2 + 0.6;
    B.neck1.add(beads);
    this.ropeMat = rope;
  }

  get forward() { return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading)); }

  /** ctl: {fwd, turn, run} while ridden and standing, else null. */
  update(dt, ctl, C, obstacles) {
    this.t += dt;
    // kneel / rise
    const kRate = 0.42;
    if (this.kneel < this.kneelTarget) this.kneel = Math.min(this.kneelTarget, this.kneel + kRate * dt);
    else if (this.kneel > this.kneelTarget) this.kneel = Math.max(this.kneelTarget, this.kneel - kRate * dt);
    const canMove = this.kneel < 0.01 && ctl;
    let target = 0;
    if (canMove) {
      if (ctl.fwd > 0.1) target = ctl.run ? 5.6 * ctl.fwd : 1.9 * ctl.fwd;
      else if (ctl.fwd < -0.1) target = -0.7;
    }
    this.speed = damp(this.speed, target, target > this.speed ? 0.9 : 2.2, dt);
    if (Math.abs(this.speed) < 0.02 && target === 0) this.speed = 0;
    if (canMove) {
      const rate = 0.95 - 0.35 * clamp(Math.abs(this.speed) / 5.6, 0, 1);
      this.heading += (ctl.turn || 0) * rate * dt * (this.speed < -0.05 ? -1 : 1);
    }
    if (this.speed !== 0) {
      const f = this.forward;
      this.pos.x += f.x * this.speed * dt;
      this.pos.z += f.z * this.speed * dt;
      // two circles: chest and rump
      for (const off of [0.85, -0.75]) {
        const p = { x: this.pos.x + f.x * off, z: this.pos.z + f.z * off };
        const hit = C.resolve(p, this.radius) || pushOut(p, this.radius, obstacles);
        if (hit) {
          this.pos.x = p.x - f.x * off;
          this.pos.z = p.z - f.z * off;
          this.speed *= 0.5;
        }
      }
    }
    this.object.rotation.y = this.heading;
    this.pose(dt);
  }

  pose(dt) {
    const B = this.B, R = this.rest;
    const v = Math.abs(this.speed);
    const run = smooth(2.0, 5.0, v);
    const A = lerp(0.3, 0.5, run) * smooth(0.05, 0.6, v);
    const flex = lerp(0.9, 1.35, run) * smooth(0.05, 0.6, v);
    const leg = 1.3;
    const stride = 4 * leg * Math.sin(Math.max(0.2, lerp(0.3, 0.5, run))) * lerp(1, 1.25, run);
    this.phase = (this.phase + (v / stride) * dt * Math.sign(this.speed || 1)) % 1;
    if (this.phase < 0) this.phase += 1;
    const legPose = (ph) => {
      ph = ((ph % 1) + 1) % 1;
      const u = -A * Math.cos(ph * Math.PI * 2);              // + = foot back
      const s = ph >= 0.5 ? Math.sin(Math.PI * (ph - 0.5) / 0.5) : 0; // swing lift
      return [u, s];
    };
    const kn = this.kneel;
    const f = smooth(0.0, 0.5, kn);   // front legs fold first
    const h = smooth(0.35, 0.9, kn);  // then the hind legs
    for (const [side, off] of [['L', 0], ['R', 0.5]]) {
      const [uf, sf] = legPose(this.phase + off);
      const [uh, sh] = legPose(this.phase + off - 0.06);
      B['fu' + side].rotation.x = lerp(uf - sf * 0.15 * flex, -0.95, f);
      B['fl' + side].rotation.x = lerp(sf * flex, 2.6, f);
      B['ff' + side].rotation.x = lerp(-sf * flex * 0.45, 0, f);
      B['hu' + side].rotation.x = lerp(uh - sh * 0.1 * flex, -1.0, h);
      B['hl' + side].rotation.x = lerp(-sh * flex * 0.75, 2.55, h);
      B['hf' + side].rotation.x = lerp(sh * flex * 0.5, 0, h);
    }
    const th = this.phase * Math.PI * 2;
    const gait = smooth(0.05, 0.6, v);
    // body: drops as the legs fold, pitches nose-down while only the front is down, sways while pacing
    const drop = (f + h) * 0.5;
    B.body.position.y = R.body.y - drop * 1.0 + gait * 0.035 * Math.cos(th * 2) * (1 + run);
    B.body.position.z = R.body.z + (f - h) * 0.15;
    B.body.rotation.x = Math.atan2((f - h) * 0.95, 1.3);
    B.body.rotation.z = gait * Math.sin(th) * lerp(0.045, 0.07, run);
    // neck and head: bob with the stride, head held level, slow looks around when idle
    const idle = 1 - gait;
    const look = idle * (0.35 * Math.sin(this.t * 0.31) + 0.15 * Math.sin(this.t * 0.87));
    B.neck0.rotation.x = -0.2 * kn + gait * 0.06 * Math.sin(th * 2 + 0.6) - run * 0.12;
    B.neck1.rotation.x = gait * 0.05 * Math.sin(th * 2 + 1.0);
    B.neck2.rotation.y = look * 0.6;
    B.neck3.rotation.y = look * 0.4;
    B.neck2.rotation.x = run * 0.1;
    B.head.rotation.x = -(B.neck0.rotation.x + B.neck1.rotation.x + B.neck2.rotation.x + B.body.rotation.x) * 0.7;
    // chewing the cud
    const chew = idle * Math.max(0, Math.sin(this.t * 5.5));
    B.jaw.rotation.x = chew * 0.08;
    B.jaw.rotation.y = chew * 0.05 * Math.sin(this.t * 2.75);
    // tail
    B.tail0.rotation.x = 0.15 + 0.08 * Math.sin(this.t * 1.7) + run * 0.25;
    B.tail0.rotation.z = 0.18 * Math.sin(this.t * 1.1) * idle + gait * 0.12 * Math.sin(th);
    B.tail1.rotation.z = 0.15 * Math.sin(this.t * 1.1 - 0.6);
  }

  isDown() { return this.kneel > 0.995; }
  isUp() { return this.kneel < 0.005; }
}

export function pushOut(p, r, obstacles) {
  if (!obstacles) return null;
  let hit = null;
  for (const o of obstacles) {
    const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), m = r + o.r;
    if (d < m && d > 1e-4) {
      p.x += dx / d * (m - d); p.z += dz / d * (m - d);
      hit = { x: dx / d, z: dz / d };
    }
  }
  return hit;
}

export { dampAngle };
