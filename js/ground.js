// The open ground of the campus and the fields around it: grass, worn dirt and sand mixed by
// a painted "splat" map, each sampled twice at different scales so no tiling shows.
import * as THREE from 'three';
import { tex } from './assets.js';
import { rng } from './util.js';
import { WALL } from './layout.js';

export const SPLAT = { x0: -330, z0: -560, size: 800 }; // metres covered by the splat map

/** paint(ctx, toPx) lets the world mark sand grounds, worn paths and construction dirt. */
export function makeGround(scene, paint) {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const toPx = (x, z) => [((x - SPLAT.x0) / SPLAT.size) * S, ((z - SPLAT.z0) / SPLAT.size) * S];
  const px = (m) => (m / SPLAT.size) * S;
  // base: grass (red channel)
  g.fillStyle = 'rgb(255,0,0)';
  g.fillRect(0, 0, S, S);
  const r = rng(77);
  // farmland outside the walls: alternating bare and green strips
  for (let i = 0; i < 26; i++) {
    const [x, z] = toPx(-330 + r() * 800, -560 + r() * 800);
    if (x > toPx(WALL.x0 - 8, 0)[0] && x < toPx(WALL.x1 + 8, 0)[0] && z > toPx(0, WALL.z0 - 8)[1] && z < toPx(0, 8)[1]) continue;
    g.fillStyle = r() < 0.55 ? 'rgba(0,255,0,0.75)' : 'rgba(255,90,0,0.6)';
    g.save(); g.translate(x, z); g.rotate((r() - 0.5) * 0.2);
    g.fillRect(-px(40 + r() * 60), -px(12 + r() * 20), px(80 + r() * 120), px(24 + r() * 40));
    g.restore();
  }
  // worn dirt patches scattered over the lawns
  for (let i = 0; i < 320; i++) {
    const [x, z] = toPx(WALL.x0 + r() * (WALL.x1 - WALL.x0), WALL.z0 + r() * (WALL.z1 - WALL.z0));
    const rad = px(2 + r() * 9);
    const gr = g.createRadialGradient(x, z, 0, x, z, rad);
    gr.addColorStop(0, `rgba(40,255,0,${0.35 + r() * 0.5})`);
    gr.addColorStop(1, 'rgba(40,255,0,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, z, rad, 0, Math.PI * 2); g.fill();
  }
  paint(g, toPx, px);
  g.filter = 'blur(1.5px)';
  g.drawImage(c, 0, 0);
  g.filter = 'none';

  const splat = new THREE.CanvasTexture(c);
  splat.colorSpace = THREE.NoColorSpace;
  splat.wrapS = splat.wrapT = THREE.ClampToEdgeWrapping;
  splat.flipY = false;
  const grass = tex('grass.jpg'), dirt = tex('dirt.jpg'), sand = tex('sand.jpg');

  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.98, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.tSplat = { value: splat };
    sh.uniforms.tGrass = { value: grass };
    sh.uniforms.tDirt = { value: dirt };
    sh.uniforms.tSand = { value: sand };
    sh.uniforms.uRect = { value: new THREE.Vector3(SPLAT.x0, SPLAT.z0, SPLAT.size) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos;
        uniform sampler2D tSplat, tGrass, tDirt, tSand;
        uniform vec3 uRect;
        vec3 twoScale(sampler2D t, vec2 p, float a, float b) {
          return mix(texture2D(t, p / a).rgb, texture2D(t, p / b + 0.37).rgb, 0.4);
        }`)
      .replace('#include <map_fragment>', `
        vec2 suv = (vWPos.xz - uRect.xy) / uRect.z;
        vec3 w = texture2D(tSplat, clamp(suv, 0.001, 0.999)).rgb + 1e-3;
        w /= (w.r + w.g + w.b);
        vec2 p = vWPos.xz;
        vec3 cg = twoScale(tGrass, p, 5.0, 23.0) * vec3(0.92, 1.0, 0.86);
        vec3 cd = twoScale(tDirt, p, 6.0, 29.0);
        vec3 cs = twoScale(tSand, p, 6.0, 31.0);
        float fade = smoothstep(150.0, 400.0, length(vWPos.xz - cameraPosition.xz));
        vec3 col = cg * w.r + cd * w.g + cs * w.b;
        col = mix(col, vec3(0.32, 0.31, 0.22), fade * 0.35);
        diffuseColor.rgb *= col;`);
  };
  const geo = new THREE.PlaneGeometry(1600, 1600, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'ground';
  scene.add(mesh);
  return { mesh, splatCanvas: c, toPx };
}
