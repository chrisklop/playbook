// Pure math helpers. No Svelte. Imported by both the game runtime and scripts/sim.ts.

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function bulkCost(
  base: number,
  growth: number,
  currentLvl: number,
  count: number,
): number {
  if (count <= 0) return 0;
  if (growth === 1) return base * count;
  return Math.ceil(
    (base * Math.pow(growth, currentLvl) * (Math.pow(growth, count) - 1)) /
      (growth - 1),
  );
}

export function affordableCount(
  base: number,
  growth: number,
  currentLvl: number,
  available: number,
  maxLevel?: number,
): number {
  if (available <= 0) return 0;
  if (growth === 1) {
    const k = Math.floor(available / base);
    return maxLevel !== undefined ? Math.min(k, maxLevel - currentLvl) : k;
  }
  const cap = 1 + (available * (growth - 1)) / (base * Math.pow(growth, currentLvl));
  if (cap <= 1) return 0;
  let k = Math.floor(Math.log(cap) / Math.log(growth));
  // Tighten boundary in case of floating-point fuzz.
  while (bulkCost(base, growth, currentLvl, k + 1) <= available) k++;
  while (k > 0 && bulkCost(base, growth, currentLvl, k) > available) k--;
  if (maxLevel !== undefined) k = Math.min(k, maxLevel - currentLvl);
  return Math.max(0, k);
}
