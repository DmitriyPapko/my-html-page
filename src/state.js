export const state = {
  paused: true,
  muted: false,
  fogEnabled: true,
  players: [],
  neutral: { units: [] },
  isBlocked: () => false,
  rand: (min = 0, max = 1) => Math.random() * (max - min) + min,
};

export default state;
