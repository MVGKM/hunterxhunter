// Core namespace, math helpers, game-time timers, storage and keyboard input.
(function () {
  'use strict';
  const HXH = (window.HXH = window.HXH || {});

  HXH.TILE = 32;
  HXH.VIEW_W = 960;
  HXH.VIEW_H = 540;

  HXH.util = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    angleDiff(a, b) {
      let d = b - a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return d;
    },
    // Deterministic 0..1 noise per tile, used for decorative variation.
    hash(x, y) {
      let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
    },
    pointSegDist(px, py, ax, ay, bx, by) {
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
      return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
    },
    fmtTime(sec) {
      sec = Math.max(0, Math.floor(sec));
      const m = Math.floor(sec / 60), s = sec % 60;
      return m + ':' + (s < 10 ? '0' : '') + s;
    },
  };

  // Timers advance with game time, so cutscenes pause along with the game.
  const timers = [];
  HXH.wait = (sec) => new Promise((res) => timers.push({ t: sec, res }));
  HXH.tickTimers = (dt) => {
    for (let i = timers.length - 1; i >= 0; i--) {
      timers[i].t -= dt;
      if (timers[i].t <= 0) {
        const r = timers[i].res;
        timers.splice(i, 1);
        r();
      }
    }
  };

  HXH.store = {
    get(key) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : null;
      } catch (e) {
        return null;
      }
    },
    set(key, val) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch (e) { /* storage unavailable: progress just isn't saved */ }
    },
    del(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) { /* ignore */ }
    },
  };

  HXH.wrapText = function (ctx, text, maxW) {
    const out = [];
    for (const para of String(text).split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxW && line) {
          out.push(line);
          line = word;
        } else line = test;
      }
      out.push(line);
    }
    return out;
  };

  // ---------------------------------------------------------------- input
  const held = new Set();
  const pressed = new Set();
  const BIND = {
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    attack: ['KeyJ', 'Space', 'Mouse0'],
    dodge: ['KeyK', 'ShiftLeft', 'ShiftRight', 'Mouse2'],
    interact: ['KeyE', 'Enter'],
    confirm: ['Enter', 'Space', 'KeyE', 'KeyJ', 'Mouse0'],
    back: ['Escape', 'Backspace'],
    pause: ['Escape', 'KeyP'],
    stats: ['Tab', 'KeyI'],
    mute: ['KeyM'],
  };
  const BLOCK_DEFAULT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);

  addEventListener('keydown', (e) => {
    if (BLOCK_DEFAULT.has(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    held.add(e.code);
    HXH.audio && HXH.audio.unlock();
  });
  addEventListener('keyup', (e) => held.delete(e.code));
  addEventListener('blur', () => held.clear());

  HXH.input = {
    down: (a) => BIND[a].some((c) => held.has(c)),
    pressed: (a) => BIND[a].some((c) => pressed.has(c)),
    consume: (a) => BIND[a].forEach((c) => pressed.delete(c)),
    endFrame: () => pressed.clear(),
    attachMouse(canvas) {
      canvas.addEventListener('mousedown', (e) => {
        const code = 'Mouse' + e.button;
        pressed.add(code);
        held.add(code);
        HXH.audio && HXH.audio.unlock();
      });
      addEventListener('mouseup', (e) => held.delete('Mouse' + e.button));
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    },
  };
})();
