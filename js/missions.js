// Fest missions (wristband, five Damru passes, the dhol circle, reaching the stage before the
// concert) and the camel & e-cart race round the ring road.
import * as THREE from 'three';
import { REG_DESK, DHOL, STAGE_FRONT, RACE } from './layout.js';

const $ = (id) => document.getElementById(id);
const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
};

/** A tall soft column of light that marks where to go. */
function beacon(colour) {
  const g = new THREE.CylinderGeometry(1.2, 1.2, 60, 20, 1, true);
  g.translate(0, 30, 0);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.12, 8, 40).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: colour, toneMapped: false }));
  ring.position.y = 0.15;
  const grp = new THREE.Group();
  grp.add(m, ring);
  grp.userData.noExport = true;
  return grp;
}

/** Upright glowing ring the vehicles drive through. */
function gate(colour) {
  const grp = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.22, 10, 48), new THREE.MeshBasicMaterial({ color: colour, toneMapped: false }));
  ring.position.y = 4.6;
  const glow = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.7, 10, 48), new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  glow.position.y = 4.6;
  grp.add(ring, glow);
  grp.userData.noExport = true;
  return grp;
}

export class Missions {
  constructor(scene, hud, fest, audio) {
    this.hud = hud; this.fest = fest; this.audio = audio;
    this.step = 0;
    this.got = 0;
    this.timer = 0;
    this.concert = 0.25;        // 0.25 = DJ warm-up, 1 = the concert
    this.done = false;
    this.marker = beacon(0xffb030);
    scene.add(this.marker);
    this.el = { box: $('mission'), step: $('mstep'), text: $('mtext'), timer: $('mtimer') };
    // race
    this.race = { on: false, count: 0, i: 0, t: 0 };
    this.startRing = beacon(0x4fd8ff);
    this.startRing.position.set(RACE.start[0], 0, RACE.start[1]);
    scene.add(this.startRing);
    this.cp = gate(0x4fd8ff);
    this.cp.visible = false;
    scene.add(this.cp);
    this.rel = { box: $('race'), time: $('rtime'), info: $('rinfo'), count: $('countdown') };
    this.show();
  }

  target() {
    if (this.step === 0) return { x: REG_DESK[0], z: REG_DESK[1] };
    if (this.step === 1) { const p = this.fest.passes.find((q) => !q.got); return p ? { x: p.x, z: p.z } : null; }
    if (this.step === 2) return { x: DHOL[0], z: DHOL[1] };
    if (this.step === 3 || this.step === 4) return { x: STAGE_FRONT[0], z: STAGE_FRONT[1] };
    return null;
  }

  show() {
    const total = this.fest.passes.length;
    const texts = [
      'Pick up your Damru wristband at the desk just inside Gate 2.',
      `Collect the Damru passes at the glowing stalls on the food & game street (${this.got}/${total}).`,
      'Join the dhol circle at the way into the north ground.',
      'Get to the front of the main stage before the concert starts!',
      'The concert has started. Get to the front of the stage!',
      "You made it to the Damru '26 concert. Enjoy the show!",
    ];
    this.el.step.textContent = this.step < 5 ? `${Math.min(this.step + 1, 4)} / 4` : 'DONE';
    this.el.text.textContent = texts[this.step];
    this.el.timer.hidden = this.step !== 3;
  }

  update(dt, pos, mode) {
    const t = this.target();
    this.marker.visible = !!t && !this.race.on;
    if (t) {
      this.marker.position.set(t.x, 0, t.z);
      this.marker.children[1].scale.setScalar(1 + 0.15 * Math.sin(performance.now() / 300));
    }
    const near = (p, r) => p && Math.hypot(pos.x - p.x, pos.z - p.z) < r;
    if (this.step === 0 && near(t, 3.2)) {
      this.step = 1;
      for (const p of this.fest.passes) p.mesh.visible = true;
      this.hud.banner('WRISTBAND ON', "Welcome to Damru '26", 'Five stalls are holding Damru passes for you. Look for the gold cards spinning on their counters.');
      this.audio.chime();
      this.show();
    } else if (this.step === 1) {
      for (const p of this.fest.passes) {
        if (!p.got && near(p, 2.8)) {
          p.got = true; p.mesh.visible = false; this.got++;
          this.audio.chime();
          this.hud.toast(`Damru pass from ${p.name}! (${this.got}/${this.fest.passes.length})`, 3);
          this.show();
        }
      }
      if (this.got >= this.fest.passes.length) {
        this.step = 2;
        this.hud.banner('ALL PASSES COLLECTED', 'Follow the dhol', 'You can hear the dhol from the north ground. Join the circle before the concert.');
        this.show();
      }
    } else if (this.step === 2 && near(t, 7)) {
      this.step = 3;
      this.timer = 120;
      this.hud.banner('DHOL CIRCLE', 'The concert starts in 2 minutes', 'Head down the aisle through the crowd to the front of the main stage.');
      this.audio.chime();
      this.show();
    } else if (this.step === 3) {
      this.timer -= dt;
      this.el.timer.textContent = fmt(Math.max(0, this.timer));
      if (near(t, 5)) { this.finish(true); }
      else if (this.timer <= 0) { this.step = 4; this.concert = 1; this.hud.banner('YOU ARE LATE', 'The concert has started', 'Hurry to the front of the stage!'); this.show(); }
    } else if (this.step === 4 && near(t, 5)) {
      this.finish(false);
    }
    // the concert lights and music follow the story
    const want = this.step >= 4 ? 1 : 0.25;
    this.concert += (want - this.concert) * Math.min(1, dt * 0.8);
    this.updateRace(dt, pos, mode);
  }

  finish(onTime) {
    this.step = 5;
    this.concert = Math.max(this.concert, 0.5);
    this.done = true;
    this.hud.banner(onTime ? 'MADE IT!' : 'MADE IT (A LITTLE LATE)', "Damru '26 is live", 'Fireworks over the north ground and the whole campus at the stage. Stay for the show, ride the camel or try the race at Gate 2.', 9);
    this.audio.chime();
    this.show();
  }

  // ---------------------------------------------------------------- race
  updateRace(dt, pos, mode) {
    const r = this.race;
    const riding = mode === 'camel' || mode === 'cart';
    this.startRing.visible = !r.on && riding;
    if (!r.on) {
      if (riding && Math.hypot(pos.x - RACE.start[0], pos.z - RACE.start[1]) < 4.5) {
        r.on = true; r.count = 3.5; r.i = 0; r.t = 0; r.mode = mode;
        this.rel.box.hidden = false;
        this.rel.info.textContent = `${mode === 'camel' ? 'Camel' : 'E-cart'} race · best ${this.best(mode) ? fmt(this.best(mode)) : '—'}`;
        this.placeGate();
      }
      return;
    }
    if (mode !== r.mode) { this.endRace(null); return; }
    if (r.count > 0) {
      const before = Math.ceil(r.count);
      r.count -= dt;
      const now = Math.ceil(r.count);
      this.rel.count.hidden = false;
      this.rel.count.textContent = r.count > 0.5 ? String(Math.max(1, Math.ceil(r.count - 0.5))) : 'GO!';
      if (now !== before) this.audio.beep(r.count > 0.5 ? 660 : 990);
      if (r.count <= 0) setTimeout(() => { this.rel.count.hidden = true; }, 600);
      this.rel.time.textContent = fmt(0);
      return;
    }
    r.t += dt;
    this.rel.time.textContent = fmt(r.t);
    const cp = RACE.checkpoints[r.i];
    if (Math.hypot(pos.x - cp[0], pos.z - cp[1]) < 6.5) {
      r.i++;
      this.audio.beep(880);
      if (r.i >= RACE.checkpoints.length) this.endRace(r.t);
      else { this.placeGate(); this.hud.toast(`Checkpoint ${r.i} / ${RACE.checkpoints.length}`, 1.5); }
    }
  }

  placeGate() {
    const r = this.race, cp = RACE.checkpoints[r.i];
    const next = RACE.checkpoints[r.i + 1] || RACE.start, prev = r.i ? RACE.checkpoints[r.i - 1] : RACE.start;
    this.cp.visible = true;
    this.cp.position.set(cp[0], 0, cp[1]);
    // face along the road: from the previous checkpoint towards this one
    this.cp.rotation.y = Math.atan2(cp[0] - prev[0], cp[1] - prev[1]);
    void next;
  }

  best(mode) { const v = parseFloat(store.get('rcr-best-' + mode)); return isFinite(v) ? v : 0; }

  endRace(time) {
    const r = this.race;
    r.on = false;
    this.cp.visible = false;
    this.rel.count.hidden = true;
    if (time == null) { this.rel.box.hidden = true; this.hud.toast('Race cancelled', 2); return; }
    const best = this.best(r.mode);
    const record = !best || time < best;
    if (record) store.set('rcr-best-' + r.mode, String(time));
    this.audio.chime();
    this.hud.banner(record ? 'NEW BEST TIME' : 'FINISHED', `${r.mode === 'camel' ? 'Camel' : 'E-cart'} race: ${fmt(time)}`, record ? 'That is your best lap of the ring road so far. Drive back into the blue ring at Gate 2 to race again.' : `Your best is ${fmt(best)}. Drive back into the blue ring at Gate 2 to race again.`, 7);
    setTimeout(() => { if (!this.race.on) this.rel.box.hidden = true; }, 7000);
  }

  /** Markers for the mini-map. */
  markers() {
    const out = [];
    const t = this.target();
    if (t && !this.race.on) out.push({ x: t.x, z: t.z, c: '#ffb030', label: 'Mission', star: true });
    if (this.race.on) { const cp = RACE.checkpoints[this.race.i]; out.push({ x: cp[0], z: cp[1], c: '#4fd8ff', label: 'Checkpoint', star: true }); }
    else out.push({ x: RACE.start[0], z: RACE.start[1], c: '#4fd8ff', label: 'Race start' });
    return out;
  }
}
