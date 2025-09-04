"use client";

import { TradeRow } from "./TabsContainer";

const nf3 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });
const nf6 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });

function short(x: string) {
  return x?.length > 12 ? `${x.slice(0, 6)}…${x.slice(-6)}` : x || "";
}
function fmtTime(iso: string, loading?: boolean) {
  if (!iso || loading) return "…";
  try { return new Date(iso).toLocaleString("ko-KR", { hour12: false }); }
  catch { return iso || ""; }
}

/** 데스크톱 테이블용: 절대배치 배경(레이아웃 영향 0) */
function renderSolCellDesktop(side: "BUY" | "SELL", raw: number) {
  const val = Math.abs(Number(raw) || 0);
  if (!Number.isFinite(val)) return "…";
  if (val < 1) return <span className="relative z-10">{nf6.format(val)}</span>;

// 11칸 게이지: 1SOL→2칸, 2SOL→3칸 … 10SOL→11칸(가득)
const over10 = val >= 10;
const level = Math.min(11, Math.max(2, Math.floor(val) + 1)); // 2..11 (채울 칸 수)
const pct = over10 ? 100 : Math.round(level * (100 / 11));    // 11칸 환산 퍼센트

const hue = side === "BUY" ? 152 : 350;     // 초록 / 로즈
const stepLight = 64 - level * 2.5;         // 옅→짙
const base = `hsla(${hue}, 90%, ${stepLight}%, 0.24)`;
const deep = `hsla(${hue}, 85%, ${stepLight - 6}%, 0.35)`;
const bg = over10 ? `linear-gradient(90deg, ${base}, ${deep})` : base;
const ring = `inset 0 0 0 1px hsla(${hue}, 85%, 55%, .30)`;


  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-6 rounded-md"
        style={{
          width: `calc(${pct}% - .75rem)`,
          background: bg,
          boxShadow: ring,
        }}
      />
      <span className="relative z-10">{nf6.format(val)}</span>
    </>
  );
}

/** 모바일 카드용: pill 스타일 */
function solHeatStyle(side: "BUY" | "SELL", solRaw: number): React.CSSProperties | undefined {
  const sol = Math.abs(Number(solRaw) || 0);
  if (sol < 1) return; // 1 SOL 미만은 색상 없음
  const isBuy = side === "BUY";
  const hue = isBuy ? 152 : 356;
  const sat = 82;
  const common: React.CSSProperties = {
    borderRadius: 8,
    padding: "2px 6px",
    display: "inline-flex",
    justifyContent: "flex-end",
    minWidth: 96,
    lineHeight: 1.25,
    fontVariantNumeric: "tabular-nums",
  };
  if (sol < 10) {
    const step = Math.min(9, Math.floor(sol));     // 1..9
    const alpha = 0.12 + step * 0.02;              // 0.14~0.30
    const bg = `hsla(${hue}, ${sat}%, 45%, ${alpha})`;
    const border = `hsla(${hue}, ${sat}%, 30%, ${alpha * 0.6})`;
    return { ...common, backgroundColor: bg, boxShadow: `inset 0 0 0 1px ${border}` };
  } else {
    const base = `hsla(${hue}, ${sat}%, 45%, 0.30)`;
    const strong = `hsla(${hue}, ${sat}%, 50%, 0.48)`;
    return {
      ...common,
      backgroundColor: base,
      backgroundImage: `linear-gradient(90deg, ${base} 0%, ${strong} 100%)`,
      boxShadow: `inset 0 0 0 1px hsla(${hue}, ${sat}%, 30%, 0.35)`,
    };
  }
}

export default function RecentTradesView({ rows }: { rows: TradeRow[] }) {
  return (
    <div className="card card-trades">
      <div className="section-head head-trades">
        <span className="head-icon icon-trades">
          <svg width="16" height="16" viewBox="0 0 24 24" className="text-emerald-200">
            <path d="M13 3L4 14h6l-1 7 9-11h-6l1-7z" fill="currentColor"/>
          </svg>
        </span>
        <div className="flex-1">
          <h3 className="h1">최근 체결</h3>
          <p className="sub">최신 500건 · 실시간 반영</p>
        </div>
        <span className="kicker kicker-emerald">TRADES</span>
      </div>

      <div className="section-body">
        <div className="desktop-only overflow-x-auto">
          <table className="table">
            <thead className="thead-sticky">
              <tr>
                <th className="th">시각</th>
                <th className="th">지갑</th>
                <th className="th">유형</th>
                <th className="th">C3C 수량</th>
                <th className="th">SOL 수량</th>
                <th className="th">가격 SOL/C3C</th>
                <th className="th">트랜잭션</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t, i) => (
                <tr key={`${t.tx_signature || i}-${i}`} className={t.side === "BUY" ? "left-buy" : "left-sell"}>
                  <td className="td">{fmtTime(t.ts, t._loading)}</td>
                  <td className="td font-mono">{t._loading ? "…" : short(t.wallet)}</td>
                  <td className="td">
                    <span className={t.side === "BUY" ? "chip-buy" : "chip-sell"}>
                      {t.side === "BUY" ? "매수" : "매도"}
                    </span>
                  </td>
                  <td className="td">{t._loading ? "…" : nf3.format(Number(t.c3c_amount || 0))}</td>

                  {/* 여기만 절대배경 방식으로 교체 (배열/간격 100% 유지) */}
                  <td className="td relative overflow-hidden">
                    {t._loading ? "…" : renderSolCellDesktop(t.side, Number(t.sol_amount || 0))}
                  </td>

                  <td className="td">{t._loading ? "…" : nf6.format(Number(t.price_sol_per_c3c || 0))}</td>
                  <td className="td">
                    {t.tx_signature ? (
                      <a className="btn-ghost" href={`https://solscan.io/tx/${t.tx_signature}`} target="_blank" rel="noreferrer">열기</a>
                    ) : (
                      <span className="text-neutral-500">…</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-only space-y-3">
          {rows.map((t, i) => (
            <div
              key={`${t.tx_signature || i}-${i}`}
              className={`mcard mcard-trade ${t.side === "BUY" ? "border-emerald-500/60" : "border-rose-500/60"}`}
            >
              <div className="flex justify-between text-xs text-neutral-400">
                <span>{fmtTime(t.ts, t._loading)}</span>
                <span className={t.side === "BUY" ? "chip-buy" : "chip-sell"}>
                  {t.side === "BUY" ? "매수" : "매도"}
                </span>
              </div>
              <div className="mt-1 font-mono">{t._loading ? "…" : short(t.wallet)}</div>
              <div className="mrow"><div className="mkey">C3C</div><div className="mval">{t._loading ? "…" : nf3.format(Number(t.c3c_amount || 0))}</div></div>
              <div className="mrow">
                <div className="mkey">SOL</div>
                <div className="mval">
                  {t._loading ? "…" : (
                    <span style={solHeatStyle(t.side, Number(t.sol_amount || 0))} title={`${t.sol_amount} SOL`}>
                      {nf6.format(Number(t.sol_amount || 0))}
                    </span>
                  )}
                </div>
              </div>
              <div className="mrow"><div className="mkey">가격</div><div className="mval">{t._loading ? "…" : `${nf6.format(Number(t.price_sol_per_c3c || 0))} SOL/C3C`}</div></div>
              <div className="mt-2">
                {t.tx_signature ? (
                  <a className="btn touch w-full justify-center" href={`https://solscan.io/tx/${t.tx_signature}`} target="_blank" rel="noreferrer">Solscan 열기</a>
                ) : (
                  <span className="btn touch w-full justify-center text-neutral-500">대기…</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
