"use client";

import { TradeRow } from "./TabsContainer";
import WalletCell from "../components/WalletCell"; // 상단에 추가

const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const nf6 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });

function short(x: string) {
  return x?.length > 12 ? `${x.slice(0, 6)}…${x.slice(-6)}` : x;
}
function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleString("ko-KR", { hour12: false }); }
  catch { return iso; }
}

export default function RecentTradesView({ rows }: { rows: TradeRow[] }) {
  return (
    <div className="card card-trades">
      {/* 초록 배너 */}
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
        {/* 데스크톱 표 */}
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
                <tr key={`${t.트랜잭션}-${i}`} className={t.매수_매도 === "매수" ? "left-buy" : "left-sell"}>
                  <td className="td">{fmtTime(t.시각)}</td>
                  <td className="td font-mono">{short(t.지갑)}</td>
                  <td className="td">
                    <span className={t.매수_매도 === "매수" ? "chip-buy" : "chip-sell"}>{t.매수_매도}</span>
                  </td>
                  <td className="td">{nf0.format(Number(t.C3C_수량 || 0))}</td>
                  <td className="td">{nf6.format(Number(t.SOL_수량 || 0))}</td>
                  <td className="td">{nf6.format(Number(t.가격_SOL_per_C3C || 0))}</td>
                  <td className="td">
                    <a className="btn-ghost" href={`https://solscan.io/tx/${t.트랜잭션}`} target="_blank" rel="noreferrer">
                      열기
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 모바일 카드 */}
        <div className="mobile-only space-y-3">
          {rows.map((t, i) => (
            <div key={`${t.트랜잭션}-${i}`} className={`mcard mcard-trade ${t.매수_매도 === "매수" ? "border-emerald-500/60" : "border-rose-500/60"}`}>
              <div className="flex justify-between text-xs text-neutral-400">
                <span>{fmtTime(t.시각)}</span>
                <span className={t.매수_매도 === "매수" ? "chip-buy" : "chip-sell"}>{t.매수_매도}</span>
              </div>
              <div className="mt-1 font-mono">{short(t.지갑)}</div>
              <div className="mrow"><div className="mkey">C3C</div><div className="mval">{nf0.format(Number(t.C3C_수량 || 0))}</div></div>
              <div className="mrow"><div className="mkey">SOL</div><div className="mval">{nf6.format(Number(t.SOL_수량 || 0))}</div></div>
              <div className="mrow"><div className="mkey">가격</div><div className="mval">{nf6.format(Number(t.가격_SOL_per_C3C || 0))} SOL/C3C</div></div>
              <div className="mt-2">
                <a className="btn touch w-full justify-center" href={`https://solscan.io/tx/${t.트랜잭션}`} target="_blank" rel="noreferrer">Solscan 열기</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
