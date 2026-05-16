export function fmt(n: number): string {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs < 10) return n.toFixed(2);
  if (abs < 1000) return n.toFixed(1);
  if (abs < 1_000_000) return (n / 1000).toFixed(2) + 'K';
  if (abs < 1_000_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  return (n / 1_000_000_000).toFixed(2) + 'B';
}

export function fmtRate(n: number): string {
  if (Math.abs(n) < 0.001) return '';
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
