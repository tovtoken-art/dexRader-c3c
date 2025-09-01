"use client";

import { TradeRow } from "../lib/types";
import { nf3, nf6, shortAddress, fmtTime } from "../lib/utils/format";

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
          <p className="sub">최신 15건 · 실시간 반영</p>
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
                <th className="th">가격(SOL/C3C)</th>
                <th className="th">트랜잭션</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t, i) => (
                <tr key={`${t.tx_signature || i}-${i}`} className={t.side === "BUY" ? "left-buy" : "left-sell"}>
                  <td className="td">{fmtTime(t.ts, t._loading)}</td>
                  <td className="td font-mono">{t._loading ? "-" : shortAddress(t.wallet)}</td>
                  <td className="td">
                    <span className={t.side === "BUY" ? "chip-buy" : "chip-sell"}>{t.side === "BUY" ? "매수" : "매도"}</span>
                  </td>
                  <td className="td">{t._loading ? "-" : nf3.format(Number(t.c3c_amount || 0))}</td>
                  <td className="td">{t._loading ? "-" : nf6.format(Number(t.sol_amount || 0))}</td>
                  <td className="td">{t._loading ? "-" : nf6.format(Number(t.price_sol_per_c3c || 0))}</td>
                  <td className="td">
                    {t.tx_signature ? (
                      <a className="btn-ghost" href={`https://solscan.io/tx/${t.tx_signature}`} target="_blank" rel="noreferrer">보기</a>
                    ) : (
                      <span className="text-neutral-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-only space-y-3">
          {rows.map((t, i) => (
            <div key={`${t.tx_signature || i}-${i}`} className={`mcard mcard-trade ${t.side === "BUY" ? "border-emerald-500/60" : "border-rose-500/60"}`}>
              <div className="flex justify-between text-xs text-neutral-400">
                <span>{fmtTime(t.ts, t._loading)}</span>
                <span className={t.side === "BUY" ? "chip-buy" : "chip-sell"}>{t.side === "BUY" ? "매수" : "매도"}</span>
              </div>
              <div className="mt-1 font-mono">{t._loading ? "-" : shortAddress(t.wallet)}</div>
              <div className="mrow"><div className="mkey">C3C</div><div className="mval">{t._loading ? "-" : nf3.format(Number(t.c3c_amount || 0))}</div></div>
              <div className="mrow"><div className="mkey">SOL</div><div className="mval">{t._loading ? "-" : nf6.format(Number(t.sol_amount || 0))}</div></div>
              <div className="mrow"><div className="mkey">가격</div><div className="mval">{t._loading ? "-" : `${nf6.format(Number(t.price_sol_per_c3c || 0))} SOL/C3C`}</div></div>
              <div className="mt-2">
                {t.tx_signature ? (
                  <a className="btn touch w-full justify-center" href={`https://solscan.io/tx/${t.tx_signature}`} target="_blank" rel="noreferrer">Solscan 보기</a>
                ) : (
                  <span className="btn touch w-full justify-center text-neutral-500">-</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
