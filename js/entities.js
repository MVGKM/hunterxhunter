// Player, NPCs, enemies, the Hisoka boss, projectiles, props, gates and hazards.
(function () {
  'use strict';
  const HXH = window.HXH;
  const U = HXH.util;
  const R = HXH.render;
  const T = HXH.TILE;
  const sfx = (n) => HXH.audio.sfx(n);

  // Collision box around an entity's feet.
  function boxOf(e, x, y) {
    return [x - e.r * 0.8, y - e.r * 0.6, x + e.r * 0.8, y + e.r * 0.3];
  }

  // Moves an entity, sliding along walls one pixel at a time on each axis.
  function moveEntity(game, e, dx, dy) {
    // Something closed on top of us (e.g. a gate): move freely until clear.
    if (game.blocked(...boxOf(e, e.x, e.y))) {
      e.x += dx;
      e.y += dy;
      return false;
    }
    let hit = false;
    for (const axis of [0, 1]) {
      let rem = axis ? dy : dx;
      while (Math.abs(rem) > 0.0001) {
        const s = Math.sign(rem) * Math.min(1, Math.abs(rem));
        const nx = axis ? e.x : e.x + s, ny = axis ? e.y + s : e.y;
        if (game.blocked(...boxOf(e, nx, ny))) {
          hit = true;
          break;
        }
        e.x = nx;
        e.y = ny;
        rem -= s;
      }
    }
    return hit;
  }

  // ================================================================ Player
  class Player {
    constructor(game) {
      this.game = game;
      this.x = 0;
      this.y = 0;
      this.r = 11;
      this.stats = { level: 1, xp: 0, maxHp: 100, hp: 100, atk: 10, maxSta: 100, sta: 100 };
      this.resetState();
    }
    resetState() {
      this.face = 1;
      this.dirX = 0;
      this.dirY = 1;
      this.t = 0;
      this.moving = false;
      this.state = 'normal';
      this.stateT = 0;
      this.iframes = 0;
      this.attackCd = 0;
      this.dodgeCd = 0;
      this.combo = 0;
      this.comboT = 0;
      this.queued = false;
      this.hitDone = false;
      this.staDelay = 0;
      this.hazardCd = 0;
      this.poison = 0;
      this.poisonTick = 0;
      this.flash = 0;
      this.kbx = 0;
      this.kby = 0;
      this.swingAngle = 0;
      this.dodgeX = 0;
      this.dodgeY = 0;
    }
    get xpNext() {
      return 30 + this.stats.level * 30;
    }
    get dead() {
      return this.state === 'dead';
    }

    gainXp(n) {
      const s = this.stats;
      s.xp += n;
      HXH.fx.text(this.x, this.y - 50, '+' + n + ' XP', '#9fe0ff', 13);
      while (s.xp >= this.xpNext) {
        s.xp -= this.xpNext;
        s.level++;
        s.maxHp += 12;
        s.atk += 2;
        s.maxSta += 5;
        s.hp = s.maxHp;
        s.sta = s.maxSta;
        sfx('levelup');
        HXH.fx.text(this.x, this.y - 66, 'LEVEL UP!  Lv.' + s.level, '#ffe25a', 20);
        HXH.fx.burst(this.x, this.y - 20, '#ffe25a', 30, 160, 0.9, 4);
        this.game.toast('Level ' + s.level + '!  Max HP +12, Attack +2, Stamina +5');
        this.game.stats.levelUps++;
      }
    }

    heal(n) {
      const s = this.stats;
      const before = s.hp;
      s.hp = Math.min(s.maxHp, s.hp + n);
      HXH.fx.text(this.x, this.y - 40, '+' + Math.round(s.hp - before), '#7dff8a', 15);
    }

    damage(n, sx, sy, opts = {}) {
      if (this.dead) return false;
      if (!opts.ignoreIframes && (this.iframes > 0 || this.game.isLocked())) return false;
      const s = this.stats;
      n = Math.round(n);
      s.hp -= n;
      this.game.stats.damageTaken += n;
      HXH.fx.text(this.x, this.y - 40, '-' + n, opts.color || '#ff6a5a', 16);
      this.flash = 1;
      if (!opts.noKnock) {
        const a = Math.atan2(this.y - sy, this.x - sx);
        this.kbx = Math.cos(a) * 260;
        this.kby = Math.sin(a) * 260;
        this.state = 'hurt';
        this.stateT = 0;
        this.iframes = 0.75;
        HXH.fx.addShake(6);
        HXH.fx.burst(this.x, this.y - 16, '#ff4a3a', 10, 140, 0.4, 3);
        sfx('hurt');
      }
      if (s.hp <= 0) {
        s.hp = 0;
        this.state = 'dead';
        this.stateT = 0;
        this.game.onPlayerDeath();
      }
      return true;
    }

    startAttack() {
      this.combo = this.comboT > 0 ? (this.combo % 3) + 1 : 1;
      this.comboT = 0.6;
      this.state = 'attack';
      this.stateT = 0;
      this.hitDone = false;
      this.queued = false;
      this.attackCd = 0.2;
      this.swingAngle = Math.atan2(this.dirY, this.dirX);
      // Soft aim assist toward the nearest enemy in front.
      let best = null, bd = 90;
      for (const e of this.game.targets()) {
        const d = U.dist(this.x, this.y, e.x, e.y);
        const a = Math.atan2(e.y - this.y, e.x - this.x);
        if (d < bd && Math.abs(U.angleDiff(this.swingAngle, a)) < 1.0) {
          best = a;
          bd = d;
        }
      }
      if (best !== null) this.swingAngle = best;
      if (Math.cos(this.swingAngle) !== 0) this.face = Math.cos(this.swingAngle) >= 0 ? 1 : -1;
      sfx('swing');
    }

    doHit() {
      this.hitDone = true;
      const heavy = this.combo === 3;
      const dmg = this.stats.atk * (heavy ? 1.6 : 1);
      const range = heavy ? 60 : 54;
      for (const e of this.game.targets()) {
        const d = U.dist(this.x, this.y - 8, e.x, e.y - 10);
        const a = Math.atan2(e.y - 10 - (this.y - 8), e.x - this.x);
        if (d <= range + e.r && Math.abs(U.angleDiff(this.swingAngle, a)) <= 1.3) e.takeHit(dmg, this, heavy);
      }
    }

    startDodge(mx, my) {
      const s = this.stats;
      s.sta -= 30;
      this.staDelay = 0.5;
      this.state = 'dodge';
      this.stateT = 0;
      this.iframes = Math.max(this.iframes, 0.3);
      this.dodgeCd = 0.35;
      const dx = mx || this.dirX, dy = mx || my ? my : this.dirY;
      const l = Math.hypot(dx, dy) || 1;
      this.dodgeX = dx / l;
      this.dodgeY = dy / l;
      sfx('dodge');
      this.game.stats.dodges++;
    }

    update(dt) {
      const g = this.game, I = HXH.input, s = this.stats;
      this.t += dt;
      this.stateT += dt;
      this.iframes = Math.max(0, this.iframes - dt);
      this.attackCd = Math.max(0, this.attackCd - dt);
      this.dodgeCd = Math.max(0, this.dodgeCd - dt);
      this.comboT = Math.max(0, this.comboT - dt);
      this.hazardCd = Math.max(0, this.hazardCd - dt);
      this.flash = Math.max(0, this.flash - dt * 5);
      if (this.dead) return;

      const locked = g.isLocked();
      let mx = 0, my = 0;
      if (!locked) {
        if (I.down('left')) mx -= 1;
        if (I.down('right')) mx += 1;
        if (I.down('up')) my -= 1;
        if (I.down('down')) my += 1;
      }
      const len = Math.hypot(mx, my);
      if (len) {
        mx /= len;
        my /= len;
      }
      const tile = g.world.info(g.world.tileAtPx(this.x, this.y));
      let slow = tile.mud ? 0.5 : 1;
      if (this.poison > 0) slow *= 0.8;

      // stamina
      this.staDelay -= dt;
      if (this.staDelay <= 0) s.sta = Math.min(s.maxSta, s.sta + 38 * dt);

      switch (this.state) {
        case 'normal': {
          this.moving = len > 0;
          if (len) {
            this.dirX = mx;
            this.dirY = my;
            if (mx) this.face = mx > 0 ? 1 : -1;
            moveEntity(g, this, mx * 150 * slow * dt, my * 150 * slow * dt);
          }
          if (!locked) {
            if (I.pressed('attack') && this.attackCd <= 0) this.startAttack();
            else if (I.pressed('dodge') && this.dodgeCd <= 0) {
              if (s.sta >= 30) this.startDodge(mx, my);
              else {
                HXH.fx.text(this.x, this.y - 44, 'Out of stamina', '#ffd25a', 12);
                sfx('deny');
              }
            }
          }
          break;
        }
        case 'attack': {
          this.moving = false;
          if (this.stateT < 0.07) moveEntity(g, this, Math.cos(this.swingAngle) * 90 * dt, Math.sin(this.swingAngle) * 90 * dt);
          if (this.stateT >= 0.07 && !this.hitDone) this.doHit();
          if (!locked && this.stateT > 0.1 && I.pressed('attack')) this.queued = true;
          if (!locked && I.pressed('dodge') && this.stateT > 0.1 && s.sta >= 30) {
            this.startDodge(mx, my);
            break;
          }
          if (this.stateT >= (this.combo === 3 ? 0.32 : 0.24)) {
            this.state = 'normal';
            if (this.queued) this.startAttack();
          }
          break;
        }
        case 'dodge': {
          this.moving = true;
          const sp = 430 * (1 - this.stateT / 0.22) + 80;
          moveEntity(g, this, this.dodgeX * sp * dt, this.dodgeY * sp * dt);
          if (Math.random() < 0.6) HXH.fx.parts.push({ x: this.x + U.rand(-6, 6), y: this.y - U.rand(0, 20), vx: 0, vy: -10, life: 0.25, max: 0.25, color: 'rgba(200,255,200,0.6)', size: 4, grav: 0 });
          if (this.stateT >= 0.22) this.state = 'normal';
          break;
        }
        case 'hurt': {
          this.moving = false;
          moveEntity(g, this, this.kbx * dt, this.kby * dt);
          this.kbx *= 0.85;
          this.kby *= 0.85;
          if (this.stateT >= 0.18) this.state = 'normal';
          break;
        }
      }

      // environmental hazards
      if (!locked && !this.dead) {
        if (tile.spikes && g.world.spikePhase() === 'up' && this.iframes <= 0 && this.state !== 'dodge') {
          this.damage(12, this.x + this.dirX * 10, this.y + this.dirY * 10);
          g.stats.hazardHits++;
        }
        if (tile.gas && this.hazardCd <= 0) {
          this.hazardCd = 0.45;
          this.damage(5, this.x, this.y, { noKnock: true, ignoreIframes: true, color: '#d29aff' });
          this.flash = 0.6;
          g.stats.hazardHits++;
        }
        if (this.poison > 0) {
          this.poison -= dt;
          this.poisonTick -= dt;
          if (this.poisonTick <= 0) {
            this.poisonTick = 1.2;
            if (s.hp > 5) this.damage(2, this.x, this.y, { noKnock: true, ignoreIframes: true, color: '#b8e05a' });
          }
        }
      }
    }

    draw(ctx) {
      const blink = this.iframes > 0 && this.state !== 'dodge' && Math.floor(this.t * 20) % 2 === 0;
      if (this.dead) {
        R.drawChar(ctx, 'gon', this.x, this.y, { face: this.face, lying: true, t: this.t });
        return;
      }
      if (this.poison > 0) {
        ctx.fillStyle = 'rgba(160,220,80,0.25)';
        R.circle(ctx, this.x, this.y - 18, 18);
      }
      // Fishing rod: behind when facing up, swung during attacks.
      const rodBehind = this.state !== 'attack';
      if (rodBehind) this.drawRod(ctx);
      R.drawChar(ctx, 'gon', this.x, this.y, { t: this.t, moving: this.moving, face: this.face, dirY: this.dirY, alpha: blink ? 0.4 : 1, flash: this.flash });
      if (!rodBehind) this.drawRod(ctx);
    }

    drawRod(ctx) {
      const cx = this.x + this.face * 6, cy = this.y - 16;
      ctx.save();
      ctx.lineCap = 'round';
      if (this.state === 'attack') {
        const p = Math.min(1, this.stateT / 0.12);
        const dir = this.combo === 2 ? -1 : 1;
        const a = this.swingAngle + dir * U.lerp(-1.4, 1.4, p);
        const len = this.combo === 3 ? 52 : 46;
        ctx.strokeStyle = '#7a4a22';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
        ctx.stroke();
        // swing trail
        ctx.strokeStyle = this.combo === 3 ? 'rgba(255,240,140,0.7)' : 'rgba(255,255,255,0.55)';
        ctx.lineWidth = this.combo === 3 ? 6 : 4;
        ctx.beginPath();
        const a0 = this.swingAngle - dir * 1.4;
        if (dir > 0) ctx.arc(cx, cy, len, a0, a);
        else ctx.arc(cx, cy, len, a, a0);
        ctx.stroke();
      } else {
        // carried over the shoulder
        ctx.strokeStyle = '#7a4a22';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(this.x - this.face * 6, this.y - 6);
        ctx.lineTo(this.x + this.face * 14, this.y - 44);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x + this.face * 14, this.y - 44);
        ctx.quadraticCurveTo(this.x + this.face * 22, this.y - 30, this.x + this.face * 18, this.y - 18);
        ctx.stroke();
        ctx.fillStyle = '#d33';
        R.circle(ctx, this.x + this.face * 18, this.y - 18, 2);
      }
      ctx.restore();
    }
  }

  // =================================================================== NPC
  class NPC {
    constructor(game, def) {
      this.game = game;
      this.id = def.id;
      this.look = def.look;
      this.x = (def.tx + 0.5) * T;
      this.y = (def.ty + 0.7) * T;
      this.face = def.face || 1;
      this.lying = !!def.lying;
      this.r = 10;
      this.t = Math.random() * 5;
      this.target = null;
      this.hidden = false;
      this.alpha = 1;
      this.talkable = def.talkable !== false;
      this.autoFace = def.autoFace !== false;
    }
    moveTo(x, y, speed = 90) {
      return new Promise((res) => {
        this.target = { x, y, speed, res };
      });
    }
    update(dt) {
      this.t += dt;
      const tg = this.target;
      if (tg) {
        const d = U.dist(this.x, this.y, tg.x, tg.y);
        const step = tg.speed * dt;
        if (d <= step) {
          this.x = tg.x;
          this.y = tg.y;
          this.target = null;
          tg.res();
        } else {
          this.x += ((tg.x - this.x) / d) * step;
          this.y += ((tg.y - this.y) / d) * step;
          if (Math.abs(tg.x - this.x) > 1) this.face = tg.x > this.x ? 1 : -1;
        }
      } else if (this.autoFace && !this.lying) {
        const p = this.game.player;
        if (U.dist(this.x, this.y, p.x, p.y) < 110) this.face = p.x > this.x ? 1 : -1;
      }
    }
    draw(ctx) {
      if (this.hidden) return;
      if (this.look === 'ape_dead') {
        R.drawApe(ctx, this.x, this.y, { t: 0, face: this.face, alpha: 0.85 });
        return;
      }
      R.drawChar(ctx, this.look, this.x, this.y, { t: this.t, moving: !!this.target, face: this.face, lying: this.lying, alpha: this.alpha });
    }
  }

  // ================================================================= Enemies
  const ENEMY_TYPES = {
    thug: { name: 'Applicant Hunter', look: 'thug', hp: 32, speed: 78, dmg: 10, xp: 15, attack: 'punch', range: 36, windup: 0.55, active: 0.15, recover: 0.75, sight: 230 },
    thug2: { name: 'Applicant Hunter', look: 'thug2', hp: 38, speed: 70, dmg: 12, xp: 15, attack: 'punch', range: 38, windup: 0.65, active: 0.15, recover: 0.8, sight: 230 },
    examinee: { name: 'Rookie Crusher', look: 'examinee', hp: 45, speed: 92, dmg: 12, xp: 20, attack: 'punch', range: 38, windup: 0.45, active: 0.15, recover: 0.6, sight: 240 },
    examinee2: { name: 'Rookie Crusher', look: 'examinee2', hp: 50, speed: 82, dmg: 14, xp: 20, attack: 'lunge', range: 130, windup: 0.6, active: 0.32, recover: 0.8, sight: 240, lungeSpeed: 420 },
    ape: { name: 'Man-faced Ape', look: 'ape', hp: 58, speed: 100, dmg: 15, xp: 25, attack: 'lunge', range: 140, windup: 0.6, active: 0.34, recover: 0.95, sight: 250, lungeSpeed: 430, r: 13 },
    frog: { name: 'Swamp Frog', look: 'frog', hp: 42, speed: 45, dmg: 13, xp: 20, attack: 'tongue', range: 165, windup: 0.75, active: 0.3, recover: 1.0, sight: 260, r: 14, keepAway: 110 },
  };

  class Enemy {
    constructor(game, def) {
      const cfg = ENEMY_TYPES[def.type];
      this.game = game;
      this.id = def.id;
      this.group = def.group;
      this.cfg = cfg;
      this.wakeFlag = def.wakeFlag;
      this.x = (def.tx + 0.5) * T;
      this.y = (def.ty + 0.7) * T;
      this.homeX = this.x;
      this.homeY = this.y;
      this.r = cfg.r || 11;
      this.hp = this.maxHp = cfg.hp;
      this.state = 'idle';
      this.stateT = 0;
      this.t = Math.random() * 5;
      this.face = -1;
      this.cd = 0;
      this.kbx = 0;
      this.kby = 0;
      this.flash = 0;
      this.dead = false;
      this.deathT = 0;
      this.lockAng = 0;
      this.hitDone = false;
      this.wander = null;
      this.moving = false;
      this.showBarT = 0;
    }

    get alive() {
      return !this.dead;
    }

    takeHit(dmg, src, heavy) {
      if (this.dead) return;
      const crit = this.state === 'recover';
      if (crit) dmg *= 1.5;
      dmg = Math.round(dmg);
      this.hp -= dmg;
      this.flash = 1;
      this.showBarT = 3;
      const a = Math.atan2(this.y - src.y, this.x - src.x);
      const kb = heavy ? 300 : 170;
      this.kbx = Math.cos(a) * kb;
      this.kby = Math.sin(a) * kb;
      HXH.fx.spray(this.x, this.y - 14, a, crit ? '#ffe25a' : '#fff', crit ? 14 : 8);
      HXH.fx.text(this.x, this.y - 40, String(dmg), crit ? '#ffe25a' : '#fff', crit ? 20 : 15);
      if (crit) {
        HXH.fx.text(this.x, this.y - 60, 'OPENING!', '#ffe25a', 14);
        sfx('crit');
        HXH.fx.addShake(5);
        this.game.stats.openings++;
      } else sfx('hit');
      HXH.fx.addShake(heavy ? 4 : 2);
      this.game.hitstop = heavy || crit ? 0.07 : 0.035;
      // Windups can only be broken by heavy (3rd combo) hits: reading the
      // telegraph matters more than mashing.
      if (this.state === 'windup' && !heavy) {
        HXH.fx.text(this.x, this.y - 58, 'Unflinching', '#ff9a7a', 11);
      } else {
        if (this.state === 'windup') HXH.fx.text(this.x, this.y - 58, 'STANCE BROKEN', '#7ad8ff', 12);
        this.state = 'stagger';
        this.stateT = 0;
      }
      if (this.hp <= 0) this.die();
    }

    die() {
      this.dead = true;
      this.deathT = 0;
      HXH.fx.burst(this.x, this.y - 14, '#ffffff', 16, 180, 0.6, 3);
      HXH.fx.burst(this.x, this.y - 14, this.cfg.look === 'frog' ? '#6ab04a' : '#c04a3a', 10, 120, 0.6, 3);
      this.game.player.gainXp(this.cfg.xp);
      this.game.onEnemyKilled(this);
    }

    update(dt) {
      this.t += dt;
      this.flash = Math.max(0, this.flash - dt * 5);
      this.showBarT = Math.max(0, this.showBarT - dt);
      if (this.dead) {
        this.deathT += dt;
        return;
      }
      const g = this.game, p = g.player, c = this.cfg;
      if (g.isLocked()) {
        this.moving = false;
        return;
      }
      this.stateT += dt;
      this.cd = Math.max(0, this.cd - dt);
      const d = U.dist(this.x, this.y, p.x, p.y);
      const ang = Math.atan2(p.y - this.y, p.x - this.x);
      const asleep = this.wakeFlag && !g.flags[this.wakeFlag];
      this.moving = false;

      // knockback
      if (Math.abs(this.kbx) + Math.abs(this.kby) > 5) {
        moveEntity(g, this, this.kbx * dt, this.kby * dt);
        this.kbx *= 0.85;
        this.kby *= 0.85;
      }

      switch (this.state) {
        case 'idle': {
          if (!this.wander || this.stateT > this.wander.t) {
            const a = Math.random() * Math.PI * 2;
            this.wander = { x: this.homeX + Math.cos(a) * 40, y: this.homeY + Math.sin(a) * 40, t: U.rand(1.5, 3) };
            this.stateT = 0;
          }
          const wd = U.dist(this.x, this.y, this.wander.x, this.wander.y);
          if (wd > 4 && !asleep) {
            this.moving = true;
            moveEntity(g, this, ((this.wander.x - this.x) / wd) * 30 * dt, ((this.wander.y - this.y) / wd) * 30 * dt);
            this.face = this.wander.x > this.x ? 1 : -1;
          }
          if (!asleep && !p.dead && d < c.sight) {
            this.state = 'chase';
            this.stateT = 0;
            HXH.fx.text(this.x, this.y - 50, '!', '#ff5a4a', 20);
          }
          break;
        }
        case 'chase': {
          if (p.dead || d > c.sight * 1.8) {
            this.state = 'idle';
            break;
          }
          this.face = p.x > this.x ? 1 : -1;
          let want = 1;
          if (c.keepAway && d < c.keepAway) want = -0.6;
          else if (d < c.range * 0.75) want = 0;
          if (want) {
            this.moving = true;
            moveEntity(g, this, Math.cos(ang) * c.speed * want * dt, Math.sin(ang) * c.speed * want * dt);
          }
          if (d <= c.range && this.cd <= 0) {
            this.state = 'windup';
            this.stateT = 0;
            this.lockAng = ang;
            sfx('warn');
          }
          break;
        }
        case 'windup': {
          // punchers keep tracking during windup; lunges and tongues commit to a line.
          if (c.attack === 'punch') {
            this.lockAng = ang;
            if (d > c.range * 0.9) moveEntity(g, this, Math.cos(ang) * c.speed * 0.5 * dt, Math.sin(ang) * c.speed * 0.5 * dt);
          }
          this.face = Math.cos(this.lockAng) >= 0 ? 1 : -1;
          if (this.stateT >= c.windup) {
            this.state = 'attack';
            this.stateT = 0;
            this.hitDone = false;
            if (c.attack === 'lunge') sfx('dodge');
            if (c.attack === 'punch') sfx('swing');
          }
          break;
        }
        case 'attack': {
          if (c.attack === 'punch') {
            if (!this.hitDone) {
              this.hitDone = true;
              const hx = this.x + Math.cos(this.lockAng) * 22, hy = this.y + Math.sin(this.lockAng) * 22;
              if (U.dist(hx, hy, p.x, p.y) < 26) p.damage(c.dmg, this.x, this.y);
            }
          } else if (c.attack === 'lunge') {
            const sp = c.lungeSpeed * (1 - this.stateT / c.active * 0.5);
            const hit = moveEntity(g, this, Math.cos(this.lockAng) * sp * dt, Math.sin(this.lockAng) * sp * dt);
            this.moving = true;
            if (!this.hitDone && U.dist(this.x, this.y, p.x, p.y) < this.r + p.r + 6) {
              this.hitDone = true;
              p.damage(c.dmg, this.x, this.y);
            }
            if (hit) this.stateT = c.active;
          } else if (c.attack === 'tongue') {
            const len = c.range * Math.min(1, this.stateT / 0.12);
            const ox = this.x, oy = this.y - 12;
            const ex = ox + Math.cos(this.lockAng) * len, ey = oy + Math.sin(this.lockAng) * len;
            if (!this.hitDone && U.pointSegDist(p.x, p.y - 12, ox, oy, ex, ey) < p.r + 5) {
              this.hitDone = true;
              p.damage(c.dmg, ox, oy);
            }
          }
          if (this.stateT >= c.active) {
            this.state = 'recover';
            this.stateT = 0;
          }
          break;
        }
        case 'recover':
          if (this.stateT >= c.recover) {
            this.state = 'chase';
            this.stateT = 0;
            this.cd = U.rand(0.3, 0.8);
          }
          break;
        case 'stagger':
          if (this.stateT >= 0.3) {
            this.state = 'chase';
            this.stateT = 0;
            this.cd = Math.max(this.cd, 0.25);
          }
          break;
      }
    }

    drawTelegraph(ctx) {
      if (this.dead || this.state !== 'windup') return;
      const c = this.cfg, p = Math.min(1, this.stateT / c.windup);
      ctx.save();
      if (c.attack === 'punch') {
        ctx.fillStyle = 'rgba(255,60,40,' + (0.15 + p * 0.3) + ')';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.arc(this.x, this.y, 46, this.lockAng - 0.7, this.lockAng + 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,60,40,0.5)';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.arc(this.x, this.y, 46 * p, this.lockAng - 0.7, this.lockAng + 0.7);
        ctx.closePath();
        ctx.fill();
      } else {
        const len = c.attack === 'lunge' ? c.lungeSpeed * c.active * 0.75 : c.range;
        const oy = c.attack === 'tongue' ? -12 : 0;
        ctx.translate(this.x, this.y + oy);
        ctx.rotate(this.lockAng);
        ctx.fillStyle = 'rgba(255,60,40,0.18)';
        ctx.fillRect(0, -10, len, 20);
        ctx.fillStyle = 'rgba(255,60,40,0.45)';
        ctx.fillRect(0, -10, len * p, 20);
      }
      ctx.restore();
    }

    draw(ctx) {
      const c = this.cfg;
      let alpha = 1;
      if (this.dead) {
        alpha = Math.max(0, 1 - this.deathT / 0.6);
        if (alpha <= 0) return;
      }
      const o = { t: this.t, moving: this.moving, face: this.face, flash: this.flash, alpha };
      if (this.state === 'windup') {
        o.crouch = 3;
        // shake while winding up
        o.t += Math.random() * 0.01;
      }
      const jx = this.state === 'windup' ? U.rand(-1, 1) : 0;
      if (c.look === 'ape') R.drawApe(ctx, this.x + jx, this.y, o);
      else if (c.look === 'frog') {
        R.drawFrog(ctx, this.x + jx, this.y, o);
        if (this.state === 'attack' && !this.dead) {
          const len = c.range * Math.min(1, this.stateT / 0.12) * (1 - Math.max(0, this.stateT - 0.18) / 0.12);
          ctx.strokeStyle = '#e0607a';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(this.x, this.y - 12);
          ctx.lineTo(this.x + Math.cos(this.lockAng) * len, this.y - 12 + Math.sin(this.lockAng) * len);
          ctx.stroke();
        }
      } else R.drawChar(ctx, c.look, this.x + jx, this.y, o);

      if (this.dead) return;
      // vulnerable indicator
      if (this.state === 'recover' || this.state === 'stagger') {
        for (let i = 0; i < 3; i++) {
          const a = this.t * 6 + (i * Math.PI * 2) / 3;
          ctx.fillStyle = '#ffe25a';
          R.circle(ctx, this.x + Math.cos(a) * 12, this.y - 48 + Math.sin(a) * 4, 2.5);
        }
      }
      if (this.showBarT > 0 || this.hp < this.maxHp) {
        const w = 30;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(this.x - w / 2 - 1, this.y - 58, w + 2, 5);
        ctx.fillStyle = '#e04a3a';
        ctx.fillRect(this.x - w / 2, this.y - 57, (w * Math.max(0, this.hp)) / this.maxHp, 3);
      }
    }
  }

  // ======================================================== Hisoka (boss)
  class Hisoka {
    constructor(game, def) {
      this.game = game;
      this.id = 'hisoka_boss';
      this.isBoss = true;
      this.name = 'Hisoka';
      this.x = (def.tx + 0.5) * T;
      this.y = (def.ty + 0.7) * T;
      this.homeX = this.x;
      this.homeY = this.y;
      this.r = 12;
      this.hits = 0;
      this.hitsNeeded = 3;
      this.state = 'idle';
      this.stateT = 0;
      this.t = 0;
      this.face = -1;
      this.flash = 0;
      this.kbx = 0;
      this.kby = 0;
      this.dead = false;
      this.orbit = 1;
      this.lockAng = 0;
      this.dashDist = 0;
      this.hitDone = false;
      this.tauntCd = 0;
      this.cardCount = 3;
      this.moving = false;
      this.alpha = 1;
      this.nextMove = 'cards';
      this.counterQueued = false;
    }
    get active() {
      const f = this.game.flags;
      return f.hisoka_fight && !f.hisoka_done;
    }
    get alive() {
      return this.active;
    }
    get speedK() {
      return [1, 0.82, 0.68][Math.min(2, this.hits)];
    }
    setState(s) {
      this.state = s;
      this.stateT = 0;
    }

    say(text) {
      HXH.fx.text(this.x, this.y - 64, text, '#ff9ad6', 14);
    }

    takeHit(dmg, src, heavy) {
      if (!this.active) return;
      if (this.state === 'recover' || this.state === 'dizzy') {
        this.hits++;
        this.flash = 1;
        const a = Math.atan2(this.y - src.y, this.x - src.x);
        this.kbx = Math.cos(a) * 340;
        this.kby = Math.sin(a) * 340;
        HXH.fx.spray(this.x, this.y - 16, a, '#ffe25a', 20, 280);
        HXH.fx.text(this.x, this.y - 48, 'CLEAN HIT!', '#ffe25a', 22);
        HXH.fx.addShake(10);
        HXH.fx.screenFlash('#fff', 0.35);
        this.game.hitstop = 0.15;
        this.game.stats.openings++;
        sfx('crit');
        if (this.hits >= this.hitsNeeded) {
          this.setState('beaten');
          this.game.onBossDefeated(this);
          return;
        }
        this.say(['Oh? ♥', 'Delicious ♠'][this.hits - 1] || '♥');
        this.cardCount = 3 + this.hits * 2;
        this.setState('hurt');
      } else if (this.state !== 'hurt' && this.state !== 'vanish') {
        // Evades anything that isn't aimed at an opening, then punishes.
        const a = Math.atan2(this.y - src.y, this.x - src.x) + (Math.random() < 0.5 ? 1.4 : -1.4);
        HXH.fx.burst(this.x, this.y - 16, '#c58aff', 10, 120, 0.4, 3);
        this.x += Math.cos(a) * 55;
        this.y += Math.sin(a) * 55;
        this.clampToArena();
        sfx('vanish');
        if (this.tauntCd <= 0) {
          this.say(U.pick(['Too slow ♥', 'Not like that ♦', 'Read me first ♣', 'Mm, impatient ♠']));
          this.tauntCd = 1.6;
        }
        this.lockAng = Math.atan2(this.game.player.y - this.y, this.game.player.x - this.x);
        this.counterQueued = true;
        this.setState('counterWind');
      }
    }

    clampToArena() {
      const g = this.game;
      // Arena interior: tiles x44..62, y1..15
      this.x = U.clamp(this.x, 45 * T, 62 * T);
      this.y = U.clamp(this.y, 2 * T, 15 * T);
      if (g.blocked(...boxOf(this, this.x, this.y))) {
        this.x = this.homeX;
        this.y = this.homeY;
      }
    }

    throwCards(n, spread) {
      const g = this.game;
      for (let i = 0; i < n; i++) {
        const a = this.lockAng + (n === 1 ? 0 : U.lerp(-spread, spread, i / (n - 1)));
        g.projectiles.push(new Projectile(g, this.x, this.y - 18, a, 330 / this.speedK * 0.9, 12));
      }
      sfx('card');
    }

    update(dt) {
      this.t += dt;
      this.flash = Math.max(0, this.flash - dt * 4);
      this.tauntCd -= dt;
      const g = this.game, p = g.player;
      this.moving = false;
      if (!this.active || g.isLocked()) {
        if (!g.flags.hisoka_done) this.face = p.x > this.x ? 1 : -1;
        return;
      }
      this.stateT += dt;
      const d = U.dist(this.x, this.y, p.x, p.y);
      const ang = Math.atan2(p.y - this.y, p.x - this.x);
      const k = this.speedK;

      if (Math.abs(this.kbx) + Math.abs(this.kby) > 5) {
        moveEntity(g, this, this.kbx * dt, this.kby * dt);
        this.kbx *= 0.86;
        this.kby *= 0.86;
      }

      switch (this.state) {
        case 'idle':
          this.setState('stalk');
          break;
        case 'stalk': {
          this.face = p.x > this.x ? 1 : -1;
          // circle the player at a comfortable distance
          const want = 170;
          const tang = ang + Math.PI + this.orbit * 0.9;
          const tx = p.x + Math.cos(tang) * want, ty = p.y + Math.sin(tang) * want;
          const td = U.dist(this.x, this.y, tx, ty);
          if (td > 6) {
            this.moving = true;
            const hit = moveEntity(g, this, ((tx - this.x) / td) * 125 * dt, ((ty - this.y) / td) * 125 * dt);
            if (hit) this.orbit *= -1;
          }
          if (this.stateT > U.rand(0.9, 1.5) * k) {
            if (Math.random() < 0.25) this.orbit *= -1;
            this.lockAng = ang;
            if (d > 260 || this.nextMove === 'dash') {
              this.setState('dashWind');
              this.nextMove = 'cards';
            } else {
              this.setState('cardWind');
              this.nextMove = Math.random() < 0.55 ? 'dash' : 'cards';
            }
            sfx('warn');
          }
          break;
        }
        case 'cardWind':
          this.face = Math.cos(this.lockAng) >= 0 ? 1 : -1;
          if (this.stateT >= 0.7 * k) {
            this.throwCards(this.cardCount, 0.18 * (this.cardCount - 1) / 2);
            this.recoverT = 0.7;
            this.setState('recover');
          }
          break;
        case 'counterWind':
          this.face = Math.cos(this.lockAng) >= 0 ? 1 : -1;
          if (this.stateT >= 0.38) {
            this.throwCards(this.hits >= 1 ? 3 : 1, 0.15);
            this.counterQueued = false;
            this.setState('stalk');
          }
          break;
        case 'dashWind':
          this.face = Math.cos(this.lockAng) >= 0 ? 1 : -1;
          // tracks you during the first half of the windup only
          if (this.stateT < 0.3 * k) this.lockAng = ang;
          if (this.stateT >= 0.65 * k) {
            this.setState('dash');
            this.dashDist = 0;
            this.hitDone = false;
            sfx('dodge');
          }
          break;
        case 'dash': {
          const sp = 640;
          const hit = moveEntity(g, this, Math.cos(this.lockAng) * sp * dt, Math.sin(this.lockAng) * sp * dt);
          this.moving = true;
          this.dashDist += sp * dt;
          if (Math.random() < 0.8) HXH.fx.parts.push({ x: this.x, y: this.y - 16, vx: 0, vy: 0, life: 0.3, max: 0.3, color: 'rgba(200,120,255,0.6)', size: 8, grav: 0 });
          if (!this.hitDone && d < this.r + p.r + 8) {
            this.hitDone = true;
            p.damage(20, this.x, this.y);
          }
          if (hit || this.dashDist > 340) {
            this.recoverT = hit ? 1.4 : 1.05;
            this.setState(hit ? 'dizzy' : 'recover');
            if (hit) {
              HXH.fx.addShake(4);
              this.say('Oops ♦');
            }
          }
          break;
        }
        case 'recover':
        case 'dizzy':
          if (this.stateT >= this.recoverT * (this.state === 'dizzy' ? 1 : k)) this.setState('stalk');
          break;
        case 'hurt':
          if (this.stateT >= 0.6) {
            this.setState('vanish');
            HXH.fx.burst(this.x, this.y - 16, '#c58aff', 24, 160, 0.6, 4);
            sfx('vanish');
          }
          break;
        case 'vanish':
          this.alpha = Math.max(0, 1 - this.stateT / 0.25);
          if (this.stateT >= 0.5) {
            // reappear somewhere away from the player
            for (let i = 0; i < 20; i++) {
              const a = Math.random() * Math.PI * 2;
              this.x = p.x + Math.cos(a) * 200;
              this.y = p.y + Math.sin(a) * 200;
              this.clampToArena();
              if (U.dist(this.x, this.y, p.x, p.y) > 150) break;
            }
            this.alpha = 1;
            HXH.fx.burst(this.x, this.y - 16, '#c58aff', 24, 160, 0.6, 4);
            this.setState('stalk');
          }
          break;
        case 'beaten':
          break;
      }
    }

    drawTelegraph(ctx) {
      if (!this.active) return;
      ctx.save();
      if (this.state === 'cardWind' || this.state === 'counterWind') {
        const n = this.state === 'cardWind' ? this.cardCount : (this.hits >= 1 ? 3 : 1);
        const spread = this.state === 'cardWind' ? 0.18 * (n - 1) / 2 : 0.15;
        const p = Math.min(1, this.stateT / (this.state === 'cardWind' ? 0.7 * this.speedK : 0.38));
        ctx.strokeStyle = 'rgba(255,80,160,' + (0.25 + p * 0.45) + ')';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        for (let i = 0; i < n; i++) {
          const a = this.lockAng + (n === 1 ? 0 : U.lerp(-spread, spread, i / (n - 1)));
          ctx.beginPath();
          ctx.moveTo(this.x, this.y - 18);
          ctx.lineTo(this.x + Math.cos(a) * 420, this.y - 18 + Math.sin(a) * 420);
          ctx.stroke();
        }
      } else if (this.state === 'dashWind') {
        const p = Math.min(1, this.stateT / (0.65 * this.speedK));
        ctx.translate(this.x, this.y);
        ctx.rotate(this.lockAng);
        ctx.fillStyle = 'rgba(200,80,255,0.15)';
        ctx.fillRect(0, -14, 340, 28);
        ctx.fillStyle = 'rgba(200,80,255,0.45)';
        ctx.fillRect(0, -14, 340 * p, 28);
      }
      ctx.restore();
    }

    draw(ctx) {
      const vulnerable = this.active && (this.state === 'recover' || this.state === 'dizzy');
      if (this.active && (this.state === 'cardWind' || this.state === 'dashWind')) {
        ctx.fillStyle = 'rgba(200,80,255,0.18)';
        R.circle(ctx, this.x, this.y - 20, 26 + Math.sin(this.t * 20) * 3);
      }
      R.drawChar(ctx, 'hisoka', this.x, this.y, { t: this.t, moving: this.moving, face: this.face, flash: this.flash, alpha: this.alpha });
      if (vulnerable) {
        for (let i = 0; i < 3; i++) {
          const a = this.t * 6 + (i * Math.PI * 2) / 3;
          ctx.fillStyle = '#ffe25a';
          R.circle(ctx, this.x + Math.cos(a) * 13, this.y - 52 + Math.sin(a) * 4, 3);
        }
        ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffe25a';
        ctx.fillText('OPENING', this.x, this.y - 62);
      }
    }
  }

  // ============================================================ Projectile
  class Projectile {
    constructor(game, x, y, ang, speed, dmg) {
      this.game = game;
      this.x = x;
      this.y = y;
      this.vx = Math.cos(ang) * speed;
      this.vy = Math.sin(ang) * speed;
      this.dmg = dmg;
      this.life = 2.2;
      this.rot = 0;
      this.suit = U.randInt(0, 3);
      this.dead = false;
    }
    update(dt) {
      this.life -= dt;
      this.rot += dt * 18;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      const g = this.game, p = g.player;
      if (this.life <= 0) this.dead = true;
      if (g.world.blocksShot(this.x, this.y + 14)) {
        this.dead = true;
        HXH.fx.burst(this.x, this.y, '#ddd', 5, 80, 0.25, 2);
      }
      if (!this.dead && !p.dead && U.dist(this.x, this.y, p.x, p.y - 16) < p.r + 6) {
        if (p.damage(this.dmg, this.x - this.vx, this.y - this.vy)) this.dead = true;
      }
    }
    draw(ctx) {
      R.drawCard(ctx, this.x, this.y, this.rot, this.suit);
    }
  }

  // ================================================================= Props
  class Prop {
    constructor(game, def) {
      this.game = game;
      this.id = def.id;
      this.kind = def.kind;
      this.label = def.label;
      this.x = (def.tx + 0.5) * T;
      this.y = (def.ty + 0.5) * T;
      this.tx = def.tx;
      this.ty = def.ty;
      this.solid = !!def.solid;
      this.r = 14;
      this.t = Math.random() * 5;
      this.dead = false;
      this.interactive = ['door', 'sign', 'elevator', 'campfire'].includes(def.kind);
    }
    rect() {
      return [this.tx * T + 2, this.ty * T + 2, this.tx * T + T - 2, this.ty * T + T - 2];
    }
    update(dt) {
      this.t += dt;
      if (this.kind === 'meat') {
        const p = this.game.player;
        if (!p.dead && U.dist(this.x, this.y, p.x, p.y - 6) < 22) {
          if (p.stats.hp >= p.stats.maxHp) return;
          this.dead = true;
          p.heal(35);
          HXH.fx.burst(this.x, this.y, '#ffd28a', 12, 100, 0.5, 3);
          sfx('pickup');
          this.game.flags['got_' + this.id] = true;
        }
      }
      if (this.kind === 'campfire' && Math.random() < 0.3) {
        HXH.fx.parts.push({ x: this.x + U.rand(-6, 6), y: this.y - 4, vx: U.rand(-10, 10), vy: -60, life: 0.6, max: 0.6, color: Math.random() < 0.5 ? '#ffb43a' : '#ff6a2a', size: 3, grav: 0 });
      }
    }
    draw(ctx) {
      const x = this.tx * T, y = this.ty * T;
      switch (this.kind) {
        case 'meat':
          R.drawMeat(ctx, this.x, this.y + 6, this.t);
          break;
        case 'sign':
          ctx.fillStyle = '#5a3a1e';
          ctx.fillRect(x + 14, y + 12, 4, 20);
          ctx.fillStyle = '#c89a5a';
          ctx.fillRect(x + 3, y + 2, 26, 14);
          ctx.fillStyle = '#5a3a1e';
          ctx.fillRect(x + 6, y + 6, 20, 2);
          ctx.fillRect(x + 6, y + 10, 14, 2);
          break;
        case 'door':
          ctx.fillStyle = '#4a2a18';
          ctx.fillRect(x + 2, y - 4, T - 4, T + 2);
          ctx.fillStyle = '#7a4a2a';
          ctx.fillRect(x + 5, y - 1, T - 10, T - 3);
          ctx.fillStyle = '#e8c35a';
          R.circle(ctx, x + T - 9, y + 14, 2);
          // noren curtain + sign
          ctx.fillStyle = '#2a4a8a';
          ctx.fillRect(x - 6, y - 4, T + 12, 9);
          ctx.fillStyle = '#c33';
          ctx.fillRect(x - 10, y - 26, T + 20, 16);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 11px "Trebuchet MS", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('GOHAN', x + T / 2, y - 14);
          break;
        case 'elevator':
          ctx.fillStyle = '#6a6e78';
          ctx.fillRect(x - 6, y - 2, T + 12, T + 2);
          ctx.fillStyle = '#8c919c';
          ctx.fillRect(x - 3, y + 1, T / 2 + 2, T - 2);
          ctx.fillRect(x + T / 2 + 1, y + 1, T / 2 + 2, T - 2);
          ctx.fillStyle = '#e04a3a';
          ctx.fillRect(x + T / 2 - 3, y - 8, 6, 4);
          break;
        case 'campfire':
          ctx.fillStyle = 'rgba(255,160,60,0.18)';
          R.circle(ctx, this.x, this.y, 30 + Math.sin(this.t * 8) * 2);
          ctx.fillStyle = '#5a3a1e';
          ctx.fillRect(this.x - 10, this.y + 4, 20, 4);
          ctx.fillStyle = '#ff8a2a';
          ctx.beginPath();
          ctx.moveTo(this.x - 7, this.y + 5);
          ctx.quadraticCurveTo(this.x, this.y - 18 - Math.sin(this.t * 10) * 3, this.x + 7, this.y + 5);
          ctx.fill();
          ctx.fillStyle = '#ffd25a';
          ctx.beginPath();
          ctx.moveTo(this.x - 3, this.y + 5);
          ctx.quadraticCurveTo(this.x, this.y - 8, this.x + 3, this.y + 5);
          ctx.fill();
          break;
      }
    }
  }

  // ================================================================= Gates
  class Gate {
    constructor(game, def) {
      this.game = game;
      this.id = def.id;
      this.look = def.look;
      this.closedFn = def.closed;
      this.x0 = def.tx * T;
      this.y0 = def.ty * T;
      this.x1 = (def.tx + def.tw) * T;
      this.y1 = (def.ty + def.th) * T;
      this.t = 0;
      this.anim = this.closed ? 1 : 0;
      this.y = this.y1;
    }
    get closed() {
      return !!this.closedFn(this.game.flags);
    }
    update(dt) {
      this.t += dt;
      const target = this.closed ? 1 : 0;
      if (target !== Math.round(this.anim) && Math.abs(this.anim - target) > 0.99) sfx('open');
      this.anim = U.clamp(this.anim + (target ? dt : -dt) * 2.5, 0, 1);
    }
    draw(ctx) {
      if (this.anim <= 0) return;
      const a = this.anim, w = this.x1 - this.x0, h = this.y1 - this.y0;
      ctx.save();
      ctx.globalAlpha = a;
      if (this.look === 'fence') {
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(this.x0, this.y0 + 4, w, 5);
        ctx.fillRect(this.x0, this.y0 + 20, w, 5);
        ctx.fillStyle = '#8a6238';
        for (let x = this.x0 + 2; x < this.x1; x += 10) ctx.fillRect(x, this.y0 - 6 + (1 - a) * 30, 6, h + 6);
      } else if (this.look === 'stone') {
        const off = (1 - a) * h;
        ctx.fillStyle = '#56525e';
        ctx.fillRect(this.x0, this.y0, w, h - off);
        ctx.fillStyle = '#6a6672';
        for (let y = this.y0; y < this.y1 - off; y += 16) ctx.fillRect(this.x0 + 3, y + 2, w - 6, 12);
      } else if (this.look === 'barrier') {
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = 'rgba(200,90,255,' + (0.18 + 0.12 * Math.sin(this.t * 6 + i)) + ')';
          ctx.fillRect(this.x0, this.y0 - 30 + i * 8, w, 8);
        }
        ctx.fillStyle = 'rgba(255,150,220,0.7)';
        for (let i = 0; i < 4; i++) R.circle(ctx, this.x0 + ((this.t * 40 + i * 25) % w), this.y0 + 10 - ((this.t * 30 + i * 9) % 34), 2);
      }
      ctx.restore();
    }
  }

  // ====================================================== Rockfall hazard
  class Rockfall {
    constructor(game, def) {
      this.game = game;
      this.bx = (def.tx + 0.5) * T;
      this.by = (def.ty + 0.5) * T;
      this.x = this.bx;
      this.y = this.by;
      this.phase = 'wait';
      this.timer = U.rand(0.5, 3);
      this.rockY = 0;
      this.dead = false;
    }
    update(dt) {
      if (this.game.isLocked()) return;
      this.timer -= dt;
      if (this.phase === 'wait' && this.timer <= 0) {
        this.phase = 'warn';
        this.timer = 1.0;
        this.x = this.bx + U.rand(-20, 20);
        this.y = this.by + U.rand(-20, 20);
      } else if (this.phase === 'warn' && this.timer <= 0) {
        this.phase = 'impact';
        this.timer = 0.5;
        const p = this.game.player;
        HXH.fx.burst(this.x, this.y, '#8a8278', 14, 160, 0.5, 4, 300);
        sfx('boom');
        if (U.dist(this.x, this.y, p.x, p.y) < 30) {
          if (p.damage(16, this.x, this.y)) this.game.stats.hazardHits++;
        }
        HXH.fx.addShake(3);
      } else if (this.phase === 'impact' && this.timer <= 0) {
        this.phase = 'wait';
        this.timer = U.rand(2.5, 4.5);
      }
    }
    drawGround(ctx) {
      if (this.phase === 'warn') {
        const p = 1 - this.timer / 1.0;
        ctx.fillStyle = 'rgba(0,0,0,' + (0.2 + p * 0.35) + ')';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, 10 + p * 20, 5 + p * 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,60,40,' + p + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, 30, 14, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (this.phase === 'impact') {
        ctx.fillStyle = 'rgba(110,104,96,' + this.timer * 2 + ')';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, 16, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    draw(ctx) {
      if (this.phase === 'warn' && this.timer < 0.4) {
        const fall = (this.timer / 0.4) * 300;
        ctx.fillStyle = '#7a746a';
        R.circle(ctx, this.x, this.y - 12 - fall, 11);
        ctx.fillStyle = '#9a948a';
        R.circle(ctx, this.x - 3, this.y - 15 - fall, 5);
      }
    }
  }

  HXH.entities = { Player, NPC, Enemy, Hisoka, Projectile, Prop, Gate, Rockfall, ENEMY_TYPES, moveEntity };
})();
