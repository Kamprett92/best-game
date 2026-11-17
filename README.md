[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Kamprett92/best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Kamprett92/best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# Emberfall

A night-garden arcade game. You are the keeper of a glowing lantern beneath a
starry sky. Golden embers drift down — catch them for points. Red-hot cinders
fall too — dodge them or lose one of your three lives.

Catch embers in a row to build a combo multiplier (up to x5); miss one, or take a
hit, and the combo resets. Rare gifts fall from the sky: **Shield** (absorbs one
hit), **Magnet** (pulls embers toward you for 8s), **Slow** (halves fall speed for
6s), and **Star** (double points for 10s). Dash with Space or Shift when a cinder
wall closes in. Every ~15 seconds the level rises — faster falls, denser spawns,
ember streams, and cinder walls with a single gap to slip through.

Everything is drawn in code (no image assets) and every sound is synthesized
with the Web Audio API (no audio files): a catch chime that climbs with your
combo, a hit thud, a power-up arpeggio, a level fanfare, and a soft ambient pad.
Particles burst on every catch, the screen shakes and flashes red on a hit, and
the lantern's warm glow lights the garden floor.

## Controls

- **← → or A / D** — move the lantern (mouse / touch drag steers too)
- **Space or Shift** — dash (short burst, with a cooldown bar)
- **P or Esc** — pause
- **Space, Enter, or click** — start / play again

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — no build step, no network requests, plain
static files.

## Layout

- `game/index.html` — canvas + inline CSS, loads `src/main.js`
- `game/src/config.js` — tuning numbers and palette
- `game/src/random.js` — seeded RNG (repeatable games and screenshots)
- `game/src/audio.js` — synthesized WebAudio sound effects and pad
- `game/src/particles.js` — fixed particle pool (bursts, motes)
- `game/src/world.js` — keeper, embers, cinders, gifts, combo, lives, levels
- `game/src/input.js` — keyboard + pointer drag + dash
- `game/src/render.js` — sky, stars, moon, hills, HUD, panels, screens
- `game/src/shots.js` — autopilot staging for the `?shot=` screenshots
- `game/src/main.js` — boot + fixed 1/60 s loop + shot staging
- `main.ts` — builds the submission dossier (`MAKEFUN_OUTPUT_DIR=out node main.ts`)
- `screenshots/` — 1-start.jpg, 2-play.jpg, 3-end.jpg

<sub>Entered on [make.fun](https://make.fun/?ref=t1yg6scf&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
