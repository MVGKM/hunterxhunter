// Procedural chiptune music and sound effects (WebAudio, no asset files).
(function () {
  'use strict';
  const HXH = window.HXH;
  let ctx = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null;
  let muted = HXH.store.get('hxh_muted') === true;
  let wanted = null, current = null, step = 0, nextTime = 0;

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function tone(freq, start, dur, type, vol, dest, slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(dest);
    o.start(start);
    o.stop(start + dur + 0.05);
  }

  function noise(start, dur, vol, dest, freq) {
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf;
    f.type = 'bandpass';
    f.frequency.value = freq;
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(start);
    src.stop(start + dur + 0.05);
  }

  const SFX = {
    swing: (t) => noise(t, 0.12, 0.35, sfxGain, 1600),
    hit: (t) => { tone(200, t, 0.12, 'square', 0.25, sfxGain, 60); noise(t, 0.08, 0.4, sfxGain, 900); },
    crit: (t) => { tone(500, t, 0.18, 'square', 0.2, sfxGain, 120); noise(t, 0.12, 0.5, sfxGain, 1200); },
    hurt: (t) => tone(320, t, 0.25, 'sawtooth', 0.22, sfxGain, 80),
    dodge: (t) => noise(t, 0.16, 0.25, sfxGain, 3200),
    blip: (t) => tone(620 + Math.random() * 60, t, 0.035, 'square', 0.04, sfxGain),
    select: (t) => tone(880, t, 0.06, 'square', 0.1, sfxGain),
    deny: (t) => tone(180, t, 0.18, 'square', 0.14, sfxGain, 140),
    pickup: (t) => { tone(660, t, 0.08, 'square', 0.14, sfxGain); tone(990, t + 0.08, 0.14, 'square', 0.14, sfxGain); },
    levelup: (t) => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * 0.08, 0.22, 'square', 0.12, sfxGain)),
    open: (t) => tone(160, t, 0.45, 'triangle', 0.3, sfxGain, 420),
    card: (t) => { noise(t, 0.07, 0.3, sfxGain, 5200); tone(1400, t, 0.05, 'square', 0.04, sfxGain, 700); },
    boom: (t) => { noise(t, 0.45, 0.5, sfxGain, 300); tone(90, t, 0.4, 'sine', 0.45, sfxGain, 35); },
    warn: (t) => tone(980, t, 0.08, 'square', 0.06, sfxGain),
    bell: (t) => { [0, 0.35].forEach((d) => { tone(1046, t + d, 0.9, 'sine', 0.25, sfxGain); tone(1568, t + d, 0.6, 'sine', 0.1, sfxGain); }); },
    vanish: (t) => tone(1200, t, 0.25, 'sine', 0.12, sfxGain, 300),
    objective: (t) => { tone(784, t, 0.1, 'triangle', 0.18, sfxGain); tone(1175, t + 0.1, 0.25, 'triangle', 0.18, sfxGain); },
  };

  // Tracks: 8th-note steps. null = rest.
  const _ = null;
  const TRACKS = {
    title: {
      bpm: 100, leadWave: 'triangle', leadVol: 0.12,
      bass: [45, _, 52, _, 57, _, 52, _, 41, _, 48, _, 53, _, 48, _, 43, _, 50, _, 55, _, 50, _, 40, _, 47, _, 52, _, 56, _],
      lead: [69, _, _, 72, 76, _, 74, 72, 72, _, _, 69, 65, _, _, _, 67, _, 71, 74, 79, _, 77, 74, 76, _, _, _, 80, _, _, _],
    },
    city: {
      bpm: 126, drums: true,
      bass: [48, _, 55, _, 48, _, 55, _, 45, _, 52, _, 45, _, 52, _, 41, _, 48, _, 41, _, 48, _, 43, _, 50, _, 43, _, 47, _],
      lead: [72, _, 76, 79, 76, _, 74, 72, 69, _, 72, 76, 74, _, 72, 69, 65, _, 69, 72, 74, 72, 69, 65, 67, _, 71, 74, 79, _, 77, 74],
    },
    tunnel: {
      bpm: 144, drums: true, leadVol: 0.07,
      bass: [45, 45, 57, 45, 45, 57, 45, 57, 43, 43, 55, 43, 43, 55, 43, 55, 41, 41, 53, 41, 41, 53, 41, 53, 40, 40, 52, 40, 44, 56, 44, 56],
      lead: [69, _, _, 72, _, 71, _, 69, 67, _, _, 71, _, 69, _, 67, 65, _, 69, _, 72, _, 74, _, 76, _, _, _, 80, _, _, _],
    },
    swamp: {
      bpm: 84, leadWave: 'sine', leadVol: 0.1, leadLen: 1.8,
      bass: [38, _, _, _, 45, _, _, _, 39, _, _, _, 46, _, _, _, 38, _, _, _, 45, _, _, _, 37, _, _, _, 44, _, _, _],
      lead: [74, _, _, 73, _, _, _, _, 77, _, 76, _, _, _, _, _, 74, _, _, 70, _, _, 69, _, 73, _, _, _, _, _, _, _],
    },
    hisoka: {
      bpm: 168, drums: true, leadVol: 0.07,
      bass: [40, 40, 52, 40, 41, 41, 53, 41, 40, 40, 52, 40, 46, 46, 58, 46, 40, 40, 52, 40, 41, 41, 53, 41, 43, 43, 55, 43, 46, 47, 46, 47],
      lead: [76, _, 77, _, 76, _, 70, _, 76, _, 77, 79, 82, _, _, _, 76, _, 77, _, 76, _, 70, _, 71, 70, 67, 64, 63, _, 64, _],
    },
    victory: {
      bpm: 132, drums: true,
      bass: [48, _, 48, _, 53, _, 53, _, 55, _, 55, _, 48, _, 48, _],
      lead: [72, 76, 79, 84, _, 81, 84, _, 79, _, 83, 86, 84, _, _, _],
    },
  };

  const A = (HXH.audio = {});

  A.unlock = function () {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      ctx = null;
      return;
    }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.4;
    musicGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.8;
    sfxGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (wanted) A.music(wanted, true);
  };

  A.sfx = function (name) {
    if (!ctx || muted || !SFX[name]) return;
    SFX[name](ctx.currentTime + 0.005);
  };

  A.music = function (name, force) {
    if (name === wanted && !force) return;
    wanted = name;
    if (!ctx) return;
    current = TRACKS[name] || null;
    step = 0;
    nextTime = ctx.currentTime + 0.08;
  };

  A.toggleMute = function () {
    muted = !muted;
    HXH.store.set('hxh_muted', muted);
    if (master) master.gain.value = muted ? 0 : 0.6;
    return muted;
  };
  A.isMuted = () => muted;

  setInterval(() => {
    if (!ctx || !current || ctx.state !== 'running') return;
    const spb = 60 / current.bpm / 2;
    if (nextTime < ctx.currentTime - 0.25) nextTime = ctx.currentTime + 0.02;
    while (nextTime < ctx.currentTime + 0.15) {
      const i = step % current.bass.length;
      const b = current.bass[i];
      if (b) tone(midi(b), nextTime, spb * 0.9, 'triangle', 0.22, musicGain);
      const l = current.lead[step % current.lead.length];
      if (l) tone(midi(l), nextTime, spb * (current.leadLen || 0.8), current.leadWave || 'square', current.leadVol || 0.08, musicGain);
      if (current.drums) {
        if (step % 4 === 0) tone(110, nextTime, 0.12, 'sine', 0.35, musicGain, 40);
        if (step % 4 === 2) noise(nextTime, 0.06, 0.12, musicGain, 7000);
      }
      nextTime += spb;
      step++;
    }
  }, 25);
})();
