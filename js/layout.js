// Where everything is, in metres. The layout follows the official Rishihood campus map (ARAMBH),
// turned so Gate 2 sits in the south-east corner: the map's top row (Residency 1, 2 and 3, Pushpa
// Devi Dining Hall and the Nescafé store) runs up the west side here, its bottom row (Residency-4,
// the tennis and basketball courts, the Learners Arena with Chai Adda, the football ground) up the
// east side, Central Park with the neem tree in the middle, and Blocks A, B and C round the Atrium
// along the south, with Gate 1 and the parking outside on the road. The look of each building
// comes from the campus videos.
// Map x = east, map y = north, origin at the middle of Gate 2. Game space: x = east, z = south.

/** Map rectangle (x0, y0, x1, y1 with y north) to game rectangle {x0, z0, x1, z1}. */
export const R = (x0, y0, x1, y1, extra = {}) => ({ x0, z0: -y1, x1, z1: -y0, ...extra });
/** Map point to game [x, z]. */
export const P = (x, y) => [x, -y];

// the east side (Gate 2, the east road and the row of Residency-4, the courts, the Learners Arena and
// the football ground) sits close to Blocks B and C, as on the ARAMBH map
export const WALL = { x0: -212, z0: -290, x1: 34, z1: 0, gateX0: -38, gateX1: -26 };

// player just inside Gate 2 facing north; the camel and the e-cart wait either side of the forecourt
export const SPAWN = { player: [-32, -6, Math.PI], camel: [-27, -15, Math.PI], cart: [-41, -14, -Math.PI / 2] };

export const BUILDINGS = {
  // the small security guard cabin just inside Gate 2
  cabin: R(-25.5, 0.6, -21, 4.4, { h: 3.0 }),
  // east side, across the road from Blocks B and C: Residency-4 by Gate 2, in one line with the
  // courts, the Learners Arena and the football ground (as on the ARAMBH map); it faces the drop-off
  // canopy at the end of the passage between Block B and Block C
  res4: R(-20, 14, 10, 78, { floors: 10, fh: 3.3 }),
  arena: R(-20, 162, 30, 222, { h: 16, base: 5.6 }),
  // round the Atrium, the paved courtyard with the national flag (as in the campus photos): Block A
  // on its west side (seven storeys, a stone colonnade on the Atrium), and only 24 m across it Block B
  // to the south-east and Block C to the north-east (four storeys each), either side of the passage
  // to the drop-off
  blockA: R(-186, 26, -140, 80, { floors: 7, fh: 3.9 }),
  // B and C are long blocks reaching towards the east road, as on the ARAMBH map
  blockB: R(-116, 24, -62, 44, { floors: 4, fh: 3.9 }),
  blockC: R(-116, 60, -62, 83, { floors: 4, fh: 3.9 }),
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
  ['forecourt', R(-46, 0, -18, 22)],
  ['checker', R(-203, 8, -46, 20)],       // south ring road (the avenue)
  ['checker', R(-38, 22, -26, 284)],      // east ring road
  ['pavers', R(-203, 272, -38, 284)],     // north ring road
  ['checker', R(-203, 20, -191, 272)],    // west ring road
  ['pavers', R(-212, 20, -203, 272)],     // staff parking and restricted bays along the west wall
  ['checker', R(-130, 84, -120, 272)],    // inner road from the Atrium, up between the residencies and Central Park
  ['checker', R(-191, 84, -130, 92)],     // cross road between Block A and Residency 1
  ['checker', R(-120, 84, -38, 92)],
  ['pavers', R(-191, 150, -140, 156)],    // the walk between Residency 1 and Residency 2
  ['checker', R(-120, 150, -38, 158)],    // path between the two lawns of Central Park
  ['atrium', R(-140, 20, -116, 84)],      // the Atrium: light grey tiles with dark granite bands
  ['atrium', R(-116, 44, -48, 60)],       // the passage between Block B and Block C, under the skybridges, on to the drop-off
  ['striped', R(-48, 38, -38, 66)],       // drop-off under the canopy, across the road from Residency-4
  ['plaza', R(-140, 136, -130, 156)],     // the Nescafé store and its tables
  ['plaza', R(-132.5, 94, -130, 136)],    // pavement in front of Pushpa Devi Dining Hall
  ['striped', R(-196, 170, -191, 194)],   // drop-off point by Residency 2 (girls hostel)
  ['striped', R(-32, 80, -26, 93)],       // drop-off point by Residency-4 (boys hostel)
  ['concrete', R(-26, 14, -21, 79)],      // walkway along the Residency-4 colonnade
  ['checker', R(-26, 93, -21, 280)],         // apron along the courts, the Arena and the football ground
  ['asphalt', R(-460, -18, 200, -6)],     // road outside the wall, through Gate 1 and past the main entrance and Gate 2
  ['asphalt', R(-292, 4, -232, 52)],      // parking outside the west wall, by Gate 1
  ['asphalt', R(-268, -6, -256, 4)],      // its driveway
  ['asphalt', R(-150, -58, -40, -24)],    // parking south of the road
  ['asphalt', R(-100, -24, -88, -18)],    // its driveway
  ['pavers', R(-42, -6, -22, 0)],         // apron outside the gate
];

// the national flag stands on a granite planter in the Atrium, in front of the skybridges between
// Block B and Block C; straight north of it stone steps go down into a sunken court to the stone jali wall
export const FLAG = { c: P(-124, 52), h: 28 };
export const COURTS = R(-18, 98, 28, 156);         // both courts together (outline)
export const TENNIS = R(-18, 98, 28, 125);         // lawn tennis
export const BASKETBALL = R(-18, 129, 28, 156);    // basketball
export const FOOTBALL = R(-18, 228, 30, 284);       // football ground, goals at the north and south ends
// open skybridges with solid stone parapets (floor height y in metres): Block A to Block B on the
// 2nd floor, open to the sky, and Block B to Block C on the 1st and the 2nd floor, one above the
// other, the upper one under a roof with a railing round it
export const SKYBRIDGES = [
  { along: 'x', a: -140, b: -116, c: -31, w: 5, y: 7.8 },
  { along: 'z', a: -60, b: -44, c: -110, w: 8, y: 3.9 },
  { along: 'z', a: -60, b: -44, c: -110, w: 8, y: 7.8, roof: true },
];
export const NEEM = P(-56, 97);                    // the old neem tree in Central Park
export const ZONES = [                             // the bays along the west wall
  { kind: 'restricted', y0: 37, y1: 74 }, { kind: 'staff', y0: 89, y1: 162 },
  { kind: 'restricted', y0: 172, y1: 209 }, { kind: 'staff', y0: 227, y1: 270 },
];
export const GARDEN = { c: P(-54, -31), r: 8 };   // across the road from Gate 2, clear of the road

// the Damru fest
export const NORTH_GROUND = R(-120, 158, -38, 272);
export const MIDDLE_GROUND = R(-120, 92, -38, 150);
export const STAGE = { x: -79, z: -254, w: 40, d: 14, h: 1.8 };   // front edge faces south
export const STALL_ROWS = [
  { z: -108, face: 1 },    // south row, counters face north (towards the aisle)
  { z: -134, face: -1 },   // north row, counters face south
];
export const STALL_X = [-108, -100, -92, -66, -58, -50];   // gap in the middle for the tables
export const STALLS = [
  // [name, kind, colour] in order along the south row then the north row
  ['Pani Puri', 'food', '#f2b632'], ['Momos', 'food', '#e45b2a'], ['Ring Toss', 'game', '#2d8fd8'],
  ['Chaat Corner', 'food', '#d93b5a'], ['Balloon Darts', 'game', '#26a65b'], ['Kulfi', 'food', '#8e5bd8'],
  ['Vada Pav', 'food', '#e85d3f'], ['Tin Can Knock', 'game', '#1e88e5'], ['Maggi Point', 'food', '#f2c200'],
  ['Photo Booth', 'game', '#ab47bc'], ['Jalebi', 'food', '#ffa000'], ['Merch', 'game', '#c62828'],
];
export const DHOL = P(-79, 176);          // dhol troupe and dance circle at the way into the north ground
export const REG_DESK = P(-43, 26);       // wristband desk on the forecourt

export const PLACES = [
  { id: 'gate', name: 'Gate 2 (Main Gate)', x: -32, z: -8, r: 9,
    info: 'The main gate, with the small security guard cabin just inside it. Tonight it is hung with marigolds under the DAMRU \'26 arch.' },
  { id: 'res4', name: 'Residency-4 (Boys Hostel)', x: -26, z: -48, r: 9,
    info: 'The boys hostel by Gate 2: ten storeys of grey panels between tall brick piers, with glass shopfronts under its long balcony, facing the drop-off canopy of Blocks B and C across the road.' },
  { id: 'tennis', name: 'Lawn Tennis Court', x: -24, z: -111, r: 9,
    info: 'The blue tennis court on the east side, fenced and lit by floodlights for the evening.' },
  { id: 'basket', name: 'Basketball Court', x: -24, z: -142, r: 9,
    info: 'The red basketball court next to the tennis court, with a hoop at each end.' },
  { id: 'arena', name: 'Learners Arena', x: -26, z: -186, r: 11,
    info: 'Brick reliefs of athletes across its walls and a black canopy with downlights over the stone ground floor.' },
  { id: 'chai', name: 'Chai Adda', x: -24, z: -212, r: 7,
    info: 'The tea stop at the north-west corner of the Learners Arena, with tables out on the walk.' },
  { id: 'football', name: 'Football Ground', x: -24, z: -256, r: 12,
    info: 'The football ground in the north-east corner, with goals at both ends and floodlights.' },
  { id: 'blockB', name: 'Block B (Library & Main Audi)', x: -58, z: -14, r: 8,
    info: 'The library and the main auditorium: four storeys of brick with big windows. At its Atrium corner stand five flags in front of the tree painting, and the red #ApproachingRishihood sign faces Block C. A stone skybridge links it to Block A on the 2nd floor, and two link it to Block C on the 1st and 2nd floors.' },
  { id: 'dropoff', name: 'Drop-off Canopy', x: -43, z: -52, r: 7,
    info: 'The canopy on grey steel columns at the end of the passage between Block B and Block C, where the cars drop students, across the road from Residency-4.' },
  { id: 'blockC', name: 'Block C', x: -60, z: -87, r: 8,
    info: 'Four storeys of brick. On the Atrium side it has three tall stone jali panels, and brick towers rise above its roof. Next to it, stone steps with water channels go down into a sunken court to the jali wall.' },
  { id: 'flag', name: 'National Flag', x: -124, z: -52, r: 7,
    info: 'The tall white flagpole with the national flag, on its granite planter in the Atrium, in front of the skybridges to Block C.' },
  { id: 'blockA', name: 'Block A', x: -137, z: -30, r: 8,
    info: 'Seven storeys. The lower two are beige stone, with a colonnade of stone pillars and the mountain painting on the Atrium side; brick above. The A-Block Dining Hall is inside, and its south end is restricted to staff.' },
  { id: 'atrium', name: 'Atrium', x: -132, z: -56, r: 9,
    info: 'The paved courtyard between Blocks A, B and C: the national flag, the Pillar of Rishihood, frangipani trees in granite planters, and stone steps with water channels going down into a sunken court to the stone jali wall.' },
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
  { id: 'neem', name: 'Neem Tree', x: -56, z: -97, r: 7,
    info: 'The old neem tree in Central Park, with a round brick seat built round its trunk.' },
  { id: 'park', name: 'Central Park', x: -86, z: -154, r: 10,
    info: 'The two big lawns in the middle of the campus. Tonight the south lawn holds the food & game street and the north lawn the main stage.' },
  { id: 'stalls', name: 'Damru Food & Game Street', x: -79, z: -121, r: 13,
    info: 'Twelve stalls on the south lawn of Central Park under strings of lights: pani puri, momos, chaat, ring toss, darts and more.' },
  { id: 'stage', name: 'Damru Main Stage', x: -79, z: -226, r: 15,
    info: 'The main stage on the north lawn of Central Park: LED screen, light towers and the crowd waiting for the concert.' },
  { id: 'entrance', name: 'Main Entrance', x: -70, z: 12, r: 8,
    info: 'Where the road from Gate 1 turns in to Gate 2, under the main entrance sign.' },
  { id: 'gate1', name: 'Gate 1', x: -288, z: 12, r: 10,
    info: 'The far gate at the west end of the road outside the campus, with the parking beside it.' },
];

// fest missions: the stalls that hand out Damru passes (indices into STALLS)
export const PASS_STALLS = [1, 2, 4, 7, 9];
export const STAGE_FRONT = P(-79, 232);

// camel & e-cart race round the ring road, clockwise from the gate
export const RACE = {
  start: P(-34, 30),
  checkpoints: [P(-100, 14), P(-197, 30), P(-197, 150), P(-197, 270), P(-100, 278), P(-32, 270), P(-32, 150), P(-32, 40)],
};

// paths the strolling students follow (game x, z)
export const ROUTES = [
  // through the skybridges (the third number is the height of the bridge floor)
  [[-138, -31.6, 7.8], [-128, -30.4, 7.8], [-118, -31.6, 7.8]],
  [[-112.6, -58.6, 3.9], [-111.4, -45.4, 3.9]],
  [[-111.4, -45.4, 7.8], [-112.6, -58.6, 7.8]],
  [[-50, -12], [-110, -12], [-190, -12]],
  [[-185, -16], [-110, -16], [-48, -16]],
  [[-197, -40], [-197, -150], [-197, -260]],
  [[-125, -95], [-125, -170], [-125, -265]],
  [[-125, -262], [-125, -200], [-125, -100]],
  [[-34, -40], [-34, -130], [-34, -260]],
  [[-30, -258], [-30, -150], [-30, -36]],
  [[-110, -277], [-70, -277], [-42, -277]],
  [[-112, -121], [-79, -121], [-46, -121]],
  [[-46, -120], [-79, -122], [-110, -120]],
  [[-134, -57], [-96, -53], [-60, -52], [-43, -52], [-34, -30]],
  [[-150, -88], [-80, -88], [-44, -88]],
];

// people standing about: [x, z, count]
export const GROUPS = [
  [-24, -7, 1],        // guard at the security cabin
  [-24, -90, 4],         // at the Residency-4 drop-off point
  [-133, -151.1, 2],   // at the Nescafé counter
  [-56, -102, 3],      // on the seat under the neem tree
  [6, -250, 4],       // a kickabout on the football ground
  [-127, -112, 2],     // outside Pushpa Devi Dining Hall
  [-206, -216, 3],     // at the kiosk on the west street
  [-130, -48, 3],      // in the Atrium by Block A
  [-54, -50, 3],       // drop-off canopy
  [-129, -58, 3],      // in the Atrium by the flag
  [-26, -196, 2],      // in front of the Arena
];
