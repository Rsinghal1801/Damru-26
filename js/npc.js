// Students around campus, as in the videos: some stroll along the paths, some stand and talk
// (Residency-4 square, the Nescafé store, the kiosk), and a guard stands at Gate 2.
// They pause when the player or a vehicle comes close.
import * as THREE from 'three';
import { ROUTES, GROUPS, DHOL, STAGE, STALL_ROWS, STALL_X, STALLS } from './layout.js';
import { rng, dampAngle } from './util.js';
import { applyDhol, makeDhol } from './characters.js';

export class Crowd {
  constructor(scene, people, quality) {
    this.list = [];
    const R = rng(31);
    const n = quality === 'low' ? 0.45 : quality === 'medium' ? 0.7 : 1;
    let manI = 1, womanI = 0;
    const make = () => (R() < 0.62 ? people.man(manI++, 1.68 + R() * 0.14) : people.woman(womanI++, 1.56 + R() * 0.1));
    const add = (p, x, z, yaw) => {
      p.object.position.set(x, 0, z);
      p.object.rotation.y = yaw;
      p.mixer.setTime(R() * 3);
      scene.add(p.object);
      return p;
    };

    // walkers
    const routes = ROUTES.slice(0, Math.max(4, Math.round(ROUTES.length * n)));
    routes.forEach((route, i) => {
      // start part-way along a random segment
      const seg = Math.floor(R() * (route.length - 1)), f = R();
      const x = route[seg][0] + (route[seg + 1][0] - route[seg][0]) * f;
      const z = route[seg][1] + (route[seg + 1][1] - route[seg][1]) * f;
      const p = add(make(), x, z, 0);
      p.object.position.y = route[0][2] || 0;   // walkers in the skybridges stay on the bridge floor
      this.list.push({ p, route, target: seg + 1, dir: 1, speed: 1.15 + R() * 0.35, wait: 0, kind: 'walk' });
    });
    // people standing about (the gate guard is the one-person group)
    const groups = GROUPS.filter((g, i) => g[2] === 1 || i < Math.max(2, Math.round(GROUPS.length * n)));
    for (const [gx, gz, size] of groups) {
      for (let k = 0; k < size; k++) {
        const a = (k / size) * Math.PI * 2 + R();
        const x = size === 1 ? gx : gx + Math.cos(a) * 0.9, z = size === 1 ? gz : gz + Math.sin(a) * 0.9;
        const p = add(size === 1 ? people.man(8, 1.74) : make(), x, z, size === 1 ? Math.PI : Math.atan2(gx - x, gz - z));
        p.play('Idle', 0, 0.8 + R() * 0.4);
        this.list.push({ p, kind: 'stand', x, z });
      }
    }
    // the fest: the dhol troupe and the dancers round them
    const [dx, dz] = DHOL;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + 0.5;
      const x = dx + Math.cos(a) * 1.4, z = dz + Math.sin(a) * 1.4;
      const p = add(people.man(3 + k * 2, 1.74), x, z, Math.atan2(x - dx, z - dz));
      const drum = makeDhol(); drum.position.set(0, 0.98, 0.32); p.object.add(drum);
      p.play('Idle', 0, 1.3);
      this.list.push({ p, kind: 'dhol', x, z, ph: k * 1.3 });
    }
    const nd = quality === 'low' ? 5 : quality === 'medium' ? 8 : 11;
    for (let k = 0; k < nd; k++) {
      const a = (k / nd) * Math.PI * 2 + 0.25, r = 4.2 + (k % 2) * 0.7;
      const x = dx + Math.cos(a) * r, z = dz + Math.sin(a) * r;
      const p = add(make(), x, z, Math.atan2(dx - x, dz - z));
      p.play('Dance', 0, 0.85 + R() * 0.3);
      this.list.push({ p, kind: 'dance', x, z, spin: (R() - 0.5) * 0.5 });
    }
    // performers on the main stage
    {
      const fz = STAGE.z + STAGE.d / 2 - 3;
      const singer = add(people.woman(1, 1.66), STAGE.x, fz, 0);
      singer.object.position.y = STAGE.h + 0.05;
      singer.play('Dance', 0, 0.6);
      this.list.push({ p: singer, kind: 'stage', x: STAGE.x, z: fz });
      const ns = quality === 'low' ? 2 : 4;
      for (let k = 0; k < ns; k++) {
        const x = STAGE.x + (k - (ns - 1) / 2) * 4.2, z = fz - 2.2;
        if (Math.abs(x - STAGE.x) < 1) continue;
        const p = add(k % 2 ? people.woman(k + 2, 1.62) : people.man(k + 1, 1.74), x, z, 0);
        p.object.position.y = STAGE.h + 0.05;
        p.play('Dance', 0, 0.95 + R() * 0.2);
        this.list.push({ p, kind: 'stage', x, z });
      }
    }
    // stall keepers behind the counters and a few customers at the counters
    if (quality !== 'low') {
      STALLS.forEach((st, i) => {
        if (quality === 'medium' && i % 2) return;
        const row = STALL_ROWS[i < STALL_X.length ? 0 : 1], x = STALL_X[i % STALL_X.length], nz = -row.face;
        const kz = row.z + nz * 0.4, yaw = nz > 0 ? 0 : Math.PI;
        const keeper = add(people.man(1 + (i % 8), 1.7), x + (R() - 0.5) * 2, kz, yaw);
        keeper.play('Idle', 0, 0.8 + R() * 0.4);
        this.list.push({ p: keeper, kind: 'stand', x, z: kz });
        if (i % 3 === 0) {
          const cz = row.z + nz * 3.3;
          const c = add(make(), x + (R() - 0.5) * 3, cz, yaw + Math.PI);
          c.play('Idle', 0, 0.8 + R() * 0.4);
          this.list.push({ p: c, kind: 'stand', x, z: cz });
        }
      });
    }
    this.t = 0;
    // collision circles the player and vehicles bump into
    // (people up in the skybridges are kept out of the way of the player and vehicles below)
    this.obstacles = this.list.map((w) => ({ x: w.p.object.position.y > 1 ? 1e6 : w.p.object.position.x, z: w.p.object.position.z, r: 0.32 }));
  }

  /** others: [{x, z, r}] — the player and vehicles. */
  update(dt, camPos, others) {
    this.t += dt;
    this.list.forEach((w, i) => {
      const o = w.p.object;
      const dist = Math.hypot(o.position.x - camPos.x, o.position.z - camPos.z);
      // skip far-away people entirely (drawing and animating)
      o.visible = dist < 140;
      if (w.kind === 'walk') this.walk(w, dt, others);
      if (o.visible) {
        w.p.update(dt);
        if (w.kind === 'dhol') applyDhol(w.p, this.t, w.ph);
        else if (w.kind === 'dance' && w.spin) o.rotation.y += w.spin * dt;
      }
      this.obstacles[i].x = o.position.y > 1 ? 1e6 : o.position.x;
      this.obstacles[i].z = o.position.z;
    });
  }

  walk(w, dt, others) {
    const o = w.p.object;
    const [tx, tz] = w.route[w.target];
    const dx = tx - o.position.x, dz = tz - o.position.z;
    const d = Math.hypot(dx, dz);
    // pause for anyone right in front
    let blocked = false;
    if (o.position.y < 1) for (const s of others) {
      const ox = s.x - o.position.x, oz = s.z - o.position.z;
      const od = Math.hypot(ox, oz);
      if (od < s.r + 1.4 && (ox * dx + oz * dz) > 0) { blocked = true; break; }
    }
    if (w.wait > 0) { w.wait -= dt; w.p.play('Idle', 0.3); return; }
    if (blocked) { w.p.play('Idle', 0.3); return; }
    if (d < 0.4) {
      let next = w.target + w.dir;
      if (next < 0 || next >= w.route.length) {
        w.dir = -w.dir;
        next = w.target + w.dir;
        w.wait = 1 + Math.random() * 3;
      }
      w.target = next;
      return;
    }
    const yaw = Math.atan2(dx, dz);
    o.rotation.y = dampAngle(o.rotation.y, yaw, 5, dt);
    o.position.x += (dx / d) * w.speed * dt;
    o.position.z += (dz / d) * w.speed * dt;
    w.p.locomote(w.speed);
  }
}
