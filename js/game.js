// Game state, map loading, update/draw loop, camera, lighting and menus.
(function () {
  'use strict';
  const HXH = window.HXH;
  const U = HXH.util;
  const I = HXH.input;
  const E = HXH.entities;
  const T = HXH.TILE;
  const W = HXH.VIEW_W, H = HXH.VIEW_H;
  const SAVE_KEY = 'hxh_save_v1';

  function freshStats() {
    return { time: 0, kills: 0, deaths: 0, damageTaken: 0, openings: 0, dodges: 0, levelUps: 0, hazardHits: 0 };
  }

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.light = document.createElement('canvas');
      this.light.width = W;
      this.light.height = H;
      this.state = 'title';
      this.menuSel = 0;
      this.time = 0;
      this.showControls = false;
      this.flags = {};
      this.stats = freshStats();
      this.player = new E.Player(this);
      this.cam = { x: 0, y: 0 };
      this.cut = 0;
      this.hitstop = 0;
      this.toasts = [];
      this.banner = null;
      this.objective = '';
      this.objectiveFlash = 0;
      this.timer = null;
      this.fade = 0;
      this.fadeTarget = 0;
      this.showHints = true;
      this.world = null;
      this.clearEntities();
      HXH.audio.music('title');
    }

    clearEntities() {
      this.npcs = [];
      this.enemies = [];
      this.props = [];
      this.gates = [];
      this.triggers = [];
      this.hazards = [];
      this.projectiles = [];
      this.sprites = [];
      this.boss = null;
    }

    // ------------------------------------------------------------ queries
    isLocked() {
      return this.cut > 0 || !!HXH.dialog.active || this.state !== 'play' || this.fade > 0.5;
    }

    blocked(x0, y0, x1, y1) {
      if (x0 < 0 || y0 < 0 || x1 > this.world.pw || y1 > this.world.ph) return true;
      if (this.world.rectHitsTiles(x0, y0, x1, y1)) return true;
      for (const g of this.gates) if (g.closed && x1 > g.x0 && x0 < g.x1 && y1 > g.y0 && y0 < g.y1) return true;
      for (const p of this.props) {
        if (!p.solid || p.dead) continue;
        const [a, b, c, d] = p.rect();
        if (x1 > a && x0 < c && y1 > b && y0 < d) return true;
      }
      return false;
    }

    targets() {
      const list = this.enemies.filter((e) => !e.dead);
      if (this.boss && this.boss.active) list.push(this.boss);
      return list;
    }

    npc(id) {
      return this.npcs.find((n) => n.id === id);
    }

    interactTarget() {
      const p = this.player;
      let best = null, bd = 50;
      for (const n of this.npcs) {
        if (n.hidden || !n.talkable) continue;
        const d = U.dist(p.x, p.y, n.x, n.y);
        if (d < bd) {
          best = n;
          bd = d;
        }
      }
      for (const pr of this.props) {
        if (!pr.interactive || pr.dead) continue;
        const d = U.dist(p.x, p.y, pr.x, pr.y + 10);
        if (d < bd + 4) {
          best = pr;
          bd = d;
        }
      }
      return best;
    }

    // ---------------------------------------------------------- lifecycle
    hasSave() {
      return !!HXH.store.get(SAVE_KEY);
    }

    newGame() {
      this.flags = {};
      this.stats = freshStats();
      this.player = new E.Player(this);
      this.objective = '';
      this.timer = null;
      this.state = 'play';
      this.loadMap('zaban');
      this.setCheckpoint();
      HXH.story.onEnterMap('zaban', { fresh: true });
    }

    continueGame() {
      const s = HXH.store.get(SAVE_KEY);
      if (!s) return this.newGame();
      this.flags = s.flags || {};
      this.stats = Object.assign(freshStats(), s.stats || {});
      this.player = new E.Player(this);
      Object.assign(this.player.stats, s.player || {});
      this.player.stats.hp = this.player.stats.maxHp;
      this.objective = s.objective || '';
      this.checkpoint = s.checkpoint;
      this.state = 'play';
      this.respawn(true);
    }

    save() {
      if (!this.checkpoint) return;
      HXH.store.set(SAVE_KEY, {
        flags: this.flags,
        stats: this.stats,
        player: this.player.stats,
        checkpoint: this.checkpoint,
        objective: this.objective,
      });
    }

    setCheckpoint(x = this.player.x, y = this.player.y, quiet = true) {
      this.checkpoint = { map: this.world.def.id, x, y };
      this.save();
      if (!quiet) this.toast('Checkpoint reached — progress saved');
    }

    loadMap(id, x, y) {
      const def = HXH.MAPS[id];
      const f = this.flags;
      this.world = new HXH.World(def);
      this.clearEntities();
      HXH.fx.reset();
      for (const n of def.npcs) if (!n.when || n.when(f)) this.npcs.push(new E.NPC(this, n));
      for (const e of def.enemies) if (!f['killed_' + e.id]) this.enemies.push(new E.Enemy(this, e));
      for (const p of def.props) if (!f['got_' + p.id]) this.props.push(new E.Prop(this, p));
      for (const gd of def.gates) this.gates.push(new E.Gate(this, gd));
      for (const h of def.hazards) this.hazards.push(new E.Rockfall(this, h));
      this.triggers = def.triggers.map((t) => ({ ...t, inside: false }));
      if (def.boss && def.boss.type === 'hisoka' && !f.hisoka_done) this.boss = new E.Hisoka(this, def.boss);
      const p = this.player;
      p.resetState();
      p.x = x != null ? x : (def.spawn.tx + 0.5) * T;
      p.y = y != null ? y : (def.spawn.ty + 0.7) * T;
      this.snapCamera();
      HXH.audio.music(def.music);
      this.areaTitle = { name: def.name, sub: def.sub, t: 0 };
    }

    respawn(fromSave) {
      const cp = this.checkpoint;
      HXH.story.onRespawn();
      this.timer = null;
      this.player.stats.hp = this.player.stats.maxHp;
      this.player.stats.sta = this.player.stats.maxSta;
      this.loadMap(cp.map, cp.x, cp.y);
      this.state = 'play';
      this.fade = 1;
      this.fadeTarget = 0;
      HXH.story.onEnterMap(cp.map, { respawn: true, fromSave });
    }

    onPlayerDeath() {
      this.stats.deaths++;
      this.overT = 0;
      this.overTitle = null;
      this.overSub = null;
      this.deathDelay = 1.1;
      HXH.fx.addShake(10);
      HXH.audio.sfx('boom');
    }

    failWith(title, sub) {
      this.player.state = 'dead';
      this.stats.deaths++;
      this.overT = 0;
      this.overTitle = title;
      this.overSub = sub;
      this.deathDelay = 0.4;
    }

    onEnemyKilled(e) {
      this.stats.kills++;
      this.flags['killed_' + e.id] = true;
      HXH.story.onEnemyKilled(e);
    }

    onBossDefeated(b) {
      HXH.story.onBossDefeated(b);
    }

    // ---------------------------------------------------- story helpers
    async scene(fn) {
      this.cut++;
      try {
        await fn();
      } finally {
        this.cut--;
      }
    }

    fadeTo(v, speed = 2.5) {
      this.fadeTarget = v;
      this.fadeSpeed = speed;
      return HXH.wait(Math.abs(v - this.fade) / speed + 0.05);
    }

    setObjective(text) {
      this.objective = text;
      this.objectiveFlash = 2;
      HXH.audio.sfx('objective');
    }

    toast(text, life = 3.2) {
      this.toasts.push({ text, t: 0, life });
      if (this.toasts.length > 3) this.toasts.shift();
    }

    showBanner(title, sub, life = 3) {
      this.banner = { title, sub, t: 0, life };
    }

    snapCamera() {
      const p = this.player;
      this.cam.x = this.camTargetX(p.x);
      this.cam.y = this.camTargetY(p.y);
    }
    camTargetX(x) {
      const pw = this.world.pw;
      return pw <= W ? (pw - W) / 2 : U.clamp(x - W / 2, 0, pw - W);
    }
    camTargetY(y) {
      const ph = this.world.ph;
      return ph <= H ? (ph - H) / 2 : U.clamp(y - H / 2 - 10, 0, ph - H);
    }

    // -------------------------------------------------------------- update
    update(dt) {
      this.time += dt;
      if (I.pressed('mute')) {
        const m = HXH.audio.toggleMute();
        this.toast(m ? 'Sound off' : 'Sound on', 1.5);
      }
      this.fade = U.clamp(this.fade + Math.sign(this.fadeTarget - this.fade) * (this.fadeSpeed || 2.5) * dt, Math.min(this.fade, this.fadeTarget), Math.max(this.fade, this.fadeTarget));

      switch (this.state) {
        case 'title':
          return this.updateTitle();
        case 'paused':
          return this.updatePause();
        case 'stats':
          if (I.pressed('stats') || I.pressed('back')) this.state = 'play';
          return;
        case 'gameover':
          this.overT += dt;
          if (this.overT > 1 && I.pressed('confirm')) this.respawn();
          return;
        case 'chapterEnd':
          this.endT += dt;
          if (this.endT > 2.5 && I.pressed('confirm')) {
            this.state = 'title';
            this.menuSel = 0;
            HXH.audio.music('title');
          }
          return;
      }

      // --- play
      if (!this.cut && !HXH.dialog.active) {
        if (I.pressed('pause')) {
          this.state = 'paused';
          this.menuSel = 0;
          return;
        }
        if (I.pressed('stats')) {
          this.state = 'stats';
          return;
        }
      }

      HXH.dialog.update(dt);

      if (this.hitstop > 0) {
        this.hitstop -= dt;
        HXH.fx.update(dt * 0.2);
        return;
      }

      HXH.tickTimers(dt);
      this.world.time += dt;
      if (!this.isLocked()) this.stats.time += dt;

      const p = this.player;
      p.update(dt);

      // interaction (short cooldown after dialogue so mashing Enter doesn't re-open it)
      if (this.isLocked()) this.interactCd = 0.3;
      else this.interactCd = Math.max(0, (this.interactCd || 0) - dt);
      if (!this.isLocked() && this.interactCd <= 0 && !p.dead && p.state === 'normal' && I.pressed('interact')) {
        const tg = this.interactTarget();
        if (tg) {
          I.consume('attack');
          p.face = tg.x > p.x ? 1 : -1;
          HXH.story.onInteract(tg.id, tg);
        }
      }

      for (const n of this.npcs) n.update(dt);
      for (const e of this.enemies) e.update(dt);
      if (this.boss) this.boss.update(dt);
      for (const pr of this.props) pr.update(dt);
      for (const g of this.gates) g.update(dt);
      for (const h of this.hazards) h.update(dt);
      for (const pj of this.projectiles) pj.update(dt);
      this.projectiles = this.projectiles.filter((x) => !x.dead);
      this.props = this.props.filter((x) => !x.dead);
      this.sprites = this.sprites.filter((s) => s.update(dt) !== false);
      this.separateBodies();

      // triggers (fire on entry)
      if (!p.dead) {
        for (const tr of this.triggers) {
          const inside = p.x >= tr.tx * T && p.x < (tr.tx + tr.tw) * T && p.y >= tr.ty * T && p.y < (tr.ty + tr.th) * T;
          if (inside && !tr.inside && !this.isLocked()) HXH.story.onTrigger(tr.id);
          tr.inside = inside;
        }
      }

      // marathon timer
      if (this.timer && !this.isLocked() && !p.dead) {
        this.timer.t -= dt;
        if (this.timer.t <= 0) {
          this.timer = null;
          HXH.story.onTimerExpired();
        }
      }

      if (p.dead && this.deathDelay != null) {
        this.deathDelay -= dt;
        if (this.deathDelay <= 0) {
          this.deathDelay = null;
          this.state = 'gameover';
        }
      }

      HXH.fx.update(dt);
      for (const t of this.toasts) t.t += dt;
      this.toasts = this.toasts.filter((t) => t.t < t.life);
      if (this.banner) {
        this.banner.t += dt;
        if (this.banner.t > this.banner.life) this.banner = null;
      }
      if (this.areaTitle) this.areaTitle.t += dt;
      this.objectiveFlash = Math.max(0, this.objectiveFlash - dt);

      // camera
      const k = 1 - Math.pow(0.001, dt);
      this.cam.x = U.lerp(this.cam.x, this.camTargetX(p.x), k);
      this.cam.y = U.lerp(this.cam.y, this.camTargetY(p.y), k);
    }

    // Keeps the player and enemies from overlapping.
    separateBodies() {
      const bodies = this.enemies.filter((e) => !e.dead);
      if (this.boss && this.boss.active && this.boss.state !== 'dash') bodies.push(this.boss);
      const p = this.player;
      const all = p.dead || p.state === 'dodge' ? bodies : bodies.concat([p]);
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i], b = all[j];
          const d = U.dist(a.x, a.y, b.x, b.y), min = a.r + b.r;
          if (d < min && d > 0.01) {
            const push = (min - d) / 2, nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
            E.moveEntity(this, a, -nx * push, -ny * push);
            E.moveEntity(this, b, nx * push, ny * push);
          }
        }
      }
    }

    updateTitle() {
      if (this.showControls) {
        if (I.pressed('confirm') || I.pressed('back')) this.showControls = false;
        return;
      }
      const opts = HXH.ui.titleOptions(this);
      if (I.pressed('up')) {
        this.menuSel = (this.menuSel + opts.length - 1) % opts.length;
        HXH.audio.sfx('select');
      }
      if (I.pressed('down')) {
        this.menuSel = (this.menuSel + 1) % opts.length;
        HXH.audio.sfx('select');
      }
      this.menuSel = Math.min(this.menuSel, opts.length - 1);
      if (I.pressed('confirm')) {
        I.consume('confirm');
        I.consume('attack');
        const id = opts[this.menuSel].id;
        HXH.audio.sfx('select');
        if (id === 'new') this.newGame();
        else if (id === 'continue') this.continueGame();
        else if (id === 'controls') this.showControls = true;
      }
    }

    updatePause() {
      if (this.showControls) {
        if (I.pressed('confirm') || I.pressed('back')) this.showControls = false;
        return;
      }
      const opts = HXH.ui.pauseOptions();
      if (I.pressed('back')) {
        this.state = 'play';
        return;
      }
      if (I.pressed('up')) {
        this.menuSel = (this.menuSel + opts.length - 1) % opts.length;
        HXH.audio.sfx('select');
      }
      if (I.pressed('down')) {
        this.menuSel = (this.menuSel + 1) % opts.length;
        HXH.audio.sfx('select');
      }
      if (I.pressed('confirm')) {
        I.consume('confirm');
        I.consume('attack');
        const id = opts[this.menuSel].id;
        HXH.audio.sfx('select');
        if (id === 'resume') this.state = 'play';
        else if (id === 'controls') this.showControls = true;
        else if (id === 'mute') HXH.audio.toggleMute();
        else if (id === 'checkpoint') {
          if (!this.cut) this.respawn();
          else this.state = 'play';
        } else if (id === 'title') {
          this.save();
          this.state = 'title';
          this.menuSel = 0;
          HXH.audio.music('title');
        }
      }
    }

    // ---------------------------------------------------------------- draw
    draw() {
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (this.state === 'title') {
        HXH.ui.drawTitle(this, ctx, this.time);
        return;
      }
      if (this.state === 'chapterEnd') {
        HXH.ui.drawChapterEnd(this, ctx);
        return;
      }
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      const sh = HXH.fx.shake;
      const cx = Math.round(this.cam.x + (sh ? U.rand(-sh, sh) : 0));
      const cy = Math.round(this.cam.y + (sh ? U.rand(-sh, sh) : 0));
      ctx.save();
      ctx.translate(-cx, -cy);

      // map (only the visible part of the pre-rendered canvas)
      const sx = U.clamp(cx, 0, this.world.pw), sy = U.clamp(cy, 0, this.world.ph);
      const sw = Math.min(W, this.world.pw - sx), shh = Math.min(H, this.world.ph - sy);
      if (sw > 0 && shh > 0) ctx.drawImage(this.world.canvas, sx, sy, sw, shh, sx, sy, sw, shh);
      this.world.drawAnimated(ctx, { x: cx, y: cy });

      for (const h of this.hazards) h.drawGround(ctx);
      for (const e of this.enemies) e.drawTelegraph(ctx);
      if (this.boss) this.boss.drawTelegraph(ctx);

      // y-sorted actors
      const list = [];
      for (const n of this.npcs) list.push(n);
      for (const e of this.enemies) list.push(e);
      for (const pr of this.props) list.push(pr);
      for (const g of this.gates) list.push(g);
      for (const s of this.sprites) list.push(s);
      if (this.boss && !this.flags.hisoka_done) list.push(this.boss);
      list.push(this.player);
      list.sort((a, b) => a.y - b.y);
      for (const o of list) {
        if (o.x != null && (o.x < cx - 80 || o.x > cx + W + 80 || o.y < cy - 80 || o.y > cy + H + 120) && !(o instanceof E.Gate)) continue;
        o.draw(ctx);
      }
      for (const h of this.hazards) h.draw(ctx);
      for (const pj of this.projectiles) pj.draw(ctx);
      HXH.fx.draw(ctx);

      if (!this.isLocked() && !this.player.dead) {
        const tg = this.interactTarget();
        if (tg) {
          const label = tg.label || (HXH.SPEAKERS[tg.id] && HXH.SPEAKERS[tg.id].name) || (HXH.SPEAKERS[tg.look] && HXH.SPEAKERS[tg.look].name) || 'Talk';
          HXH.ui.drawInteractPrompt(ctx, tg, label);
        }
      }
      ctx.restore();

      this.drawLighting(ctx, cx, cy);

      if (HXH.fx.flash > 0) {
        ctx.globalAlpha = HXH.fx.flash;
        ctx.fillStyle = HXH.fx.flashColor;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      // area title card
      const at = this.areaTitle;
      if (at && at.t < 3.5 && !this.banner) {
        const a = Math.min(1, at.t * 2, (3.5 - at.t) * 1.5);
        ctx.globalAlpha = Math.max(0, a);
        HXH.ui.text(ctx, at.name, W / 2, 120, 30, '#fff', 'center', 'bold');
        HXH.ui.text(ctx, at.sub || '', W / 2, 146, 15, '#ffe25a', 'center');
        ctx.globalAlpha = 1;
      }

      HXH.ui.drawHUD(this, ctx);
      HXH.ui.drawBanner(this, ctx);
      HXH.dialog.draw(ctx);

      if (this.fade > 0) {
        ctx.fillStyle = 'rgba(0,0,0,' + this.fade + ')';
        ctx.fillRect(0, 0, W, H);
      }

      if (this.state === 'paused') HXH.ui.drawPause(this, ctx);
      else if (this.state === 'stats') HXH.ui.drawStats(this, ctx);
      else if (this.state === 'gameover') HXH.ui.drawGameOver(this, ctx);
    }

    drawLighting(ctx, cx, cy) {
      const def = this.world.def;
      if (!def.light && !def.fog) return;
      const L = this.light.getContext('2d');
      const p = this.player;
      const px = p.x - cx, py = p.y - 20 - cy;
      L.globalCompositeOperation = 'source-over';
      L.clearRect(0, 0, W, H);
      if (def.light) {
        L.fillStyle = 'rgba(0,0,8,' + def.light.dark + ')';
        L.fillRect(0, 0, W, H);
        L.globalCompositeOperation = 'destination-out';
        const holes = [[px, py, def.light.radius]];
        const s = this.npc('satotz');
        if (s && !s.hidden) holes.push([s.x - cx, s.y - 20 - cy, 120]);
        for (const [x, y, r] of holes) {
          const g = L.createRadialGradient(x, y, r * 0.2, x, y, r);
          g.addColorStop(0, 'rgba(0,0,0,1)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          L.fillStyle = g;
          L.fillRect(x - r, y - r, r * 2, r * 2);
        }
      } else if (def.fog) {
        const fg = def.fog;
        L.fillStyle = 'rgba(' + fg.color + ',' + fg.alpha + ')';
        L.fillRect(0, 0, W, H);
        L.globalCompositeOperation = 'destination-out';
        const r = fg.radius + Math.sin(this.time * 0.8) * 10;
        const g = L.createRadialGradient(px, py, r * 0.35, px, py, r);
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        L.fillStyle = g;
        L.fillRect(0, 0, W, H);
        // drifting fog banks
        L.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 7; i++) {
          const fx = ((i * 211 + this.time * (12 + i * 3) - cx * 0.3) % (W + 400) + W + 400) % (W + 400) - 200;
          const fy = ((i * 137 - cy * 0.3) % H + H) % H;
          const gg = L.createRadialGradient(fx, fy, 10, fx, fy, 160);
          gg.addColorStop(0, 'rgba(' + fg.color + ',0.22)');
          gg.addColorStop(1, 'rgba(' + fg.color + ',0)');
          L.fillStyle = gg;
          L.fillRect(fx - 160, fy - 160, 320, 320);
        }
      }
      ctx.drawImage(this.light, 0, 0);
    }
  }

  HXH.Game = Game;

  // ---------------------------------------------------------------- boot
  window.addEventListener('load', () => {
    const canvas = document.getElementById('game');
    HXH.input.attachMouse(canvas);
    const game = (HXH.game = new Game(canvas));
    HXH.story.init(game);
    let last = performance.now();
    function frame(now) {
      const dt = Math.min(1 / 30, (now - last) / 1000);
      last = now;
      game.update(dt);
      game.draw();
      HXH.input.endFrame();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
})();
