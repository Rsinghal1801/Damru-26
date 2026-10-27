// Where everything is, in metres. The layout follows the hand-drawn campus map (Gate 2 in the
// south-east corner, the ring road, Blocks A, B and C round the flag circle (B and C either side of
// a wide lit plaza), Residency 1, 2 and 3 up the west side with the Nescafé store between 1 and 2, the two big grounds in the middle, and Residency-4, the courts and the
// Learners Arena along the east side). The look of each building comes from the campus videos.
// Map x = east, map y = north, origin at the middle of Gate 2. Game space: x = east, z = south.

/** Map rectangle (x0, y0, x1, y1 with y north) to game rectangle {x0, z0, x1, z1}. */
export const R = (x0, y0, x1, y1, extra = {}) => ({ x0, z0: -y1, x1, z1: -y0, ...extra });
/** Map point to game [x, z]. */
export const P = (x, y) => [x, -y];

export const WALL = { x0: -212, z0: -290, x1: 66, z1: 0, gateX0: -6, gateX1: 6 };

// player just inside Gate 2 facing north; the camel and the e-cart wait either side of the forecourt
export const SPAWN = { player: [0, -6, Math.PI], camel: [5, -15, Math.PI], cart: [-9, -14, -Math.PI / 2] };

export const BUILDINGS = {
  gateTower: R(8, 2, 18, 12, { h: 34 }),
  cabin: R(6.5, 0.6, 12, 5, { h: 3.3 }),
  // east side, outside the ring road
  res4: R(12, 14, 42, 78, { floors: 5, fh: 3.8 }),
  res4Tower: R(11, 80, 22, 91, { h: 33 }),
  res4Base: R(5, 79, 24, 93, { h: 4.4 }),
  arena: R(12, 166, 62, 240, { h: 16, base: 5.6 }),
  pump: R(50, 274, 58, 282, { h: 3 }),
  // round the flag circle
  blockA: R(-186, 26, -140, 80, { floors: 5, fh: 4.2 }),
  // Block B and Block C stand closer to Residency-4 (with the lawn kept between them), either side of
  // a 16 m plaza that runs from the inner road to the drop-off
  blockB: R(-88, 24, -56, 44, { floors: 4, fh: 3.9 }),
  blockC: R(-88, 60, -60, 83, { floors: 6, fh: 3.9 }),
  // Residency 1, 2 and 3: one ten-storey building each, in a single column up the west side
  res1: R(-186, 98, -140, 136, { floors: 10, fh: 3.3, front: 'e', label: 'RESIDENCY-1' }),
  // the Nescafé store between Residency 1 and Residency 2, its counter facing Residency 2 (north)
  nescafe: R(-171.5, 138, -158.5, 144, { h: 3.8 }),
  res2: R(-186, 164, -140, 200, { floors: 10, fh: 3.3, front: 'e', label: 'RESIDENCY-2' }),
  res3: R(-186, 212, -140, 264, { floors: 10, fh: 3.3, front: 'e', label: 'RESIDENCY-3' }),
  kiosk1: R(-210, 60, -204, 72, { h: 3.4 }),
  kiosk2: R(-210, 200, -204, 212, { h: 3.4 }),
};

// paved areas: material, game rect
export const PAVING = [
  ['forecourt', R(-14, 0, 14, 22)],
  ['checker', R(-203, 8, -14, 20)],       // south ring road (the avenue)
  ['checker', R(-6, 22, 6, 284)],         // east ring road
  ['pavers', R(-203, 272, -6, 284)],      // north ring road
  ['checker', R(-203, 20, -191, 272)],    // west ring road
  ['pavers', R(-212, 20, -203, 272)],     // parking strip along the west wall
  ['checker', R(-130, 20, -120, 272)],    // inner road north from the flag circle
  ['checker', R(-191, 84, -130, 92)],     // cross road between Block A and Residency 1
  ['checker', R(-120, 84, -6, 92)],
  ['checker', R(-191, 150, -130, 158)],   // cross road between Residency 1 and Residency 2
  ['checker', R(-120, 150, -6, 158)],
  ['plaza', R(-140, 20, -130, 84)],       // flag row along Block A
  ['striped', R(-56, 38, -36, 66)],       // drop-off under the white canopy
  ['plaza', R(-120, 44, -58, 60)],        // the plaza between Block B and Block C, under the skybridges
  ['pavers', R(-36, 49, -6, 55)],         // walk across the lawn to the east road
  ['plaza', R(-178, 136, -152, 150)],     // the Nescafé store and its tables
  ['concrete', R(6, 14, 11, 79)],         // walkway along the Residency-4 colonnade
  ['checker', R(6, 93, 11, 280)],         // apron along the courts and the Arena
  ['asphalt', R(-212, -18, 66, -6)],      // road outside the wall
  ['pavers', R(-10, -6, 10, 0)],          // apron outside the gate
];

export const FLAG_CIRCLE = { c: P(-125, 52), r: 6.5 };
export const COURTS = R(14, 98, 60, 156);          // volleyball and tennis
export const SAND_GROUND = R(16, 246, 60, 270);
export const GARDEN = { c: P(-22, -11), r: 8 };

// the Damru fest
export const NORTH_GROUND = R(-120, 158, -6, 272);
export const MIDDLE_GROUND = R(-120, 92, -6, 150);
export const STAGE = { x: -63, z: -254, w: 40, d: 14, h: 1.8 };   // front edge faces south
export const STALL_ROWS = [
  { z: -108, face: 1 },    // south row, counters face north (towards the aisle)
  { z: -134, face: -1 },   // north row, counters face south
];
export const STALL_X = [-110, -101, -92, -83, -74, -52, -43, -34, -25, -16];   // gap in the middle for the arches
export const STALLS = [
  // [name, kind, colour] in order along the south row then the north row
  ['Pani Puri', 'food', '#f2b632'], ['Momos', 'food', '#e45b2a'], ['Chaat Corner', 'food', '#d93b5a'],
  ['Ring Toss', 'game', '#2d8fd8'], ['Maggi Point', 'food', '#f2c200'], ['Kulfi', 'food', '#8e5bd8'],
  ['Balloon Darts', 'game', '#26a65b'], ['Dosa', 'food', '#ef7d22'], ['Chai Adda', 'food', '#b5651d'],
  ['Henna', 'game', '#c2185b'],
  ['Vada Pav', 'food', '#e85d3f'], ['Tin Can Knock', 'game', '#1e88e5'], ['Pizza', 'food', '#d84315'],
  ['Cold Coffee', 'food', '#6d4c41'], ['Photo Booth', 'game', '#ab47bc'], ['Shawarma', 'food', '#f57c00'],
  ['Gola', 'food', '#29b6f6'], ['Lucky Wheel', 'game', '#43a047'], ['Jalebi', 'food', '#ffa000'],
  ['Merch', 'game', '#c62828'],
];
export const DHOL = P(-63, 176);          // dhol troupe and dance circle at the way into the north ground
export const REG_DESK = P(-11, 26);       // wristband desk on the forecourt

export const PLACES = [
  { id: 'gate', name: 'Gate 2 (Main Gate)', x: 0, z: -8, r: 9,
    info: 'The main gate, next to the tall brick tower with a figure laid in the brickwork. Tonight it is hung with marigolds under the DAMRU \'26 arch.' },
  { id: 'res4', name: 'Residency-4', x: 6, z: -48, r: 9,
    info: 'The long brick block just inside the gate, with glass shopfronts behind its brick colonnade and the tall tower at its north end.' },
  { id: 'courts', name: 'Volleyball & Tennis Court', x: 8, z: -126, r: 10,
    info: 'The fenced hard courts on the east side, lit by floodlights for the evening matches.' },
  { id: 'arena', name: 'Learners Arena', x: 6, z: -202, r: 11,
    info: 'Brick reliefs of athletes across its walls, a black canopy with downlights, and the Chai Adda cafe on the ground floor.' },
  { id: 'blockB', name: 'Block B', x: -50, z: -30, r: 8,
    info: 'Four storeys of red brick with white jali screens, linked to Block C by two skybridges across the lit plaza.' },
  { id: 'dropoff', name: 'Drop-off Canopy', x: -47, z: -52, r: 7,
    info: 'The white canopy on grey steel columns where the cars drop students between Block B and Block C.' },
  { id: 'blockC', name: 'Block C', x: -54, z: -74, r: 8,
    info: 'The tall jali tower, six storeys of brick and white screens above a glass ground floor.' },
  { id: 'circle', name: 'Flag Circle', x: -125, z: -52, r: 9,
    info: 'The round lawn with the national flag where the roads meet between Block A, Block B and Block C.' },
  { id: 'blockA', name: 'Block A', x: -137, z: -30, r: 8,
    info: 'Glass ground floor with brick storeys above, and the row of flags along its front.' },
  { id: 'res1', name: 'Residency 1', x: -125, z: -122, r: 9,
    info: 'The first of the three residencies up the west side: ten storeys of brick with grey concrete balconies.' },
  { id: 'nescafe', name: 'Nescafé', x: -165, z: -149, r: 7,
    info: 'The red Nescafé store between Residency 1 and Residency 2, its counter facing Residency 2, with tables outside under the lights.' },
  { id: 'res2', name: 'Residency 2', x: -125, z: -184, r: 8,
    info: 'Ten storeys of brick with grey concrete balconies.' },
  { id: 'res3', name: 'Residency 3', x: -125, z: -238, r: 9,
    info: 'The north-west corner of the campus, the last of the three residencies.' },
  { id: 'stalls', name: 'Damru Food & Game Street', x: -63, z: -121, r: 13,
    info: 'Twenty stalls on the middle ground under strings of lights: pani puri, momos, chai, ring toss, darts and more.' },
  { id: 'stage', name: 'Damru Main Stage', x: -63, z: -226, r: 15,
    info: 'The main stage on the big north ground: LED screen, light towers and the crowd waiting for the concert.' },
];

// fest missions: the stalls that hand out Damru passes (indices into STALLS)
export const PASS_STALLS = [1, 3, 8, 11, 17];
export const STAGE_FRONT = P(-63, 232);

// camel & e-cart race round the ring road, clockwise from the gate
export const RACE = {
  start: P(-2, 30),
  checkpoints: [P(-100, 14), P(-197, 30), P(-197, 150), P(-197, 270), P(-100, 278), P(0, 270), P(0, 150), P(0, 40)],
};

// paths the strolling students follow (game x, z)
export const ROUTES = [
  [[-20, -12], [-100, -12], [-190, -12]],
  [[-185, -16], [-90, -16], [-16, -16]],
  [[-197, -40], [-197, -150], [-197, -260]],
  [[-125, -95], [-125, -170], [-125, -265]],
  [[-125, -262], [-125, -200], [-125, -100]],
  [[-2, -40], [-2, -130], [-2, -260]],
  [[2, -258], [2, -150], [2, -36]],
  [[-110, -277], [-40, -277], [-10, -277]],
  [[-112, -121], [-63, -121], [-14, -121]],
  [[-16, -120], [-63, -122], [-110, -120]],
  [[-112, -52], [-60, -52], [-10, -52]],
  [[-150, -88], [-60, -88], [-12, -88]],
];

// people standing about: [x, z, count]
export const GROUPS = [
  [-2, -4, 1],         // guard at the gate
  [8, -97, 4],         // Residency-4 square
  [-160, -147.6, 3],   // at the Nescafé counter
  [-206, -216, 3],     // at the kiosk on the west street
  [-136, -60, 3],      // flag row along Block A
  [-43, -43, 3],       // drop-off canopy
  [-104, -52, 3],      // the plaza between Block B and Block C
  [6, -206, 2],        // in front of the Arena
];
