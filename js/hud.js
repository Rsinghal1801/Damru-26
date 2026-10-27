// On-screen UI: places found, info cards, prompts, the round mini-map and the full map. Both maps
// are drawn like the official campus map: turned a quarter clockwise, so north points right, west
// is up and Gate 2 sits at the bottom left.
import { PLACES, WALL } from './layout.js';

const $ = (id) => document.getElementById(id);

function star(g, x, z, r, c) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, z + Math.sin(a) * rr); }
  g.closePath(); g.fillStyle = c; g.fill(); g.lineWidth = 2; g.strokeStyle = '#111'; g.stroke();
}

export class Hud {
  constructor(mapShapes) {
    this.found = new Set();
    this.el = {
      found: $('found'), mode: $('mode'), prompt: $('prompt'), card: $('card'), cardtag: $('cardtag'),
      cardtitle: $('cardtitle'), cardbody: $('cardbody'), toast: $('toast'), mini: $('minimap'),
      big: $('bigmap'), bigc: $('bigmapcanvas'), finish: $('finish'), finishtext: $('finishtext'),
    };
    this.mini = this.el.mini.getContext('2d');
    this.cardTimer = 0;
    this.toastTimer = 0;
    this.base = this.drawBase(mapShapes);
    this.updateFound();
    this.el.big.addEventListener('click', () => this.toggleMap(false));
  }

  /** Pre-draws the campus plan once (north-up, 2 px per metre), from Gate 1 to the east wall. */
  drawBase(shapes) {
    const S = 2, pad = 30;
    const x0 = -312, z0 = WALL.z0 - pad, x1 = WALL.x1 + pad, z1 = 64;
    const c = document.createElement('canvas');
    c.width = (x1 - x0) * S; c.height = (z1 - z0) * S;
    const g = c.getContext('2d');
    g.fillStyle = '#4c5a3a'; g.fillRect(0, 0, c.width, c.height);
    for (const s of shapes) {
      g.fillStyle = s.c;
      g.fillRect((s.x0 - x0) * S, (s.z0 - z0) * S, (s.x1 - s.x0) * S, (s.z1 - s.z0) * S);
    }
    this.mapRect = { x0, z0, x1, z1, S };
    return c;
  }

  updateFound() {
    this.el.found.textContent = `Places found ${this.found.size} / ${PLACES.length}`;
  }

  setMode(text) { this.el.mode.textContent = text; }

  prompt(text) {
    if (this._prompt === text) return;
    this._prompt = text;
    this.el.prompt.hidden = !text;
    if (text) this.el.prompt.innerHTML = text;
  }

  toast(text, secs = 2.5) {
    this.el.toast.textContent = text;
    this.el.toast.hidden = false;
    this.toastTimer = secs;
  }

  /** A message card for missions and the race. */
  banner(tag, title, body, secs = 6) {
    this.el.card.classList.add('banner');
    this.el.cardtag.textContent = tag;
    this.el.cardtitle.textContent = title;
    this.el.cardbody.textContent = body;
    this.el.card.hidden = false;
    this.el.card.classList.remove('show'); void this.el.card.offsetWidth; this.el.card.classList.add('show');
    this.cardTimer = secs;
  }

  card(place, isNew) {
    this.el.card.classList.remove('banner');
    this.el.cardtag.textContent = isNew ? `NEW PLACE · ${this.found.size} OF ${PLACES.length}` : 'YOU ARE AT';
    this.el.cardtitle.textContent = place.name;
    this.el.cardbody.textContent = place.info;
    this.el.card.hidden = false;
    this.el.card.classList.remove('show'); void this.el.card.offsetWidth; this.el.card.classList.add('show');
    this.cardTimer = isNew ? 7 : 4;
  }

  /** Checks for places near the player; returns a newly found place or null. */
  checkPlaces(x, z) {
    let near = null;
    for (const p of PLACES) {
      if (Math.hypot(x - p.x, z - p.z) < p.r) { near = p; break; }
    }
    let fresh = null;
    if (near && near !== this.current) {
      const isNew = !this.found.has(near.id);
      if (isNew) { this.found.add(near.id); this.updateFound(); fresh = near; }
      this.card(near, isNew);
    }
    this.current = near;
    return fresh;
  }

  update(dt) {
    if (this.cardTimer > 0 && (this.cardTimer -= dt) <= 0) this.el.card.hidden = true;
    if (this.toastTimer > 0 && (this.toastTimer -= dt) <= 0) this.el.toast.hidden = true;
  }

  /** Mini-map: centred on the player, north to the right; markers for places and vehicles. */
  drawMini(px, pz, heading, things) {
    const g = this.mini, W = this.el.mini.width, H = this.el.mini.height;
    const { x0, z0, S } = this.mapRect;
    const zoom = 1.1; // canvas px per base px
    g.save();
    g.clearRect(0, 0, W, H);
    g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#3d4830'; g.fillRect(0, 0, W, H);
    g.translate(W / 2, H / 2);
    g.scale(zoom, zoom);
    g.rotate(Math.PI / 2);
    g.drawImage(this.base, -(px - x0) * S, -(pz - z0) * S);
    const P = (x, z) => [(x - px) * S, (z - pz) * S];
    for (const p of PLACES) {
      const [x, z] = P(p.x, p.z);
      g.beginPath(); g.arc(x, z, 6, 0, Math.PI * 2);
      g.fillStyle = this.found.has(p.id) ? '#7fe08a' : 'rgba(255,255,255,0.25)';
      g.fill();
      g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
    }
    for (const t of things) {
      let [x, z] = P(t.x, t.z);
      if (t.star) {
        // keep mission markers on the edge of the round map when they are far away
        const r = Math.hypot(x, z), lim = (W / 2 - 12) / zoom;
        if (r > lim) { x *= lim / r; z *= lim / r; }
        star(g, x, z, 8, t.c);
        continue;
      }
      g.fillStyle = t.c; g.beginPath(); g.arc(x, z, 5, 0, Math.PI * 2); g.fill();
      g.lineWidth = 1.5; g.strokeStyle = '#111'; g.stroke();
    }
    g.restore();
    // player arrow in the centre
    g.save();
    g.translate(W / 2, H / 2);
    g.rotate(-heading + Math.PI * 1.5);
    g.beginPath(); g.moveTo(0, -11); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath();
    g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#ff9f2e'; g.stroke();
    g.restore();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = 'bold 13px system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText('N', W - 14, H / 2 + 5);
  }

  toggleMap(show = this.el.big.hidden) {
    this.el.big.hidden = !show;
    return show;
  }

  drawBig(px, pz, heading, things) {
    const c = this.el.bigc, g = c.getContext('2d');
    const { x0, z0, x1, z1, S } = this.mapRect;
    // turned a quarter clockwise: screen right = north (-z), screen down = east (+x)
    const k = Math.min(c.width / (z1 - z0), c.height / (x1 - x0));
    const ox = (c.width - (z1 - z0) * k) / 2, oz = (c.height - (x1 - x0) * k) / 2;
    g.fillStyle = '#2c3424'; g.fillRect(0, 0, c.width, c.height);
    g.save();
    g.translate(ox + (z1 - z0) * k, oz);
    g.rotate(Math.PI / 2);
    g.drawImage(this.base, 0, 0, (x1 - x0) * k, (z1 - z0) * k);
    g.restore();
    const P = (x, z) => [ox + (z1 - z) * k, oz + (x - x0) * k];
    for (const p of PLACES) {
      const [x, z] = P(p.x, p.z);
      g.beginPath(); g.arc(x, z, 8, 0, Math.PI * 2);
      g.fillStyle = this.found.has(p.id) ? '#ff9f2e' : 'rgba(255,255,255,0.3)'; g.fill();
      g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
    }
    // markers for vehicles and missions, then labels: each tries above, below, right and left of its
    // marker and takes the spot that overlaps the fewest markers and labels already placed
    for (const t of things) {
      const [x, z] = P(t.x, t.z);
      if (t.star) { star(g, x, z, 11, t.c); continue; }
      g.fillStyle = t.c; g.beginPath(); g.arc(x, z, 7, 0, Math.PI * 2); g.fill();
      g.lineWidth = 2; g.strokeStyle = '#111'; g.stroke();
    }
    const items = [
      ...PLACES.map((p) => [...P(p.x, p.z), this.found.has(p.id) ? p.name : '?', '600 14px system-ui, sans-serif']),
      ...things.map((t) => [...P(t.x, t.z), t.label, '600 12px system-ui, sans-serif']),
    ];
    const boxes = items.map(([x, z]) => [x - 9, z - 9, x + 9, z + 9]);
    const overlap = (b) => boxes.reduce((t, o) => t + Math.max(0, Math.min(b[2], o[2]) - Math.max(b[0], o[0])) * Math.max(0, Math.min(b[3], o[3]) - Math.max(b[1], o[1])), 0);
    g.lineJoin = 'round';
    for (const [x, z, label, font] of items) {
      if (!label) continue;
      g.font = font;
      const w = g.measureText(label).width, h = 15;
      const spots = [[x, z - 14, 'center'], [x, z + 24, 'center'], [x + 13, z + 5, 'left'], [x - 13, z + 5, 'right'], [x, z - 30, 'center'], [x, z + 40, 'center']];
      let pick = null, best = Infinity, pickBox = null;
      for (const sp of spots) {
        const [lx, ly, al] = sp, bx = al === 'center' ? lx - w / 2 : al === 'left' ? lx : lx - w;
        const b = [bx - 2, ly - h + 2, bx + w + 2, ly + 4], o = overlap(b);
        if (o < best - 0.5) { best = o; pick = sp; pickBox = b; }
        if (o === 0) break;
      }
      boxes.push(pickBox);
      g.textAlign = pick[2];
      g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.65)'; g.strokeText(label, pick[0], pick[1]);
      g.fillStyle = '#fff'; g.fillText(label, pick[0], pick[1]);
    }
    g.textAlign = 'center';
    const [x, z] = P(px, pz);
    g.save(); g.translate(x, z); g.rotate(-heading + Math.PI * 1.5);
    g.beginPath(); g.moveTo(0, -14); g.lineTo(9, 10); g.lineTo(0, 5); g.lineTo(-9, 10); g.closePath();
    g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#ff9f2e'; g.stroke();
    g.restore();
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.font = 'bold 18px system-ui, sans-serif'; g.fillText('N →', c.width - 44, 34);
  }

  finish(text) {
    this.el.finishtext.textContent = text;
    this.el.finish.hidden = false;
  }
}
