// Tile map: definitions, pre-rendering, collision queries and area lighting.
(function () {
  'use strict';
  const HXH = window.HXH;
  const U = HXH.util;
  const T = HXH.TILE;

  // solid: blocks walking. shot: blocks projectiles. Colors may be overridden per map palette.
  const TILES = {
    '#': { solid: true, shot: true, color: '#3a3a4a', top: '#4d4d62' }, // wall / cliff
    'B': { solid: true, shot: true, color: '#8a6a52', top: '#a3413a' }, // building
    '.': { color: '#b9ae9a' }, // paving
    '_': { color: '#5b5a5e' }, // road
    'a': { color: '#77706a' }, // alley
    ',': { color: '#5f9a48' }, // grass
    'T': { solid: true, shot: true, color: '#5f9a48' }, // tree
    '~': { solid: true, water: true, color: '#2f6fa8' }, // water
    '=': { color: '#9a6b3e' }, // planks / bridge
    'c': { solid: true, shot: true, color: '#b9ae9a' }, // crate
    'f': { color: '#4a4652' }, // tunnel floor
    'x': { color: '#4a4652', spikes: true }, // spike trap
    'S': { color: '#6a6672', stairs: true }, // stairs
    'w': { color: '#4e6b3c' }, // wetland grass
    'm': { color: '#5a4630', mud: true }, // mud (slows)
    'g': { color: '#4e6b3c', gas: true }, // poison gas vent
    'R': { color: '#4e6b3c', reeds: true }, // reeds (decor)
    'r': { solid: true, shot: true, color: '#4e6b3c' }, // boulder
  };

  class World {
    constructor(def) {
      this.def = def;
      this.grid = def.grid;
      this.h = this.grid.length;
      this.w = this.grid[0].length;
      this.pw = this.w * T;
      this.ph = this.h * T;
      this.palette = def.palette || {};
      this.time = 0;
      this.animTiles = [];
      this.prerender();
    }

    tile(tx, ty) {
      if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return '#';
      return this.grid[ty][tx];
    }
    tileAtPx(x, y) {
      return this.tile(Math.floor(x / T), Math.floor(y / T));
    }
    info(ch) {
      return TILES[ch] || TILES['.'];
    }
    solidTile(tx, ty) {
      return !!this.info(this.tile(tx, ty)).solid;
    }
    blocksShot(x, y) {
      return !!this.info(this.tileAtPx(x, y)).shot;
    }
    rectHitsTiles(x0, y0, x1, y1) {
      const tx0 = Math.floor(x0 / T), ty0 = Math.floor(y0 / T), tx1 = Math.floor((x1 - 0.01) / T), ty1 = Math.floor((y1 - 0.01) / T);
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (this.solidTile(tx, ty)) return true;
      return false;
    }
    // Spike traps cycle globally: 1.1s down, 0.9s up (with a short warning wobble).
    spikePhase() {
      const p = (this.time % 2.0) / 2.0;
      if (p < 0.45) return 'down';
      if (p < 0.55) return 'warn';
      return 'up';
    }

    colorOf(ch, key = 'color') {
      const pal = this.palette[ch];
      if (pal && pal[key]) return pal[key];
      return this.info(ch)[key];
    }

    prerender() {
      const c = document.createElement('canvas');
      c.width = this.pw;
      c.height = this.ph;
      const ctx = c.getContext('2d');
      for (let ty = 0; ty < this.h; ty++) {
        for (let tx = 0; tx < this.w; tx++) {
          const ch = this.grid[ty][tx];
          const x = tx * T, y = ty * T, n = U.hash(tx, ty);
          const info = this.info(ch);
          ctx.fillStyle = this.colorOf(ch);
          ctx.fillRect(x, y, T, T);
          // subtle noise
          ctx.fillStyle = n > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
          ctx.fillRect(x + ((n * 97) % 20), y + ((n * 53) % 20), 8, 6);
          this.drawTileDetail(ctx, ch, tx, ty, x, y, n);
          if (info.water || info.gas || info.spikes) this.animTiles.push([tx, ty, ch]);
        }
      }
      // Wall faces: darken the bottom of solid tiles above walkable ones for depth.
      for (let ty = 0; ty < this.h - 1; ty++) {
        for (let tx = 0; tx < this.w; tx++) {
          const ch = this.grid[ty][tx], below = this.grid[ty + 1][tx];
          if ((ch === '#' || ch === 'B') && !this.info(below).solid) {
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(tx * T, (ty + 1) * T, T, 5);
          }
        }
      }
      this.canvas = c;
    }

    drawTileDetail(ctx, ch, tx, ty, x, y, n) {
      const top = this.colorOf(ch, 'top');
      switch (ch) {
        case '#': {
          ctx.fillStyle = top;
          ctx.fillRect(x, y, T, T - 8);
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(x + (n * 20) | 0, y + 6, 10, 2);
          ctx.fillRect(x + 4, y + 16, 12, 2);
          if (this.def.wallStyle === 'forest') {
            ctx.fillStyle = '#1f3320';
            HXH.render.circle(ctx, x + 16, y + 12, 15);
            ctx.fillStyle = '#2c4a2a';
            HXH.render.circle(ctx, x + 10 + n * 10, y + 8, 7);
          }
          break;
        }
        case 'B': {
          const above = this.tile(tx, ty - 1), below = this.tile(tx, ty + 1);
          ctx.fillStyle = above === 'B' ? '#7b5c46' : top;
          ctx.fillRect(x, y, T, T);
          if (above !== 'B') {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            for (let i = 0; i < 4; i++) ctx.fillRect(x, y + 4 + i * 8, T, 2);
          } else if (below !== 'B') {
            // facade: window
            ctx.fillStyle = '#6a4c38';
            ctx.fillRect(x, y, T, T);
            ctx.fillStyle = n > 0.4 ? '#f1d27a' : '#2b3442';
            ctx.fillRect(x + 9, y + 6, 14, 14);
            ctx.fillStyle = '#4a3426';
            ctx.fillRect(x + 15, y + 6, 2, 14);
          } else {
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(x, y + 15, T, 2);
          }
          break;
        }
        case '.':
          ctx.strokeStyle = 'rgba(0,0,0,0.08)';
          ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
          break;
        case '_':
          if (ty % 4 === 1 && tx % 3 === 0) {
            ctx.fillStyle = '#d8d2a0';
            ctx.fillRect(x + 4, y + T - 2, 18, 4);
          }
          break;
        case ',':
        case 'w':
        case 'R':
          ctx.fillStyle = ch === ',' ? '#4f8a3c' : '#3e5a30';
          for (let i = 0; i < 3; i++) ctx.fillRect(x + ((n * 31 + i * 11) % 28), y + ((n * 17 + i * 13) % 26), 2, 5);
          if (ch === 'R') {
            ctx.strokeStyle = '#7a8a3a';
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
              ctx.beginPath();
              ctx.moveTo(x + 6 + i * 6, y + T);
              ctx.lineTo(x + 4 + i * 6 + n * 4, y + 6 + (i % 2) * 5);
              ctx.stroke();
            }
          }
          break;
        case 'T':
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath();
          ctx.ellipse(x + 16, y + 26, 13, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#6b4a2a';
          ctx.fillRect(x + 13, y + 14, 6, 12);
          ctx.fillStyle = this.def.treeColor || '#2f6a2a';
          HXH.render.circle(ctx, x + 16, y + 10, 13);
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          HXH.render.circle(ctx, x + 12, y + 6, 6);
          break;
        case 'r':
          ctx.fillStyle = '#6d6a62';
          ctx.beginPath();
          ctx.ellipse(x + 16, y + 18, 14, 11, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#8a877e';
          ctx.beginPath();
          ctx.ellipse(x + 12, y + 14, 7, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case '=':
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          for (let i = 0; i < 4; i++) ctx.fillRect(x, y + i * 8 + 7, T, 1);
          ctx.fillRect(x, y, 2, T);
          ctx.fillRect(x + T - 2, y, 2, T);
          break;
        case 'c':
          ctx.fillStyle = '#a0723e';
          ctx.fillRect(x + 3, y + 3, T - 6, T - 6);
          ctx.strokeStyle = '#6a4a26';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 4, y + 4, T - 8, T - 8);
          ctx.beginPath();
          ctx.moveTo(x + 4, y + 4);
          ctx.lineTo(x + T - 4, y + T - 4);
          ctx.stroke();
          break;
        case 'f':
          ctx.strokeStyle = 'rgba(0,0,0,0.15)';
          ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
          break;
        case 'S':
          for (let i = 0; i < 4; i++) {
            ctx.fillStyle = i % 2 ? '#57535f' : '#7a7684';
            ctx.fillRect(x, y + i * 8, T, 8);
          }
          break;
        case 'm':
          ctx.fillStyle = '#4a3824';
          HXH.render.circle(ctx, x + 8 + n * 14, y + 10, 4);
          HXH.render.circle(ctx, x + 22, y + 22 - n * 6, 3);
          break;
        case 'g':
          ctx.fillStyle = '#3a3a2a';
          ctx.beginPath();
          ctx.ellipse(x + 16, y + 18, 11, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#6a5a8a';
          ctx.beginPath();
          ctx.ellipse(x + 16, y + 18, 7, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        default:
          break;
      }
    }

    // Animated overlays (water ripples, gas, spikes) for visible tiles only.
    drawAnimated(ctx, cam) {
      const t = this.time;
      const x0 = cam.x - T, y0 = cam.y - T, x1 = cam.x + HXH.VIEW_W + T, y1 = cam.y + HXH.VIEW_H + T;
      const spikes = this.spikePhase();
      for (const [tx, ty, ch] of this.animTiles) {
        const x = tx * T, y = ty * T;
        if (x < x0 || x > x1 || y < y0 || y > y1) continue;
        if (ch === '~') {
          ctx.strokeStyle = 'rgba(255,255,255,0.18)';
          ctx.lineWidth = 2;
          const o = Math.sin(t * 2 + tx * 0.7 + ty) * 4;
          ctx.beginPath();
          ctx.moveTo(x + 4 + o, y + 10);
          ctx.lineTo(x + 14 + o, y + 10);
          ctx.moveTo(x + 16 - o, y + 22);
          ctx.lineTo(x + 26 - o, y + 22);
          ctx.stroke();
        } else if (ch === 'g') {
          for (let i = 0; i < 3; i++) {
            const p = (t * 0.6 + i / 3 + U.hash(tx, ty)) % 1;
            ctx.fillStyle = 'rgba(170,110,210,' + (0.45 * (1 - p)) + ')';
            HXH.render.circle(ctx, x + 16 + Math.sin(t * 2 + i) * 6, y + 18 - p * 34, 5 + p * 10);
          }
        } else if (ch === 'x') {
          const h = spikes === 'up' ? 10 : spikes === 'warn' ? 3 : 0;
          ctx.fillStyle = '#2e2b33';
          for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) ctx.fillRect(x + 5 + i * 9, y + 7 + j * 9, 4, 3);
          if (h) {
            ctx.fillStyle = spikes === 'up' ? '#c9c9d4' : '#8a8a96';
            for (let i = 0; i < 3; i++) {
              for (let j = 0; j < 3; j++) {
                const sx = x + 7 + i * 9, sy = y + 10 + j * 9;
                ctx.beginPath();
                ctx.moveTo(sx - 3, sy);
                ctx.lineTo(sx, sy - h);
                ctx.lineTo(sx + 3, sy);
                ctx.fill();
              }
            }
          }
        }
      }
    }
  }

  HXH.TILES = TILES;
  HXH.World = World;
})();
