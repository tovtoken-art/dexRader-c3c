"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase as sb } from "../lib/supabase";

const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const nf6 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });

function short(x: string) {
  return x?.length > 12 ? `${x.slice(0, 6)}…${x.slice(-6)}` : x;
}
function sign6(n: number) {
  const v = Number(n || 0);
  const s = v >= 0 ? "+" : "";
  return s + v.toFixed(6);
}
function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type Whale = {
  [k: string]: any; // "지갑","순위","순매수_C3C","순매수_SOL"
};

type LabelMap = Record<string, string>;

export default function WhaleTabs({
  whales,
  lastPriceSOLperC3C
}: {
  whales: Whale[];
  lastPriceSOLperC3C: number;
}) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [labels, setLabels] = useState<LabelMap>({});
  const [hover, setHover] = useState<string | null>(null);

  // 라벨 불러오기
  useEffect(() => {
    (async () => {
      const { data } = await sb.from("wallet_labels").select("wallet,label");
      const map: LabelMap = {};
      for (const r of data ?? []) map[r.wallet] = r.label;
      setLabels(map);
    })();
  }, []);

  // 정렬
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

  // 라벨 저장
  async function setLabel(wallet: string) {
    const current = labels[wallet] || "";
    const label = window.prompt("지갑 라벨을 입력", current ?? "");
    if (label == null) return;
    const { error } = await sb
      .from("wallet_labels")
      .upsert({ wallet, label });
    if (error) {
      alert("라벨 저장 실패");
      return;
    }
    setLabels((m) => ({ ...m, [wallet]: label }));
  }

  // 복사
  async function copy(wallet: string) {
    try {
      await navigator.clipboard.writeText(wallet);
    } catch {
      // 무시
    }
  }

  return (
    <section className="card">
      <div className="flex items-end justify-between mb-4">
        <h1 className="h1">고래 순위</h1>

        <div className="flex gap-2">
          <button
            onClick={() => setTab("buy")}
            className={cls(
              "px-3 py-1 rounded-xl transition",
              tab === "buy" ? "bg-white/10" : "bg-neutral-800 hover:bg-neutral-700"
            )}
          >
            순매수 랭킹
          </button>
          <button
            onClick={() => setTab("sell")}
            className={cls(
              "px-3 py-1 rounded-xl transition",
              tab === "sell" ? "bg-white/10" : "bg-neutral-800 hover:bg-neutral-700"
            )}
          >
            순매도 랭킹
          </button>
        </div>
      </div>

      <p className="sub mb-3">
        {tab === "buy" ? "C3C 기준 상위" : "SOL 기준 상위"} · 기준가{" "}
        {nf6.format(lastPriceSOLperC3C)} SOL/C3C로 P&L 계산
      </p>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="th">순위</th>
              <th className="th">지갑</th>
              <th className="th">순매수 C3C</th>
              <th className="th">순매수 SOL</th>
              <th className="th">P&amp;L(SOL)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w: any) => {
              const wallet = w["지갑"];
              const netC3C = Number(w["순매수_C3C"] || 0);
              const netSOL = Number(w["순매수_SOL"] || 0);
              const pnlSOL = netSOL + netC3C * Number(lastPriceSOLperC3C || 0); // 핵심

              return (
                <tr
                  key={wallet}
                  onMouseEnter={() => setHover(wallet)}
                  onMouseLeave={() => setHover(null)}
                  className={cls(
                    "transition",
                    hover === wallet && "bg-neutral-800/40 ring-1 ring-neutral-700"
                  )}
                >
                  <td className="td">{w._rank}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{short(wallet)}</span>

                      {/* 라벨 뱃지 */}
                      {labels[wallet] && (
                        <span className="px-2 py-0.5 text-xs rounded-lg bg-neutral-800 border border-neutral-700">
                          {labels[wallet]}
                        </span>
                      )}

                      {/* 액션들 */}
                      <button
                        title="라벨 편집"
                        onClick={() => setLabel(wallet)}
                        className="p-1 rounded hover:bg-white/10"
                      >
                        {/* 연필 아이콘 */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M16.5 3.5l4 4L8 20l-5 1 1-5L16.5 3.5z" stroke="currentColor" strokeWidth="2" fill="none"/>
                        </svg>
                      </button>

                      <button
                        title="지갑 복사"
                        onClick={() => copy(wallet)}
                        className="p-1 rounded hover:bg-white/10"
                      >
                        {/* 복사 아이콘 */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                          <rect x="2" y="2" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>

                      <a
                        title="Solscan에서 보기"
                        href={`https://solscan.io/account/${wallet}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded hover:bg-white/10"
                      >
                        {/* 링크 아이콘 */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M14 3h7v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M21 14v7h-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M14 21L3 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </a>
                    </div>
                  </td>

                  <td className="td">{nf0.format(netC3C)}</td>
                  <td className="td">{nf6.format(netSOL)}</td>
                  <td className={cls("td", pnlSOL >= 0 ? "text-green-400" : "text-red-400")}>
                    {sign6(pnlSOL)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
