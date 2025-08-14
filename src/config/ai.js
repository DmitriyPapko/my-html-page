export const DEBUG_AI = false;

export const AI_THRESHOLDS = {
  aggression: 1.2,
  powerMultiplier: 1.2,
  minReserve: { rice: 40, water: 20 },
};

export function packPower(units) {
  let p = 0;
  for (const u of units) {
    p += (u.hp * 0.5 + u.dps * 12) * (u.ranged ? 1.05 : 1) * (u.armor ? 1.05 : 1);
  }
  return p;
}

export function campPower(camp) {
  if (!camp) return 0;
  if (Array.isArray(camp.units)) return packPower(camp.units);
  return packPower([camp]);
}
