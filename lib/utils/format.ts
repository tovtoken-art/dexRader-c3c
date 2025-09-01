export const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
export const nf3 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });
export const nf6 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });

export function shortAddress(x: string, head = 6, tail = 6): string {
  if (!x) return "";
  return x.length > head + tail ? `${x.slice(0, head)}…${x.slice(-tail)}` : x;
}

export function sign0(n: number): string {
  const v = Number(n || 0);
  const s = v >= 0 ? "+" : "";
  return s + nf0.format(Math.abs(v));
}

export function sign6(n: number): string {
  const v = Number(n || 0);
  const s = v >= 0 ? "+" : "";
  return s + v.toFixed(6);
}

export function tone(n: number): string {
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-rose-400";
  return "text-neutral-300";
}

export function fmtTime(iso: string, loading?: boolean): string {
  if (!iso || loading) return "-";
  try {
    return new Date(iso).toLocaleString("ko-KR", { hour12: false });
  } catch {
    return iso || "";
  }
}

