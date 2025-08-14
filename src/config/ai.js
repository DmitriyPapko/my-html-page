export const DEBUG_AI = false;

export function packPower(units) {
  let p = 0;
  for (const u of units) {
    p += (u.hp * 0.5 + u.dps * 12) * (u.ranged ? 1.05 : 1) * (u.armor ? 1.05 : 1);
  }
  return p;
}
