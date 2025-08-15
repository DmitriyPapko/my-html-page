export const state = {
  paused: true,
  muted: false,
  fogEnabled: true,
  players: [],
  isBlocked: (...args) => false,
  rand: (min = 0, max = 1) => Math.random() * (max - min) + min,
};

export default state;

['paused', 'muted', 'fogEnabled', 'players', 'isBlocked', 'rand'].forEach(key => {
  Object.defineProperty(globalThis, key, {
    get: () => state[key],
    set: v => { state[key] = v; },
  });
});
