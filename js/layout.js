// Where everything is, in metres. The layout follows the official Rishihood campus map (ARAMBH),
// turned so Gate 2 sits in the south-east corner: the map's top row (Residency 1, 2 and 3, Pushpa
// Devi Dining Hall and the Nescafé store) runs up the west side here, its bottom row (Residency-4,
// the tennis and basketball courts, the Learners Arena with Chai Adda, the football ground) up the
// east side, Central Park with the neem tree in the middle, and Blocks A, B and C round the flag
// circle along the south, with Gate 1 and the parking outside on the road. The look of each building
// comes from the campus videos.
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
  arena: R(12, 162, 62, 222, { h: 16, base: 5.6 }),
  // round the flag circle
  blockA: R(-186, 26, -140, 80, { floors: 5, fh: 4.2 }),
  // the glass Atrium against Block A's east face at its north end, by the A-Block Dining Hall
  atrium: R(-140, 66, -132, 80, { h: 8 }),
  // Block B and Block C stand closer to Residency-4 (with the lawn kept between them), either side of
  // a 16 m plaza that runs from the inner road to the drop-off
  blockB: R(-88, 24, -56, 44, { floors: 4, fh: 3.9 }),
  blockC: R(-88, 60, -60, 83, { floors: 6, fh: 3.9 }),
  // Residency 1, 2 and 3: one ten-storey building each, in a single column up the west side
  res1: R(-186, 96, -140, 150, { floors: 10, fh: 3.3, front: 'e', label: 'RESIDENCY-1' }),
  // Pushpa Devi Dining Hall along Residency 1's east side, and the Nescafé store at its north-east
  // corner, its counter facing Residency 2 (north)
  pdHall: R(-140, 98, -132.5, 132, { h: 4.6 }),
  nescafe: R(-139.5, 141, -131, 149.5, { h: 3.8 }),
  res2: R(-186, 156, -140, 206, { floors: 10, fh: 3.3, front: 'e', label: 'RESIDENCY-2', sub: 'GIRLS HOSTEL' }),
  res3: R(-186, 212, -140, 264, { floors: 10, fh: 3.3, front: 'e', label: 'RESIDENCY-3' }),
  kiosk1: R(-210, 60, -204, 72, { h: 3.4 }),
  kiosk2: R(-210, 200, -204, 212, { h: 3.4 }),
  // outside: the guard cabin just inside Gate 1, at the west end of the road along the south wall
  gate1Cabin: R(-290, -27, -284, -21.5, { h: 3 }),
};

// paved areas: material, game rect
export const PAVING = [
  ['forecourt', R(-14, 0, 14, 22)],
  ['checker', R(-203, 8, -14, 20)],       // south ring road (the avenue)
  ['checker', R(-6, 22, 6, 284)],         // east ring road
  ['pavers', R(-203, 272, -6, 284)],      // north ring road
  ['checker', R(-203, 20, -191, 272)],    // west ring road
  ['pavers', R(-212, 20, -203, 272)],     // staff parking and restricted bays along the west wall
  ['checker', R(-130, 20, -120, 272)],    // inner road from the avenue, past the flag row, up between the residencies and Central Park
  ['checker', R(-191, 84, -130, 92)],     // cross road between Block A and Residency 1
  ['checker', R(-120, 84, -6, 92)],
  ['pavers', R(-191, 150, -140, 156)],    // the walk between Residency 1 and Residency 2
  ['checker', R(-120, 150, -6, 158)],     // path between the two lawns of Central Park
  ['plaza', R(-140, 20, -130, 84)],       // flag row along Block A
  ['striped', R(-56, 38, -36, 66)],       // drop-off under the white canopy
  ['plaza', R(-130, 44, -58, 60)],        // the plaza between Block B and Block C, under the skybridges
  ['plaza', R(-130, 28.5, -88, 33.5)],    // path under the skybridge from Block A to Block B
  ['pavers', R(-105.5, 60, -102.5, 66.2)], // path from the plaza to the flag circle
  ['pavers', R(-36, 49, -6, 55)],         // walk across the lawn to the east road
  ['plaza', R(-140, 136, -130, 156)],     // the Nescafé store and its tables
  ['plaza', R(-132.5, 94, -130, 136)],    // pavement in front of Pushpa Devi Dining Hall
  ['striped', R(-196, 170, -191, 194)],   // drop-off point by Residency 2 (girls hostel)
  ['striped', R(0, 80, 6, 93)],           // drop-off point by Residency-4 (boys hostel)
  ['concrete', R(6, 14, 11, 79)],         // walkway along the Residency-4 colonnade
  ['checker', R(6, 93, 11, 280)],         // apron along the courts, the Arena and the football ground
  ['asphalt', R(-460, -18, 200, -6)],     // road outside the wall, through Gate 1 and past the main entrance and Gate 2
  ['asphalt', R(-292, 4, -232, 52)],      // parking outside the west wall, by Gate 1
  ['asphalt', R(-268, -6, -256, 4)],      // its driveway
  ['asphalt', R(-150, -58, -40, -24)],    // parking south of the road
  ['asphalt', R(-100, -24, -88, -18)],    // its driveway
  ['pavers', R(-10, -6, 10, 0)],          // apron outside the gate
];

// the flag circle stands on the green between Block A and Block C, just north of the B-C plaza
export const FLAG_CIRCLE = { c: P(-104, 72.5), r: 6.5 };
export const COURTS = R(14, 98, 60, 156);          // both courts together (outline)
export const TENNIS = R(14, 98, 60, 125);          // lawn tennis
export const BASKETBALL = R(14, 129, 60, 156);     // basketball
export const FOOTBALL = R(14, 228, 62, 284);       // football ground, goals at the north and south ends
// glass skybridges (deck height y in metres): Block A to Block B on the 2nd floor, and Block B to
// Block C on the 1st and the 2nd floor, one above the other
export const SKYBRIDGES = [
  { along: 'x', a: -140, b: -88, c: -31, w: 4.6, y: 8.1, piers: [-134, -114, -101] },
  { along: 'z', a: -60, b: -44, c: -84, w: 5, y: 3.9 },
  { along: 'z', a: -60, b: -44, c: -84, w: 5, y: 7.8 },
];
export const NEEM = P(-24, 97);                    // the old neem tree in Central Park
export const ZONES = [                             // the bays along the west wall
  { kind: 'restricted', y0: 37, y1: 74 }, { kind: 'staff', y0: 89, y1: 162 },
  { kind: 'restricted', y0: 172, y1: 209 }, { kind: 'staff', y0: 227, y1: 270 },
];
export const GARDEN = { c: P(-22, -31), r: 8 };   // across the road from Gate 2, clear of the road

// the Damru fest
export const NORTH_GROUND = R(-120, 158, -6, 272);
export const MIDDLE_GROUND = R(-120, 92, -6, 150);
export const STAGE = { x: -63, z: -254, w: 40, d: 14, h: 1.8 };   // front edge faces south
export const STALL_ROWS = [
  { z: -108, face: 1 },    // south row, counters face north (towards the aisle)
  { z: -134, face: -1 },   // north row, counters face south
];
export const STALL_X = [-96, -87, -78, -48, -39, -30];   // gap in the middle for the tables
export const STALLS = [
  // [name, kind, colour] in order along the south row then the north row
  ['Pani Puri', 'food', '#f2b632'], ['Momos', 'food', '#e45b2a'], ['Ring Toss', 'game', '#2d8fd8'],
  ['Chaat Corner', 'food', '#d93b5a'], ['Balloon Darts', 'game', '#26a65b'], ['Kulfi', 'food', '#8e5bd8'],
  ['Vada Pav', 'food', '#e85d3f'], ['Tin Can Knock', 'game', '#1e88e5'], ['Maggi Point', 'food', '#f2c200'],
  ['Photo Booth', 'game', '#ab47bc'], ['Jalebi', 'food', '#ffa000'], ['Merch', 'game', '#c62828'],
];
export const DHOL = P(-63, 176);          // dhol troupe and dance circle at the way into the north ground
export const REG_DESK = P(-11, 26);       // wristband desk on the forecourt

export const PLACES = [
  { id: 'gate', name: 'Gate 2 (Main Gate)', x: 0, z: -8, r: 9,
    info: 'The main gate, next to the tall brick tower with a figure laid in the brickwork. Tonight it is hung with marigolds under the DAMRU \'26 arch.' },
  { id: 'res4', name: 'Residency-4 (Boys Hostel)', x: 6, z: -48, r: 9,
    info: 'The boys hostel: the long brick block just inside the gate, with glass shopfronts behind its brick colonnade, the tall tower and the drop-off point at its north end.' },
  { id: 'tennis', name: 'Lawn Tennis Court', x: 8, z: -111, r: 9,
    info: 'The blue tennis court on the east side, fenced and lit by floodlights for the evening.' },
  { id: 'basket', name: 'Basketball Court', x: 8, z: -142, r: 9,
    info: 'The red basketball court next to the tennis court, with a hoop at each end.' },
  { id: 'arena', name: 'Learners Arena', x: 6, z: -186, r: 11,
    info: 'Brick reliefs of athletes across its walls and a black canopy with downlights over the stone ground floor.' },
  { id: 'chai', name: 'Chai Adda', x: 8, z: -212, r: 7,
    info: 'The tea stop at the north-west corner of the Learners Arena, with tables out on the walk.' },
  { id: 'football', name: 'Football Ground', x: 8, z: -256, r: 12,
    info: 'The football ground in the north-east corner, with goals at both ends and floodlights.' },
  { id: 'blockB', name: 'Block B (Library & Main Audi)', x: -50, z: -30, r: 8,
    info: 'The library and the main auditorium: four storeys of red brick with white jali screens, linked to Block A by a glass skybridge on the 2nd floor and to Block C by two, on the 1st and 2nd floors.' },
  { id: 'dropoff', name: 'Drop-off Canopy', x: -47, z: -52, r: 7,
    info: 'The white canopy on grey steel columns where the cars drop students between Block B and Block C.' },
  { id: 'blockC', name: 'Block C', x: -54, z: -74, r: 8,
    info: 'The tall jali tower, six storeys of brick and white screens above a glass ground floor.' },
  { id: 'circle', name: 'Flag Circle', x: -104, z: -72.5, r: 10,
    info: 'The round lawn with the national flag on the green between Block A and Block C, just off the plaza.' },
  { id: 'blockA', name: 'Block A', x: -137, z: -30, r: 8,
    info: 'Glass ground floor with brick storeys above, and the row of flags along its front. Its south end is restricted to staff.' },
  { id: 'atrium', name: 'A-Block Dining Hall & Atrium', x: -126, z: -73, r: 8,
    info: 'The dining hall at the north end of Block A and the glass atrium beside it.' },
  { id: 'pdhall', name: 'Pushpa Devi Dining Hall', x: -126, z: -112, r: 8,
    info: 'The dining hall along the east side of Residency 1, its glass front on the inner road.' },
  { id: 'res1', name: 'Residency 1', x: -125, z: -138, r: 7,
    info: 'The first of the three residencies up the west side: ten storeys of brick with grey concrete balconies.' },
  { id: 'nescafe', name: 'Nescafé', x: -135, z: -153, r: 5,
    info: 'The red Nescafé store at the north-east corner of Residency 1, its counter facing Residency 2, with tables outside under the lights.' },
  { id: 'res2', name: 'Residency 2 (Girls Hostel)', x: -125, z: -184, r: 8,
    info: 'The girls hostel: ten storeys of brick with grey concrete balconies, and the drop-off point on the west road.' },
  { id: 'res3', name: 'Residency 3', x: -125, z: -238, r: 9,
    info: 'The north-west corner of the campus, the last of the three residencies.' },
  { id: 'neem', name: 'Neem Tree', x: -24, z: -97, r: 7,
    info: 'The old neem tree in Central Park, with a round brick seat built round its trunk.' },
  { id: 'park', name: 'Central Park', x: -90, z: -154, r: 10,
    info: 'The two big lawns in the middle of the campus. Tonight the south lawn holds the food & game street and the north lawn the main stage.' },
  { id: 'stalls', name: 'Damru Food & Game Street', x: -63, z: -121, r: 13,
    info: 'Twelve stalls on the south lawn of Central Park under strings of lights: pani puri, momos, chaat, ring toss, darts and more.' },
  { id: 'stage', name: 'Damru Main Stage', x: -63, z: -226, r: 15,
    info: 'The main stage on the north lawn of Central Park: LED screen, light towers and the crowd waiting for the concert.' },
  { id: 'entrance', name: 'Main Entrance', x: -38, z: 12, r: 8,
    info: 'Where the road from Gate 1 turns in to Gate 2, under the main entrance sign.' },
  { id: 'gate1', name: 'Gate 1', x: -288, z: 12, r: 10,
    info: 'The far gate at the west end of the road outside the campus, with the parking beside it.' },
];

// fest missions: the stalls that hand out Damru passes (indices into STALLS)
export const PASS_STALLS = [1, 2, 4, 7, 9];
export const STAGE_FRONT = P(-63, 232);

// camel & e-cart race round the ring road, clockwise from the gate
export const RACE = {
  start: P(-2, 30),
  checkpoints: [P(-100, 14), P(-197, 30), P(-197, 150), P(-197, 270), P(-100, 278), P(0, 270), P(0, 150), P(0, 40)],
};

// paths the strolling students follow (game x, z)
export const ROUTES = [
  // through the skybridges (the third number is the height of the bridge floor)
  [[-138, -31.6, 8.1], [-114, -30.4, 8.1], [-90, -31.6, 8.1]],
  [[-84.6, -58.6, 3.9], [-83.4, -45.4, 3.9]],
  [[-83.4, -45.4, 7.8], [-84.6, -58.6, 7.8]],
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
  [-133, -151.1, 2],   // at the Nescafé counter
  [-24, -102, 3],      // on the seat under the neem tree
  [38, -250, 4],       // a kickabout on the football ground
  [-127, -112, 2],     // outside Pushpa Devi Dining Hall
  [-206, -216, 3],     // at the kiosk on the west street
  [-136, -50, 3],      // flag row along Block A
  [-43, -43, 3],       // drop-off canopy
  [-104, -52, 3],      // the plaza between Block B and Block C
  [6, -196, 2],        // in front of the Arena
];
