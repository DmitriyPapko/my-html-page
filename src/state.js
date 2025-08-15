export const state = {
  paused: true,
  muted: false,
  fogEnabled: true,
  players: [],
  neutral: { units: [] },
  isBlocked: (...args) => false,
  rand: (min = 0, max = 1) => Math.random() * (max - min) + min,
};

export default state;

['paused', 'muted', 'fogEnabled', 'players', 'neutral', 'isBlocked', 'rand'].forEach(key => {
  Object.defineProperty(globalThis, key, {
    get: () => state[key],
    set: v => { state[key] = v; },
  });
});
