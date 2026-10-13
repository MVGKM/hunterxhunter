// Procedural character / creature / prop drawing. Everything is vector-drawn so
// there are no asset files to load; swap these for sprite sheets later.
(function () {
  'use strict';
  const HXH = window.HXH;

  const LOOKS = {
    gon: { skin: '#f3c9a2', hair: '#161616', hairStyle: 'gon', shirt: '#2f9a44', sleeve: '#2f9a44', pants: '#2a8a3c', shoes: '#c96a2a', accent: '#1f6a2c' },
    killua: { skin: '#f6d8c0', hair: '#eef2f8', hairStyle: 'fluffy', shirt: '#e4e8f0', sleeve: '#5c6f92', pants: '#55688a', shoes: '#6e4f33', eye: '#3a6ea5' },
    kurapika: { skin: '#f4d2b4', hair: '#f0cd62', hairStyle: 'bob', shirt: '#2f55b0', sleeve: '#2f55b0', pants: '#2f55b0', shoes: '#3a2a20', tabard: '#ebe5d2', eye: '#5a3b2a' },
    leorio: { skin: '#e9bf98', hair: '#2a2420', hairStyle: 'short', shirt: '#28344d', sleeve: '#28344d', pants: '#28344d', shoes: '#151515', tall: 1.18, glasses: true, tie: '#141414', collar: '#f2f2f2' },
    hisoka: { skin: '#f6e1d3', hair: '#d9443a', hairStyle: 'slick', shirt: '#ece6f4', sleeve: '#ece6f4', pants: '#7c49ad', shoes: '#4a2a6a', tall: 1.16, facepaint: true, eye: '#c9a227', suit: '#e06aa8' },
    satotz: { skin: '#f1d9c4', hair: '#7a54c4', hairStyle: 'curl', shirt: '#2c2a3a', sleeve: '#2c2a3a', pants: '#3a3450', shoes: '#151515', tall: 1.22, mustache: '#7a54c4', noMouth: true, collar: '#f2f2f2' },
    fakesatotz: { skin: '#c9b29b', hair: '#5d466e', hairStyle: 'curl', shirt: '#3a3328', sleeve: '#3a3328', pants: '#3e3428', shoes: '#151515', tall: 1.1, mustache: '#5d466e', noMouth: true },
    tonpa: { skin: '#e7b88e', hair: '#6c4528', hairStyle: 'short', shirt: '#86704a', sleeve: '#86704a', pants: '#4a3d2c', shoes: '#2a2018', wide: 1.3, tall: 0.92, nose: true },
    beans: { skin: '#76c271', hair: null, hairStyle: 'bean', shirt: '#262626', sleeve: '#262626', pants: '#262626', shoes: '#111', tall: 0.8, collar: '#f2f2f2', tie: '#c33' },
    navigator: { skin: '#e8c3a2', hair: '#bdbdbd', hairStyle: 'bun', shirt: '#8a5a9a', sleeve: '#8a5a9a', pants: '#5a3a6a', shoes: '#222', tall: 0.9 },
    cook: { skin: '#e3b48a', hair: '#ffffff', hairStyle: 'chef', shirt: '#f4f4f4', sleeve: '#f4f4f4', pants: '#444', shoes: '#222' },
    villager: { skin: '#e8c09c', hair: '#5a3b26', hairStyle: 'short', shirt: '#b0703a', sleeve: '#b0703a', pants: '#3e4a5e', shoes: '#222' },
    villager2: { skin: '#d9a77d', hair: '#222', hairStyle: 'bun', shirt: '#3d8f8a', sleeve: '#3d8f8a', pants: '#6b4e3a', shoes: '#222' },
    fisher: { skin: '#cf9c72', hair: '#888', hairStyle: 'short', shirt: '#2d6a8c', sleeve: '#2d6a8c', pants: '#34404f', shoes: '#222', wide: 1.1 },
    thug: { skin: '#dcae86', hair: '#4a2a1a', hairStyle: 'mohawk', shirt: '#6b2626', sleeve: '#dcae86', pants: '#2b2b2b', shoes: '#111', wide: 1.15 },
    thug2: { skin: '#c8956a', hair: '#1d1d1d', hairStyle: 'short', shirt: '#3a3a3a', sleeve: '#3a3a3a', pants: '#5a2a2a', shoes: '#111', wide: 1.1, glasses: true },
    examinee: { skin: '#e0b38a', hair: '#3d3d3d', hairStyle: 'short', shirt: '#4d5c38', sleeve: '#4d5c38', pants: '#3a3a2a', shoes: '#1a1a1a' },
    examinee2: { skin: '#c99872', hair: '#7a2a2a', hairStyle: 'mohawk', shirt: '#2f4a6a', sleeve: '#2f4a6a', pants: '#222', shoes: '#111', wide: 1.1 },
    todo: { skin: '#d8a47a', hair: '#111', hairStyle: 'mohawk', shirt: '#7a2020', sleeve: '#d8a47a', pants: '#202020', shoes: '#111', wide: 1.45, tall: 1.15 },
    pokkle: { skin: '#f0c9a6', hair: '#c47a2a', hairStyle: 'short', shirt: '#c8a050', sleeve: '#c8a050', pants: '#5a6a3a', shoes: '#3a2a1a', tall: 0.95, hat: '#4a7a3a' },
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHair(ctx, L, hy) {
    ctx.fillStyle = L.hair;
    switch (L.hairStyle) {
      case 'gon': {
        ctx.beginPath();
        ctx.moveTo(-10, hy + 2);
        ctx.lineTo(-14, hy - 8);
        ctx.lineTo(-8, hy - 8);
        ctx.lineTo(-10, hy - 19);
        ctx.lineTo(-3, hy - 11);
        ctx.lineTo(0, hy - 23);
        ctx.lineTo(4, hy - 11);
        ctx.lineTo(10, hy - 19);
        ctx.lineTo(9, hy - 7);
        ctx.lineTo(15, hy - 6);
        ctx.lineTo(9, hy - 1);
        ctx.lineTo(6, hy - 4);
        ctx.lineTo(-6, hy - 5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, hy, 8.6, Math.PI, 0);
        ctx.fill();
        break;
      }
      case 'fluffy':
        [[-6, -6, 5.5], [0, -9, 6.5], [6, -6, 5.5], [-8, -1, 4.5], [8, -1, 4], [-3, -3, 5], [4, -4, 5]].forEach(([x, y, r]) => circle(ctx, x, hy + y, r));
        break;
      case 'bob':
        ctx.beginPath();
        ctx.arc(0, hy - 1, 9.5, Math.PI, 0);
        ctx.lineTo(9.5, hy + 7);
        ctx.lineTo(5, hy + 7);
        ctx.lineTo(5, hy - 3);
        ctx.lineTo(-9.5, hy - 3);
        ctx.lineTo(-9.5, hy + 7);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(-9.5, hy - 3, 5, 10);
        break;
      case 'short':
        ctx.beginPath();
        ctx.arc(0, hy - 1, 8.8, Math.PI * 1.05, -0.05);
        ctx.lineTo(9, hy - 3);
        ctx.lineTo(-9, hy - 2);
        ctx.closePath();
        ctx.fill();
        if (L.hat) {
          ctx.fillStyle = L.hat;
          ctx.fillRect(-10, hy - 9, 20, 4);
          ctx.fillRect(-7, hy - 14, 14, 6);
        }
        break;
      case 'slick':
        ctx.beginPath();
        ctx.moveTo(8, hy - 3);
        ctx.lineTo(4, hy - 10);
        ctx.lineTo(-4, hy - 11);
        ctx.lineTo(-16, hy - 16);
        ctx.lineTo(-11, hy - 8);
        ctx.lineTo(-17, hy - 7);
        ctx.lineTo(-10, hy - 3);
        ctx.lineTo(-14, hy + 1);
        ctx.lineTo(-7, hy + 2);
        ctx.closePath();
        ctx.fill();
        break;
      case 'curl':
        ctx.beginPath();
        ctx.arc(0, hy - 2, 9, Math.PI, 0);
        ctx.fill();
        circle(ctx, -9, hy - 1, 4);
        circle(ctx, -6, hy - 9, 5);
        circle(ctx, 2, hy - 11, 5);
        break;
      case 'mohawk':
        ctx.fillRect(-3, hy - 15, 6, 9);
        ctx.beginPath();
        ctx.arc(0, hy, 8.4, Math.PI * 1.15, -0.15);
        ctx.fill();
        break;
      case 'bun':
        ctx.beginPath();
        ctx.arc(0, hy - 1, 8.8, Math.PI, 0);
        ctx.fill();
        circle(ctx, -8, hy - 8, 4.5);
        break;
      case 'chef':
        ctx.fillStyle = '#fff';
        ctx.fillRect(-8, hy - 16, 16, 10);
        circle(ctx, -5, hy - 17, 5);
        circle(ctx, 4, hy - 18, 6);
        break;
      default:
        break;
    }
  }

  // Draws a humanoid with feet at (x, y). o: { t, moving, face(-1|1), dirY, scale, alpha, flash, lying }
  function drawChar(ctx, lookId, x, y, o = {}) {
    const L = LOOKS[lookId] || LOOKS.villager;
    const t = o.t || 0, face = o.face || 1, s = o.scale || 1;
    const tall = L.tall || 1, wide = L.wide || 1;
    ctx.save();
    ctx.translate(x, y);
    if (!o.noShadow) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(0, 0, (o.lying ? 20 : 11 * wide) * s, 4.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.lying) {
      ctx.translate(0, -4 * s);
      ctx.rotate(-Math.PI / 2 * face);
      ctx.translate(0, 10 * s);
    }
    ctx.scale(face * s, s);

    const moving = o.moving;
    const bob = moving ? Math.abs(Math.sin(t * 12)) * 2 : Math.sin(t * 2.5) * 0.6;
    const st = moving ? Math.sin(t * 12) * 3 : 0;
    const legH = 9 * tall;

    ctx.fillStyle = L.pants;
    ctx.fillRect(-5 * wide, -legH, 4, legH - Math.max(0, st));
    ctx.fillRect(1 * wide, -legH, 4, legH - Math.max(0, -st));
    ctx.fillStyle = L.shoes;
    ctx.fillRect(-5 * wide - 1, -3 - Math.max(0, st), 6, 3);
    ctx.fillRect(1 * wide, -3 - Math.max(0, -st), 6, 3);

    const by = -legH - bob + 1;
    const th = 13 * tall, tw = 16 * wide;
    // back arm
    const sw = moving ? Math.sin(t * 12) * 3 : 0;
    ctx.fillStyle = L.sleeve || L.shirt;
    ctx.fillRect(-tw / 2 - 2, by - th + 3 - sw, 4, 9);
    ctx.fillStyle = L.shirt;
    roundRect(ctx, -tw / 2, by - th, tw, th, 4);
    ctx.fill();
    if (L.accent) {
      ctx.fillStyle = L.accent;
      ctx.fillRect(-tw / 2, by - 4, tw, 3);
    }
    if (L.suit) {
      ctx.fillStyle = L.suit;
      ctx.beginPath();
      ctx.moveTo(-3, by - th + 3);
      ctx.lineTo(0, by - th + 7);
      ctx.lineTo(3, by - th + 3);
      ctx.lineTo(0, by - th + 11);
      ctx.fill();
      ctx.fillStyle = '#4a7ad0';
      ctx.fillRect(3, by - 6, 3, 3);
    }
    if (L.tabard) {
      ctx.fillStyle = L.tabard;
      ctx.fillRect(-tw / 2 + 3, by - th + 2, tw - 6, th + 4);
      ctx.fillStyle = '#2f55b0';
      ctx.fillRect(-1.5, by - th + 2, 3, th + 4);
    }
    if (L.collar) {
      ctx.fillStyle = L.collar;
      ctx.beginPath();
      ctx.moveTo(-4, by - th);
      ctx.lineTo(0, by - th + 5);
      ctx.lineTo(4, by - th);
      ctx.fill();
    }
    if (L.tie) {
      ctx.fillStyle = L.tie;
      ctx.fillRect(-1, by - th + 3, 2, 7);
    }
    // front arm + hand
    ctx.fillStyle = L.sleeve || L.shirt;
    ctx.fillRect(tw / 2 - 2, by - th + 3 + sw, 4, 8);
    ctx.fillStyle = L.skin;
    ctx.fillRect(tw / 2 - 2, by - th + 10 + sw, 4, 3);

    // head
    const hy = by - th - 7;
    ctx.fillStyle = L.skin;
    if (L.hairStyle === 'bean') {
      ctx.beginPath();
      ctx.ellipse(0, hy - 2, 7, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    } else circle(ctx, 0, hy, 8);

    const facingAway = (o.dirY || 0) < -0.7;
    if (!facingAway) {
      ctx.fillStyle = L.eye || '#222';
      ctx.fillRect(1, hy - 1, 2, 3);
      ctx.fillRect(5, hy - 1, 2, 3);
      if (L.glasses) {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, hy - 2, 8, 3);
      }
      if (L.mustache) {
        ctx.fillStyle = L.mustache;
        ctx.fillRect(1, hy + 3, 8, 2);
        circle(ctx, 9, hy + 2, 1.6);
        circle(ctx, 1, hy + 2, 1.6);
      } else if (!L.noMouth) {
        ctx.fillStyle = 'rgba(80,30,20,0.7)';
        ctx.fillRect(3, hy + 4, 3, 1);
      }
      if (L.facepaint) {
        ctx.fillStyle = '#4b7fd6';
        ctx.beginPath();
        ctx.moveTo(-2, hy + 1);
        ctx.lineTo(-1, hy + 5);
        ctx.lineTo(-3, hy + 5);
        ctx.fill();
        ctx.fillStyle = '#e04080';
        ctx.fillRect(6, hy + 2, 2, 2);
      }
      if (L.nose) {
        ctx.fillStyle = '#d49a70';
        circle(ctx, 8, hy + 1, 2.2);
      }
    }
    drawHair(ctx, L, hy);

    if (o.flash) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255,255,255,' + o.flash + ')';
      ctx.fillRect(-20, hy - 30, 40, 70);
    }
    ctx.restore();
  }

  // Man-faced ape (Hito-Mo-Doki) from the Milsy Wetlands.
  function drawApe(ctx, x, y, o = {}) {
    const t = o.t || 0, face = o.face || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.scale(face, 1);
    const bob = o.moving ? Math.abs(Math.sin(t * 10)) * 3 : Math.sin(t * 3);
    const crouch = o.crouch || 0;
    ctx.fillStyle = '#5b3a24';
    ctx.fillRect(-10, -10, 6, 10);
    ctx.fillRect(4, -10, 6, 10);
    ctx.fillStyle = '#6e4a2e';
    ctx.beginPath();
    ctx.ellipse(0, -18 - bob + crouch, 14, 12 - crouch * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // long arms
    ctx.fillStyle = '#5b3a24';
    ctx.fillRect(10, -26 - bob + crouch, 5, 24);
    ctx.fillRect(-15, -26 - bob + crouch, 5, 24);
    // eerie human face
    const hy = -32 - bob + crouch;
    ctx.fillStyle = '#6e4a2e';
    circle(ctx, 2, hy, 10);
    ctx.fillStyle = '#e2c7a8';
    ctx.beginPath();
    ctx.ellipse(5, hy + 1, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.fillRect(4, hy - 1, 2, 2);
    ctx.fillRect(8, hy - 1, 2, 2);
    ctx.fillStyle = '#7a2a2a';
    ctx.fillRect(4, hy + 4, 5, 1.5);
    if (o.flash) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255,255,255,' + o.flash + ')';
      ctx.fillRect(-20, -50, 40, 50);
    }
    ctx.restore();
  }

  function drawFrog(ctx, x, y, o = {}) {
    const t = o.t || 0, face = o.face || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.scale(face, 1);
    const puff = Math.sin(t * 4) * 1.5 + (o.crouch || 0);
    ctx.fillStyle = '#3f7a3a';
    ctx.beginPath();
    ctx.ellipse(0, -11, 17 + puff * 0.3, 11 - puff * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9ec46a';
    ctx.beginPath();
    ctx.ellipse(4, -7, 10, 5 + puff * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f7a3a';
    circle(ctx, 2, -21, 5);
    circle(ctx, 11, -20, 5);
    ctx.fillStyle = '#f2e25a';
    circle(ctx, 2, -22, 3);
    circle(ctx, 11, -21, 3);
    ctx.fillStyle = '#111';
    ctx.fillRect(1, -23, 2, 3);
    ctx.fillRect(10, -22, 2, 3);
    ctx.fillStyle = '#2c5a2a';
    for (let i = 0; i < 4; i++) circle(ctx, -10 + i * 5, -15 + (i % 2) * 4, 1.6);
    if (o.flash) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255,255,255,' + o.flash + ')';
      ctx.fillRect(-20, -30, 40, 30);
    }
    ctx.restore();
  }

  function drawCard(ctx, x, y, rot, suit) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-5, -7, 10, 14);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(-5, -7, 10, 14);
    ctx.fillStyle = suit === 1 || suit === 2 ? '#d22' : '#111';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(['♠', '♥', '♦', '♣'][suit || 0], 0, 3);
    ctx.restore();
  }

  function drawMeat(ctx, x, y, t) {
    const b = Math.sin(t * 4) * 2;
    ctx.save();
    ctx.translate(x, y - 8 + b);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 10 - b, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(-0.5);
    ctx.fillStyle = '#f2ead8';
    ctx.fillRect(4, -2, 9, 4);
    circle(ctx, 13, -2, 2.5);
    circle(ctx, 13, 2, 2.5);
    ctx.fillStyle = '#b5532c';
    ctx.beginPath();
    ctx.ellipse(-2, 0, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d97a45';
    ctx.beginPath();
    ctx.ellipse(-4, -2, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Head-and-shoulders portrait, drawn into a box (used by the dialogue UI).
  function drawPortrait(ctx, lookId, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    ctx.clip();
    const scale = size / 26;
    if (lookId === 'ape') {
      const sc = size / 34;
      ctx.translate(x + size * 0.45, y + size * 0.5 + 32 * sc);
      ctx.scale(sc, sc);
      drawApe(ctx, 0, 0, {});
    } else {
      const L = LOOKS[lookId] || LOOKS.villager;
      const headOffset = (9 * (L.tall || 1) + 13 * (L.tall || 1) + 7) * scale;
      drawChar(ctx, lookId, x + size * 0.45, y + size * 0.55 + headOffset, { scale, noShadow: true });
    }
    ctx.restore();
  }

  HXH.render = { LOOKS, roundRect, circle, drawChar, drawApe, drawFrog, drawCard, drawMeat, drawPortrait };
})();
