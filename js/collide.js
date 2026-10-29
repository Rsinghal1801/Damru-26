// Flat-ground collision: buildings, walls and fences are rectangles, trees and poles circles.
// Movers are circles; resolve() pushes them back out of anything they overlap.
export class Colliders {
  constructor() {
    this.rects = [];   // {x0, z0, x1, z1, h}
    this.circles = []; // {x, z, r}
    this.cell = 16;
    this.grid = new Map();
  }

  rect(x0, z0, x1, z1, h = 3) {
    const r = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), h };
    this.rects.push(r);
    this.index(r, r.x0, r.z0, r.x1, r.z1);
    return r;
  }

  circle(x, z, r) {
    const c = { x, z, r };
    this.circles.push(c);
    this.index(c, x - r, z - r, x + r, z + r);
    return c;
  }

  index(item, x0, z0, x1, z1) {
    const s = this.cell;
    for (let gx = Math.floor(x0 / s); gx <= Math.floor(x1 / s); gx++) {
      for (let gz = Math.floor(z0 / s); gz <= Math.floor(z1 / s); gz++) {
        const k = gx + ',' + gz;
        if (!this.grid.has(k)) this.grid.set(k, []);
        this.grid.get(k).push(item);
      }
    }
  }

  near(x, z, r) {
    const s = this.cell, out = new Set();
    for (let gx = Math.floor((x - r) / s); gx <= Math.floor((x + r) / s); gx++) {
      for (let gz = Math.floor((z - r) / s); gz <= Math.floor((z + r) / s); gz++) {
        const l = this.grid.get(gx + ',' + gz);
        if (l) for (const it of l) out.add(it);
      }
    }
    return out;
  }

  /** Pushes position p (with .x/.z) of radius r out of colliders. Returns the push normal or null. */
  resolve(p, r) {
    let hit = null;
    for (let iter = 0; iter < 2; iter++) {
      for (const c of this.near(p.x, p.z, r + 1)) {
        let dx, dz, dist, pen;
        if (c.r !== undefined) {
          dx = p.x - c.x; dz = p.z - c.z;
          dist = Math.hypot(dx, dz);
          pen = r + c.r - dist;
          if (pen <= 0) continue;
          if (dist < 1e-6) { dx = 1; dz = 0; dist = 1; }
          dx /= dist; dz /= dist;
        } else {
          const cx = Math.max(c.x0, Math.min(p.x, c.x1));
          const cz = Math.max(c.z0, Math.min(p.z, c.z1));
          dx = p.x - cx; dz = p.z - cz;
          dist = Math.hypot(dx, dz);
          if (dist > r) continue;
          if (dist < 1e-6) {
            // centre inside the box: leave by the nearest side
            const l = p.x - c.x0, rr = c.x1 - p.x, t = p.z - c.z0, b = c.z1 - p.z;
            const m = Math.min(l, rr, t, b);
            if (m === l) { dx = -1; dz = 0; pen = l + r; }
            else if (m === rr) { dx = 1; dz = 0; pen = rr + r; }
            else if (m === t) { dx = 0; dz = -1; pen = t + r; }
            else { dx = 0; dz = 1; pen = b + r; }
          } else {
            pen = r - dist; dx /= dist; dz /= dist;
          }
        }
        p.x += dx * pen; p.z += dz * pen;
        hit = { x: dx, z: dz };
      }
    }
    return hit;
  }

  /** Height of whatever blocks the point (for the camera), or 0. */
  heightAt(x, z, poles = 0) {
    let h = 0;
    for (const c of this.near(x, z, 0.5 + poles)) {
      if (c.r !== undefined) {
        // trunks and poles block the camera too (when asked)
        if (poles && c.r > 0.1 && Math.hypot(x - c.x, z - c.z) < c.r + poles) h = Math.max(h, 6);
        continue;
      }
      if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) h = Math.max(h, c.h);
    }
    return h;
  }
}
