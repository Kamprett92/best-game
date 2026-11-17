// Emberfall tuning: every number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below
// depends on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 656 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const KEEPER = {
  width: 64,
  height: 78,
  speed: 540,
  dashSpeed: 2.3,
  dashTime: 0.18,
  dashCooldown: 1.2,
  invulnerable: 1.5,
};

export const LIVES = 3;

/** A golden ember: the thing to catch. Base points are multiplied by the combo and the star. */
export const EMBER = {
  size: 22,
  speed: 200,
  speedPerLevel: 16,
  speedJitter: 70,
  interval: 0.85,
  intervalScale: 0.9,
  minInterval: 0.3,
  points: 10,
};

/** A red-hot cinder: dodge it or lose a life. */
export const CINDER = {
  size: 26,
  speed: 230,
  speedPerLevel: 20,
  speedJitter: 80,
  interval: 1.15,
  intervalScale: 0.88,
  minInterval: 0.35,
};

/** Rare falling gifts, one of four kinds, each with its own look and timer. */
export const GIFT = {
  size: 30,
  speed: 150,
  interval: 16,
  intervalJitter: 8,
  magnetSeconds: 8,
  slowSeconds: 6,
  starSeconds: 10,
};

export const COMBO = {
  /** Catches per multiplier step: 0-2 catches x1, 3-5 x2, 6-8 x3, 9-11 x4, 12+ x5. */
  step: 3,
  max: 5,
};

/** Seconds of play per level, and the last level: speeds and spawn rates stop growing there. */
export const LEVEL = { seconds: 15, max: 12 };

/** How many falling things can exist at once; the pool is allocated once, at boot. */
export const POOL_SIZE = 96;

/** How many spark particles can exist at once; also allocated once, at boot. */
export const PARTICLE_POOL = 240;

export const PALETTE = {
  backdrop: '#0a0d1f',
  skyTop: '#0b1030',
  skyMid: '#1a1440',
  skyLow: '#3a1f4d',
  ground: '#241a2e',
  groundTop: '#3a2b45',
  keeper: '#ffc95e',
  keeperCore: '#fff3c4',
  ember: '#ffb52e',
  emberCore: '#ffe9a8',
  cinder: '#ff4b2e',
  cinderCore: '#ff8a5c',
  shield: '#5ec8ff',
  magnet: '#ff6ec7',
  slow: '#8ef0c8',
  star: '#fff06a',
  panel: '#171233',
  panelEdge: '#4a3572',
  text: '#f5efff',
  muted: '#b3a8d6',
  heart: '#ff5e7a',
  danger: '#ff3b30',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberfall.best';
