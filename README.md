# Hunter × Hunter — The Hunter Exam

A fan-made, single-player browser action-RPG prototype set in the world of
Hunter × Hunter. You play Gon in **Chapter 1: The Hunter Exam**: explore, survive,
meet the cast and face Hisoka.

No build step, no dependencies, no asset files. Everything (art, music, sound) is
generated in code.

## Play

Open `index.html` in a browser. To share it, host the folder on any static host
(GitHub Pages, itch.io, Netlify, …), or serve it locally:

```sh
npx http-server .   # or: python3 -m http.server
```

| Action | Keys |
| --- | --- |
| Move | WASD / arrow keys |
| Attack (3-hit combo, 3rd hit is heavy) | J / Space / left click |
| Dodge roll (invulnerable, costs stamina) | K / Shift / right click |
| Talk / interact | E / Enter |
| Character sheet | Tab / I |
| Pause | Esc / P |
| Mute | M |

Progress autosaves at checkpoints (stored in the browser's `localStorage`).

## Chapter 1 walkthrough

1. **Zaban City**: meet Leorio and Kurapika, pass the Navigator's quiz,
   clear the applicant hunters from the back alley and give the diner the
   password.
2. **Exam Hall B100**: get badge #405 from Beans, deal with Tonpa's juice, meet
   Killua (and Hisoka). Then follow Satotz through a timed tunnel marathon past
   falling rocks, spike traps and Rookie Crushers.
3. **Milsy Wetlands**: see through the Man-faced Ape's trick, cross the foggy
   swamp (mud, poison gas, apes, frogs), rest at the campfire, and save Leorio
   from **Hisoka**.

## Combat design

Combat rewards reading your opponent over button-mashing:

- Every enemy attack has a **red telegraph** (cone, lunge line or tongue line).
- After attacking, enemies **recover** (yellow stars). Hits during this
  **OPENING** deal 1.5× damage.
- Normal hits don't interrupt a windup ("Unflinching"). Only the heavy 3rd combo
  hit breaks a stance.
- Dodging grants i-frames but costs stamina, so you can't roll forever.
- **Hisoka** evades any strike that isn't aimed at an opening and counters with
  cards. You win by landing 3 clean hits after his card fans or dashes. If his dash
  hits a rock, he stays dazed longer.

Choices matter in small ways: sniffing Tonpa's juice or the fake examiner earns
XP, drinking the juice poisons you, and how you approach Hisoka changes his
opening move.

## Code layout

```
index.html          entry point (plain <script> tags, works from file://)
css/style.css       responsive 16:9 canvas
js/core.js          namespace, math helpers, game-time timers, storage, input
js/audio.js         WebAudio chiptune tracks + sound effects
js/fx.js            particles, floating text, screen shake
js/render.js        procedural character/creature/prop drawing (swap for sprites later)
js/world.js         tile types, map pre-rendering, collision, spike timing
js/maps.js          Chapter 1 maps + entity placement
js/entities.js      Player, NPC, Enemy (AI state machine), Hisoka boss, props, gates, hazards
js/dialogue.js      typewriter dialogue with portraits and choices
js/ui.js            HUD, menus, character sheet, game over, chapter end
js/story.js         all Chapter 1 quests, cutscenes and dialogue (async/await scripts)
js/game.js          game state, map loading, update/draw loop, camera, lighting, boot
tools/check-maps.js map sanity checks (node tools/check-maps.js)
```

Cutscenes are plain async functions (`await say(...)`, `await npc.moveTo(...)`,
`await wait(1)`), so adding story content mostly means editing `js/story.js` and
`js/maps.js`.

## Roadmap

- [x] **Phase 1, prototype**: character, environment, movement, basic attack, enemies
- [x] **Chapter 1 slice**: exploration, hazards, quests, characters, boss, music, VFX
- [ ] **Phase 2, the Nen system**: aura bar, Ten/Zetsu/Ren/Hatsu, the six categories
      (water divination test), cooldown-based abilities, a custom Hatsu builder with
      **vows and limitations** that trade restrictions for power
- [ ] **Phase 3, the Hunter experience**: more exam phases (Menchi's cooking exam,
      Trick Tower, Zevil Island), character select, more bosses

_Hunter × Hunter is © Yoshihiro Togashi / Shueisha. This is a non-commercial fan project._
