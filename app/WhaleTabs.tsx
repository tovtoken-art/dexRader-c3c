"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase as sb } from "../lib/supabase";
import WalletCell from "./components/WalletCell";

const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const nf6 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });

type Whale = { [k: string]: any };
type LabelMap = Record<string, string>;

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
  lastPriceSOLperC3C: number;
}) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [labels, setLabels] = useState<LabelMap>({});
  const [hover, setHover] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [watchOnly, setWatchOnly] = useState(false);
  const [watch, setWatch] = useState<string[]>(
    () => { try { return JSON.parse(localStorage.getItem("watchlist")||"[]"); } catch { return []; } }
  );

  useEffect(() => {
    (async () => {
      const wallets = (whales ?? []).map(w => String(w["지갑"])).filter(Boolean);
      if (!wallets.length) return;
      const { data } = await sb
        .from("wallet_labels")
        .select("wallet,label")
        .in("wallet", wallets.slice(0, 500));
      const map: LabelMap = {};
      for (const r of data ?? []) map[r.wallet] = r.label;
      setLabels(map);
    })();
  }, [whales]);

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

  const rowsBase = tab === "buy" ? byC3C : bySOL;
  const rows = rowsBase.filter((w: any) => {
    const wallet = String(w["지갑"] || "");
    const okSearch = !q || wallet.toLowerCase().includes(q.toLowerCase()) || (labels[wallet] || "").includes(q);
    const okWatch  = !watchOnly || watch.includes(wallet);
    return okSearch && okWatch;
  });

  const maxMetric = useMemo(() => {
    const nums = rows.map(w => Math.abs(Number(tab === "buy" ? w["순매수_C3C"] : w["순매수_SOL"]) || 0));
    return Math.max(1, ...nums);
  }, [rows, tab]);

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
    <section className="card card-rank">
      {/* 보라 배너 헤더 */}
      <div className="section-head head-rank">
        <span className="head-icon icon-rank">
          {/* 고래 아이콘 */}
          <svg width="18" height="18" viewBox="0 0 24 24" className="text-violet-200" fill="currentColor">
            <path d="M3 11c0 3.5 3 6 7.5 6h3.3c3.1 0 5.7-2.3 6.1-5.4l.1-.6c.1-1-.7-1.8-1.6-1.8h-3.1c-.7 0-1.3-.3-1.8-.8l-1-1a2 2 0 0 0-1.4-.6H9c-3.3 0-6 2.2-6 4.2Zm5.5-.8a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6Z"/>
          </svg>
        </span>
        <div className="flex-1">
          <h2 className="h1">고래 순위</h2>
          <p className="sub">{tab === "buy" ? "C3C 기준 상위" : "SOL 기준 상위"} · 기준가 {nf6.format(lastPriceSOLperC3C)} SOL/C3C</p>
        </div>
        <span className="kicker kicker-violet">RANK</span>
      </div>

      <div className="section-body">
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto mb-4">
          <div className="flex gap-2 bg-neutral-900/60 border border-neutral-700 rounded-xl p-1">
            <button onClick={() => setTab("buy")}  className={cls("px-3 py-1 rounded-lg touch", tab==="buy"  ? "bg-violet-500/20" : "hover:bg-white/5")}>순매수 랭킹</button>
            <button onClick={() => setTab("sell")} className={cls("px-3 py-1 rounded-lg touch", tab==="sell" ? "bg-violet-500/20" : "hover:bg-white/5")}>순매도 랭킹</button>
          </div>
          <div className="flex gap-2">
            <input className="input" placeholder="지갑 또는 라벨 검색" value={q} onChange={(e)=>setQ(e.target.value)} />
            <label className="switch">
              <input type="checkbox" checked={watchOnly} onChange={(e)=>setWatchOnly(e.target.checked)} />
              <span>관심만</span>
            </label>
          </div>
        </div>

        {/* 데스크톱 표 */}
        <div className="desktop-only overflow-x-auto">
          <table className="table">
            <thead className="thead-sticky">
              <tr>
                <th className="th">순위</th>
                <th className="th">지갑</th>
                <th className="th">{tab==="buy" ? "순매수 C3C" : "순매수 SOL"}</th>
                <th className="th">{tab==="buy" ? "순매수 SOL" : "순매수 C3C"}</th>
                <th className="th">P&L(SOL)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w: any) => {
                const wallet = String(w["지갑"]);
                const netC3C = Number(w["순매수_C3C"] || 0);
                const netSOL = Number(w["순매수_SOL"] || 0);
                const metric = Math.abs(Number(tab === "buy" ? netC3C : netSOL));
                const widthPct = Math.max(2, Math.min(100, Math.round(100 * metric / maxMetric)));

                // PnL 계산 우선순위: realized/pos/원가 있으면 그 공식, 아니면 net 기반 대안
                const posC3C  = Number(w["pos_c3c"] || 0);
                const posCost = Number(w["pos_cost_sol"] || 0);
                const realized= Number(w["realized_pnl_sol"] || 0);
                const pnlSOL =
                  (Number.isFinite(posC3C) && Number.isFinite(posCost) && Number.isFinite(realized))
                    ? realized + (Number(lastPriceSOLperC3C || 0) * posC3C - posCost)
                    : netSOL + netC3C * Number(lastPriceSOLperC3C || 0);

                return (
                  <tr
                    key={wallet}
                    onMouseEnter={() => setHover(wallet)}
                    onMouseLeave={() => setHover(null)}
                    className={cls("transition", hover === wallet && "bg-violet-900/10 ring-1 ring-violet-700/30")}
                  >
                    <td className="td">{w._rank}</td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <button onClick={()=>toggleWatch(wallet)} title="관심 토글" className="btn-ghost touch">
                          {watch.includes(wallet)
                            ? (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.25l-7.19-.62L12 2 9.19 8.63 2 9.25l5.46 4.72L5.82 21z"/></svg>)
                            : (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.25l-7.19-.62L12 2 9.19 8.63 2 9.25l5.46 4.72L5.82 21z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>)
                          }
                        </button>

                        {/* 지갑 셀: 복사 + Solscan 포함 */}
                        <WalletCell addr={wallet} />

                        {labels[wallet] && <span className="badge badge-emerald">{labels[wallet]}</span>}
                        <button title="라벨 편집" onClick={() => setLabel(wallet)} className="btn-ghost touch">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M16.5 3.5l4 4L8 20l-5 1 1-5L16.5 3.5z" stroke="currentColor" strokeWidth="2" fill="none"/>
                          </svg>
                        </button>
                      </div>
                    </td>

                    {/* 핵심 지표 + 막대 */}
                    <td className={cls("td", tone(tab==="buy"?netC3C:netSOL))}>
                      <div className="flex items-center justify-between gap-3">
                        <span>{tab==="buy" ? sign0(netC3C) : sign6(netSOL)}</span>
                        <span className="text-[10px] text-neutral-400">{widthPct}%</span>
                      </div>
                      <div className="rankwrap"><div className="rankbar" style={{ width: `${widthPct}%` }} /></div>
                    </td>

                    {/* 보조 지표 */}
                    <td className={cls("td", tone(tab==="buy"?netSOL:netC3C))}>
                      {tab==="buy" ? sign6(netSOL) : sign0(netC3C)}
                    </td>

                    {/* PnL */}
                    <td className={cls("td", pnlSOL >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {sign6(pnlSOL)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 모바일 카드 */}
        <div className="mobile-only space-y-3">
          {rows.map((w: any) => {
            const wallet = String(w["지갑"]);
            const netC3C = Number(w["순매수_C3C"] || 0);
            const netSOL = Number(w["순매수_SOL"] || 0);
            const metric = Math.abs(Number(tab === "buy" ? netC3C : netSOL));
            const widthPct = Math.max(2, Math.min(100, Math.round(100 * metric / maxMetric)));

            const posC3C  = Number(w["pos_c3c"] || 0);
            const posCost = Number(w["pos_cost_sol"] || 0);
            const realized= Number(w["realized_pnl_sol"] || 0);
            const pnlSOL =
              (Number.isFinite(posC3C) && Number.isFinite(posCost) && Number.isFinite(realized))
                ? realized + (Number(lastPriceSOLperC3C || 0) * posC3C - posCost)
                : netSOL + netC3C * Number(lastPriceSOLperC3C || 0);

            return (
              <div key={wallet} className="mcard mcard-rank">
                <div className="mrow items-center justify-between">
                  <WalletCell addr={wallet} small />
                  {labels[wallet] && <span className="badge badge-emerald">{labels[wallet]}</span>}
                </div>
                <div className="mrow"><span className="mkey">순위</span><span className="mval">{w._rank}</span></div>
                <div className="mrow">
                  <span className="mkey">{tab==="buy" ? "순매수 C3C" : "순매수 SOL"}</span>
                  <span className="mval">{tab==="buy" ? sign0(netC3C) : sign6(netSOL)}</span>
                </div>
                <div className="rankwrap"><div className="rankbar" style={{ width: `${widthPct}%` }} /></div>
                <div className="mrow">
                  <span className="mkey">{tab==="buy" ? "순매수 SOL" : "순매수 C3C"}</span>
                  <span className="mval">{tab==="buy" ? sign6(netSOL) : sign0(netC3C)}</span>
                </div>
                <div className="mrow">
                  <span className="mkey">P&L(SOL)</span>
                  <span className={cls("mval", (pnlSOL>=0) ? "text-emerald-400" : "text-rose-400")}>{sign6(pnlSOL)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
