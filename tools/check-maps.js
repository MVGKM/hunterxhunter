// Sanity checks for map data: entities on walkable tiles, key points reachable.
// Usage: node tools/check-maps.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { window: {}, addEventListener() {}, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['core.js', 'world.js', 'maps.js']) {
  let src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  vm.runInContext(src, ctx, { filename: f });
}
const { MAPS, TILES } = ctx.HXH;
let errors = 0;
const fail = (m) => { errors++; console.log('  ✗ ' + m); };

const KEY_POINTS = {
  zaban: [[24, 4], [24, 10], [9, 21]],
  tunnel: [[48, 17], [12, 3]],
  swamp: [[51, 15], [53, 0], [36, 12]],
};

for (const [id, m] of Object.entries(MAPS)) {
  console.log(id + ' (' + m.grid[0].length + 'x' + m.grid.length + ')');
  const solid = (x, y) => !m.grid[y] || m.grid[y][x] === undefined || (TILES[m.grid[y][x]] || {}).solid;
  const solidProps = new Set(m.props.filter((p) => p.solid).map((p) => p.tx + ',' + p.ty));
  const check = (what, tx, ty) => { if (solid(tx, ty)) fail(what + ' at ' + tx + ',' + ty + " on solid tile '" + m.grid[ty][tx] + "'"); };
  check('spawn', m.spawn.tx, m.spawn.ty);
  m.npcs.forEach((n) => check('npc ' + n.id, n.tx, n.ty));
  m.enemies.forEach((e) => check('enemy ' + e.id, e.tx, e.ty));
  m.props.forEach((p) => check('prop ' + p.id, p.tx, p.ty));
  (m.hazards || []).forEach((h) => check('hazard', h.tx, h.ty));
  // BFS ignoring gates, treating solid props as walls.
  const seen = new Set([m.spawn.tx + ',' + m.spawn.ty]);
  const q = [[m.spawn.tx, m.spawn.ty]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (seen.has(k) || solid(nx, ny) || solidProps.has(k)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  for (const [x, y] of KEY_POINTS[id] || []) {
    const near = [[0, 0], [0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => seen.has(x + dx + ',' + (y + dy)));
    if (!near) fail('key point ' + x + ',' + y + ' unreachable from spawn');
  }
  m.enemies.forEach((e) => { if (!seen.has(e.tx + ',' + e.ty)) fail('enemy ' + e.id + ' unreachable'); });
}
console.log(errors ? errors + ' problem(s)' : 'All map checks passed');
process.exit(errors ? 1 : 0);
