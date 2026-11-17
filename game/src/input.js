// Keyboard and pointer input. Held keys give a steering direction; one-shot presses
// (start or restart, pause, dash) are queued as bit flags and taken once by the loop,
// so a press between two frames is never lost and never counted twice. Dragging the
// pointer steers the keeper toward it, so the game plays with a mouse or a finger too.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const DASH = new Set(['Space', 'ShiftLeft', 'ShiftRight']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  let left = false;
  let right = false;
  let actions = 0;
  let pointerX = null;
  let pointerDown = false;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (DASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DASH;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    pointerX = null;
    pointerDown = false;
  });

  // A press anywhere confirms (start / restart); a drag steers instead of holding a key.
  target.addEventListener('pointerdown', (event) => {
    actions |= ACTION_CONFIRM;
    pointerDown = true;
    pointerX = event.clientX;
  });
  target.addEventListener('pointermove', (event) => {
    if (pointerDown) pointerX = event.clientX;
  });
  const release = () => {
    pointerDown = false;
    pointerX = null;
  };
  target.addEventListener('pointerup', release);
  target.addEventListener('pointercancel', release);

  return {
    /** -1 for left, 1 for right, 0 for neither or both. */
    direction() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** The pointer's client x while dragging, or null when no drag is happening. */
    dragX() {
      return pointerDown ? pointerX : null;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
