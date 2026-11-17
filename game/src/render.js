// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the
// backdrop colour. A night garden: indigo sky, twinkling stars, a glowing moon,
// rolling hills, and a warm lantern keeper catching golden embers. Everything is
// drawn in code; there are no image assets.

import { FIELD, FONT, GIFT, KEEPER, LIVES, PALETTE } from './config.js';
import { GIFT_MAGNET, GIFT_SHIELD, GIFT_SLOW, GIFT_STAR, KIND_CINDER, KIND_EMBER, KIND_GIFT } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 640, top: 150, line: 34, bottom: 76 };
const HEART_SIZE = 22;
const HEART_GAP = 8;

/** A tiny deterministic generator for the starfield and the hill plants: fixed seed, so the sky never changes. */
function makeSkyRandom(seed) {
  let state = seed | 0;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function starPath(context, x, y, outer, inner, points) {
  context.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
}

function heartPath(context, x, y, size) {
  context.beginPath();
  context.moveTo(x, y + size * 0.32);
  context.bezierCurveTo(x, y, x - size * 0.55, y - size * 0.1, x - size * 0.55, y + size * 0.28);
  context.bezierCurveTo(x - size * 0.55, y + size * 0.62, x - size * 0.2, y + size * 0.85, x, y + size * 1.05);
  context.bezierCurveTo(x + size * 0.2, y + size * 0.85, x + size * 0.55, y + size * 0.62, x + size * 0.55, y + size * 0.28);
  context.bezierCurveTo(x + size * 0.55, y - size * 0.1, x, y, x, y + size * 0.32);
  context.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  // The sky's furniture, fixed at boot: stars with their own twinkle, and tufts on the ground.
  const skyRandom = makeSkyRandom(20261117);
  const stars = [];
  for (let i = 0; i < 120; i += 1) {
    stars.push({ x: skyRandom() * FIELD.width, y: skyRandom() * 520, r: 0.8 + skyRandom() * 1.7, phase: skyRandom() * Math.PI * 2, speed: 0.6 + skyRandom() * 1.8 });
  }
  const tufts = [];
  for (let i = 0; i < 46; i += 1) {
    tufts.push({ x: skyRandom() * FIELD.width, h: 8 + skyRandom() * 14 });
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, weight) {
    const key = `${weight ?? ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight ?? ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function drawSky(time) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.groundY);
    gradient.addColorStop(0, PALETTE.skyTop);
    gradient.addColorStop(0.55, PALETTE.skyMid);
    gradient.addColorStop(1, PALETTE.skyLow);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.groundY);

    for (let i = 0; i < stars.length; i += 1) {
      const star = stars[i];
      context.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * star.speed + star.phase));
      context.fillStyle = '#e8ecff';
      context.beginPath();
      context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;

    // The moon, high on the right, with a soft halo.
    context.save();
    context.shadowColor = '#fff8d6';
    context.shadowBlur = 46;
    context.fillStyle = '#f7efc8';
    context.beginPath();
    context.arc(1120, 108, 46, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.fillStyle = '#e3d6a4';
    context.beginPath();
    context.arc(1106, 96, 9, 0, Math.PI * 2);
    context.arc(1132, 122, 12, 0, Math.PI * 2);
    context.arc(1112, 128, 6, 0, Math.PI * 2);
    context.fill();

    // Two rolling hill silhouettes for depth.
    context.fillStyle = '#1c1440';
    context.beginPath();
    context.moveTo(0, FIELD.groundY);
    for (let x = 0; x <= FIELD.width; x += 32) {
      context.lineTo(x, FIELD.groundY - 96 - Math.sin(x * 0.004 + 1.2) * 34);
    }
    context.lineTo(FIELD.width, FIELD.groundY);
    context.closePath();
    context.fill();
    context.fillStyle = '#251a4d';
    context.beginPath();
    context.moveTo(0, FIELD.groundY);
    for (let x = 0; x <= FIELD.width; x += 32) {
      context.lineTo(x, FIELD.groundY - 52 - Math.sin(x * 0.006 + 4.0) * 22);
    }
    context.lineTo(FIELD.width, FIELD.groundY);
    context.closePath();
    context.fill();

    // The ground: dark earth with a lit top edge and grass tufts.
    const groundGradient = context.createLinearGradient(0, FIELD.groundY, 0, FIELD.height);
    groundGradient.addColorStop(0, PALETTE.groundTop);
    groundGradient.addColorStop(1, PALETTE.ground);
    context.fillStyle = groundGradient;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = '#57406e';
    context.fillRect(0, FIELD.groundY, FIELD.width, 3);
    context.strokeStyle = '#3d2f52';
    context.lineWidth = 2;
    for (let i = 0; i < tufts.length; i += 1) {
      const tuft = tufts[i];
      context.beginPath();
      context.moveTo(tuft.x, FIELD.groundY + 4);
      context.lineTo(tuft.x - 4, FIELD.groundY + 4 - tuft.h);
      context.moveTo(tuft.x + 3, FIELD.groundY + 4);
      context.lineTo(tuft.x + 7, FIELD.groundY + 4 - tuft.h * 0.8);
      context.stroke();
    }
  }

  function drawEmber(item, time) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    // A short trail above the ember, fading upward.
    const trail = context.createLinearGradient(cx, cy - 26, cx, cy);
    trail.addColorStop(0, 'rgba(255, 181, 46, 0)');
    trail.addColorStop(1, 'rgba(255, 181, 46, 0.55)');
    context.strokeStyle = trail;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(cx, cy - 26);
    context.lineTo(cx, cy - 6);
    context.stroke();
    context.save();
    context.shadowColor = PALETTE.ember;
    context.shadowBlur = 16;
    context.fillStyle = PALETTE.ember;
    context.beginPath();
    context.arc(cx, cy, item.width / 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.fillStyle = PALETTE.emberCore;
    context.beginPath();
    context.arc(cx, cy, item.width / 4, 0, Math.PI * 2);
    context.fill();
  }

  function drawCinder(item, time) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const flicker = 0.75 + 0.25 * Math.sin(time * 14 + item.phase);
    context.save();
    context.shadowColor = PALETTE.cinder;
    context.shadowBlur = 18 * flicker;
    context.fillStyle = PALETTE.cinder;
    context.beginPath();
    context.arc(cx, cy, item.width / 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.fillStyle = PALETTE.cinderCore;
    context.beginPath();
    context.arc(cx, cy, item.width / 4.4, 0, Math.PI * 2);
    context.fill();
    // Jagged spikes so a cinder reads as dangerous at a glance.
    context.strokeStyle = PALETTE.cinderCore;
    context.lineWidth = 2;
    for (let s = 0; s < 5; s += 1) {
      const angle = (s / 5) * Math.PI * 2 + item.phase;
      context.beginPath();
      context.moveTo(cx + Math.cos(angle) * item.width * 0.32, cy + Math.sin(angle) * item.width * 0.32);
      context.lineTo(cx + Math.cos(angle) * item.width * 0.62, cy + Math.sin(angle) * item.width * 0.62);
      context.stroke();
    }
  }

  function drawGift(item, time) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const bob = Math.sin(time * 5 + item.phase) * 2;
    const colors = [PALETTE.shield, PALETTE.magnet, PALETTE.slow, PALETTE.star];
    const color = colors[item.pkind] ?? PALETTE.star;
    context.save();
    context.shadowColor = color;
    context.shadowBlur = 18;
    context.fillStyle = '#171233';
    context.beginPath();
    context.arc(cx, cy + bob, 17, 0, Math.PI * 2);
    context.fill();
    context.restore();
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(cx, cy + bob, 17, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = color;
    context.strokeStyle = color;
    if (item.pkind === GIFT_SHIELD) {
      context.beginPath();
      context.moveTo(cx, cy + bob - 9);
      context.lineTo(cx + 8, cy + bob - 5);
      context.lineTo(cx + 8, cy + bob + 2);
      context.quadraticCurveTo(cx + 8, cy + bob + 9, cx, cy + bob + 11);
      context.quadraticCurveTo(cx - 8, cy + bob + 9, cx - 8, cy + bob + 2);
      context.lineTo(cx - 8, cy + bob - 5);
      context.closePath();
      context.fill();
    } else if (item.pkind === GIFT_MAGNET) {
      context.lineWidth = 5;
      context.beginPath();
      context.arc(cx, cy + bob - 1, 8, Math.PI, 0);
      context.stroke();
      context.beginPath();
      context.moveTo(cx - 8, cy + bob - 1);
      context.lineTo(cx - 8, cy + bob + 7);
      context.moveTo(cx + 8, cy + bob - 1);
      context.lineTo(cx + 8, cy + bob + 7);
      context.stroke();
    } else if (item.pkind === GIFT_SLOW) {
      context.lineWidth = 2.5;
      context.beginPath();
      context.arc(cx, cy + bob, 9, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.moveTo(cx, cy + bob);
      context.lineTo(cx, cy + bob - 6);
      context.moveTo(cx, cy + bob);
      context.lineTo(cx + 5, cy + bob + 2);
      context.stroke();
    } else {
      starPath(context, cx, cy + bob, 11, 5, 5);
      context.fill();
    }
  }

  function drawKeeper(state, time) {
    const player = state.player;
    const cx = player.x + player.width / 2;
    const flame = 1 + 0.18 * Math.sin(time * 11) + 0.1 * Math.sin(time * 23);
    // A pool of warm light on the ground beneath the lantern.
    const pool = context.createRadialGradient(cx, FIELD.groundY + 8, 4, cx, FIELD.groundY + 8, 120);
    pool.addColorStop(0, 'rgba(255, 201, 94, 0.4)');
    pool.addColorStop(1, 'rgba(255, 201, 94, 0)');
    context.fillStyle = pool;
    context.beginPath();
    context.ellipse(cx, FIELD.groundY + 8, 120, 16, 0, 0, Math.PI * 2);
    context.fill();

    // Blink while invulnerable after a hit: hidden on every other tenth of a second.
    const visible = player.invulnerable === 0 || Math.floor(player.invulnerable * 10) % 2 === 1;
    if (!visible) return;

    // Dash streaks behind the lantern.
    if (player.dashTime > 0) {
      context.strokeStyle = 'rgba(255, 220, 130, 0.7)';
      context.lineWidth = 3;
      for (let s = 0; s < 3; s += 1) {
        const y = player.y + 18 + s * 16;
        context.beginPath();
        context.moveTo(cx - 34, y);
        context.lineTo(cx - 34 - 26 - s * 10, y);
        context.stroke();
      }
    }

    // The post, the arm, and the hanging lantern with its flame.
    context.fillStyle = '#5b3a24';
    context.fillRect(cx - 4, player.y + 26, 8, FIELD.groundY - player.y - 26);
    context.fillRect(cx - 4, player.y + 26, 26, 6);
    context.save();
    context.shadowColor = PALETTE.keeper;
    context.shadowBlur = 34;
    context.fillStyle = PALETTE.keeper;
    context.beginPath();
    context.roundRect(cx + 8, player.y + 30, 28, 34, 6);
    context.fill();
    context.restore();
    context.fillStyle = PALETTE.keeperCore;
    context.beginPath();
    context.ellipse(cx + 22, player.y + 47, 7 * flame, 11 * flame, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#3a2415';
    context.fillRect(cx + 6, player.y + 28, 32, 5);
    context.fillRect(cx + 6, player.y + 63, 32, 5);

    // The shield's ring, when a shield is held.
    if (state.shield) {
      context.strokeStyle = PALETTE.shield;
      context.lineWidth = 3;
      context.globalAlpha = 0.65 + 0.35 * Math.sin(time * 6);
      context.beginPath();
      context.arc(cx, player.y + 42, 46, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
    }
  }

  function drawField(state, time, particles) {
    drawSky(time);
    const items = state.items;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      if (item.kind === KIND_EMBER) drawEmber(item, time);
      else if (item.kind === KIND_CINDER) drawCinder(item, time);
      else if (item.kind === KIND_GIFT) drawGift(item, time);
    }
    drawKeeper(state, time);
    if (particles) particles.draw(context);
  }

  function drawHud(state, screen) {
    context.textBaseline = 'top';
    text(`Score ${state.score}`, 24, 18, 30, PALETTE.text, 'left', '700 ');
    text(`Level ${state.level}`, FIELD.width / 2, 18, 30, PALETTE.text, 'center', '700 ');
    const firstHeart = FIELD.width - 24 - LIVES * (HEART_SIZE + HEART_GAP) + HEART_GAP;
    text('Lives', firstHeart - 14, 18, 30, PALETTE.text, 'right', '700 ');
    for (let life = 0; life < LIVES; life += 1) {
      context.fillStyle = life < state.lives ? PALETTE.heart : '#3a2f52';
      heartPath(context, firstHeart + life * (HEART_SIZE + HEART_GAP) + HEART_SIZE / 2, 26, HEART_SIZE);
      context.fill();
    }

    // The combo meter under the score: the multiplier and progress to the next step.
    if (state.combo > 0) {
      const inStep = state.combo % 3;
      const progress = state.multiplier >= 5 ? 1 : inStep / 3;
      text(`Combo x${state.multiplier}  ·  ${state.combo} caught`, 24, 56, 22, PALETTE.ember, 'left', '700 ');
      context.fillStyle = '#3a2f52';
      context.fillRect(24, 84, 170, 10);
      context.fillStyle = PALETTE.ember;
      context.fillRect(24, 84, 170 * progress, 10);
    }

    // Active power-ups as chips under the hearts, with seconds left.
    const chips = [];
    if (state.shield) chips.push({ label: 'SHIELD', color: PALETTE.shield });
    if (state.magnetT > 0) chips.push({ label: `MAGNET ${Math.ceil(state.magnetT)}s`, color: PALETTE.magnet });
    if (state.slowT > 0) chips.push({ label: `SLOW ${Math.ceil(state.slowT)}s`, color: PALETTE.slow });
    if (state.starT > 0) chips.push({ label: `STAR x2 ${Math.ceil(state.starT)}s`, color: PALETTE.star });
    let chipY = 56;
    for (let i = 0; i < chips.length; i += 1) {
      const chip = chips[i];
      context.font = `700 18px ${FONT}`;
      const width = context.measureText(chip.label).width + 20;
      context.fillStyle = '#171233';
      context.beginPath();
      context.roundRect(FIELD.width - 24 - width, chipY, width, 26, 13);
      context.fill();
      context.strokeStyle = chip.color;
      context.lineWidth = 2;
      context.stroke();
      text(chip.label, FIELD.width - 24 - width / 2, chipY + 4, 18, chip.color, 'center', '700 ');
      chipY += 32;
    }

    // The dash cooldown bar, centred just above the ground. It belongs to live
    // play only: on the game-over screen the keeper is done dashing.
    if (screen === SCREEN_PLAY) {
      const dashReady = state.player.dashCooldown === 0;
      const dashFill = 1 - state.player.dashCooldown / KEEPER.dashCooldown;
      const barWidth = 180;
      const barX = (FIELD.width - barWidth) / 2;
      const barY = FIELD.groundY - 26;
      context.fillStyle = '#171233';
      context.beginPath();
      context.roundRect(barX, barY, barWidth, 12, 6);
      context.fill();
      context.fillStyle = dashReady ? PALETTE.keeper : '#7a68a8';
      context.beginPath();
      context.roundRect(barX, barY, Math.max(12, barWidth * dashFill), 12, 6);
      context.fill();
      text(dashReady ? 'DASH READY — Space / Shift' : 'DASH…', FIELD.width / 2, barY - 22, 16, dashReady ? PALETTE.keeper : PALETTE.muted, 'center', '700 ');
    }
  }

  function drawBanner(state) {
    if (state.levelBanner <= 0) return;
    const alpha = Math.min(1, state.levelBanner / 0.6);
    context.globalAlpha = alpha;
    text(`LEVEL ${state.level}`, FIELD.width / 2, 220, 64, PALETTE.keeperCore, 'center', '800 ');
    text('The night grows faster — and fuller', FIELD.width / 2, 292, 24, PALETTE.text, 'center');
    context.globalAlpha = 1;
  }

  function drawPanel(title, lines, prompt, titleSize) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.save();
    context.globalAlpha = 0.92;
    context.fillStyle = PALETTE.panel;
    context.beginPath();
    context.roundRect(x, y, PANEL.width, height, 18);
    context.fill();
    context.restore();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(x, y, PANEL.width, height, 18);
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 82, titleSize ?? 52, PALETTE.text, 'center', '800 ');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 24, PALETTE.ember, 'center', '700 ');
  }

  const TITLE_LINES = [
    'Catch the golden embers. Dodge the red-hot cinders.',
    'Three lives. Combos multiply your score up to x5.',
    'Shield · Magnet · Slow · Star — gifts fall from the sky.',
    'Move with ← → or A D, drag, or steer with the mouse.',
    'Space or Shift to dash. P to pause.',
    '',
  ];
  const PAUSED_LINES = ['The embers will wait for you.'];
  const OVER_LINES = ['', '', ''];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, fx) {
    const time = fx && fx.time !== undefined ? fx.time : 0;
    const shake = fx && fx.shake ? fx.shake : 0;
    const flash = fx && fx.flash ? fx.flash : 0;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = shake > 0 ? (Math.random() - 0.5) * shake * 22 : 0;
    const shakeY = shake > 0 ? (Math.random() - 0.5) * shake * 16 : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    drawField(state, time, fx ? fx.particles : null);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[5] = best > 0 ? `Best score ${best}` : 'No lantern lit yet — set the first best.';
      drawPanel('EMBERFALL', TITLE_LINES, 'Press Space, Enter or click to begin', 72);
      return;
    }
    drawHud(state, screen);
    if (screen === SCREEN_PLAY) drawBanner(state);
    else if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      const isBest = state.score > 0 && state.score >= best;
      OVER_LINES[0] = `Score ${state.score}`;
      OVER_LINES[1] = `Best ${best}`;
      OVER_LINES[2] = isBest ? 'A new best — the garden remembers.' : '';
      drawPanel('The lantern fades…', OVER_LINES, 'Press Space or click to light it again');
    }
    if (flash > 0) {
      context.fillStyle = `rgba(255, 43, 30, ${flash * 0.32})`;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    /** Convert a pointer's client x into the playfield's logical x. */
    toLogicalX(clientX) {
      return (clientX - view.x) / view.scale;
    },
  };
}
