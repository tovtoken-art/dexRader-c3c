// app/WhaleTabs.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase as sb } from "../lib/supabase";

const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const nf6 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });

type Whale = { [k: string]: any };
type LabelMap = Record<string, string>;

function short(x: string) {
  return x?.length > 12 ? `${x.slice(0, 6)}…${x.slice(-6)}` : x;
}
function sign0(n: number) {
  const v = Number(n || 0);
  const s = v >= 0 ? "+" : "";
  return s + nf0.format(Math.abs(v));
}
function sign6(n: number) {
  const v = Number(n || 0);
  const s = v >= 0 ? "+" : "";
  return s + v.toFixed(6);
}
function tone(n: number) {
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-rose-400";
  return "text-neutral-300";
}
function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function WhaleTabs({
  whales,
  lastPriceSOLperC3C
}: {
  whales: Whale[];
  lastPriceSOLperC3C: number; // 1 C3C 당 SOL
}) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [labels, setLabels] = useState<LabelMap>({});
  const [hover, setHover] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [watchOnly, setWatchOnly] = useState(false);
  const [watch, setWatch] = useState<string[]>(
    () => { try { return JSON.parse(localStorage.getItem("watchlist")||"[]"); } catch { return []; } }
  );

  // 라벨 1회 로드: 현재 표에 보일 가능성이 높은 지갑만 쿼리해 트래픽 최소화
  useEffect(() => {
    (async () => {
      const wallets = (whales ?? []).map(w => String(w["지갑"])).filter(Boolean);
      if (wallets.length === 0) return;
      const { data, error } = await sb
        .from("wallet_labels")
        .select("wallet,label")           // color 제거
        .in("wallet", wallets.slice(0, 500)); // 안전 버퍼
      if (error) return; // 실패해도 무시하고 진행
      const map: LabelMap = {};
      for (const r of data ?? []) map[r.wallet] = r.label;
      setLabels(map);
    })();
  }, [whales]);

  // 정렬
  const byC3C = useMemo(
    () => [...(whales ?? [])]
      .sort((a, b) => Number(b["순매수_C3C"] || 0) - Number(a["순매수_C3C"] || 0))
      .map((w, i) => ({ ...w, _rank: i + 1 })),
    [whales]
  );
  const bySOL = useMemo(
    () => [...(whales ?? [])]
      .sort((a, b) => Number(b["순매수_SOL"] || 0) - Number(a["순매수_SOL"] || 0))
      .map((w, i) => ({ ...w, _rank: i + 1 })),
    [whales]
  );

  // 검색 + 관심 필터
  const rowsBase = tab === "buy" ? byC3C : bySOL;
  const rows = rowsBase.filter((w: any) => {
    const wallet = String(w["지갑"] || "");
    const okSearch = !q
      || wallet.toLowerCase().includes(q.toLowerCase())
      || (labels[wallet] || "").includes(q);
    const okWatch = !watchOnly || watch.includes(wallet);
    return okSearch && okWatch;
  });

  // 라벨 저장만 upsert. 요청 시에만 1회 호출
  async function setLabel(wallet: string) {
    const current = labels[wallet] || "";
    const label = window.prompt("지갑 라벨을 입력", current ?? "");
    if (label == null) return;
    const { error } = await sb.from("wallet_labels").upsert({ wallet, label });
    if (error) { alert("라벨 저장 실패"); return; }
    setLabels(m => ({ ...m, [wallet]: label }));
  }

  function toggleWatch(wallet: string){
    setWatch(prev => {
      const next = prev.includes(wallet) ? prev.filter(x=>x!==wallet) : [...prev, wallet];
      localStorage.setItem("watchlist", JSON.stringify(next));
      return next;
    });
  }

  return (
    <section className="card">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
        <div>
          <h2 className="h1">고래 순위</h2>
          <p className="sub">
            {tab === "buy" ? "C3C 기준 상위" : "SOL 기준 상위"} · 기준가 {nf6.format(lastPriceSOLperC3C)} SOL/C3C
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2 bg-neutral-900/60 border border-neutral-700 rounded-xl p-1">
            <button onClick={() => setTab("buy")} className={cls("px-3 py-1 rounded-lg", tab==="buy"?"bg-white/10":"hover:bg-white/5")}>순매수 랭킹</button>
            <button onClick={() => setTab("sell")} className={cls("px-3 py-1 rounded-lg", tab==="sell"?"bg-white/10":"hover:bg-white/5")}>순매도 랭킹</button>
          </div>
          <input className="input" placeholder="지갑 또는 라벨 검색" value={q} onChange={(e)=>setQ(e.target.value)} />
          <label className="switch">
            <input type="checkbox" checked={watchOnly} onChange={e=>setWatchOnly(e.target.checked)} />
            <span>관심만</span>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="th">순위</th>
              <th className="th">지갑</th>
              <th className="th">순매수 C3C</th>
              <th className="th">순매수 SOL</th>
              <th className="th">P&L(SOL)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w: any) => {
              const wallet = String(w["지갑"]);
              const netC3C = Number(w["순매수_C3C"] || 0);
              const netSOL = Number(w["순매수_SOL"] || 0);
              const pnlSOL = netSOL + netC3C * Number(lastPriceSOLperC3C || 0);

              return (
                <tr
                  key={wallet}
                  onMouseEnter={() => setHover(wallet)}
                  onMouseLeave={() => setHover(null)}
                  className={cls("transition", hover === wallet && "bg-neutral-800/40 ring-1 ring-neutral-700")}
                >
                  <td className="td">{w._rank}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      {/* 관심 토글 */}
                      <button onClick={()=>toggleWatch(wallet)} title="관심 토글" className="btn-ghost">
                        {watch.includes(wallet)
                          ? (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.25l-7.19-.62L12 2 9.19 8.63 2 9.25l5.46 4.72L5.82 21z"/></svg>)
                          : (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.25l-7.19-.62L12 2 9.19 8.63 2 9.25l5.46 4.72L5.82 21z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>)
                        }
                      </button>

                      <span className="font-mono">{short(wallet)}</span>

                      {/* 라벨 뱃지 */}
                      {labels[wallet] && (
                        <span className="badge badge-sky">{labels[wallet]}</span>
                      )}

                      {/* 라벨 편집 */}
                      <button title="라벨 편집" onClick={() => setLabel(wallet)} className="btn-ghost">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M16.5 3.5l4 4L8 20l-5 1 1-5L16.5 3.5z" stroke="currentColor" strokeWidth="2" fill="none"/>
                        </svg>
                      </button>

                      {/* 복사 */}
                      <button title="지갑 복사" onClick={async()=>{ try{ await navigator.clipboard.writeText(wallet);}catch{} }} className="btn-ghost">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                          <rect x="2" y="2" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>

                      {/* Solscan */}
                      <a title="Solscan" href={`https://solscan.io/account/${wallet}`} target="_blank" rel="noreferrer" className="btn-ghost">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M14 3h7v7M10 14L21 3M21 14v7h-7M14 21L3 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </a>
                    </div>
                  </td>

                  <td className={cls("td", tone(netC3C))}>{sign0(netC3C)}</td>
                  <td className={cls("td", tone(netSOL))}>{sign6(netSOL)}</td>
                  <td className={cls("td", pnlSOL >= 0 ? "text-emerald-400" : "text-rose-400")}>
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
