// Number formatting that scales (UX-11). Idle games hit astronomical
// values fast — must handle 1 → 1e308 without breaking. Suffixed through
// the named ranges (K, M, B, T, Qa, Qi, Sx, Sp, Oc, No, Dc) and then
// scientific past that. Reads cleanly at every scale.
const SUFFIXES = [
  '',  // 1e0
  'K', // 1e3
  'M', // 1e6
  'B', // 1e9
  'T', // 1e12  trillion
  'Qa', // 1e15  quadrillion
  'Qi', // 1e18  quintillion
  'Sx', // 1e21  sextillion
  'Sp', // 1e24  septillion
  'Oc', // 1e27  octillion
  'No', // 1e30  nonillion
  'Dc', // 1e33  decillion
];

export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs < 10) return n.toFixed(2);
  if (abs < 1000) return n.toFixed(1);

  // Find suffix tier (each step = 10^3).
  const tier = Math.floor(Math.log10(abs) / 3);
  if (tier < SUFFIXES.length) {
    const scaled = n / Math.pow(10, tier * 3);
    return scaled.toFixed(2) + SUFFIXES[tier];
  }

  // Past the named suffixes, use scientific notation.
  // e.g. 1.42e36 reads cleanly even past the IEEE precision concerns.
  return n.toExponential(2).replace('e+', 'e');
}

export function fmtRate(n: number): string {
  // Always show the per-second rate, even when zero. Empty string was
  // confusing: players saw their value climbing (from POST overflow,
  // events, etc.) but no rate displayed and assumed the meter was broken.
  if (Math.abs(n) < 0.0005) return '+0/s';
  return (n >= 0 ? '+' : '') + fmt(n) + '/s';
}

export function fmtDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '';
  if (seconds < 1) return '<1s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds - m * 60);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds - h * 3600) / 60);
  return `${h}h ${m}m`;
}

export function etaToCap(current: number, cap: number, rate: number): string {
  if (rate <= 0 || cap <= 0) return '';
  if (current >= cap) return 'full';
  return `full in ${fmtDuration((cap - current) / rate)}`;
}
