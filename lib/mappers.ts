import { TradeRow, WhaleStat } from "./types";

export function mapTradeRow(r: any): TradeRow {
  const priceSolPerC3C = Number(r?.price_sol_per_c3c) || (Number(r?.price_c3c_per_sol) ? 1 / Number(r?.price_c3c_per_sol) : 0);
  return {
    ts: r?.ts || "",
    wallet: r?.wallet || "",
    side: (r?.side === "BUY" ? "BUY" : "SELL") as "BUY" | "SELL",
    c3c_amount: Number(r?.c3c_amount ?? 0),
    sol_amount: Number(r?.sol_amount ?? 0),
    price_sol_per_c3c: Number(priceSolPerC3C || 0),
    tx_signature: r?.tx_signature || "",
  };
}

// Best-effort whale mapper; keeps compatibility with current keys.
export function mapWhaleRow(r: any): WhaleStat {
  const k = (name: string, fallbacks: string[]) => {
    for (const f of [name, ...fallbacks]) if (f in (r || {})) return r[f];
    // fuzzy fallback for garbled keys that still contain token symbols
    if (name === "netC3C") {
      const c3cKey = Object.keys(r || {}).find((x) => x.toUpperCase().includes("C3C"));
      if (c3cKey) return r[c3cKey];
    }
    if (name === "netSOL") {
      const solKey = Object.keys(r || {}).find((x) => x.toUpperCase().includes("SOL"));
      if (solKey) return r[solKey];
    }
    return undefined;
  };

  const wallet: string = k("wallet", ["지갑", "주소", "wallet_address"]) ?? "";
  const netC3C = Number(k("netC3C", ["순매수C3C", "매매_C3C", "?�매??C3C"]) ?? 0);
  const netSOL = Number(k("netSOL", ["순매수SOL", "매매_SOL", "?�매??SOL"]) ?? 0);
  return { wallet: String(wallet || ""), netC3C, netSOL, ...r } as WhaleStat;
}

