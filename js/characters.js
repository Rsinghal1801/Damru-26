// People: the player and the students around campus. One Ready Player Me body (recoloured
// per person) and the Michelle model, both animated with the Mixamo clips from Soldier.glb,
// retargeted at load time through world-space rotations so the different rigs line up.
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { model, tex } from './assets.js';

const norm = (n) => n.replace(/^mixamorig:?/, '');
const LIMB_CHILD = {
  LeftShoulder: 'LeftArm', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand',
  RightShoulder: 'RightArm', RightArm: 'RightForeArm', RightForeArm: 'RightHand',
  LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot',
};

function bonesOf(root) {
  const m = {};
  // the slim animation file keeps the rig as plain nodes, so match by name too
  root.traverse((o) => { if (o.isBone || /^mixamorig/.test(o.name)) m[norm(o.name)] = o; });
  return m;
}
const wq = (o) => o.getWorldQuaternion(new THREE.Quaternion());
const wp = (o) => o.getWorldPosition(new THREE.Vector3());

function yawOf(B) {
  const left = wp(B.LeftUpLeg).sub(wp(B.RightUpLeg));
  const f = new THREE.Vector3().crossVectors(left, new THREE.Vector3(0, 1, 0));
  return Math.atan2(f.x, f.z);
}

/**
 * A relaxed standing idle made from the rest pose: arms down at the sides with a slight bend,
 * slow breathing, a small weight shift and the head looking about. Loops every 6 s.
 */
function standIdle(root) {
  root.updateMatrixWorld(true);
  const B = bonesOf(root);
  const all = [];
  root.traverse((o) => { if (o.isBone) all.push(o); });
  const rest = new Map(all.map((b) => [b, b.quaternion.clone()]));
  const restHips = B.Hips.position.clone();
  // turn a bone in world space so the direction to its child points along `dir`
  const aim = (bone, child, dir) => {
    const from = wp(child).sub(wp(bone)).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(from, dir.clone().normalize());
    const world = q.multiply(wq(bone));
    bone.quaternion.copy(wq(bone.parent).invert().multiply(world));
    root.updateMatrixWorld(true);
  };
  // which way is the person facing, and which way is their left
  const left = wp(B.LeftUpLeg).sub(wp(B.RightUpLeg)).setY(0).normalize();
  const fwd = new THREE.Vector3().crossVectors(left, new THREE.Vector3(0, 1, 0)).normalize();
  const down = new THREE.Vector3(0, -1, 0);
  for (const [side, s] of [['Left', 1], ['Right', -1]]) {
    const arm = B[side + 'Arm'], fore = B[side + 'ForeArm'], hand = B[side + 'Hand'];
    if (!arm || !fore || !hand) continue;
    aim(arm, fore, down.clone().addScaledVector(left, 0.16 * s).addScaledVector(fwd, 0.04));
    aim(fore, hand, down.clone().addScaledVector(left, 0.05 * s).addScaledVector(fwd, 0.32));
  }
  const pose = new Map(all.map((b) => [b, b.quaternion.clone()]));
  const T = 6, N = 61, times = new Float32Array(N);
  const qv = new Map(all.map((b) => [b, new Float32Array(N * 4)]));
  const pv = new Float32Array(N * 3);
  const tmp = new THREE.Quaternion(), e = new THREE.Euler();
  for (let f = 0; f < N; f++) {
    const t = (f / (N - 1)) * T, w = (t / T) * Math.PI * 2;
    times[f] = t;
    for (const b of all) pose.get(b).toArray(qv.get(b), f * 4);
    const add = (bone, x, y, z) => {
      if (!bone) return;
      const q = new THREE.Quaternion().fromArray(qv.get(bone), f * 4);
      q.multiply(tmp.setFromEuler(e.set(x, y, z))).toArray(qv.get(bone), f * 4);
    };
    const breath = Math.sin(w * 2);              // two breaths per loop
    add(B.Spine1, 0.012 * breath, 0, 0);
    add(B.Spine2, 0.014 * breath, 0, 0);
    add(B.Neck, -0.01 * breath, 0, 0);
    add(B.Head, 0, 0.16 * Math.sin(w + 0.6) * Math.max(0, Math.sin(w * 0.5)), 0.02 * Math.sin(w));
    add(B.Hips, 0, 0, 0.012 * Math.sin(w));      // weight shifts from foot to foot
    add(B.LeftUpLeg, 0, 0, -0.012 * Math.sin(w));
    add(B.RightUpLeg, 0, 0, -0.012 * Math.sin(w));
    add(B.LeftArm, 0.03 * breath, 0, 0);
    add(B.RightArm, 0.03 * breath, 0, 0);
    const hp = restHips.clone();
    hp.y -= Math.abs(restHips.y) * 0.002 * (1 + breath);
    hp.toArray(pv, f * 3);
  }
  for (const b of all) b.quaternion.copy(rest.get(b));
  root.updateMatrixWorld(true);
  const tracks = all.map((b) => new THREE.QuaternionKeyframeTrack(b.name + '.quaternion', times, qv.get(b)));
  tracks.push(new THREE.VectorKeyframeTrack(B.Hips.name + '.position', times, pv));
  return new THREE.AnimationClip('Idle', T, tracks);
}

/** Bakes source clips onto the target skeleton. Returns {name: AnimationClip}. */
function retarget(srcRoot, tgtRoot, clips, names, fps = 30) {
  srcRoot.updateMatrixWorld(true);
  tgtRoot.updateMatrixWorld(true);
  const S = bonesOf(srcRoot), T = bonesOf(tgtRoot);
  // face the same way
  srcRoot.rotation.y += yawOf(T) - yawOf(S);
  srcRoot.updateMatrixWorld(true);
  const k = wp(T.Hips).y / wp(S.Hips).y;

  const tgtList = [];
  tgtRoot.traverse((o) => { if (o.isBone) tgtList.push(o); });
  const restS = {}, restT = {}, corr = {};
  for (const name in T) {
    if (!S[name]) continue;
    restS[name] = wq(S[name]);
    restT[name] = wq(T[name]);
    corr[name] = new THREE.Quaternion();
    const child = LIMB_CHILD[name];
    if (child && S[child] && T[child]) {
      const dS = wp(S[child]).sub(wp(S[name])).normalize();
      const dT = wp(T[child]).sub(wp(T[name])).normalize();
      corr[name].setFromUnitVectors(dT, dS);
    }
  }
  const hipsRestS = wp(S.Hips), hipsRestT = wp(T.Hips);
  const hipsParentInv = T.Hips.parent.matrixWorld.clone().invert();
  const parentRest = new Map();
  for (const b of tgtList) parentRest.set(b, wq(b.parent));

  const mixer = new THREE.AnimationMixer(srcRoot);
  const out = {};
  for (const name of names) {
    const clip = clips.find((c) => c.name === name);
    if (!clip) continue;
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.reset().play();
    const frames = Math.max(2, Math.round(clip.duration * fps) + 1);
    const times = new Float32Array(frames);
    const qv = {}, prev = {};
    for (const b of tgtList) if (restS[norm(b.name)]) qv[b.name] = new Float32Array(frames * 4);
    const pv = new Float32Array(frames * 3);
    const world = new Map();
    for (let f = 0; f < frames; f++) {
      const t = Math.min(clip.duration, f / fps);
      times[f] = t;
      mixer.setTime(t);
      srcRoot.updateMatrixWorld(true);
      world.clear();
      for (const b of tgtList) {
        const n = norm(b.name);
        const pw = world.get(b.parent) || parentRest.get(b);
        let w;
        if (restS[n]) {
          const delta = wq(S[n]).multiply(restS[n].clone().invert());
          w = delta.multiply(corr[n]).multiply(restT[n]);
          const local = pw.clone().invert().multiply(w);
          const p = prev[b.name];
          if (p && p.dot(local) < 0) local.set(-local.x, -local.y, -local.z, -local.w);
          prev[b.name] = local;
          local.toArray(qv[b.name], f * 4);
        } else {
          w = pw.clone().multiply(b.quaternion);
        }
        world.set(b, w);
      }
      const d = wp(S.Hips).sub(hipsRestS).multiplyScalar(k);
      const hp = hipsRestT.clone().add(d).applyMatrix4(hipsParentInv);
      hp.toArray(pv, f * 3);
    }
    const tracks = [];
    for (const b of tgtList) if (qv[b.name]) tracks.push(new THREE.QuaternionKeyframeTrack(b.name + '.quaternion', times, qv[b.name]));
    tracks.push(new THREE.VectorKeyframeTrack(T.Hips.name + '.position', times, pv));
    out[name] = new THREE.AnimationClip(name, clip.duration, tracks);
  }
  mixer.stopAllAction();
  return out;
}

// outfits: [top colour, bottom colour, skin tint, beard]
const OUTFITS = [
  [0xf2efe8, 0x2c3e5c, 0xf4e6da, true],   // the player: white jacket, dark jeans
  [0x7d1a22, 0x2a2a2e, 0xead6c6, false],  // maroon
  [0x2f6fae, 0xd8cfbf, 0xfff0e4, false],  // blue, beige chinos
  [0xe2b33c, 0x34495e, 0xe2cbb8, true],   // mustard
  [0x3a3d42, 0x4a5d7a, 0xf6e4d6, false],  // charcoal
  [0x4f7f52, 0x2b2b2b, 0xe8d2c0, true],   // olive
  [0xd9d4c8, 0x6b4f3a, 0xfaeadc, false],  // cream, brown trousers
  [0xa33c2e, 0x3d4c63, 0xe0c8b6, false],  // rust
  [0x1f2a44, 0x8f8f8a, 0xf0dccc, true],   // navy, grey trousers
];

export async function loadPeople() {
  const [rpm, soldier, mich, srcAgain] = await Promise.all([model('readyplayer.me.glb'), model('anims.glb'), model('Michelle.glb'), model('anims.glb')]);
  const manClips = retarget(soldier.scene, rpm.scene, soldier.animations, ['Idle', 'Walk', 'Run']);
  // Michelle's own rig is upright; retarget onto her too so walking matches the men
  const girlClips = retarget(srcAgain.scene, mich.scene, srcAgain.animations, ['Idle', 'Walk', 'Run']);
  girlClips.Dance = mich.animations.find((a) => a.name === 'SambaDance');
  // the source idle is a crouched ready stance: it stays as the base the seated poses are
  // built on, and people standing about use a relaxed idle instead
  manClips.Seat = manClips.Idle;
  girlClips.Seat = girlClips.Idle;
  manClips.Idle = standIdle(rpm.scene);
  // the men dance too: Michelle's samba retargeted onto the Ready Player Me body
  const samba = retarget(SkeletonUtils.clone(mich.scene), rpm.scene, mich.animations, ['SambaDance']).SambaDance;
  if (samba) manClips.Dance = samba;
  girlClips.Idle = standIdle(mich.scene);

  // shorten the long jacket tails to a waist-length jacket (shared geometry, done once)
  rpm.scene.traverse((o) => {
    if (o.isMesh && o.material.name === 'Wolf3D_Outfit_Top') {
      const pos = o.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0.9) pos.setY(i, 0.9 + (pos.getY(i) - 0.9) * 0.12);
      pos.needsUpdate = true;
    }
  });
  const topMap = tex('man_top.jpg', { flipY: false, repeat: false });
  const botMap = tex('man_bottom.jpg', { flipY: false, repeat: false });

  const rpmHeight = new THREE.Box3().setFromObject(rpm.scene).getSize(new THREE.Vector3()).y;
  const michHeight = new THREE.Box3().setFromObject(mich.scene).getSize(new THREE.Vector3()).y;

  function prep(root) {
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        // skinned bounds come from the bind pose: pad them so moving limbs are not culled
        if (o.isSkinnedMesh) {
          o.computeBoundingSphere();
          o.boundingSphere.radius *= 1.6;
        }
      }
    });
  }

  /** A man in outfit i (0 is the player). */
  // short dark hair: a lumpy cap built round the head, in head-bone space, so it moves with
  // the head. Below the hairline the cap is pulled inside the head and disappears.
  rpm.scene.updateMatrixWorld(true);
  let headBone = null;
  rpm.scene.traverse((o) => { if (o.isBone && o.name === 'Head') headBone = o; });
  const hairStyles = [0, 1, 2].map((style) => {
    const g = new THREE.SphereGeometry(1, 40, 28);
    const p = g.attributes.position, v = new THREE.Vector3();
    const c = new THREE.Vector3(0, 1.738, 0.008), r = new THREE.Vector3(0.104, 0.118, 0.126);
    const vol = [1.0, 1.05, 1.1][style];
    for (let k = 0; k < p.count; k++) {
      v.fromBufferAttribute(p, k);
      const front = THREE.MathUtils.smoothstep(v.z, -0.1, 0.75);
      const side = Math.abs(v.x);
      const hairline = 1.775 + 0.012 * front - 0.11 * (1 - front) * (1 - side * 0.35);
      const top = THREE.MathUtils.smoothstep(v.y, 0.1, 1);
      const bump = 1 + (vol - 1) * top + 0.012 * Math.sin(v.x * 23 + v.z * 17) * Math.sin(v.y * 19);
      let x = c.x + r.x * v.x * bump, y = c.y + r.y * v.y * bump, z = c.z + r.z * v.z * bump;
      if (y < hairline) { x = c.x + r.x * v.x * 0.8; y = c.y + r.y * v.y * 0.8; z = c.z + r.z * v.z * 0.8; }
      p.setXYZ(k, x, y, z);
    }
    g.computeVertexNormals();
    if (headBone) g.applyMatrix4(headBone.matrixWorld.clone().invert());
    return g;
  });
  const hairColours = [0x15110e, 0x1d1712, 0x0f0d0c, 0x2a1f17];
  const hairMats = hairColours.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.62, metalness: 0.0 }));

  function man(i = 0, height = 1.76) {
    const [top, bottom, skin, beard] = OUTFITS[i % OUTFITS.length];
    const root = SkeletonUtils.clone(rpm.scene);
    root.traverse((o) => {
      if (o.isBone && o.name === 'Head' && headBone) {
        const hair = new THREE.Mesh(hairStyles[i % 3], hairMats[i % hairMats.length]);
        hair.castShadow = true;
        o.add(hair);
      }
    });
    root.traverse((o) => {
      if (!o.isMesh) return;
      const n = o.material.name;
      if (n === 'Wolf3D_Headwear' || n === 'Wolf3D_Teeth') { o.visible = false; return; }
      if (n === 'Wolf3D_Beard' && !beard) { o.visible = false; return; }
      const m = o.material.clone();
      if (n === 'Wolf3D_Outfit_Top') { m.map = topMap; m.color.setHex(top); m.roughness = 0.85; }
      else if (n === 'Wolf3D_Outfit_Bottom') { m.map = botMap; m.color.setHex(bottom); m.roughness = 0.9; }
      else if (n === 'Wolf3D_Skin' || n === 'Wolf3D_Body') { m.color.setHex(skin); }
      else if (n === 'Wolf3D_Outfit_Footwear') { m.color.setHex(i % 3 === 0 ? 0xffffff : 0x666666); }
      o.material = m;
    });
    prep(root);
    const s = height / rpmHeight;
    root.scale.setScalar(s);
    return person(root, manClips);
  }

  /** Michelle, lightly varied. */
  function woman(i = 0, height = 1.64) {
    const root = SkeletonUtils.clone(mich.scene);
    const tints = [0xffffff, 0xf0e6ff, 0xffeedd, 0xe8f2ff, 0xfff0f0];
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      o.material.color.setHex(tints[i % tints.length]);
    });
    prep(root);
    root.scale.multiplyScalar(height / michHeight);
    return person(root, girlClips);
  }

  return { man, woman };
}

/** Wraps a model with a mixer, cross-fading between Idle / Walk / Run / Dance. */
function person(model, clips) {
  const holder = new THREE.Group();
  holder.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const k in clips) if (clips[k]) actions[k] = mixer.clipAction(clips[k]);
  let current = null;
  const bones = bonesOf(model);
  const p = {
    object: holder, model, mixer, actions, bones,
    state: null,
    play(name, fade = 0.25, timeScale = 1) {
      const a = actions[name];
      if (!a) return;
      a.timeScale = timeScale;
      if (current === a) return;
      a.reset().setEffectiveWeight(1).fadeIn(fade).play();
      if (current) current.fadeOut(fade);
      current = a;
      p.state = name;
    },
    /** Blend walk and run by speed (m/s) so feet roughly match the ground. */
    locomote(speed) {
      if (speed < 0.15) p.play('Idle', 0.3);
      else if (speed < 2.6) p.play('Walk', 0.25, speed / 1.45);
      else p.play('Run', 0.25, speed / 5.2);
    },
    update(dt) { mixer.update(dt); },
  };
  p.play('Idle', 0);
  return p;
}

// ---------------------------------------------------------------- seated poses
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler();
const _rootInv = new THREE.Quaternion();

/**
 * Bends a person into a seat after the mixer has run: hips, legs and arms are set in the
 * character's own frame (x right... z forward). kind: 'cart' or 'camel'.
 */
export function applySeat(p, kind, P = SEAT[kind]) {
  const B = p.bones;
  const root = p.model;
  root.updateMatrixWorld(true);
  _rootInv.copy(root.getWorldQuaternion(_q)).invert();
  const rel = (b) => _rootInv.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion()));
  const set = (b, relQ) => {
    const parentRel = rel(b.parent);
    b.quaternion.copy(parentRel.invert().multiply(relQ));
    b.updateMatrixWorld(true);
  };
  const rot = (a) => new THREE.Quaternion().setFromEuler(_e.set(a[0], a[1], a[2], 'YXZ'));
  const list = ['Hips', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot', 'LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm'];
  const idle = {};
  for (const n of list) if (B[n]) idle[n] = rel(B[n]);
  // the angles are in the character's frame; values for the right side are mirrored
  const mir = (a, s) => [a[0], a[1] * s, a[2] * s];
  set(B.Hips, rot(P.hips).multiply(stripPitch(idle.Hips)));
  for (const side of ['Left', 'Right']) {
    const s = side === 'Left' ? 1 : -1;
    set(B[side + 'UpLeg'], rot(mir(P.thigh, s)).multiply(idle[side + 'UpLeg']));
    set(B[side + 'Leg'], rot(mir(P.shin, s)).multiply(idle[side + 'Leg']));
    set(B[side + 'Foot'], rot(mir(P.foot, s)).multiply(idle[side + 'Foot']));
    set(B[side + 'Arm'], rot(mir(P.arm, s)).multiply(idle[side + 'Arm']));
    set(B[side + 'ForeArm'], rot(mir(P.fore, s)).multiply(idle[side + 'ForeArm']));
  }
}

/** Dhol drummer's arms over whatever the mixer posed: sticks beating on both heads. */
export function applyDhol(p, t, phase = 0) {
  const b = Math.max(0, Math.sin(t * 11 + phase)), c = Math.max(0, Math.sin(t * 11 + phase + Math.PI));
  applyArms(p, [-0.75, 0, 0.35], [-1.0 - 0.45 * b, -0.6, 0], [-0.75, 0, 0.35], [-1.0 - 0.45 * c, -0.6, 0]);
}

function applyArms(p, armL, foreL, armR, foreR) {
  const B = p.bones;
  if (!B.LeftArm || !B.RightArm) return;
  const root = p.model;
  root.updateMatrixWorld(true);
  _rootInv.copy(root.getWorldQuaternion(_q)).invert();
  const rel = (b) => _rootInv.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion()));
  const set = (b, relQ) => { const parentRel = rel(b.parent); b.quaternion.copy(parentRel.invert().multiply(relQ)); b.updateMatrixWorld(true); };
  const rot = (a) => new THREE.Quaternion().setFromEuler(_e.set(a[0], a[1], a[2], 'YXZ'));
  const mir = (a, s) => [a[0], a[1] * s, a[2] * s];
  const idle = {};
  for (const n of ['LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm']) idle[n] = rel(B[n]);
  set(B.LeftArm, rot(armL).multiply(idle.LeftArm));
  set(B.LeftForeArm, rot(foreL).multiply(idle.LeftForeArm));
  set(B.RightArm, rot(mir(armR, -1)).multiply(idle.RightArm));
  set(B.RightForeArm, rot(mir(foreR, -1)).multiply(idle.RightForeArm));
}

/** A dhol drum on its strap, hung in front of a player (local to the person's holder). */
export function makeDhol() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.5, 20, 1, true).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8a1c14, roughness: 0.5, side: THREE.DoubleSide }));
  const headMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.7 });
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.CircleGeometry(0.215, 20).rotateY(s * Math.PI / 2), headMat);
    h.position.x = s * 0.25; g.add(h);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.018, 6, 20).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.6, roughness: 0.4 }));
    rim.position.x = s * 0.25; g.add(rim);
  }
  for (let k = 0; k < 8; k++) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.5, 4).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf2d16b }));
    const a = (k / 8) * Math.PI * 2; r.position.set(0, Math.cos(a) * 0.213, Math.sin(a) * 0.213); g.add(r);
  }
  g.add(shell);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// seat poses: [pitch (x), yaw (y), roll (z)] rotations applied in the character's frame to
// the standing pose, for the left side (the right side is mirrored)
export const SEAT = {
  cart: { hips: [-0.04, 0, 0], thigh: [-1.45, 0, 0.1], shin: [-0.1, 0, 0], foot: [-0.1, 0, 0], arm: [-0.55, 0, 0.12], fore: [-1.25, -0.35, 0] },
  camel: { hips: [0.04, 0, 0], thigh: [-0.8, 0, 0.45], shin: [0.3, 0, 0.12], foot: [0.35, 0, 0.05], arm: [-0.45, 0, 0.1], fore: [-1.15, -0.3, 0] },
};

function stripPitch(q) {
  const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
  e.x = 0;
  return new THREE.Quaternion().setFromEuler(e);
}
