// Every surface in the campus. World geometry carries UVs in metres; each texture's repeat
// turns metres into tiles, so one material fits walls and paths of any size.
import * as THREE from 'three';
import { tex } from './assets.js';

function tiled(name, metresU, metresV = metresU, { normal = null, colour = true } = {}) {
  const map = tex(name, { colour });
  map.repeat.set(1 / metresU, 1 / metresV);
  let normalMap = null;
  if (normal) {
    normalMap = tex(normal, { colour: false });
    normalMap.repeat.set(1 / metresU, 1 / metresV);
  }
  return { map, normalMap };
}

export function makeMaterials(quality) {
  const M = {};
  const std = (o) => new THREE.MeshStandardMaterial(o);

  const brick = tiled('brick.jpg', 4.8, 2.4, { normal: 'brick_n.jpg' });
  M.brick = std({ ...brick, roughness: 0.86, normalScale: new THREE.Vector2(0.8, 0.8) });
  M.brickDark = std({ ...brick, color: 0xb59a90, roughness: 0.9 });
  const pav = tiled('pavers_grey.jpg', 2, 2, { normal: 'pavers_grey_n.jpg' });
  M.pavers = std({ ...pav, roughness: 0.8 });
  const chk = tiled('pavers_checker.jpg', 2, 2, { normal: 'pavers_checker_n.jpg' });
  M.checker = std({ ...chk, roughness: 0.82 });
  const plz = tiled('plaza_tiles.jpg', 3.6, 3.6, { normal: 'plaza_tiles_n.jpg' });
  M.plaza = std({ ...plz, color: 0xf7e9d6, roughness: 0.5, envMapIntensity: 0.6 });
  const stone = tiled('stone_beige.jpg', 3, 3, { normal: 'stone_beige_n.jpg' });
  M.stone = std({ ...stone, roughness: 0.75 });
  M.concrete = std({ ...tiled('concrete.jpg', 4, 4), roughness: 0.9 });
  M.concreteDark = std({ ...tiled('concrete.jpg', 4, 4), color: 0x8f8f8f, roughness: 0.9 });
  const fence = tiled('fence.jpg', 3, 2.3);
  M.fence = std({ ...fence, roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide });
  const jali = tex('jali.png');
  jali.repeat.set(1 / 0.9, 1 / 0.9);
  M.jali = std({ map: jali, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.7 });
  const lat = tex('gate_lattice.png', { repeat: false });
  M.gate = std({ map: lat, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.45, color: 0x8a8f94 });
  M.sand = std({ ...tiled('sand.jpg', 5, 5), roughness: 1 });
  M.dirt = std({ ...tiled('dirt.jpg', 6, 6), roughness: 1 });
  M.hedge = std({ ...tiled('hedge.jpg', 0.9, 0.9), roughness: 0.95 });
  M.hedge.color.setRGB(0.95, 1.0, 0.9);
  M.court = std({ color: 0x9d4635, roughness: 0.85 });
  M.courtGreen = std({ color: 0x3f6e52, roughness: 0.85 });
  M.courtLine = std({ color: 0xf2efe6, roughness: 0.8 });

  // glass reflects the evening sky (scene.environment); frames and metal
  M.glass = std({ color: 0x3a4c58, metalness: 0.92, roughness: 0.05, envMapIntensity: 2.4 });
  M.glassLit = std({ color: 0x2a3540, metalness: 0.6, roughness: 0.1, emissive: 0xffe2b0, emissiveIntensity: 0.0 });
  M.frame = std({ color: 0x2e3236, metalness: 0.6, roughness: 0.45 });
  M.metal = std({ color: 0x8e9499, metalness: 0.8, roughness: 0.35 });
  M.darkMetal = std({ color: 0x25282b, metalness: 0.7, roughness: 0.5 });
  M.black = std({ color: 0x17181a, roughness: 0.6 });
  M.white = std({ color: 0xeeeae2, roughness: 0.55 });
  M.whitePaint = std({ color: 0xf4f2ee, roughness: 0.4 });
  M.canopy = std({ color: 0x1b1c1f, metalness: 0.4, roughness: 0.4 });
  M.terracotta = std({ color: 0xa4552f, roughness: 0.85 });
  M.planter = std({ color: 0x2a2b2e, roughness: 0.6 });
  M.wood = std({ color: 0x6b4428, roughness: 0.75 });
  M.kerb = std({ color: 0xb9b5ad, roughness: 0.9 });
  M.trunk = std({ color: 0x6b5a48, roughness: 0.95 });
  M.palmTrunk = std({ color: 0x8b7a5e, roughness: 0.95 });
  M.redSign = std({ color: 0xff3b3b, emissive: 0xff2020, emissiveIntensity: 0.9, roughness: 0.4 });
  M.lampGlow = std({ color: 0xfff2d6, emissive: 0xffe0a8, emissiveIntensity: 2.2 });
  M.downlight = std({ color: 0xfff7e8, emissive: 0xfff0d0, emissiveIntensity: 3.0 });
  M.tent = std({ color: 0xf3f0e8, roughness: 0.7, side: THREE.DoubleSide });
  M.dustbinBlue = std({ color: 0x1d5fa8, roughness: 0.5 });
  M.acUnit = std({ color: 0xdedcd6, roughness: 0.5, metalness: 0.2 });
  M.cable = std({ color: 0x1b1b1b, roughness: 0.8 });
  M.steel = std({ color: 0x9aa0a6, metalness: 0.8, roughness: 0.4 });
  M.flowerWhite = std({ color: 0xf6f1ea, roughness: 0.8 });
  M.flowerYellow = std({ color: 0xf2b521, roughness: 0.8 });
  M.flowerPink = std({ color: 0xe75d86, roughness: 0.8 });
  M.arenaMural = std({ map: tex('arena_mural.jpg', { repeat: false }), roughness: 0.85 });
  M.arenaCafe = std({ map: tex('arena_cafe.jpg', { repeat: false }), emissive: 0xffffff, emissiveMap: tex('arena_cafe.jpg', { repeat: false }), emissiveIntensity: 0.55 });
  M.towerRelief = std({ map: tex('tower_relief.jpg', { repeat: false }), normalMap: tex('tower_relief_n.jpg', { colour: false, repeat: false }), roughness: 0.88 });
  M.flag = std({ map: tex('flag.jpg', { repeat: false }), side: THREE.DoubleSide, roughness: 0.8 });
  return M;
}

/** A material whose texture is drawn on a canvas (signs, banners, boards). */
export function canvasMaterial(w, h, draw, { emissive = 0, transparent = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return new THREE.MeshStandardMaterial({
    map: t, roughness: 0.6, transparent, side: THREE.DoubleSide,
    emissive: emissive ? 0xffffff : 0x000000, emissiveMap: emissive ? t : null, emissiveIntensity: emissive,
  });
}

/** The Damru logo image, drawn into canvases once it has loaded. */
export function logoImage(name = 'damru_logo_maroon.png') {
  const img = new Image();
  img.src = 'assets/textures/' + name;
  return img;
}

/**
 * A sign with the Damru logo: background, an optional line of text along the top, and the logo
 * fitted into `box` (fractions of the canvas: x, y, w, h). The logo is drawn when the image arrives.
 */
export function logoSign({ w = 1024, h = 512, bg = '#fbfaf7', top = null, topFont = '500 64px "Avenir Next", Arial', fg = '#555', logo = 'damru_logo_maroon.png', emissive = 0, box = [0.06, 0.24, 0.88, 0.72] } = {}) {
  let ctx = null;
  const mat = canvasMaterial(w, h, (g) => {
    ctx = g;
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    if (top) { g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = topFont; g.fillText(top, w / 2, h * 0.13); }
  }, { emissive });
  const img = logoImage(logo);
  img.onload = () => {
    const [bx, by, bw, bh] = box;
    const s = Math.min((bw * w) / img.width, (bh * h) / img.height);
    const dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, bx * w + (bw * w - dw) / 2, by * h + (bh * h - dh) / 2, dw, dh);
    mat.map.needsUpdate = true;
  };
  return mat;
}
