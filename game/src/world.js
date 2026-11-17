// The game's rules and state, with no drawing and no browser in it: the lantern
// keeper, the pool of falling embers, cinders and gifts, spawning (including ember
// streams and cinder walls), collisions, combo, lives and level. step() advances one
// fixed step and returns what happened as bit flags, so the caller can react without
// the world knowing about screens or sound. Nothing here allocates after
// createWorld returns.

import { CINDER, COMBO, EMBER, FIELD, GIFT, KEEPER, LEVEL, LIVES, POOL_SIZE } from './config.js';

export const KIND_EMBER = 0;
export const KIND_CINDER = 1;
export const KIND_GIFT = 2;

export const GIFT_SHIELD = 0;
export const GIFT_MAGNET = 1;
export const GIFT_SLOW = 2;
export const GIFT_STAR = 3;

export const EVENT_CATCH = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_MISS = 8;
export const EVENT_POWERUP = 16;
export const EVENT_LEVEL = 32;
export const EVENT_SHIELD = 64;
export const EVENT_DASH = 128;

const MAGNET_RANGE = 300;
const MAGNET_PULL = 340;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function createWorld(random) {
  const player = {
    x: 0,
    y: FIELD.groundY - KEEPER.height,
    width: KEEPER.width,
    height: KEEPER.height,
    invulnerable: 0,
    dashTime: 0,
    dashCooldown: 0,
  };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({ active: false, kind: KIND_EMBER, pkind: 0, x: 0, y: 0, width: 0, height: 0, speed: 0, sway: 0, phase: 0, baseX: 0 });
  }
  const state = {
    player,
    items,
    score: 0,
    lives: LIVES,
    level: 1,
    elapsed: 0,
    combo: 0,
    multiplier: 1,
    shield: false,
    magnetT: 0,
    slowT: 0,
    starT: 0,
    levelBanner: 0,
    lastCatchX: 0,
    lastCatchY: 0,
    lastHitX: 0,
    lastHitY: 0,
    lastGift: -1,
    emberTimer: 0,
    cinderTimer: 0,
    giftTimer: 0,
  };

  function reset() {
    player.x = (FIELD.width - player.width) / 2;
    player.invulnerable = 0;
    player.dashTime = 0;
    player.dashCooldown = 0;
    for (const item of items) item.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.level = 1;
    state.elapsed = 0;
    state.combo = 0;
    state.multiplier = 1;
    state.shield = false;
    state.magnetT = 0;
    state.slowT = 0;
    state.starT = 0;
    state.levelBanner = 0;
    state.lastGift = -1;
    state.emberTimer = EMBER.interval;
    state.cinderTimer = CINDER.interval;
    state.giftTimer = GIFT.interval + random() * GIFT.intervalJitter;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) if (!items[index].active) return items[index];
    return null;
  }

  function fallSpeed(base) {
    return base * (state.slowT > 0 ? 0.5 : 1);
  }

  function spawnEmber(x, y) {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_EMBER;
    item.width = EMBER.size;
    item.height = EMBER.size;
    item.x = x === undefined ? random() * (FIELD.width - item.width) : x;
    item.y = y === undefined ? -item.height : y;
    item.speed = fallSpeed(EMBER.speed + EMBER.speedPerLevel * (state.level - 1) + random() * EMBER.speedJitter);
    item.sway = 14 + random() * 22;
    item.phase = random() * Math.PI * 2;
    item.baseX = item.x;
  }

  /** Four embers in a vertical ribbon at one x, so a good run can chain a combo fast. */
  function spawnStream() {
    const x = 40 + random() * (FIELD.width - 120);
    for (let n = 0; n < 4; n += 1) spawnEmber(x, -EMBER.size - n * 58);
  }

  function spawnCinder(x, y) {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_CINDER;
    item.width = CINDER.size;
    item.height = CINDER.size;
    item.x = x === undefined ? random() * (FIELD.width - item.width) : x;
    item.y = y === undefined ? -item.height : y;
    item.speed = fallSpeed(CINDER.speed + CINDER.speedPerLevel * (state.level - 1) + random() * CINDER.speedJitter);
    item.sway = 6 + random() * 10;
    item.phase = random() * Math.PI * 2;
    item.baseX = item.x;
  }

  /** A row of cinders across the sky with one gap to slip through. */
  function spawnWall() {
    const gapX = 120 + random() * (FIELD.width - 360);
    const gapWidth = 210;
    for (let x = 0; x < FIELD.width; x += 74) {
      if (x + CINDER.size > gapX && x < gapX + gapWidth) continue;
      spawnCinder(x, -CINDER.size - random() * 30);
    }
  }

  function spawnGift() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_GIFT;
    item.pkind = Math.floor(random() * 4);
    item.width = GIFT.size;
    item.height = GIFT.size;
    item.x = random() * (FIELD.width - item.width);
    item.y = -item.height;
    item.speed = fallSpeed(GIFT.speed);
    item.sway = 18;
    item.phase = random() * Math.PI * 2;
    item.baseX = item.x;
  }

  function emberInterval() {
    return Math.max(EMBER.minInterval, EMBER.interval * EMBER.intervalScale ** (state.level - 1));
  }

  function cinderInterval() {
    return Math.max(CINDER.minInterval, CINDER.interval * CINDER.intervalScale ** (state.level - 1));
  }

  function resetCombo() {
    state.combo = 0;
    state.multiplier = 1;
  }

  function applyGift(pkind) {
    state.lastGift = pkind;
    if (pkind === GIFT_SHIELD) state.shield = true;
    else if (pkind === GIFT_MAGNET) state.magnetT = GIFT.magnetSeconds;
    else if (pkind === GIFT_SLOW) state.slowT = GIFT.slowSeconds;
    else state.starT = GIFT.starSeconds;
  }

  /**
   * One fixed step. `direction` is -1, 0 or 1 (left, still, right); `dash` asks for a
   * speed burst. With `harmless` set (the title screen's backdrop) things fall but
   * nothing touches the keeper and nothing scores.
   */
  function step(dt, direction, dash, harmless) {
    let events = 0;
    state.elapsed += dt;
    const nextLevel = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));
    if (nextLevel !== state.level) {
      state.level = nextLevel;
      state.levelBanner = 2.2;
      events |= EVENT_LEVEL;
    }
    if (state.levelBanner > 0) state.levelBanner = Math.max(0, state.levelBanner - dt);
    if (state.magnetT > 0) state.magnetT = Math.max(0, state.magnetT - dt);
    if (state.slowT > 0) state.slowT = Math.max(0, state.slowT - dt);
    if (state.starT > 0) state.starT = Math.max(0, state.starT - dt);

    if (player.dashCooldown > 0) player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    if (player.dashTime > 0) player.dashTime = Math.max(0, player.dashTime - dt);
    if (dash && player.dashCooldown === 0 && !harmless) {
      player.dashTime = KEEPER.dashTime;
      player.dashCooldown = KEEPER.dashCooldown;
      events |= EVENT_DASH;
    }
    const speed = KEEPER.speed * (player.dashTime > 0 ? KEEPER.dashSpeed : 1);
    player.x = Math.min(FIELD.width - player.width, Math.max(0, player.x + direction * speed * dt));
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);

    state.emberTimer -= dt;
    if (state.emberTimer <= 0) {
      if (state.level >= 2 && random() < 0.3) spawnStream();
      else spawnEmber();
      state.emberTimer += emberInterval();
    }
    state.cinderTimer -= dt;
    if (state.cinderTimer <= 0) {
      if (state.level >= 3 && random() < 0.25) spawnWall();
      else spawnCinder();
      state.cinderTimer += cinderInterval();
    }
    state.giftTimer -= dt;
    if (state.giftTimer <= 0) {
      spawnGift();
      state.giftTimer += GIFT.interval + random() * GIFT.intervalJitter;
    }

    const keeperCentre = player.x + player.width / 2;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.y += item.speed * dt;
      // Embers and gifts drift side to side as they fall; cinders barely waver.
      item.x = item.baseX + Math.sin(item.phase + item.y * 0.004) * item.sway;
      if (item.x < 0) item.x = 0;
      if (item.x > FIELD.width - item.width) item.x = FIELD.width - item.width;
      // The magnet bends nearby embers toward the keeper.
      if (!harmless && state.magnetT > 0 && item.kind === KIND_EMBER) {
        const dx = keeperCentre - (item.x + item.width / 2);
        if (Math.abs(dx) < MAGNET_RANGE && item.y < FIELD.groundY - 60) {
          item.x += Math.sign(dx) * Math.min(Math.abs(dx), MAGNET_PULL * dt);
          item.baseX = item.x;
        }
      }
      if (item.y > FIELD.groundY) {
        item.active = false;
        if (item.kind === KIND_EMBER && !harmless) {
          resetCombo();
          events |= EVENT_MISS;
        }
        continue;
      }
      if (harmless || !overlaps(item, player)) continue;
      if (item.kind === KIND_EMBER) {
        item.active = false;
        state.combo += 1;
        state.multiplier = 1 + Math.min(COMBO.max - 1, Math.floor(state.combo / COMBO.step));
        state.score += EMBER.points * state.multiplier * (state.starT > 0 ? 2 : 1);
        state.lastCatchX = item.x + item.width / 2;
        state.lastCatchY = item.y + item.height / 2;
        events |= EVENT_CATCH;
      } else if (item.kind === KIND_GIFT) {
        item.active = false;
        applyGift(item.pkind);
        state.lastCatchX = item.x + item.width / 2;
        state.lastCatchY = item.y + item.height / 2;
        events |= EVENT_POWERUP;
      } else if (player.invulnerable === 0) {
        item.active = false;
        state.lastHitX = item.x + item.width / 2;
        state.lastHitY = item.y + item.height / 2;
        if (state.shield) {
          state.shield = false;
          player.invulnerable = KEEPER.invulnerable;
          events |= EVENT_SHIELD;
        } else {
          state.lives -= 1;
          player.invulnerable = KEEPER.invulnerable;
          resetCombo();
          events |= EVENT_HIT;
          if (state.lives === 0) {
            events |= EVENT_OVER;
            break;
          }
        }
      }
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
