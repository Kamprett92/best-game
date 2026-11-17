// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), particles and the
// screen effects update with real time, and the renderer paints what is there. The
// game moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the falling pattern. ?shot=start|play|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for
// a screenshot.
import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createParticles } from './particles.js';
import { createWorld, EVENT_CATCH, EVENT_DASH, EVENT_HIT, EVENT_LEVEL, EVENT_OVER, EVENT_POWERUP, EVENT_SHIELD } from './world.js';
import { ACTION_CONFIRM, ACTION_DASH, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);
const world = createWorld(random);
const renderer = createRenderer(canvas);
const audio = createAudio();
const particles = createParticles(random);

// A small handle for automated checks (screenshots, play-tests): the live world and particles.
window.__emberfall = { world, particles };

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  // A fresh burst over the last catch (play) or the last hit (end) so the still
  // frame shows the game's particles, not just its pieces. The burst is stepped
  // forward a quarter of a second so its sparks have spread out instead of
  // sitting in one dot at the catch point.
  if (name === 'play') particles.burst(world.state.lastCatchX, world.state.lastCatchY, '#ffb52e', 16, 180);
  else if (name === 'end') particles.burst(world.state.lastHitX, world.state.lastHitY, '#ff4b2e', 18, 220);
  particles.update(0.12);
  particles.update(0.12);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, { time: world.state.elapsed, shake: 0, flash: 0, particles });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let clock = 0;
  let shake = 0;
  let flash = 0;
  let moteTimer = 0;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    particles.clear();
    accumulator = 0;
    shake = 0;
    flash = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${LIVES} lives. Catch the embers, dodge the cinders.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    audio.gameOver();
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Game over. Score ${world.state.score}. Best ${best}.`);
  }

  /** Turn the world's event flags into particles, shake, flash and sound. */
  function react(events) {
    const state = world.state;
    if (events & EVENT_CATCH) {
      particles.burst(state.lastCatchX, state.lastCatchY, '#ffb52e', 14, 170);
      audio.catch(state.multiplier);
    }
    if (events & EVENT_POWERUP) {
      const colors = ['#5ec8ff', '#ff6ec7', '#8ef0c8', '#fff06a'];
      particles.burst(state.lastCatchX, state.lastCatchY, colors[state.lastGift] ?? '#fff06a', 22, 220);
      audio.powerUp();
    }
    if (events & EVENT_HIT) {
      particles.burst(state.lastHitX, state.lastHitY, '#ff4b2e', 26, 260);
      shake = 1;
      flash = 1;
      audio.hit();
      announce(state.lives === 1 ? 'Hit. 1 life left.' : `Hit. ${state.lives} lives left.`);
    }
    if (events & EVENT_SHIELD) {
      particles.burst(state.lastHitX, state.lastHitY, '#5ec8ff', 20, 200);
      audio.shieldPop();
      announce('Shield absorbed the hit.');
    }
    if (events & EVENT_LEVEL) {
      audio.levelUp();
      announce(`Level ${state.level}.`);
    }
    if (events & EVENT_DASH) audio.dash();
    if (events & EVENT_OVER) endGame();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    // Space and Shift both dash; on the title and game-over screens Space already started the game above.
    if (actions & ACTION_DASH && screen === SCREEN_PLAY) {
      // The dash itself is requested through the step call below.
    }
    return actions;
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, 0, false, true);
      return;
    }
    // Keyboard steering, or the pointer drag steering the keeper toward the drag point.
    let direction = input.direction();
    const dragX = input.dragX();
    if (dragX !== null) {
      const logical = renderer.toLogicalX(dragX);
      const centre = world.state.player.x + world.state.player.width / 2;
      direction = logical > centre + 10 ? 1 : logical < centre - 10 ? -1 : 0;
    }
    const dash = Boolean(actions & ACTION_DASH);
    const events = world.step(STEP, direction, dash, false);
    react(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    clock += dt;
    const actions = handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      accumulator += dt;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(actions);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    // The title screen's backdrop breathes: golden motes drift up through the garden.
    if (screen === SCREEN_TITLE) {
      moteTimer -= dt;
      if (moteTimer <= 0) {
        particles.mote(60 + Math.random() * 1160, 700);
        moteTimer = 0.35;
      }
    }
    particles.update(dt);
    if (shake > 0) shake = Math.max(0, shake - dt * 2.2);
    if (flash > 0) flash = Math.max(0, flash - dt * 2.6);
    renderer.draw(world.state, screen, best, { time: clock, shake, flash, particles });
  }

  // Leaving the tab pauses a running game rather than letting cinders fall unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Emberfall. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
