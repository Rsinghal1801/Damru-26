// On-screen UI: places found, info cards, prompts, the round mini-map and the full map. Both maps
// are drawn like the official campus map: turned a quarter clockwise, so north points right, west
// is up and Gate 2 sits at the bottom left. They are drawn as shapes at the screen's own resolution
// (not a stretched picture), so they stay sharp on any screen.
import { PLACES, WALL } from './layout.js';

const $ = (id) => document.getElementById(id);
// older browsers: plain rectangles instead of rounded ones
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };

function star(g, x, z, r, c) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, z + Math.sin(a) * rr); }
  g.closePath(); g.fillStyle = c; g.fill(); g.lineWidth = 2; g.strokeStyle = '#111'; g.stroke();
}

// ---------------------------------------------------------------- map style
const OUTSIDE = '#323d2a';
// roads, paths and plazas in light neutral greys so the brick buildings stand out
const KIND_FILL = { ground: '#5b7744', road: '#bdb6ab', plaza: '#d6d0c4', asphalt: '#3d3f44', parking: '#45474c' };
// drawing order, bottom to top
const LAYERS = ['ground', 'parking', 'asphalt', 'road', 'plaza', 'zone', 'round', 'court', 'line', 'building', 'canopy', 'stall', 'stage', 'wall', 'bridge'];
// shorter names for the map labels
const SHORT = {
  gate: 'Gate 2', res4: 'Residency-4 (Boys)', tennis: 'Tennis Court', basket: 'Basketball Court', arena: 'Learners Arena',
  chai: 'Chai Adda', football: 'Football Ground', blockB: 'Block B · Library', dropoff: 'Drop-off', blockC: 'Block C',
  flag: 'National Flag', blockA: 'Block A', atrium: 'Atrium', pdhall: 'Pushpa Devi Dining Hall', res1: 'Residency 1',
  nescafe: 'Nescafé', res2: 'Residency 2 (Girls)', res3: 'Residency 3', neem: 'Neem Tree', park: 'Central Park',
  stalls: 'Food & Game Street', stage: 'Main Stage', entrance: 'Main Entrance', gate1: 'Gate 1',
};
const short = (p) => SHORT[p.id] || p.name;
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** The player's arrow, pointing along `angle` (screen radians, 0 = up). */
function arrow(g, x, y, angle, size) {
  g.save(); g.translate(x, y); g.rotate(angle);
  g.beginPath(); g.moveTo(0, -size); g.lineTo(size * 0.64, size * 0.72); g.lineTo(0, size * 0.36); g.lineTo(-size * 0.64, size * 0.72); g.closePath();
  g.fillStyle = '#ffffff'; g.fill(); g.lineJoin = 'round'; g.lineWidth = Math.max(2, size * 0.18); g.strokeStyle = '#ff8a1e'; g.stroke();
  g.restore();
}

/** Text with a dark outline so it reads on any colour. */
function label(g, text, x, y, align, colour) {
  g.textAlign = align; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
  g.lineWidth = 3.5; g.strokeStyle = 'rgba(10,10,10,0.8)'; g.strokeText(text, x, y);
  g.fillStyle = colour; g.fillText(text, x, y);
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
    this.setShapes(mapShapes);
    this.fitCount = 0;
    addEventListener('resize', () => { this.fitCount = 0; });
    this.updateFound();
    this.el.big.addEventListener('click', () => this.toggleMap(false));
  }

  /** Keeps the campus plan (footprints) grouped by kind for drawing; the maps cover Gate 1 to the east wall. */
  setShapes(shapes) {
    this.byKind = {};
    for (const sh of shapes) (this.byKind[sh.kind || 'building'] ||= []).push(sh);
    this.mapRect = { x0: -312, z0: WALL.z0 - 30, x1: WALL.x1 + 30, z1: 64 };
  }

  /** Sizes a canvas to its on-screen size times the screen's pixel density, so the maps stay sharp. */
  fit(cv, force) {
    const key = cv === this.el.mini ? 'miniSize' : 'bigSize';
    if (!force && this[key] && this.fitCount++ % 30) return this[key];
    const W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = Math.round(W * dpr), h = Math.round(H * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    this[key] = { W, H, dpr };
    return this[key];
  }

  /** Draws the campus plan; the context's transform maps metres (x east, z south) to the screen. */
  drawShapes(g, px) {
    for (const kind of LAYERS) {
      const list = this.byKind[kind];
      if (!list) continue;
      for (const sh of list) {
        const w = sh.x1 - sh.x0, d = sh.z1 - sh.z0;
        if (kind === 'round') {
          g.beginPath(); g.arc((sh.x0 + sh.x1) / 2, (sh.z0 + sh.z1) / 2, Math.min(w, d) / 2, 0, Math.PI * 2);
          g.fillStyle = sh.c; g.fill();
          g.lineWidth = px * 1.2; g.strokeStyle = 'rgba(255,255,255,0.45)'; g.stroke();
          continue;
        }
        if (kind === 'bridge') {
          // skybridges: pale blue with a dashed white edge, drawn over whatever runs beneath
          g.fillStyle = 'rgba(170,215,235,0.75)'; g.fillRect(sh.x0, sh.z0, w, d);
          g.setLineDash([px * 4, px * 3]); g.lineWidth = px * 1.3; g.strokeStyle = '#ffffff'; g.strokeRect(sh.x0, sh.z0, w, d); g.setLineDash([]);
          continue;
        }
        g.fillStyle = KIND_FILL[kind] || sh.c;
        g.fillRect(sh.x0, sh.z0, w, d);
        if (kind === 'building' || kind === 'stage' || kind === 'stall') {
          g.lineWidth = px * (kind === 'stall' ? 0.8 : 1.3); g.strokeStyle = 'rgba(25,10,6,0.8)'; g.strokeRect(sh.x0, sh.z0, w, d);
        } else if (kind === 'court') {
          g.lineWidth = px; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.strokeRect(sh.x0, sh.z0, w, d);
        }
      }
    }
  }

  /** Puts labels where they overlap the fewest markers and labels already placed. */
  placeLabels(g, items, boxes, { maxOverlap = Infinity, bounds = null, near = false } = {}) {
    const overlap = (b) => boxes.reduce((t, o) => t + Math.max(0, Math.min(b[2], o[2]) - Math.max(b[0], o[0])) * Math.max(0, Math.min(b[3], o[3]) - Math.max(b[1], o[1])), 0);
    for (const it of items) {
      g.font = it.font;
      const w = g.measureText(it.text).width, h = it.size, r = it.r + 3;
      const spots = [[it.x, it.y - r - 2, 'center'], [it.x + r + 2, it.y + h * 0.35, 'left'], [it.x, it.y + r + h, 'center'], [it.x - r - 2, it.y + h * 0.35, 'right'],
        [it.x, it.y - r - h - 4, 'center'], [it.x, it.y + r + h * 2 + 2, 'center']].slice(0, near ? 4 : 6);
      let pick = null, best = Infinity;
      for (const [lx, ly, al] of spots) {
        const bx = al === 'center' ? lx - w / 2 : al === 'left' ? lx : lx - w;
        const b = [bx - 2, ly - h, bx + w + 2, ly + 3];
        let o = overlap(b);
        if (bounds && !bounds(b)) o += 1e6;
        if (o < best - 0.5) { best = o; pick = { lx, ly, al, b }; }
        if (o === 0) break;
      }
      if (!pick || best > maxOverlap * w * h) continue;
      boxes.push(pick.b);
      label(g, it.text, pick.lx, pick.ly, pick.al, it.colour);
    }
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

  /** Mini-map: centred on the player, turned like the official map (north to the right, west up). */
  drawMini(px, pz, heading, things) {
    const cv = this.el.mini, g = this.mini, fit = this.fit(cv);
    if (!fit) return;
    const { W, H, dpr } = fit, R = W / 2;
    const s = 2.2 * (W / 200);                 // screen pixels per metre
    const S = (x, z) => [W / 2 - (z - pz) * s, H / 2 + (x - px) * s];
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.save();
    g.beginPath(); g.arc(W / 2, H / 2, R - 1, 0, Math.PI * 2); g.clip();
    g.fillStyle = OUTSIDE; g.fillRect(0, 0, W, H);
    // metres to screen: screen right = north (-z), screen down = east (+x)
    g.setTransform(0, s * dpr, -s * dpr, 0, (W / 2 + pz * s) * dpr, (H / 2 - px * s) * dpr);
    this.drawShapes(g, 1 / s);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // places: green when found, a white ring when not yet found; names for those in view
    const mr = Math.max(3.5, 5 * W / 200), inView = [];
    for (const p of PLACES) {
      const [x, y] = S(p.x, p.z);
      if (Math.hypot(x - W / 2, y - H / 2) > R - 4) continue;
      const got = this.found.has(p.id);
      g.beginPath(); g.arc(x, y, mr, 0, Math.PI * 2);
      g.fillStyle = got ? '#4fd86a' : 'rgba(20,24,18,0.75)'; g.fill();
      g.lineWidth = 1.8; g.strokeStyle = '#ffffff'; g.stroke();
      inView.push({ x, y, r: mr, text: short(p), got });
    }
    for (const t of things) {
      let [x, y] = S(t.x, t.z);
      if (t.star) {
        // mission markers stay on the edge of the round map when they are far away
        const dx = x - W / 2, dy = y - H / 2, d = Math.hypot(dx, dy), lim = R - 12;
        if (d > lim) { x = W / 2 + dx * lim / d; y = H / 2 + dy * lim / d; }
        star(g, x, y, 7.5, t.c);
        continue;
      }
      if (Math.hypot(x - W / 2, y - H / 2) > R - 4) continue;
      g.fillStyle = t.c; g.beginPath(); g.arc(x, y, mr * 0.9, 0, Math.PI * 2); g.fill();
      g.lineWidth = 1.5; g.strokeStyle = '#111'; g.stroke();
    }
    if (W >= 150) {
      const size = 10;
      // keep clear of the player's arrow, the markers and the N badge on the right
      const boxes = [[W / 2 - 13, H / 2 - 13, W / 2 + 13, H / 2 + 13], [W - 24, H / 2 - 11, W, H / 2 + 11], ...inView.map((m) => [m.x - m.r, m.y - m.r, m.x + m.r, m.y + m.r])];
      const items = inView.map((m) => ({ ...m, size, font: `600 ${size}px ${FONT}`, colour: m.got ? '#ffffff' : 'rgba(255,255,255,0.85)' }));
      // only labels that stay inside the round map and do not cover another one
      g.save(); g.beginPath(); g.arc(W / 2, H / 2, R - 3, 0, Math.PI * 2); g.clip();
      const inCircle = (b) => [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]].every(([x, y]) => Math.hypot(x - W / 2, y - H / 2) < R - 5);
      this.placeLabels(g, items, boxes, { maxOverlap: 0.05, near: true, bounds: inCircle });
      g.restore();
    }
    g.restore();
    arrow(g, W / 2, H / 2, -heading + Math.PI * 1.5, 11 * Math.max(0.75, W / 200));
    // north is to the right
    g.beginPath(); g.arc(W - 13, H / 2, 9, 0, Math.PI * 2); g.fillStyle = 'rgba(10,12,10,0.7)'; g.fill();
    g.font = `700 11px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.fillText('N', W - 13, H / 2 + 0.5);
    g.textBaseline = 'alphabetic';
  }

  toggleMap(show = this.el.big.hidden) {
    this.el.big.hidden = !show;
    if (show) this.bigSize = null;   // measure the big map again now that it is on screen
    return show;
  }

  /** The full map: the whole campus with every place named, a legend, a compass and a scale bar. */
  drawBig(px, pz, heading, things) {
    const c = this.el.bigc, g = c.getContext('2d'), fit = this.fit(c);
    if (!fit) return;
    const { W, H, dpr } = fit;
    const { x0, z0, x1, z1 } = this.mapRect;
    const f = Math.max(0.72, Math.min(1, Math.min(W, H * 1.15) / 820));   // text scale for small screens
    const fs = (n) => Math.round(n * f);
    const legend = [
      ['you', 'You'], ['found', 'Place found'], ['todo', 'Not found yet'], ['mission', 'Mission'],
      ['camel', 'Camel'], ['cart', 'E-cart'], ['race', 'Race'], ['bridge', 'Skybridge'], ['park', 'Parking'], ['restricted', 'Restricted'],
    ];
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.font = `600 ${fs(12)}px ${FONT}`;
    const itemW = legend.map((it) => 22 + g.measureText(it[1]).width + 14);
    const top = fs(40), side = 10, rowH = fs(20);
    // legend along the bottom (rows) or down the right-hand side (one column): whichever leaves a bigger map
    const rows = [[]];
    let rowW = 0;
    legend.forEach((it, n) => {
      if (rowW + itemW[n] > W - 24 && rows[rows.length - 1].length) { rows.push([]); rowW = 0; }
      rows[rows.length - 1].push([...it, itemW[n]]); rowW += itemW[n];
    });
    const colW = Math.max(...itemW) + 12;
    const kBottom = Math.min((W - 2 * side) / (z1 - z0), (H - top - rows.length * rowH - 14) / (x1 - x0));
    const kSide = Math.min((W - colW - 3 * side) / (z1 - z0), (H - top - 14) / (x1 - x0));
    const sideLegend = kSide > kBottom * 1.02;
    const k = sideLegend ? kSide : kBottom;
    const mw = (z1 - z0) * k, mh = (x1 - x0) * k;
    const areaW = sideLegend ? W - colW - side : W, areaH = sideLegend ? H - 14 : H - rows.length * rowH - 14;
    const ox = (areaW - mw) / 2, oy = top + (areaH - top - mh) / 2;
    const P = (x, z) => [ox + (z1 - z) * k, oy + (x - x0) * k];
    g.fillStyle = '#1c2218'; g.fillRect(0, 0, W, H);
    // the plan
    g.save();
    g.beginPath(); g.roundRect(ox, oy, mw, mh, 8); g.clip();
    g.fillStyle = OUTSIDE; g.fillRect(ox, oy, mw, mh);
    g.setTransform(0, k * dpr, -k * dpr, 0, (ox + z1 * k) * dpr, (oy - x0 * k) * dpr);
    this.drawShapes(g, 1 / k);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // P badges on the car parks
    const badge = (x, y, sz) => {
      g.fillStyle = '#1e5fb4'; g.beginPath(); g.roundRect(x - sz / 2, y - sz / 2, sz, sz, 3); g.fill();
      g.lineWidth = 1.5; g.strokeStyle = '#ffffff'; g.stroke();
      g.font = `800 ${Math.round(sz * 0.72)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.fillText('P', x, y + 0.5);
      g.textBaseline = 'alphabetic';
    };
    const boxes = [];
    for (const sh of [...(this.byKind.parking || []), ...(this.byKind.zone || []).filter((z) => z.c === '#80838a')]) {
      const [x, y] = P((sh.x0 + sh.x1) / 2, (sh.z0 + sh.z1) / 2), sz = fs(sh.kind === 'parking' ? 18 : 13);
      badge(x, y, sz);
      boxes.push([x - sz / 2, y - sz / 2, x + sz / 2, y + sz / 2]);
    }
    // markers: places (a tick once found), the vehicles and the mission
    const mr = Math.max(5, fs(7));
    const items = [];
    for (const p of PLACES) {
      const [x, y] = P(p.x, p.z), got = this.found.has(p.id);
      g.beginPath(); g.arc(x, y, mr, 0, Math.PI * 2);
      g.fillStyle = got ? '#ff9f2e' : 'rgba(20,24,18,0.8)'; g.fill();
      g.lineWidth = 2; g.strokeStyle = '#ffffff'; g.stroke();
      if (got) { g.beginPath(); g.moveTo(x - mr * 0.45, y); g.lineTo(x - mr * 0.1, y + mr * 0.4); g.lineTo(x + mr * 0.5, y - mr * 0.4); g.lineWidth = 2; g.strokeStyle = '#3a1d00'; g.stroke(); }
      boxes.push([x - mr, y - mr, x + mr, y + mr]);
      items.push({ x, y, r: mr, text: short(p), size: fs(13), font: `${got ? 700 : 600} ${fs(13)}px ${FONT}`, colour: got ? '#ffffff' : '#e3e8dc' });
    }
    for (const t of things) {
      const [x, y] = P(t.x, t.z);
      if (t.star) star(g, x, y, fs(10), t.c);
      else { g.fillStyle = t.c; g.beginPath(); g.arc(x, y, fs(6), 0, Math.PI * 2); g.fill(); g.lineWidth = 2; g.strokeStyle = '#111'; g.stroke(); }
      boxes.push([x - fs(9), y - fs(9), x + fs(9), y + fs(9)]);
      items.push({ x, y, r: fs(8), text: t.label, size: fs(11), font: `600 ${fs(11)}px ${FONT}`, colour: t.star ? '#ffd27a' : '#ffffff' });
    }
    const [ax, ay] = P(px, pz);
    boxes.push([ax - 14, ay - 14, ax + 14, ay + 14]);
    // on a small map, a label that would sit on top of another is left out rather than drawn over it
    this.placeLabels(g, items, boxes, { maxOverlap: k < 1.3 ? 0.04 : 0.3, near: k < 1.3, bounds: (b) => b[0] > ox + 2 && b[1] > oy + 2 && b[2] < ox + mw - 2 && b[3] < oy + mh - 2 });
    arrow(g, ax, ay, -heading + Math.PI * 1.5, Math.max(10, fs(14)));
    // scale bar: 50 m, bottom right of the plan
    const bar = 50 * k, bx = ox + mw - bar - 14, by = oy + mh - 14;
    g.fillStyle = 'rgba(10,12,10,0.6)'; g.beginPath(); g.roundRect(bx - 8, by - fs(18), bar + 16, fs(18) + 8, 4); g.fill();
    g.fillStyle = '#ffffff'; g.fillRect(bx, by - 2, bar, 3); g.fillRect(bx, by - 6, 2, 8); g.fillRect(bx + bar - 2, by - 6, 2, 8);
    g.font = `600 ${fs(11)}px ${FONT}`; g.textAlign = 'center'; g.fillText('50 m', bx + bar / 2, by - 7);
    g.restore();
    // header: title, places found and the compass
    const wide = mw > 560 || sideLegend;
    g.font = `700 ${fs(15)}px ${FONT}`; g.textAlign = 'left'; g.fillStyle = '#ffffff';
    g.fillText(mw > 420 ? "Rishihood University · Damru '26" : "Damru '26 campus", ox, top - fs(14));
    g.font = `800 ${fs(15)}px ${FONT}`; g.textAlign = 'right'; g.fillText('N →', ox + mw, top - fs(14));
    if (wide && !sideLegend) {
      g.font = `500 ${fs(12)}px ${FONT}`; g.fillStyle = 'rgba(255,255,255,0.6)';
      g.fillText(`Places found ${this.found.size} / ${PLACES.length}`, ox + mw - fs(46), top - fs(14));
    }
    // legend
    const key = (kind, text, lx, cy) => {
      const cx = lx + 8;
      if (kind === 'you') arrow(g, cx, cy, Math.PI / 2, 7);
      else if (kind === 'found' || kind === 'todo') { g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI * 2); g.fillStyle = kind === 'found' ? '#ff9f2e' : 'rgba(20,24,18,0.9)'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke(); }
      else if (kind === 'mission') star(g, cx, cy, 7, '#ffb030');
      else if (kind === 'camel' || kind === 'cart' || kind === 'race') { g.beginPath(); g.arc(cx, cy, 5.5, 0, Math.PI * 2); g.fillStyle = kind === 'camel' ? '#c58b4c' : kind === 'cart' ? '#f2f2f2' : '#4fd8ff'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#111'; g.stroke(); }
      else if (kind === 'bridge') { g.fillStyle = 'rgba(170,215,235,0.9)'; g.fillRect(cx - 8, cy - 4, 16, 8); g.setLineDash([3, 2]); g.lineWidth = 1; g.strokeStyle = '#fff'; g.strokeRect(cx - 8, cy - 4, 16, 8); g.setLineDash([]); }
      else if (kind === 'park') badge(cx, cy, 14);
      else if (kind === 'restricted') { g.fillStyle = '#a8913c'; g.fillRect(cx - 8, cy - 5, 16, 10); }
      g.font = `600 ${fs(12)}px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillStyle = 'rgba(255,255,255,0.88)'; g.fillText(text, lx + 22, cy + 0.5);
      g.textBaseline = 'alphabetic';
    };
    if (sideLegend) {
      const lx = ox + mw + side + 6;
      let ly = oy + 8;
      g.font = `700 ${fs(13)}px ${FONT}`; g.textAlign = 'left'; g.fillStyle = '#ffffff';
      g.fillText(`Found ${this.found.size} / ${PLACES.length}`, lx, ly + 4);
      ly += rowH + 6;
      for (const [kind, text] of legend) { key(kind, text, lx, ly); ly += rowH; }
    } else {
      let ly = oy + mh + rowH - 2;
      for (const row of rows) {
        let lx = (W - row.reduce((t, it) => t + it[2], 0)) / 2;
        for (const [kind, text, w] of row) { key(kind, text, lx, ly - fs(4)); lx += w; }
        ly += rowH;
      }
    }
  }

  finish(text) {
    this.el.finishtext.textContent = text;
    this.el.finish.hidden = false;
  }
}
