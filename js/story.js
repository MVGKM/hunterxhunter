// Chapter 1 — The Hunter Exam. All quest logic, cutscenes and dialogue live here.
(function () {
  'use strict';
  const HXH = window.HXH;
  const T = HXH.TILE;
  const U = HXH.util;
  let g = null;

  const say = (who, text) => HXH.dialog.say(who, text);
  const choose = (who, text, options) => HXH.dialog.choose(who, text, options);
  const wait = (s) => HXH.wait(s);
  const sfx = (n) => HXH.audio.sfx(n);
  const px = (tx) => (tx + 0.5) * T;
  const py = (ty) => (ty + 0.7) * T;
  const f = () => g.flags;

  // Cycles through flavour lines for repeat conversations.
  const counters = {};
  function cycle(id, lines) {
    const i = (counters[id] = ((counters[id] ?? -1) + 1) % lines.length);
    return lines[i];
  }

  function addNpc(id, look, x, y, face = 1) {
    let n = g.npc(id);
    if (!n) {
      n = new HXH.entities.NPC(g, { id, look, tx: 0, ty: 0, face });
      g.npcs.push(n);
    }
    n.x = x;
    n.y = y;
    n.hidden = false;
    n.alpha = 1;
    return n;
  }

  function poof(n, color = '#c58aff') {
    HXH.fx.burst(n.x, n.y - 16, color, 20, 140, 0.6, 4);
    n.hidden = true;
  }

  function remaining(group) {
    return g.enemies.filter((e) => e.group === group && !e.dead).length;
  }

  const S = (HXH.story = {
    init(game) {
      g = game;
    },

    onRespawn() {
      // A failed boss attempt restarts the encounter; a failed marathon restarts the run.
      if (f().hisoka_fight && !f().hisoka_done) f().hisoka_fight = false;
    },

    // ======================================================== map entry
    onEnterMap(id, opts = {}) {
      if (id === 'zaban') enterZaban(opts);
      else if (id === 'tunnel') enterTunnel(opts);
      else if (id === 'swamp') enterSwamp(opts);
    },

    onInteract(id, target) {
      const h = INTERACT[id];
      if (h) g.scene(() => h(target));
      else if (target.look && HXH.SPEAKERS[target.look]) g.scene(() => say(target.look, '...'));
    },

    onTrigger(id) {
      const h = TRIGGERS[id];
      if (h) h();
    },

    onEnemyKilled(e) {
      if (e.group === 'alley') {
        const left = remaining('alley');
        if (left > 0) g.setObjective('Defeat the Applicant Hunters in the back alley (' + (2 - left) + '/2)');
        else g.scene(alleyCleared);
      }
    },

    onBossDefeated() {
      g.scene(hisokaDefeated);
    },

    onTimerExpired() {
      g.failWith('YOU LOST SIGHT OF SATOTZ', 'Applicants who fall behind fail the First Phase... Try again!');
    },
  });

  // ================================================================ ZABAN
  function placeFriendsZaban() {
    const l = g.npc('leorio'), k = g.npc('kurapika');
    if (f().thugs_cleared) {
      l.x = px(22);
      l.y = py(5);
      k.x = px(26);
      k.y = py(6);
    } else if (f().met_friends) {
      l.x = px(22);
      l.y = py(10);
      k.x = px(26);
      k.y = py(10);
    }
  }

  function enterZaban(opts) {
    placeFriendsZaban();
    if (f().intro_done) return;
    g.scene(async () => {
      g.fade = 1;
      await g.fadeTo(0, 0.8);
      g.showBanner('CHAPTER 1', 'The Hunter Exam', 3.2);
      await wait(3.4);
      await say('narrator', 'Each year, millions dream of becoming Hunters — elite adventurers who track down treasure, monsters and lost wonders.');
      await say('narrator', 'Only a handful pass the Hunter Exam. Many never even find the exam site.');
      await say('gon', 'Zaban City! The exam is somewhere around here. Dad... I\'m going to become a Hunter, just like you!');
      await say('gon', 'Those two from the ferry are in the park. Maybe they know where to go.');
      f().intro_done = true;
      g.setObjective('Talk to the other applicants in the park (Leorio or Kurapika).');
      await say('tip', 'Move with WASD or the arrow keys. Press E to talk to people and examine things.');
      g.setCheckpoint();
    });
  }

  async function meetFriends() {
    await say('leorio', 'Hey, kid! You were on that ferry too. Don\'t tell me you\'re heading to the Hunter Exam?');
    await say('gon', 'Yep! I\'m Gon, from Whale Island. My dad is a Hunter — I want to find out why he chose that life.');
    await say('leorio', 'Name\'s Leorio. Me? I\'m in it for the money. Hunters make a fortune.');
    await say('kurapika', 'I\'m Kurapika. Our captain said the site is hidden. Applicants need a Navigator to reach it.');
    await say('kurapika', 'Rumour says an old woman near the back alley guides applicants — but only those who pass her test.');
    await say('gon', 'Then let\'s go find her!');
    f().met_friends = true;
    g.setObjective('Find the Navigator near the back alley in the north of town.');
    // They head to the alley on their own.
    const l = g.npc('leorio'), k = g.npc('kurapika');
    (async () => {
      await l.moveTo(px(9), py(18), 110);
      await l.moveTo(px(22), py(18), 110);
      await l.moveTo(px(22), py(10), 110);
    })();
    (async () => {
      await k.moveTo(px(11), py(18), 110);
      await k.moveTo(px(26), py(18), 110);
      await k.moveTo(px(26), py(10), 110);
    })();
  }

  async function navigatorQuiz() {
    await say('navigator', 'Hmph. More applicants. If you want me to show you the way, answer my question. Answer wrong, and forget the exam this year.');
    let wrong = false;
    for (;;) {
      const c = await choose('navigator', 'Villains have taken your mother and your sweetheart. You can save only one. Who do you choose?', [
        'My mother.',
        'My sweetheart.',
        '... (Say nothing.)',
      ]);
      if (c === 2) break;
      wrong = true;
      sfx('deny');
      await say('navigator', c === 0 ? 'Your mother? Is that truly your final answer, boy?' : 'Your sweetheart? Is that truly your final answer, boy?');
      await say('leorio', 'Wait, Gon! Think about it — what kind of question has a "right" answer like that?!');
      await say('kurapika', 'Exactly. Any answer abandons someone. The only correct response... is to give none.');
      await say('navigator', 'Hmph. I\'ll ask once more.');
    }
    await say('gon', '......');
    await wait(1.0);
    await say('navigator', (wrong ? 'Took you long enough. ' : '') + 'Heh. You pass. Silence was the right answer. Some choices have no correct answer — a Hunter must still face them.');
    await say('navigator', 'The site is beneath the diner at the end of that alley. Tell the cook: "One steak combo, grilled slowly."');
    await say('navigator', 'But careful. Applicant hunters lurk in there — thugs who prey on rookies to thin out the competition.');
    f().alley_open = true;
    g.player.gainXp(wrong ? 5 : 15);
    sfx('open');
    await wait(0.6);
    const t1 = g.enemies.find((e) => e.id === 'thug1');
    if (t1) HXH.fx.text(t1.x, t1.y - 60, 'Fresh meat!', '#ff9a7a', 14);
    await say('leorio', 'Tch. We\'ll watch the street so nobody jumps us from behind. Go get \'em, Gon!');
    g.setObjective('Defeat the Applicant Hunters in the back alley (0/2)');
    await say('tip', 'J / Space swings your fishing rod (3-hit combo — the third hit is heavy). K / Shift dodge-rolls through attacks.');
    await say('tip', 'Enemies flash a RED telegraph before attacking. Dodge it, then strike while they recover — hits during an OPENING deal 1.5× damage.');
    g.setCheckpoint(px(24), py(11));
  }

  async function alleyCleared() {
    f().thugs_cleared = true;
    await wait(0.4);
    await say('gon', 'Phew! That\'s all of them.');
    g.setObjective('Enter the diner (GOHAN) and give the cook the password.');
    const l = g.npc('leorio'), k = g.npc('kurapika');
    l.moveTo(px(22), py(5), 120);
    k.moveTo(px(26), py(6), 120);
    g.setCheckpoint();
  }

  async function dinerDoor() {
    if (!f().alley_open) return say('narrator', 'A small diner. The sign reads GOHAN. The door is locked from this side.');
    if (!f().thugs_cleared) return say('narrator', 'The applicant hunters won\'t let you near the door. Deal with them first.');
    await say('cook', 'Welcome! What\'ll it be?');
    const c = await choose('cook', 'What do you order?', ['One steak combo, grilled slowly.', 'Just a glass of water, please.', 'What do you recommend?']);
    if (c !== 0) {
      await say('cook', c === 1 ? 'One water, coming right up!' : 'Today\'s special is the fried fish. Very popular!');
      await say('narrator', 'Nothing happens. That wasn\'t the password the Navigator gave you.');
      return;
    }
    await say('cook', '...Grilled slowly, huh? Please, take the room in the back.');
    await say('narrator', 'The back room has a table, three steaming plates — and no windows. With a lurch, the whole room begins to descend.');
    await say('leorio', 'An elevator?! And the steak isn\'t even grilled slowly!');
    await say('kurapika', 'A test of patience, perhaps. Only one applicant in every ten thousand reaches this point.');
    await say('gon', 'Hehe! B50... B80... B100! Here we go!');
    f().zaban_done = true;
    sfx('open');
    await g.fadeTo(1, 1.5);
    g.loadMap('tunnel');
    g.setCheckpoint();
    S.onEnterMap('tunnel', { fresh: true });
  }

  // =============================================================== TUNNEL
  function enterTunnel(opts) {
    const fl = f();
    if (fl.tunnel_open) {
      const k = g.npc('killua');
      if (k) k.hidden = true;
    }
    if (fl.tunnel_open && !fl.tunnel_done) {
      startMarathon();
      return;
    }
    if (fl.tunnel_intro) return;
    g.scene(async () => {
      g.fade = 1;
      await g.fadeTo(0, 1);
      await wait(1.2);
      await say('narrator', 'Hundreds of applicants crowd the underground hall. Every head turns to size up the newcomers.');
      await say('leorio', 'Whoa... these guys look tough.');
      await say('gon', 'There\'s a little green guy handing out badges!');
      fl.tunnel_intro = true;
      g.setObjective('Get your applicant badge from Beans.');
    });
  }

  function hallObjective() {
    const fl = f();
    const parts = ['Meet the other applicants before the exam begins:'];
    parts.push((fl.met_tonpa ? '✓' : '•') + ' Tonpa (the veteran)');
    parts.push((fl.met_killua ? '✓' : '•') + ' Killua (the boy with white hair)');
    g.setObjective(parts.join('\n'));
  }

  async function checkHall() {
    const fl = f();
    if (!(fl.badge && fl.met_tonpa && fl.met_killua) || fl.tunnel_open) return;
    await wait(0.6);
    sfx('bell');
    HXH.fx.addShake(3);
    await say('narrator', 'RRRRRIIIIIING!! A shrill bell echoes through the hall. Part of the wall slides away...');
    const s = addNpc('satotz', 'satotz', px(19), py(10) - 6, -1);
    HXH.fx.burst(s.x, s.y - 20, '#b59aff', 16, 100, 0.6, 3);
    await say('satotz', 'I apologise for the wait. The entry period has ended. The Hunter Exam will now begin.');
    await say('satotz', 'I am Satotz, examiner for the First Phase. Please follow me to the second phase site.');
    await say('satotz', 'I will not tell you where it is, or when we will arrive. Simply follow me. Those who lose sight of me... fail.');
    fl.tunnel_open = true;
    sfx('open');
    const k = g.npc('killua');
    if (k) {
      await say('killua', 'See you at the finish line, Gon. Try to keep up!');
      (async () => {
        await k.moveTo(px(23), py(10), 240);
        await k.moveTo(px(42), py(10), 240);
        poof(k, '#dfe6ee');
      })();
    }
    await say('tip', 'Keep up with Satotz before the timer runs out. Watch for shadows on the ground — falling rocks! — and the spike traps.');
    await say('tip', 'Dodge-rolling makes you briefly invulnerable, even to spikes. Rookie Crushers will try to stop you, but you don\'t have to fight them.');
    g.setCheckpoint(px(18), py(10));
    startMarathon();
  }

  function startMarathon() {
    const path = HXH.MAPS.tunnel.satotzPath;
    const s = addNpc('satotz', 'satotz', path[0][0] * T, path[0][1] * T + 6, 1);
    s.talkable = false;
    const total = 85;
    g.timer = { t: total, label: 'FOLLOW SATOTZ' };
    g.setObjective('Follow Satotz through the tunnel to the exit stairs before time runs out.');
    let len = 0;
    for (let i = 1; i < path.length; i++) len += U.dist(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1]) * T;
    const speed = len / (total - 12);
    (async () => {
      for (let i = 1; i < path.length; i++) {
        if (!g.npcs.includes(s)) return; // map reloaded
        await s.moveTo(path[i][0] * T, path[i][1] * T + 6, speed);
      }
      s.face = 1;
    })();
  }

  async function tunnelExit() {
    const fl = f();
    if (!fl.tunnel_open || fl.tunnel_done) return;
    const left = g.timer ? g.timer.t : 0;
    g.timer = null;
    fl.tunnel_done = true;
    await g.scene(async () => {
      const s = g.npc('satotz');
      if (s) s.face = -1;
      await say('satotz', 'Hm. Well done. Few rookies keep pace with me on their first attempt.');
      const bonus = Math.max(5, Math.round(left));
      await say('narrator', 'Time to spare: ' + Math.round(left) + 's.  Marathon bonus: +' + bonus + ' XP.');
      g.player.gainXp(bonus);
      await say('satotz', 'Beyond these stairs lies the Milsy Wetlands — the Swindlers\' Swamp. Its creatures deceive humans in order to devour them.');
      await say('satotz', 'Be very careful not to be fooled.');
      await g.fadeTo(1, 1.5);
      g.loadMap('swamp');
      g.setCheckpoint();
      S.onEnterMap('swamp', { fresh: true });
    });
  }

  async function tonpaTalk() {
    const fl = f();
    if (fl.met_tonpa) {
      return say('tonpa', cycle('tonpa', [
        'Stick with me, rookie, and you\'ll go far! Heh heh.',
        'This is my 36th exam. I know every trick in the book!',
        'Wanna know who\'s dangerous? That clown in the corner. Stay away from him.',
      ]));
    }
    await say('tonpa', 'Hey there, rookies! Name\'s Tonpa. I\'ve taken this exam thirty-five times, so I know the ropes!');
    await say('tonpa', 'Here — a juice to celebrate our new friendship! Bottoms up!');
    const c = await choose('gon', 'Tonpa holds out a can of juice...', ['Drink it.', 'Sniff it first.', 'No thanks.']);
    if (c === 0) {
      await say('gon', '*gulp gulp* ... Blegh! This tastes weird!');
      g.player.poison = 25;
      sfx('hurt');
      await say('narrator', 'Your stomach churns. You are POISONED for a while — slower, and slowly losing HP.');
      await say('tonpa', '(Heh heh heh... works every time.)');
      fl.drank_juice = true;
    } else if (c === 1) {
      await say('gon', '*sniff sniff* ... Tonpa-san, I think your juice has gone bad. It smells like medicine.');
      await say('tonpa', 'W-What?! Must be past its date! Ha... ha ha!');
      await say('narrator', 'Gon\'s wild-honed senses saw through the trick.');
      g.player.gainXp(20);
      fl.sharp_nose = true;
    } else {
      await say('tonpa', 'Suit yourself... (Tch. Cautious little brat.)');
      fl.refused_juice = true;
    }
    fl.met_tonpa = true;
    if (fl.badge) hallObjective();
    await checkHall();
  }

  async function killuaTalk() {
    const fl = f();
    if (fl.met_killua) {
      return say('killua', cycle('killua', [
        'This exam is pretty boring so far. Hopefully it gets harder.',
        'You\'re 12 too, right? Cool.',
        'That Hisoka guy... keep your distance. He\'s seriously bad news.',
      ]));
    }
    await say('killua', 'Hey. You look about my age.');
    await say('gon', 'I\'m Gon! You\'re taking the exam too?');
    await say('killua', 'Killua. I\'m only here \'cause I was bored. They say it\'s really hard.');
    if (fl.drank_juice) await say('killua', 'You drank Tonpa\'s juice? Ha! It\'s laced with laxatives. I drank a few too — poison doesn\'t work on me. My family trained me.');
    else if (fl.sharp_nose) await say('killua', 'You smelled out Tonpa\'s juice? Not bad. I drank it anyway — poison doesn\'t work on me.');
    else if (fl.met_tonpa) await say('killua', 'Smart move skipping Tonpa\'s juice. I drank it, but poison doesn\'t work on me.');
    else await say('killua', 'Watch out for that chubby guy, Tonpa. His juice is laced. Not that poison works on me.');
    await say('gon', 'Whoa... Killua, you\'re amazing!');
    await say('killua', '...You\'re a weird one, Gon. Let\'s see which of us makes it further.');
    fl.met_killua = true;
    if (fl.badge) hallObjective();
    await checkHall();
  }

  async function beansTalk() {
    const fl = f();
    if (fl.badge) return say('beans', 'Please keep your badge on at all times. The exam will begin shortly.');
    await say('beans', 'Welcome to the Hunter Exam! Please take your number badge, and do not lose it.');
    await say('narrator', 'Gon received applicant badge #405!');
    await say('gon', '405! Leorio is 403 and Kurapika is 404. We\'re lined up!');
    fl.badge = true;
    sfx('pickup');
    hallObjective();
    await checkHall();
  }

  async function hisokaHall() {
    const fl = f();
    if (!fl.met_hisoka) {
      fl.met_hisoka = true;
      await say('hisoka', '♠ ...');
      await say('hisoka', 'My, my. What a ripe little fruit. Don\'t mind me... I\'m only looking.');
      await say('gon', '(This guy... the air around him feels heavy. I can\'t stop my hands from shaking.)');
      await say('pokkle', '(whispering) That\'s Hisoka. Last year he nearly killed an examiner he didn\'t like.');
      return;
    }
    return say('hisoka', cycle('hisoka', ['Run along now ♥', 'Not yet. You\'re not ripe yet ♦', '...♣']));
  }

  // ================================================================ SWAMP
  function enterSwamp(opts) {
    const fl = f();
    if (fl.swamp_intro_done) return;
    g.scene(async () => {
      g.fade = 1;
      await g.fadeTo(0, 1);
      await wait(1.4);
      await say('narrator', 'Daylight at last. Beyond the stairs, the Milsy Wetlands stretch out — endless reeds, dark water, and thick, rolling fog.');
      const fake = g.npc('fakesatotz');
      await fake.moveTo(px(9), py(39), 70);
      await say('fakesatotz', 'Wait! Don\'t follow that man! He\'s an impostor — he isn\'t the examiner!');
      await say('fakesatotz', 'I am the real examiner! He\'s a Man-faced Ape — a swamp beast that mimics humans to lure them in and eat them!');
      await say('satotz', '......');
      const c = await choose('gon', 'Who do you believe?', ['Trust the stranger.', 'Trust Satotz.', 'Use your nose. (Sniff the air)']);
      if (c === 0) await say('gon', 'Is Satotz-san really a fake...? He did look kind of strange...');
      else if (c === 1) await say('gon', 'Satotz-san led us all this way. I trust him!');
      else {
        await say('gon', '*sniff sniff* ...This guy smells like an animal! Like the monkeys in the forest back home!');
        g.player.gainXp(20);
        f().sniffed_ape = true;
      }
      // Hisoka settles the matter with playing cards.
      const h = g.npc('hisoka_intro'), s = g.npc('satotz');
      for (const [target, hit] of [[fake, true], [s, false]]) {
        g.sprites.push(cardSprite(h.x + 8, h.y - 20, target, hit));
      }
      sfx('card');
      await wait(0.25);
      sfx('card');
      await wait(0.6);
      fake.look = 'ape_dead';
      fake.talkable = false;
      HXH.fx.burst(fake.x, fake.y - 20, '#c04a3a', 18, 140, 0.6, 3);
      HXH.fx.addShake(5);
      sfx('hit');
      await wait(0.6);
      await say('narrator', 'Satotz has caught the cards between his fingers. The "examiner" collapses — and his face peels into the snout of an ape.');
      await say('hisoka', '♣ Settled. Examiners are chosen by the Hunter Association. A real one would never fall to an attack like that.');
      await say('satotz', '...I\'ll take that as a compliment. But attack me again, and I will disqualify you on the spot.');
      await say('hisoka', 'Yes, yes ♥');
      await say('satotz', 'Follow me, everyone. And do not stray. The fog swallows those who fall behind.');
      (async () => {
        await s.moveTo(px(7), py(30), 120);
        poof(s, '#b59aff');
      })();
      await h.moveTo(px(5), py(33), 140);
      poof(h);
      await wait(0.8);
      await say('narrator', 'The fog rolls in. Within moments, Satotz and the other applicants have vanished into the white.');
      await say('gon', 'I lost them...! But I can still smell Leorio\'s cologne — he went northeast. And there was a scream from that way too...');
      fl.swamp_intro_done = true;
      g.setObjective('Cross the Milsy Wetlands. Follow Leorio\'s scent to the northeast.');
      await say('tip', 'Apes lunge across long distances; frogs strike with their tongues from range. Brown mud slows you, purple gas vents poison you.');
      await say('tip', 'You can see less in the fog. Grab meat to restore HP, and use the campfire to rest and save.');
      g.setCheckpoint();
    });
  }

  function cardSprite(x, y, target, hit) {
    const sp = {
      x, y, rot: 0, t: 0,
      update(dt) {
        this.t += dt;
        const tx = target.x, ty = target.y - 20;
        const d = U.dist(this.x, this.y, tx, ty);
        this.rot += dt * 20;
        if (d < 8) {
          if (!hit) HXH.fx.burst(tx, ty, '#fff', 6, 60, 0.3, 2);
          return false;
        }
        const s = Math.min(d, 520 * dt);
        this.x += ((tx - this.x) / d) * s;
        this.y += ((ty - this.y) / d) * s;
        return this.t < 3;
      },
      draw(ctx) {
        HXH.render.drawCard(ctx, this.x, this.y, this.rot, hit ? 0 : 1);
      },
    };
    return sp;
  }

  async function campfire() {
    const p = g.player;
    p.stats.hp = p.stats.maxHp;
    p.stats.sta = p.stats.maxSta;
    p.poison = 0;
    HXH.fx.burst(p.x, p.y - 20, '#7dff8a', 16, 100, 0.6, 3);
    sfx('pickup');
    g.setCheckpoint(px(36), py(13));
    g.toast('Rested at the campfire. HP restored — progress saved.');
    if (!f().campfire_seen) {
      f().campfire_seen = true;
      await say('narrator', 'A campfire, still warm. Other applicants rested here not long ago. Gon catches his breath.');
    }
  }

  async function arenaEnter() {
    const fl = f();
    if (fl.hisoka_fight || fl.hisoka_done) return;
    await g.scene(async () => {
      const b = g.boss;
      if (!fl.arena_seen) {
        fl.arena_seen = true;
        b.x = px(48);
        b.y = py(9);
        b.face = -1;
        HXH.audio.music('hisoka');
        await say('narrator', 'In a clearing, the fog parts. Leorio is down, battered. Over him looms a tall figure with a deck of cards.');
        await say('hisoka', 'Mmm... Leorio-kun, you have a good face. You pass ♠. But you need to grow a little more.');
        await say('leorio', 'Ugh... damn... clown...');
        await say('gon', 'LEORIO!!');
        await say('narrator', 'Gon\'s fishing rod whips through the air — the line cracks across Hisoka\'s cheek!');
        sfx('hit');
        HXH.fx.addShake(6);
        b.flash = 1;
        await wait(0.4);
        b.face = 1;
        await say('hisoka', 'Oh? ♥ A fishing rod. What a lovely choice of weapon.');
        await say('hisoka', 'Come then, little one. Let\'s see if you can touch me again.');
        const c = await choose('gon', 'How do you face Hisoka?', ['Charge straight in!', 'Watch him carefully first.']);
        if (c === 0) {
          await say('gon', 'Get away from Leorio!');
          await say('hisoka', 'Such reckless energy ♦ I love it.');
        } else {
          await say('gon', '(He\'s toying with me... He only drops his guard right after he attacks. I have to wait for that moment.)');
          fl.read_hisoka = true;
        }
        await say('tip', 'BOSS — Hisoka evades careless strikes and punishes them with cards. Watch his telegraph: a FAN of dashed lines (cards) or a purple bar (dash).');
        await say('tip', 'Dodge it, then hit him while he shows OPENING. Land 3 clean hits. If his dash slams into a rock, he\'s dazed for longer.');
      } else {
        HXH.audio.music('hisoka');
        b.face = -1;
        await say('hisoka', 'Back for more? ♥ Good. I was getting bored.');
      }
      b.x = px(53);
      b.y = py(7);
      b.hits = 0;
      b.cardCount = 3;
      b.setState('idle');
      if (!fl.read_hisoka) b.nextMove = 'dash';
      fl.hisoka_fight = true;
      g.checkpoint = { map: 'swamp', x: px(51), y: py(18) };
      g.save();
    });
  }

  async function hisokaDefeated() {
    const fl = f();
    const b = g.boss;
    g.projectiles.length = 0;
    await wait(0.8);
    HXH.audio.music('swamp');
    await say('hisoka', '...Fufu. Fufufu ♥');
    await say('hisoka', 'Very good. You found my openings instead of flailing at me. You have a fine instinct for battle.');
    await say('hisoka', 'You pass, too. Grow up strong... ripen nicely... and one day, I\'ll enjoy fighting you for real ♠.');
    await say('hisoka', 'Your friend will live. I\'ll leave him in your care. Bye-bye ♦');
    HXH.fx.burst(b.x, b.y - 16, '#c58aff', 30, 180, 0.8, 4);
    sfx('vanish');
    fl.hisoka_done = true;
    g.boss = null;
    g.player.gainXp(60);
    await wait(0.8);
    await say('gon', '(My legs are shaking... He wasn\'t even trying. Someday... I\'ll make him take me seriously.)');
    const l = g.npc('leorio_hurt');
    if (l) {
      l.lying = false;
      HXH.fx.burst(l.x, l.y - 10, '#fff', 8, 60, 0.4, 2);
    }
    await say('leorio', 'Gon...? You actually landed a hit on that monster? ...Thanks, kid. I owe you one.');
    await say('gon', 'Hehe! Can you walk? I can smell food — the next exam site must be close!');
    g.setObjective('Reach Biska Forest Park through the north gate of the clearing.');
    g.setCheckpoint(px(53), py(9));
    if (l) l.moveTo(px(53), py(3), 70);
  }

  async function swampExit() {
    const fl = f();
    if (!fl.hisoka_done || fl.chapter_done) return;
    fl.chapter_done = true;
    await g.scene(async () => {
      await g.fadeTo(1, 1.2);
      HXH.audio.music('victory');
      await say('narrator', 'Gon and Leorio stumble out of the fog into Biska Forest Park — just as Satotz addresses the remaining applicants.');
      await say('satotz', 'The First Phase is now complete. Congratulations to all of you who made it this far.');
      await say('killua', 'Took you long enough, Gon! I thought the frogs got you.');
      await say('kurapika', 'Leorio! You\'re hurt — what happened out there?');
      await say('leorio', 'I\'m fine... Gon saved my skin. The kid stood up to Hisoka.');
      await say('kurapika', 'You stood up to... Gon, that was reckless. ...But thank you.');
      await say('gon', 'Hehe. Now what\'s next? I smell something cooking!');
      await say('narrator', 'From inside a great building, a low rumble — like the growl of an enormous stomach — echoes across the park...');
      g.state = 'chapterEnd';
      g.endT = 0;
      g.fade = 0;
      g.fadeTarget = 0;
      g.save();
    });
  }

  // =========================================================== lookup tables
  const INTERACT = {
    // Zaban City
    leorio: async () => {
      if (!f().met_friends) return meetFriends();
      if (f().thugs_cleared) return say('leorio', 'The diner\'s right there. C\'mon, let\'s eat — I mean, let\'s take the exam!');
      if (f().alley_open) return say('leorio', 'Show those creeps what Whale Island kids are made of!');
      if (g.world.def.id === 'tunnel') {
        return say('leorio', cycle('leorio_t', [
          'Don\'t trust anyone down here, Gon. Especially that Tonpa guy.',
          'With the Hunter license, I can afford medical school. Then I\'ll treat poor kids for free.',
          'Hisoka? The clown? Yeah... I\'m not going anywhere near him.',
        ]));
      }
      return say('leorio', 'The old lady is by the alley gate, Gon. Let\'s go!');
    },
    kurapika: async () => {
      if (!f().met_friends) return meetFriends();
      if (g.world.def.id === 'tunnel') {
        return say('kurapika', cycle('kurapika_t', [
          'Over four hundred applicants. Barely a handful will pass.',
          'I\'m here to become a Blacklist Hunter. There is someone I must find.',
          'Gon, stay alert. The exam may already have started without us knowing.',
        ]));
      }
      if (f().thugs_cleared) return say('kurapika', 'Well fought, Gon. Your movements are like a wild animal\'s.');
      if (f().alley_open) return say('kurapika', 'Watch their stance. Strike after they commit to an attack.');
      return say('kurapika', 'The Navigator should be near the alley gate to the north.');
    },
    navigator: async () => {
      if (!f().met_friends) return say('navigator', 'Hmph. A child alone? Come back with your companions, boy.');
      if (!f().alley_open) return navigatorQuiz();
      return say('navigator', '"One steak combo, grilled slowly." Don\'t forget it, boy.');
    },
    diner_door: dinerDoor,
    sign_city: () => say('narrator', 'ZABAN CITY — Welcome, Hunter Exam applicants!  (Beware of pickpockets and so-called "applicant hunters".)'),
    sign_pier: () => say('narrator', 'DOLLE HARBOR FERRY. The storm-tossed ship from Whale Island arrived this morning.'),
    fisher: () => say('fisher', cycle('fisher', [
      'That fishing rod of yours — you know how to use it? Good. A rod has reach, kid. Use it.',
      'Sea\'s been rough. Half the applicants on that ship were seasick!',
    ])),
    villager: () => say('villager', cycle('villager', [
      'Every year the town fills with applicants. Most leave with nothing but bruises.',
      'They say the exam hall is somewhere right under our feet...',
    ])),
    villager2: () => say('villager2', cycle('villager2', [
      'Meat buns! Fresh meat buns! ...Oh, you found one already? They\'re great for recovering after a fight.',
      'Careful in the back alley. Thugs hang around there waiting for rookies.',
    ])),

    // Exam hall
    beans: beansTalk,
    tonpa: tonpaTalk,
    killua: killuaTalk,
    hisoka: hisokaHall,
    todo: () => say('todo', cycle('todo', ['Outta my way, shrimp. Todo the wrestler doesn\'t lose to kids.', 'Hmph. Kids these days think the Hunter Exam is a picnic.'])),
    pokkle: () => say('pokkle', cycle('pokkle', ['I\'m Pokkle. Rookie, same as you. Good luck out there.', 'I hear the First Phase is some kind of endurance test.'])),
    examineeA: () => say('examinee', 'Rumour is the First Phase is a marathon. No one knows how long.'),
    examineeB: () => say('examinee2', 'See that guy, Tonpa? They call him the Rookie Crusher. He\'s ruined dozens of first-timers.'),
    elevator: () => say('narrator', 'The elevator doors are sealed. There\'s no going back now.'),

    // Swamp
    campfire,
    leorio_hurt: () => say('leorio', f().hisoka_done ? 'Let\'s get outta this swamp, Gon.' : '...Gon... run...'),
    leorio_up: () => say('leorio', 'Let\'s get outta this swamp, Gon. The north gate\'s right there.'),
  };

  const TRIGGERS = {
    tunnel_exit: tunnelExit,
    swamp_mid: () => {
      if (!f().mid_seen) {
        f().mid_seen = true;
        g.toast('A campfire glows through the fog nearby.');
      }
    },
    arena: arenaEnter,
    swamp_exit: swampExit,
  };
})();
