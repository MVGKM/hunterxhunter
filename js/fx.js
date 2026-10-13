// Particles, floating combat text and screen shake.
(function () {
  'use strict';
  const HXH = window.HXH;
  const U = HXH.util;

  const fx = (HXH.fx = {
    parts: [],
    texts: [],
    shake: 0,
    flash: 0,
    flashColor: '#fff',

    reset() {
      this.parts.length = 0;
      this.texts.length = 0;
      this.shake = 0;
      this.flash = 0;
    },

    burst(x, y, color, n = 10, speed = 120, life = 0.5, size = 3, grav = 0) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
        this.parts.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - grav * 0.3,
          life: life * (0.6 + Math.random() * 0.4), max: life, color, size: size * (0.6 + Math.random() * 0.6), grav,
        });
      }
    },

    // Sparks travelling mostly in one direction (hit impacts).
    spray(x, y, angle, color, n = 8, speed = 220) {
      for (let i = 0; i < n; i++) {
        const a = angle + U.rand(-0.6, 0.6), s = speed * U.rand(0.4, 1);
        this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3, max: 0.3, color, size: U.rand(2, 4), grav: 0 });
      }
    },

    text(x, y, str, color = '#fff', size = 16) {
      this.texts.push({ x, y, str, color, size, life: 1, vy: -40 });
    },

    addShake(v) {
      this.shake = Math.max(this.shake, v);
    },

    screenFlash(color = '#fff', v = 0.5) {
      this.flashColor = color;
      this.flash = Math.max(this.flash, v);
    },

    update(dt) {
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.parts.splice(i, 1);
          continue;
        }
        p.vy += p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= p.grav ? 1 : 0.92;
      }
      for (let i = this.texts.length - 1; i >= 0; i--) {
        const t = this.texts[i];
        t.life -= dt * 0.9;
        t.y += t.vy * dt;
        t.vy *= 0.95;
        if (t.life <= 0) this.texts.splice(i, 1);
      }
      this.shake = Math.max(0, this.shake - dt * 30);
      this.flash = Math.max(0, this.flash - dt * 2);
    },

    draw(ctx) {
      for (const p of this.parts) {
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      for (const t of this.texts) {
        ctx.globalAlpha = Math.min(1, t.life * 2);
        ctx.font = 'bold ' + t.size + 'px "Trebuchet MS", sans-serif';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.strokeText(t.str, t.x, t.y);
        ctx.fillStyle = t.color;
        ctx.fillText(t.str, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    },
  });
})();
