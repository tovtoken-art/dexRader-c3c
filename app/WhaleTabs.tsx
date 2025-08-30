"use client";

import { useMemo, useState } from "react";

const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const nf6 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });

function short(x: string) {
  return x?.length > 12 ? `${x.slice(0, 6)}…${x.slice(-6)}` : x;
}

export default function WhaleTabs({ whales }: { whales: any[] }) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");

  // 1) C3C 기준 내림차순
  const byC3C = useMemo(
    () =>
      [...(whales ?? [])]
        .sort(
          (a, b) =>
            Number(b["순매수_C3C"] || 0) - Number(a["순매수_C3C"] || 0)
        )
        .map((w, i) => ({ ...w, _rank: i + 1 })),
    [whales]
  );

  // 2) SOL 기준 내림차순  값이 클수록 C3C를 많이 매도한 지갑
  const bySOL = useMemo(
    () =>
      [...(whales ?? [])]
        .sort(
          (a, b) =>
            Number(b["순매수_SOL"] || 0) - Number(a["순매수_SOL"] || 0)
        )
        .map((w, i) => ({ ...w, _rank: i + 1 })),
    [whales]
  );

  const rows = tab === "buy" ? byC3C : bySOL;

  return (
    <section className="card">
      <div className="flex items-end justify-between mb-4">
        <h1 className="h1">고래 순위</h1>

        <div className="flex gap-2">
          <button
            onClick={() => setTab("buy")}
            className={`px-3 py-1 rounded-xl ${
              tab === "buy" ? "bg-white/10" : "bg-neutral-800"
            }`}
          >
            순매수 랭킹
          </button>
          <button
            onClick={() => setTab("sell")}
            className={`px-3 py-1 rounded-xl ${
              tab === "sell" ? "bg-white/10" : "bg-neutral-800"
            }`}
          >
            순매도 랭킹
          </button>
        </div>
      </div>

      <p className="sub mb-3">{tab === "buy" ? "C3C 기준 상위" : "SOL 기준 상위"}</p>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="th">순위</th>
              <th className="th">지갑</th>
              <th className="th">순매수 C3C</th>
              <th className="th">순매수 SOL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w: any) => (
              <tr key={`${w["지갑"]}`}>
                <td className="td">{w._rank}</td>
                <td className="td font-mono">{short(w["지갑"])}</td>
                <td className="td">{nf0.format(Number(w["순매수_C3C"] || 0))}</td>
                <td className="td">{nf6.format(Number(w["순매수_SOL"] || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
