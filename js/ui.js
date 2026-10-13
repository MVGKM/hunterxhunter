// HUD, menus, banners and full-screen panels (all drawn on the canvas).
(function () {
  'use strict';
  const HXH = window.HXH;
  const R = HXH.render;
  const W = HXH.VIEW_W, H = HXH.VIEW_H;
  const FONT = '"Trebuchet MS", sans-serif';

  function panel(ctx, x, y, w, h, stroke) {
    ctx.fillStyle = 'rgba(10,12,22,0.82)';
    R.roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function bar(ctx, x, y, w, h, frac, color, back = 'rgba(0,0,0,0.6)') {
    ctx.fillStyle = back;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * Math.min(1, frac)), h - 2);
  }

  function text(ctx, str, x, y, size = 16, color = '#fff', align = 'left', weight = '') {
    ctx.font = weight + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  const CONTROLS = [
    ['Move', 'WASD / Arrow keys'],
    ['Attack (3-hit combo)', 'J / Space / Left click'],
    ['Dodge roll (i-frames)', 'K / Shift / Right click'],
    ['Talk / Interact', 'E / Enter'],
    ['Character sheet', 'Tab / I'],
    ['Pause', 'Esc / P'],
    ['Mute music & sound', 'M'],
  ];

  const UI = (HXH.ui = {
    drawHUD(g, ctx) {
      const p = g.player, s = p.stats;
      // player panel
      panel(ctx, 14, 14, 270, 78);
      ctx.save();
      ctx.beginPath();
      ctx.arc(46, 52, 26, 0, Math.PI * 2);
      ctx.fillStyle = '#20402a';
      ctx.fill();
      ctx.clip();
      R.drawPortrait(ctx, 'gon', 18, 24, 56);
      ctx.restore();
      text(ctx, 'GON', 82, 34, 15, '#7ef08e', 'left', 'bold');
      text(ctx, 'Lv ' + s.level, 274, 34, 13, '#ffe25a', 'right', 'bold');
      bar(ctx, 82, 41, 192, 13, s.hp / s.maxHp, s.hp / s.maxHp < 0.3 ? '#ff4a3a' : '#e8473a');
      text(ctx, Math.ceil(s.hp) + ' / ' + s.maxHp, 178, 51.5, 10, '#fff', 'center', 'bold');
      bar(ctx, 82, 58, 192, 8, s.sta / s.maxSta, s.sta >= 30 ? '#f2c23a' : '#8a7a3a');
      bar(ctx, 82, 71, 192, 5, s.xp / p.xpNext, '#5ab4ff');
      text(ctx, 'XP', 82, 88, 9, '#9fd0ff');
      if (p.poison > 0) text(ctx, 'POISONED ' + Math.ceil(p.poison) + 's', 274, 88, 10, '#b8e05a', 'right', 'bold');

      // objective
      if (g.objective) {
        ctx.font = '14px ' + FONT;
        const lines = HXH.wrapText(ctx, g.objective, 280);
        const h = 34 + lines.length * 18;
        panel(ctx, W - 320, 14, 306, h, g.objectiveFlash > 0 ? '#ffe25a' : null);
        text(ctx, 'OBJECTIVE', W - 306, 34, 11, '#ffe25a', 'left', 'bold');
        lines.forEach((ln, i) => text(ctx, ln, W - 306, 54 + i * 18, 14, '#eee'));
      }

      // marathon timer
      if (g.timer) {
        const tt = g.timer.t, warn = tt < 15;
        panel(ctx, W / 2 - 110, 14, 220, 52, warn ? '#ff5a4a' : null);
        text(ctx, g.timer.label, W / 2, 33, 11, '#bbb', 'center', 'bold');
        text(ctx, HXH.util.fmtTime(tt), W / 2, 58, 24, warn && Math.floor(tt * 4) % 2 ? '#ff5a4a' : '#fff', 'center', 'bold');
      }

      // boss bar
      const b = g.boss;
      if (b && b.active) {
        panel(ctx, W / 2 - 200, H - 70, 400, 52, '#ff7ac0');
        text(ctx, 'HISOKA', W / 2 - 185, H - 48, 16, '#ff7ac0', 'left', 'bold');
        text(ctx, 'Land clean hits during his openings', W / 2 - 185, H - 29, 11, '#ccc');
        for (let i = 0; i < b.hitsNeeded; i++) {
          const x = W / 2 + 90 + i * 34;
          ctx.save();
          ctx.translate(x, H - 44);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = i < b.hits ? '#ffe25a' : 'rgba(255,255,255,0.15)';
          ctx.fillRect(-9, -9, 18, 18);
          ctx.strokeStyle = '#ffe25a';
          ctx.strokeRect(-9, -9, 18, 18);
          ctx.restore();
        }
      }

      // toasts
      g.toasts.forEach((t, i) => {
        const a = Math.min(1, t.t * 3, (t.life - t.t) * 2);
        ctx.globalAlpha = Math.max(0, a);
        ctx.font = 'bold 14px ' + FONT;
        const w = ctx.measureText(t.text).width + 30;
        panel(ctx, W / 2 - w / 2, 80 + i * 40, w, 32, '#5ab4ff');
        text(ctx, t.text, W / 2, 101 + i * 40, 14, '#fff', 'center', 'bold');
        ctx.globalAlpha = 1;
      });

      // controls hint
      if (g.showHints && !HXH.dialog.active && !g.cut) {
        text(ctx, 'WASD move · J attack · K dodge · E talk · Tab stats · Esc pause', 18, H - 14, 12, 'rgba(255,255,255,0.55)');
      }
    },

    drawInteractPrompt(ctx, target, label) {
      const x = target.x, y = target.y - (target.kind ? 30 : 58);
      const bob = Math.sin(performance.now() / 200) * 2;
      ctx.font = 'bold 12px ' + FONT;
      const w = ctx.measureText(label).width + 34;
      panel(ctx, x - w / 2, y - 18 + bob, w, 22, '#ffe25a');
      ctx.fillStyle = '#ffe25a';
      ctx.fillRect(x - w / 2 + 5, y - 14 + bob, 15, 14);
      text(ctx, 'E', x - w / 2 + 12.5, y - 3 + bob, 11, '#111', 'center', 'bold');
      text(ctx, label, x - w / 2 + 26, y - 3 + bob, 12, '#fff', 'left', 'bold');
    },

    drawBanner(g, ctx) {
      const b = g.banner;
      if (!b) return;
      const a = Math.min(1, b.t * 2, (b.life - b.t) * 1.5);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, H / 2 - 70, W, 120);
      text(ctx, b.title, W / 2, H / 2 - 12, 38, '#fff', 'center', 'bold');
      if (b.sub) text(ctx, b.sub, W / 2, H / 2 + 26, 18, '#ffe25a', 'center');
      ctx.globalAlpha = 1;
    },

    drawTitle(g, ctx, t) {
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#0d2a1a');
      grd.addColorStop(1, '#05080c');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      // drifting aura particles
      for (let i = 0; i < 40; i++) {
        const x = (i * 97 + t * (10 + (i % 5) * 6)) % W, y = H - ((i * 53 + t * (20 + (i % 7) * 5)) % H);
        ctx.fillStyle = 'rgba(120,255,160,' + (0.08 + (i % 4) * 0.05) + ')';
        R.circle(ctx, x, y, 2 + (i % 3));
      }
      // the four
      const chars = [['kurapika', 300], ['gon', 420], ['killua', 540], ['leorio', 660]];
      chars.forEach(([c, x], i) => R.drawChar(ctx, c, x, 330, { scale: 2.6, t: t + i, face: x < 480 ? 1 : -1 }));
      R.drawChar(ctx, 'hisoka', 830, 300, { scale: 2.2, t, face: -1, alpha: 0.35 + Math.sin(t) * 0.1 });
      text(ctx, 'HUNTER × HUNTER', W / 2, 92, 54, '#fff', 'center', 'bold');
      text(ctx, 'Chapter 1 — The Hunter Exam', W / 2, 128, 20, '#7ef08e', 'center');
      const opts = this.titleOptions(g);
      opts.forEach((o, i) => {
        const sel = i === g.menuSel;
        text(ctx, (sel ? '▶  ' : '') + o.label, W / 2, 392 + i * 34, 22, sel ? '#ffe25a' : '#ccc', 'center', sel ? 'bold' : '');
      });
      text(ctx, 'Fan-made prototype · ↑↓ select · Enter confirm · M mute', W / 2, H - 18, 12, 'rgba(255,255,255,0.45)', 'center');
      if (g.showControls) this.drawControls(ctx);
    },

    titleOptions(g) {
      const o = [];
      if (g.hasSave()) o.push({ id: 'continue', label: 'Continue' });
      o.push({ id: 'new', label: 'New Game' });
      o.push({ id: 'controls', label: 'Controls' });
      return o;
    },

    pauseOptions() {
      return [
        { id: 'resume', label: 'Resume' },
        { id: 'controls', label: 'Controls' },
        { id: 'mute', label: HXH.audio.isMuted() ? 'Sound: OFF' : 'Sound: ON' },
        { id: 'checkpoint', label: 'Restart from checkpoint' },
        { id: 'title', label: 'Save & quit to title' },
      ];
    },

    drawPause(g, ctx) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);
      panel(ctx, W / 2 - 160, 120, 320, 280, '#7ef08e');
      text(ctx, 'PAUSED', W / 2, 165, 28, '#fff', 'center', 'bold');
      this.pauseOptions().forEach((o, i) => {
        const sel = i === g.menuSel;
        text(ctx, (sel ? '▶  ' : '') + o.label, W / 2, 215 + i * 36, 19, sel ? '#ffe25a' : '#ccc', 'center', sel ? 'bold' : '');
      });
      if (g.showControls) this.drawControls(ctx);
    },

    drawControls(ctx) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, H);
      panel(ctx, W / 2 - 250, 90, 500, 360, '#5ab4ff');
      text(ctx, 'CONTROLS', W / 2, 130, 24, '#fff', 'center', 'bold');
      CONTROLS.forEach(([a, k], i) => {
        text(ctx, a, W / 2 - 220, 175 + i * 32, 16, '#ddd');
        text(ctx, k, W / 2 + 220, 175 + i * 32, 16, '#ffe25a', 'right', 'bold');
      });
      text(ctx, 'Press any key to close', W / 2, 430, 13, '#999', 'center');
    },

    drawStats(g, ctx) {
      const p = g.player, s = p.stats;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, H);
      panel(ctx, 80, 50, W - 160, H - 100, '#7ef08e');
      R.drawChar(ctx, 'gon', 200, 300, { scale: 4, t: g.time });
      text(ctx, 'GON FREECSS', 330, 100, 26, '#7ef08e', 'left', 'bold');
      text(ctx, 'Rookie applicant #405 · Whale Island', 330, 124, 14, '#aaa');
      const rows = [
        ['Level', s.level],
        ['HP', Math.ceil(s.hp) + ' / ' + s.maxHp],
        ['Attack', s.atk],
        ['Stamina', Math.ceil(s.sta) + ' / ' + s.maxSta],
        ['Experience', s.xp + ' / ' + p.xpNext],
      ];
      rows.forEach(([k, v], i) => {
        text(ctx, k, 330, 165 + i * 28, 17, '#ddd');
        text(ctx, String(v), 560, 165 + i * 28, 17, '#fff', 'right', 'bold');
      });
      // Nen teaser (Phase 2)
      text(ctx, 'NEN', 620, 100, 20, '#c58aff', 'left', 'bold');
      text(ctx, 'Your aura is still sealed.', 620, 124, 14, '#aaa');
      const cats = ['Enhancement', 'Transmutation', 'Emission', 'Conjuration', 'Manipulation', 'Specialization'];
      cats.forEach((c, i) => {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 6, cx = 710 + Math.cos(a) * 70, cy = 240 + Math.sin(a) * 70;
        ctx.fillStyle = 'rgba(197,138,255,0.12)';
        R.circle(ctx, cx, cy, 22);
        text(ctx, '???', cx, cy + 5, 12, '#777', 'center', 'bold');
      });
      text(ctx, 'Six categories await. Awaken your aura', 710, 345, 12, '#999', 'center');
      text(ctx, 'in a later chapter.', 710, 361, 12, '#999', 'center');
      // exam log
      text(ctx, 'EXAM LOG', 330, 330, 16, '#ffe25a', 'left', 'bold');
      const st = g.stats;
      const log = [
        'Enemies defeated: ' + st.kills,
        'Openings exploited: ' + st.openings,
        'Time: ' + HXH.util.fmtTime(st.time),
      ];
      log.forEach((l, i) => text(ctx, l, 330, 356 + i * 22, 14, '#ccc'));
      text(ctx, 'Tab / Esc to close', W / 2, H - 66, 13, '#888', 'center');
    },

    drawGameOver(g, ctx) {
      const a = Math.min(1, g.overT * 1.5);
      ctx.fillStyle = 'rgba(40,0,0,' + a * 0.75 + ')';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = a;
      text(ctx, g.overTitle || 'YOU COLLAPSED', W / 2, H / 2 - 30, 44, '#ff5a4a', 'center', 'bold');
      text(ctx, g.overSub || 'Gon gets back up. A Hunter never gives up.', W / 2, H / 2 + 10, 18, '#eee', 'center');
      if (g.overT > 1) text(ctx, 'Press Enter to retry from the last checkpoint', W / 2, H / 2 + 60, 16, '#ffe25a', 'center');
      ctx.globalAlpha = 1;
    },

    drawChapterEnd(g, ctx) {
      const t = g.endT;
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#0d2a1a');
      grd.addColorStop(1, '#05080c');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = Math.min(1, t);
      text(ctx, 'CHAPTER 1 COMPLETE', W / 2, 80, 40, '#ffe25a', 'center', 'bold');
      text(ctx, 'First Phase passed — Gon reaches Biska Forest Park', W / 2, 112, 17, '#7ef08e', 'center');
      ['gon', 'killua', 'kurapika', 'leorio'].forEach((c, i) => R.drawChar(ctx, c, 330 + i * 100, 250, { scale: 2.2, t: g.time + i, face: 1 }));
      const st = g.stats, s = g.player.stats;
      const rows = [
        ['Final level', s.level],
        ['Enemies defeated', st.kills],
        ['Openings exploited', st.openings],
        ['Dodges', st.dodges],
        ['Times collapsed', st.deaths],
        ['Play time', HXH.util.fmtTime(st.time)],
      ];
      rows.forEach(([k, v], i) => {
        const delay = 0.5 + i * 0.25;
        if (t < delay) return;
        text(ctx, k, W / 2 - 160, 300 + i * 28, 17, '#ddd');
        text(ctx, String(v), W / 2 + 160, 300 + i * 28, 17, '#fff', 'right', 'bold');
      });
      if (t > 2.5) {
        text(ctx, 'Next: Chapter 2 — The Cooking Exam & Zevil Island · Nen awakening coming soon', W / 2, 490, 14, '#c58aff', 'center');
        text(ctx, 'Press Enter to return to the title screen', W / 2, 518, 14, '#999', 'center');
      }
      ctx.globalAlpha = 1;
    },
  });

  UI.panel = panel;
  UI.text = text;
})();
