// Typewriter dialogue box with portraits and multiple-choice prompts.
(function () {
  'use strict';
  const HXH = window.HXH;
  const I = HXH.input;

  const SPEAKERS = {
    gon: { name: 'Gon', look: 'gon', color: '#5ad16a' },
    killua: { name: 'Killua', look: 'killua', color: '#b9d4ff' },
    kurapika: { name: 'Kurapika', look: 'kurapika', color: '#f0cd62' },
    leorio: { name: 'Leorio', look: 'leorio', color: '#8aa6e0' },
    hisoka: { name: 'Hisoka', look: 'hisoka', color: '#ff7ac0' },
    satotz: { name: 'Satotz', look: 'satotz', color: '#b59aff' },
    fakesatotz: { name: '"Examiner"', look: 'fakesatotz', color: '#c9a07a' },
    ape: { name: 'Man-faced Ape', look: 'ape', color: '#c9a07a' },
    tonpa: { name: 'Tonpa', look: 'tonpa', color: '#d6b07a' },
    beans: { name: 'Beans', look: 'beans', color: '#8ad67a' },
    navigator: { name: 'Navigator', look: 'navigator', color: '#d0a0e0' },
    cook: { name: 'Cook', look: 'cook', color: '#f0f0f0' },
    todo: { name: 'Todo', look: 'todo', color: '#e08a7a' },
    pokkle: { name: 'Pokkle', look: 'pokkle', color: '#e0c07a' },
    thug: { name: 'Applicant Hunter', look: 'thug', color: '#e08a7a' },
    villager: { name: 'Townsperson', look: 'villager', color: '#ddd' },
    villager2: { name: 'Shopkeeper', look: 'villager2', color: '#ddd' },
    fisher: { name: 'Fisherman', look: 'fisher', color: '#ddd' },
    examinee: { name: 'Examinee', look: 'examinee', color: '#ddd' },
    examinee2: { name: 'Examinee', look: 'examinee2', color: '#ddd' },
    narrator: { name: '', look: null, color: '#fff' },
    tip: { name: 'TIP', look: null, color: '#ffe25a' },
  };

  const D = (HXH.dialog = {
    active: null,

    say(speaker, text) {
      return new Promise((res) => this.open({ speaker, text, res }));
    },

    // Resolves with the selected option index.
    choose(speaker, text, options) {
      return new Promise((res) => this.open({ speaker, text, options, res, sel: 0 }));
    },

    open(d) {
      d.shown = 0;
      d.t = 0;
      d.blip = 0;
      this.active = d;
      I.consume('confirm');
    },

    update(dt) {
      const d = this.active;
      if (!d) return;
      d.t += dt;
      const full = d.shown >= d.text.length;
      if (!full) {
        const before = Math.floor(d.shown);
        d.shown = Math.min(d.text.length, d.shown + dt * 55);
        if (Math.floor(d.shown) !== before && (d.blip = (d.blip + 1) % 3) === 0 && d.text[before] !== ' ') HXH.audio.sfx('blip');
      }
      if (d.options && full) {
        if (I.pressed('up')) {
          d.sel = (d.sel + d.options.length - 1) % d.options.length;
          HXH.audio.sfx('select');
        }
        if (I.pressed('down')) {
          d.sel = (d.sel + 1) % d.options.length;
          HXH.audio.sfx('select');
        }
      }
      if (I.pressed('confirm') && d.t > 0.12) {
        I.consume('confirm');
        I.consume('attack');
        if (!full) d.shown = d.text.length;
        else {
          this.active = null;
          HXH.audio.sfx('select');
          d.res(d.options ? d.sel : undefined);
        }
      }
    },

    draw(ctx) {
      const d = this.active;
      if (!d) return;
      const S = SPEAKERS[d.speaker] || { name: d.speaker, look: null, color: '#fff' };
      const W = HXH.VIEW_W, H = HXH.VIEW_H;
      const bh = d.options ? 150 + d.options.length * 26 : 150;
      const bx = 40, by = H - bh - 20, bw = W - 80;
      ctx.save();
      ctx.fillStyle = 'rgba(12,14,24,0.92)';
      HXH.render.roundRect(ctx, bx, by, bw, bh, 12);
      ctx.fill();
      ctx.strokeStyle = S.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      let tx = bx + 24;
      if (S.look) {
        const ps = 104;
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        HXH.render.roundRect(ctx, bx + 18, by + 22, ps, ps, 8);
        ctx.fill();
        HXH.render.drawPortrait(ctx, S.look, bx + 18, by + 22, ps);
        tx = bx + 18 + ps + 22;
      }
      if (S.name) {
        ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
        ctx.fillStyle = S.color;
        ctx.textAlign = 'left';
        ctx.fillText(S.name, tx, by + 36);
      }
      ctx.font = (d.speaker === 'narrator' ? 'italic ' : '') + '18px "Trebuchet MS", sans-serif';
      ctx.fillStyle = '#f2f2f2';
      const lines = HXH.wrapText(ctx, d.text.slice(0, Math.floor(d.shown)), bw - (tx - bx) - 30);
      lines.forEach((ln, i) => ctx.fillText(ln, tx, by + (S.name ? 64 : 44) + i * 24));
      const full = d.shown >= d.text.length;
      if (d.options && full) {
        const oy = by + bh - d.options.length * 26 - 16;
        d.options.forEach((opt, i) => {
          const sel = i === d.sel;
          ctx.fillStyle = sel ? 'rgba(255,226,90,0.15)' : 'transparent';
          ctx.fillRect(tx - 8, oy + i * 26 - 17, bw - (tx - bx) - 20, 24);
          ctx.fillStyle = sel ? '#ffe25a' : '#bbb';
          ctx.fillText((sel ? '▶ ' : '   ') + opt, tx, oy + i * 26);
        });
      } else if (full && Math.floor(d.t * 3) % 2 === 0) {
        ctx.fillStyle = S.color;
        ctx.textAlign = 'right';
        ctx.fillText('▼', bx + bw - 20, by + bh - 16);
      }
      ctx.restore();
    },
  });

  HXH.SPEAKERS = SPEAKERS;
  D.SPEAKERS = SPEAKERS;
})();
