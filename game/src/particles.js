// A fixed pool of spark particles: golden bursts when an ember is caught, red
// shards on a hit, and a soft shimmer when a power-up lands. Slots are reused, so
// nothing here allocates after createParticles returns.

import { PARTICLE_POOL } from './config.js';

export function createParticles(random) {
  const pool = [];
  for (let index = 0; index < PARTICLE_POOL; index += 1) {
    pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, color: '#ffffff', gravity: 0, drag: 1 });
  }

  function spawn(x, y, vx, vy, life, size, color, gravity) {
    for (let index = 0; index < pool.length; index += 1) {
      const p = pool[index];
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.maxLife = life;
      p.size = size;
      p.color = color;
      p.gravity = gravity;
      p.drag = 0.985;
      return;
    }
  }

  return {
    /** A radial burst of `count` sparks in `color`, with a few slower embers mixed in. */
    burst(x, y, color, count, speed) {
      for (let n = 0; n < count; n += 1) {
        const angle = random() * Math.PI * 2;
        const power = speed * (0.35 + random() * 0.65);
        spawn(
          x,
          y,
          Math.cos(angle) * power,
          Math.sin(angle) * power - speed * 0.35,
          0.45 + random() * 0.45,
          2 + random() * 3.5,
          n % 3 === 0 ? '#fff3c4' : color,
          320,
        );
      }
    },

    /** A gentle upward drift of motes, used for the title screen's living backdrop. */
    mote(x, y) {
      spawn(x, y, (random() - 0.5) * 24, -18 - random() * 30, 1.2 + random() * 1.2, 1.5 + random() * 2, '#ffd98a', -24);
    },

    update(dt) {
      for (let index = 0; index < pool.length; index += 1) {
        const p = pool[index];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        p.vy += p.gravity * dt;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    },

    draw(context) {
      for (let index = 0; index < pool.length; index += 1) {
        const p = pool[index];
        if (!p.active) continue;
        const fade = p.life / p.maxLife;
        context.globalAlpha = fade;
        context.fillStyle = p.color;
        context.beginPath();
        context.arc(p.x, p.y, Math.max(0.5, p.size * fade), 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    },

    clear() {
      for (let index = 0; index < pool.length; index += 1) pool[index].active = false;
    },

    /** How many particles are alive right now (handy for automated checks). */
    count() {
      let alive = 0;
      for (let index = 0; index < pool.length; index += 1) if (pool[index].active) alive += 1;
      return alive;
    },
  };
}
