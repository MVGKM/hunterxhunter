// Chapter 1 maps. Built with small drawing helpers (rect / dot / scatter) so
// layouts are easy to tweak. Entity positions are in tile coordinates.
(function () {
  'use strict';
  const HXH = window.HXH;

  function grid(w, h, ch) {
    const g = [];
    for (let y = 0; y < h; y++) g.push(new Array(w).fill(ch));
    return g;
  }
  function rect(g, x, y, w, h, ch) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (g[yy] && xx >= 0 && xx < g[0].length) g[yy][xx] = ch;
  }
  function dots(g, list, ch) {
    for (const [x, y] of list) g[y][x] = ch;
  }
  function frame(g, ch) {
    const w = g[0].length, h = g.length;
    rect(g, 0, 0, w, 1, ch);
    rect(g, 0, h - 1, w, 1, ch);
    rect(g, 0, 0, 1, h, ch);
    rect(g, w - 1, 0, 1, h, ch);
  }
  // Seeded scatter of `ch` onto tiles currently equal to `on`, avoiding reserved rects.
  function scatter(g, ch, on, count, seed, avoid = []) {
    let s = seed >>> 0;
    const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    const w = g[0].length, h = g.length;
    let placed = 0, tries = 0;
    while (placed < count && tries++ < count * 50) {
      const x = 1 + Math.floor(rnd() * (w - 2)), y = 1 + Math.floor(rnd() * (h - 2));
      if (g[y][x] !== on) continue;
      if (avoid.some(([ax, ay, aw, ah]) => x >= ax && x < ax + aw && y >= ay && y < ay + ah)) continue;
      g[y][x] = ch;
      placed++;
    }
  }

  // ------------------------------------------------------------ Zaban City
  function zaban() {
    const g = grid(48, 28, '.');
    frame(g, '#');
    rect(g, 1, 1, 20, 8, 'B');
    rect(g, 28, 1, 19, 8, 'B');
    rect(g, 21, 1, 7, 2, 'B'); // the diner
    rect(g, 21, 3, 7, 6, 'a'); // back alley
    rect(g, 1, 13, 46, 4, '_');
    rect(g, 1, 20, 12, 3, ',');
    rect(g, 14, 20, 20, 3, 'B');
    rect(g, 38, 20, 9, 3, 'B');
    rect(g, 1, 23, 46, 4, '~');
    rect(g, 5, 20, 3, 7, '=');
    rect(g, 34, 23, 4, 2, '=');
    dots(g, [[4, 12], [10, 12], [16, 12], [32, 12], [38, 12], [44, 12], [2, 17], [45, 17], [2, 20], [2, 22], [12, 20]], 'T');
    dots(g, [[13, 10], [35, 10], [36, 10], [44, 18], [45, 18], [21, 4], [27, 6]], 'c');
    return g;
  }

  // ------------------------------------------------- Exam hall + tunnel
  function tunnel() {
    const g = grid(72, 22, '#');
    rect(g, 1, 1, 20, 20, 'f');
    rect(g, 5, 5, 2, 2, '#');
    rect(g, 14, 5, 2, 2, '#');
    rect(g, 5, 14, 2, 2, '#');
    rect(g, 14, 14, 2, 2, '#');
    rect(g, 21, 9, 24, 4, 'f');
    rect(g, 41, 2, 4, 11, 'f');
    rect(g, 45, 2, 22, 4, 'f');
    rect(g, 63, 6, 4, 14, 'f');
    rect(g, 48, 16, 15, 4, 'f');
    rect(g, 48, 16, 2, 4, 'S');
    rect(g, 28, 9, 2, 2, 'x');
    rect(g, 33, 11, 2, 2, 'x');
    rect(g, 52, 2, 1, 4, 'x');
    rect(g, 58, 2, 1, 4, 'x');
    rect(g, 63, 10, 4, 1, 'x');
    rect(g, 63, 14, 4, 1, 'x');
    rect(g, 56, 16, 1, 4, 'x');
    return g;
  }

  // -------------------------------------------------- Milsy Wetlands
  function swamp() {
    const g = grid(64, 44, 'w');
    frame(g, '#');
    rect(g, 10, 30, 12, 5, '~');
    rect(g, 30, 33, 10, 8, '~');
    rect(g, 3, 13, 9, 7, '~');
    rect(g, 24, 15, 10, 7, '~');
    rect(g, 45, 20, 7, 9, '~');
    rect(g, 14, 4, 8, 4, '~');
    rect(g, 15, 30, 2, 5, '=');
    rect(g, 24, 18, 10, 1, '=');
    rect(g, 18, 37, 8, 3, 'm');
    rect(g, 36, 25, 6, 5, 'm');
    rect(g, 22, 8, 7, 3, 'm');
    rect(g, 54, 30, 6, 4, 'm');
    dots(g, [[24, 35], [12, 26], [38, 14], [40, 10], [20, 24], [9, 36], [30, 28], [56, 34], [36, 5], [27, 12], [44, 36]], 'g');
    // Hisoka's clearing (arena) in the north-east.
    rect(g, 44, 1, 19, 15, ',');
    rect(g, 43, 1, 1, 16, 'T');
    rect(g, 43, 16, 20, 1, 'T');
    rect(g, 50, 16, 3, 1, ',');
    rect(g, 52, 0, 3, 1, ',');
    dots(g, [[47, 5], [58, 5], [48, 11], [57, 11]], 'r');
    rect(g, 1, 42, 3, 1, 'S');
    const avoid = [[1, 34, 12, 9], [43, 0, 21, 18], [48, 17, 6, 3]];
    scatter(g, 'T', 'w', 70, 1337, avoid);
    scatter(g, 'r', 'w', 14, 4242, avoid);
    scatter(g, 'R', 'w', 90, 777, []);
    return g;
  }

  const P = (f) => f; // marker for flag predicates, for readability

  HXH.MAPS = {
    zaban: {
      id: 'zaban',
      name: 'Zaban City',
      sub: 'Hunter Exam — Day 1',
      music: 'city',
      grid: zaban(),
      spawn: { tx: 6, ty: 25 },
      npcs: [
        { id: 'leorio', look: 'leorio', tx: 9, ty: 21, face: 1 },
        { id: 'kurapika', look: 'kurapika', tx: 11, ty: 22, face: -1 },
        { id: 'navigator', look: 'navigator', tx: 24, ty: 10, face: 1 },
        { id: 'fisher', look: 'fisher', tx: 35, ty: 21, face: -1 },
        { id: 'villager', look: 'villager', tx: 40, ty: 10, face: -1 },
        { id: 'villager2', look: 'villager2', tx: 14, ty: 18, face: 1 },
      ],
      enemies: [
        { id: 'thug1', type: 'thug', tx: 23, ty: 5, group: 'alley', wakeFlag: 'alley_open' },
        { id: 'thug2', type: 'thug2', tx: 26, ty: 4, group: 'alley', wakeFlag: 'alley_open' },
      ],
      props: [
        { id: 'diner_door', kind: 'door', tx: 24, ty: 3, solid: true, label: 'Diner' },
        { id: 'sign_city', kind: 'sign', tx: 18, ty: 10, solid: true, label: 'Sign' },
        { id: 'sign_pier', kind: 'sign', tx: 8, ty: 19, solid: true, label: 'Sign' },
        { id: 'meat_city1', kind: 'meat', tx: 45, ty: 10 },
        { id: 'meat_city2', kind: 'meat', tx: 2, ty: 18 },
      ],
      gates: [{ id: 'alley_gate', tx: 21, ty: 8, tw: 7, th: 1, look: 'fence', closed: P((f) => !f.alley_open) }],
      triggers: [],
      hazards: [],
    },

    tunnel: {
      id: 'tunnel',
      name: 'Exam Hall — B100',
      sub: 'First Phase: Follow the Examiner',
      music: 'tunnel',
      grid: tunnel(),
      spawn: { tx: 10, ty: 2 },
      light: { dark: 0.55, radius: 250 },
      palette: { '#': { color: '#2a2830', top: '#3a3742' } },
      npcs: [
        { id: 'beans', look: 'beans', tx: 12, ty: 3, face: -1 },
        { id: 'tonpa', look: 'tonpa', tx: 6, ty: 9, face: 1 },
        { id: 'killua', look: 'killua', tx: 17, ty: 11, face: -1 },
        { id: 'kurapika', look: 'kurapika', tx: 3, ty: 17, face: 1 },
        { id: 'leorio', look: 'leorio', tx: 4, ty: 17, face: -1 },
        { id: 'hisoka', look: 'hisoka', tx: 18, ty: 18, face: -1 },
        { id: 'todo', look: 'todo', tx: 9, ty: 13, face: 1 },
        { id: 'pokkle', look: 'pokkle', tx: 12, ty: 17, face: -1 },
        { id: 'examineeA', look: 'examinee', tx: 3, ty: 4, face: 1 },
        { id: 'examineeB', look: 'examinee2', tx: 18, ty: 4, face: -1 },
      ],
      enemies: [
        { id: 'rogue1', type: 'examinee', tx: 37, ty: 11, group: 'tunnel', wakeFlag: 'tunnel_open' },
        { id: 'rogue2', type: 'examinee2', tx: 55, ty: 3, group: 'tunnel', wakeFlag: 'tunnel_open' },
        { id: 'rogue3', type: 'examinee', tx: 60, ty: 18, group: 'tunnel', wakeFlag: 'tunnel_open' },
      ],
      props: [
        { id: 'elevator', kind: 'elevator', tx: 10, ty: 1, solid: true, label: 'Elevator' },
        { id: 'meat_tunnel1', kind: 'meat', tx: 43, ty: 3 },
        { id: 'meat_tunnel2', kind: 'meat', tx: 66, ty: 19 },
      ],
      gates: [{ id: 'tunnel_gate', tx: 21, ty: 9, tw: 1, th: 4, look: 'stone', closed: P((f) => !f.tunnel_open) }],
      triggers: [{ id: 'tunnel_exit', tx: 48, ty: 16, tw: 2, th: 4 }],
      hazards: [[38, 10], [43, 6], [47, 4], [61, 3], [65, 8], [64, 12], [60, 17], [53, 18]].map(([tx, ty]) => ({ kind: 'rockfall', tx, ty })),
      satotzPath: [[19.5, 10.5], [24, 10.5], [42.5, 10.5], [42.5, 3.5], [64.5, 3.5], [64.5, 17.5], [51.5, 17.5]],
    },

    swamp: {
      id: 'swamp',
      name: 'Milsy Wetlands',
      sub: "Swindlers' Swamp",
      music: 'swamp',
      grid: swamp(),
      spawn: { tx: 3, ty: 41 },
      wallStyle: 'forest',
      treeColor: '#284f2a',
      palette: { '#': { color: '#1a2a1a', top: '#1f331f' }, T: { color: '#4e6b3c' } },
      fog: { radius: 230, color: '200,214,196', alpha: 0.72 },
      npcs: [
        { id: 'satotz', look: 'satotz', tx: 7, ty: 38, face: 1, when: P((f) => !f.swamp_intro_done) },
        { id: 'fakesatotz', look: 'fakesatotz', tx: 11, ty: 39, face: -1, when: P((f) => !f.swamp_intro_done) },
        { id: 'hisoka_intro', look: 'hisoka', tx: 2, ty: 37, face: 1, when: P((f) => !f.swamp_intro_done) },
        { id: 'leorio_hurt', look: 'leorio', tx: 47, ty: 9, face: 1, lying: true, when: P((f) => !f.hisoka_done) },
        { id: 'leorio_up', look: 'leorio', tx: 52, ty: 3, face: 1, when: P((f) => f.hisoka_done) },
      ],
      enemies: [
        { id: 'ape1', type: 'ape', tx: 20, ty: 27, group: 'swamp' },
        { id: 'ape2', type: 'ape', tx: 36, ty: 31, group: 'swamp' },
        { id: 'ape3', type: 'ape', tx: 12, ty: 10, group: 'swamp' },
        { id: 'ape4', type: 'ape', tx: 54, ty: 36, group: 'swamp' },
        { id: 'frog1', type: 'frog', tx: 17, ty: 22, group: 'swamp' },
        { id: 'frog2', type: 'frog', tx: 41, ty: 17, group: 'swamp' },
        { id: 'frog3', type: 'frog', tx: 30, ty: 11, group: 'swamp' },
        { id: 'frog4', type: 'frog', tx: 58, ty: 24, group: 'swamp' },
      ],
      props: [
        { id: 'meat_swamp1', kind: 'meat', tx: 26, ty: 26 },
        { id: 'meat_swamp2', kind: 'meat', tx: 42, ty: 32 },
        { id: 'meat_swamp3', kind: 'meat', tx: 8, ty: 10 },
        { id: 'meat_swamp4', kind: 'meat', tx: 41, ty: 21 },
        { id: 'meat_swamp5', kind: 'meat', tx: 51, ty: 18 },
        { id: 'campfire', kind: 'campfire', tx: 36, ty: 11, solid: true, label: 'Campfire' },
      ],
      gates: [
        { id: 'arena_gate', tx: 50, ty: 16, tw: 3, th: 1, look: 'barrier', closed: P((f) => f.hisoka_fight && !f.hisoka_done) },
        { id: 'forest_gate', tx: 52, ty: 1, tw: 3, th: 1, look: 'fence', closed: P((f) => !f.hisoka_done) },
      ],
      triggers: [
        { id: 'swamp_mid', tx: 33, ty: 8, tw: 6, th: 7 },
        { id: 'arena', tx: 50, ty: 14, tw: 3, th: 2 },
        { id: 'swamp_exit', tx: 52, ty: 0, tw: 3, th: 1 },
      ],
      hazards: [],
      boss: { type: 'hisoka', tx: 54, ty: 7 },
    },
  };

  // Clear scattered trees/rocks that landed on or right next to a placed entity.
  (function clearAroundEntities(def) {
    const spots = [def.spawn, ...def.npcs, ...def.enemies, ...def.props];
    for (const e of spots) {
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = e.tx + dx, y = e.ty + dy, row = def.grid[y];
        const inArena = x >= 43 && y <= 16; // arena walls and cover rocks are deliberate
        if (row && !inArena && (row[x] === 'T' || row[x] === 'r')) row[x] = 'w';
      }
    }
  })(HXH.MAPS.swamp);
})();
