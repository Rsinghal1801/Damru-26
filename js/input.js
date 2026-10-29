// Keyboard, mouse-drag look, and touch (virtual stick + drag to look + buttons).
import { clamp } from './util.js';

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();   // keys that went down this frame
    this.lookX = 0; this.lookY = 0;
    this.stick = { x: 0, y: 0, active: false };
    this.touchRun = false;
    this.lastLook = -1e9;
    this.zoom = 0;
    const down = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    };
    const up = (e) => this.keys.delete(e.code);
    addEventListener('keydown', down);
    addEventListener('keyup', up);
    addEventListener('blur', () => this.keys.clear());

    // mouse: drag anywhere on the canvas to look around, wheel to zoom
    let dragging = false, lx = 0, ly = 0;
    canvas.addEventListener('mousedown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; });
    addEventListener('mouseup', () => { dragging = false; });
    addEventListener('mousemove', (e) => {
      if (!dragging) return;
      this.lookX += e.clientX - lx; this.lookY += e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      this.lastLook = performance.now();
    });
    canvas.addEventListener('wheel', (e) => { this.zoom += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });

    // touch: left stick (fixed), the rest of the screen drags the camera
    const stickEl = document.getElementById('stick');
    const knob = document.getElementById('knob');
    let stickId = null, lookId = null, sx = 0, sy = 0;
    const R = 52;
    const setKnob = (x, y) => { knob.style.transform = `translate(${x}px, ${y}px)`; };
    stickEl.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      stickId = t.identifier;
      const r = stickEl.getBoundingClientRect();
      sx = r.left + r.width / 2; sy = r.top + r.height / 2;
      this.stick.active = true;
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
      }
      e.preventDefault();
    }, { passive: false });
    addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) {
          let dx = t.clientX - sx, dy = t.clientY - sy;
          const d = Math.hypot(dx, dy);
          if (d > R) { dx *= R / d; dy *= R / d; }
          this.stick.x = dx / R; this.stick.y = dy / R;
          setKnob(dx, dy);
        } else if (t.identifier === lookId) {
          this.lookX += (t.clientX - lx) * 1.4; this.lookY += (t.clientY - ly) * 1.4;
          lx = t.clientX; ly = t.clientY;
          this.lastLook = performance.now();
        }
      }
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) { stickId = null; this.stick.x = this.stick.y = 0; this.stick.active = false; setKnob(0, 0); }
        if (t.identifier === lookId) lookId = null;
      }
    };
    addEventListener('touchend', end);
    addEventListener('touchcancel', end);
    const tap = (id, code) => {
      const el = document.getElementById(id);
      el.addEventListener('touchstart', (e) => { this.pressed.add(code); e.preventDefault(); e.stopPropagation(); }, { passive: false });
      el.addEventListener('click', () => this.pressed.add(code));
    };
    tap('tbtn-use', 'KeyE');
    const runBtn = document.getElementById('tbtn-run');
    const toggleRun = (e) => { this.touchRun = !this.touchRun; runBtn.classList.toggle('on', this.touchRun); e.preventDefault(); };
    runBtn.addEventListener('touchstart', toggleRun, { passive: false });
    runBtn.addEventListener('click', (e) => { if (e.pointerType !== 'touch') toggleRun(e); });
  }

  has(...codes) { return codes.some((c) => this.keys.has(c)); }
  hit(code) { return this.pressed.has(code); }

  /** Movement intent: x right, y forward (-1..1), and running. */
  get move() {
    let x = 0, y = 0;
    if (this.has('KeyW', 'ArrowUp')) y += 1;
    if (this.has('KeyS', 'ArrowDown')) y -= 1;
    if (this.has('KeyD', 'ArrowRight')) x += 1;
    if (this.has('KeyA', 'ArrowLeft')) x -= 1;
    if (this.stick.active) { x += this.stick.x; y -= this.stick.y; }
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y, run: this.has('ShiftLeft', 'ShiftRight') || this.touchRun };
  }

  /** Vehicle controls: fwd (throttle/brake), turn (+ = left). */
  get drive() {
    const m = this.move;
    return { fwd: clamp(m.y, -1, 1), turn: clamp(-m.x, -1, 1), run: m.run };
  }

  consumeLook() {
    const r = { x: this.lookX, y: this.lookY, zoom: this.zoom };
    this.lookX = this.lookY = 0; this.zoom = 0;
    return r;
  }

  endFrame() { this.pressed.clear(); }
}
