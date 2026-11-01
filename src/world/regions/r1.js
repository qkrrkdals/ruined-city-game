// Region 1 — Residential district (day, tutorial). z: 120..266
import { bld } from '../buildings.js';
import { groundTiles, groundBoxes, road, sidewalk, tree, lamp, car, wire, CAR_COLORS } from '../streets.js';
import { buildHouse, buildStore, buildGarage, buildGate, buildPlayground, buildPark, buildBusStop } from './r1_places.js';

export function buildR1(k) {
  const P = k.pal, R = k.rand;
  const roads = [[-6, 120, 6, 266], [-80, 222, -6, 230], [6, 222, 80, 230], [-80, 168, -6, 176], [6, 168, 80, 176]];
  const walks = [[-10, 120, -6, 168], [-10, 176, -6, 222], [-10, 230, -6, 266], [6, 120, 10, 168], [6, 176, 10, 222], [6, 230, 10, 266],
    [-80, 220, -10, 222], [-80, 230, -10, 232], [10, 220, 80, 222], [10, 230, 80, 232], [-80, 166, -10, 168], [-80, 176, -10, 178], [10, 166, 80, 168], [10, 176, 80, 178]];
  const hole = [16, 148, 20, 160];
  groundTiles(k, -80, 120, 80, 266, P.ground, [...roads, ...walks, hole, [-26, 236, -14, 246], [12, 198, 26, 212]], { dry: P.dry });
  groundBoxes(k, -80, 120, 80, 266, [hole]);
  roads.forEach((r) => road(k, r, P));
  walks.forEach((w) => sidewalk(k, w, P));
  // lots: grass everywhere free (occupancy keeps it out of buildings)
  [[-80, 232, -10, 266], [10, 232, 80, 266], [-80, 178, -10, 220], [10, 178, 80, 220], [-80, 120, -10, 166], [10, 120, 80, 166]].forEach((r) => k.green(r[0], r[1], r[2], r[3], { d: 0.85, flowers: 0.12, tall: 0.04 }));

  buildHouse(k); buildStore(k); buildGarage(k); buildGate(k); buildPlayground(k); buildPark(k); buildBusStop(k);

  // ---- buildings (rect x0,z0,x1,z1, floors, front face)
  const H = (x0, z0, x1, z1, fl, face, o) => bld(k, x0, z0, x1, z1, fl, face, o);
  // block A-W (south-west)
  H(-50, 234, -38, 245, 2, 'n', { style: 'house' }); H(-64, 234, -53, 247, 3, 'n'); H(-79, 233, -67, 250, 4, 'n', { style: 'apt', ruin: 0.6 });
  H(-34, 254, -22, 265, 3, 'n'); H(-20, 252, -11, 264, 2, 'e', { style: 'house' }); H(-50, 254, -37, 265, 2, 'n', { style: 'house' }); H(-66, 253, -53, 265, 3, 'n'); H(-79, 253, -68, 265, 4, 'n');
  // block A-E
  H(11, 233, 22, 245, 2, 'w', { style: 'house' }); H(26, 233, 38, 246, 3, 'n'); H(42, 233, 52, 243, 2, 'n', { style: 'house', tilt: [0.03, -0.02] }); H(56, 233, 79, 250, 4, 'n', { style: 'apt' });
  H(11, 249, 25, 264, 3, 'w'); H(29, 251, 43, 265, 2, 'n', { style: 'house' }); H(47, 250, 61, 265, 3, 'n', { ruin: 0.8 }); H(65, 253, 79, 265, 2, 'n', { style: 'house' });
  // block B-W (playground + park take most of it)
  H(-21, 180, -11, 191, 2, 'e', { style: 'house', blind: [3] }); H(-21, 196, -11, 206, 1, 'e', { style: 'shop', sign: 'signs.laundry' }); H(-21, 210, -11, 219, 2, 'e', { style: 'house' });
  // block B-E
  H(12, 180, 24, 194, 2, 'w', { style: 'house' }); H(30, 180, 42, 192, 2, 'n', { style: 'house' }); H(46, 180, 58, 195, 3, 'n'); H(62, 180, 79, 198, 4, 'n', { style: 'apt', ruin: 0.5 });
  H(30, 205, 44, 219, 2, 's', { style: 'house' }); H(48, 206, 60, 219, 2, 's', { style: 'house' }); H(64, 203, 79, 219, 3, 's');
  // block C-W
  H(-23, 124, -11, 138, 3, 'e'); H(-40, 125, -28, 139, 2, 'n', { style: 'house', ruin: 0.9 }); H(-56, 124, -44, 142, 4, 'n', { ruin: 0.75 }); H(-79, 124, -60, 146, 3, 'n');
  H(-23, 146, -11, 165, 2, 'e', { style: 'house' }); H(-42, 150, -28, 165, 3, 's'); H(-60, 150, -46, 165, 2, 's', { style: 'house' }); H(-79, 152, -64, 165, 3, 's');
  // block C-E: apartment complex (3단지) over the garage
  H(24, 126, 70, 140, 5, 's', { style: 'apt', ruin: 0.3, sign: null }); H(24, 148, 70, 162, 5, 'n', { style: 'apt', ruin: 0.55 }); H(71, 128, 79, 160, 3, 'w');
  k.green(24, 140, 70, 148, { d: 0.9, flowers: 0.15, tall: 0.12 });

  // ---- street trees, lamps, poles + wires
  for (let z = 128; z < 264; z += 14) {
    if (Math.abs(z - 172) < 8 || Math.abs(z - 226) < 8) continue;
    if (R() < 0.8) tree(k, -8, z + R() * 2, R() < 0.3 ? 'treeC' : 'treeA');
    if (R() < 0.8) tree(k, 8, z + 7 + R() * 2, R() < 0.3 ? 'treeC' : 'treeA');
  }
  for (let z = 132; z < 262; z += 20) { lamp(k, -9.2, z, 0); lamp(k, 9.2, z + 10, Math.PI); }
  let prev = null;
  for (let x = -76; x <= 76; x += 19) {
    if (Math.abs(x) < 12) { prev = null; continue; }
    k.add('pole', { x, y: 0, z: 220.9, ry: 0, rz: R() < 0.2 ? 0.08 : 0 }); k.col.addBox(x, 4, 220.9, 0.3, 8, 0.3);
    if (prev !== null) for (const dx of [-0.75, 0, 0.75]) wire(k.geo, [prev, 7.5, 220.9 + dx * 0.02], [x, 7.5, 220.9], 0.6 + R() * 0.4);
    prev = x;
  }
  // ---- stopped cars
  const cars = [[-2.5, 250, 0.1], [3, 236, 3.0], [-3, 205, -0.3], [2.6, 190, 3.3], [-1, 158, 1.2], [3.2, 140, 2.9], [-3, 128, 0.05], [-40, 226, 1.62], [-62, 224.5, 1.5], [33, 226, 4.6], [55, 227, 1.7], [-28, 171, 1.4], [44, 172, 4.8], [40, 144, 0.3], [62, 145, 1.4]];
  cars.forEach(([x, z, ry]) => car(k, x, z, ry, CAR_COLORS[Math.floor(R() * CAR_COLORS.length)]));
  // debris scatter on roads
  for (let i = 0; i < 40; i++) { const x = -70 + R() * 140, z = 124 + R() * 140; k.add('rock', { x, y: 0.05, z, ry: R() * 6, s: 0.12 + R() * 0.3, c: R() < 0.5 ? '#c9bfb4' : '#b8b0a8' }); }
  k.zone({ id: 'r1', kind: 'outdoor', box: [-200, -1, 120, 200, 200, 400] });
}
