export function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export function parseRxPower(s: any): number | null {
  if (s === undefined || s === null) return null;
  const m = String(s).match(/([+-]?\d+(?:\.\d+)?)/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (Number.isNaN(v)) return null;
  return v;
}
