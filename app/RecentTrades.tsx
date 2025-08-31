"use client";

import { useEffect, useState } from "react";
import { supabase as sb } from "../lib/supabase";
import WalletCell from "./components/WalletCell";

const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const nf6 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });

type Row = {
  시각: string;
  지갑: string;
  매수_매도: "매수" | "매도";
  C3C_수량: number;
  SOL_수량: number;
  가격_SOL_per_C3C: number;
  트랜잭션: string;
};

export default function RecentTrades({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial || []);

  useEffect(() => { setRows(initial || []); }, [initial]);

  useEffect(() => {
    const ch = sb
      .channel("te_insert_only")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trade_events" },
        async () => {
          const { data } = await sb
            .from("trade_events")
            .select("ts,wallet,side,c3c_amount,sol_amount,price_c3c_per_sol,price_sol_per_c3c,tx_signature")
            .order("ts", { ascending: false })
            .limit(15);

          const mapped: Row[] = (data ?? []).map((r: any) => ({
            시각: r.ts,
            지갑: r.wallet,
            매수_매도: r.side === "BUY" ? "매수" : "매도",
            C3C_수량: r.c3c_amount,
            SOL_수량: r.sol_amount,
            가격_SOL_per_C3C:
              Number(r.price_sol_per_c3c) ||
              (Number(r.price_c3c_per_sol) ? 1 / Number(r.price_c3c_per_sol) : 0),
            트랜잭션: r.tx_signature,
          }));

          setRows(mapped);
        }
      )
      .subscribe();

    return () => { sb.removeChannel(ch); };
  }, []);

  function fmtTime(iso: string) {
    try { return new Date(iso).toLocaleString("ko-KR", { hour12: false }); }
    catch { return iso; }
  }

  return (
    <section className="card card-trades">
      {/* 초록 배너 헤더 */}
      <div className="section-head head-trades">
        <span className="head-icon icon-trades">
          {/* bolt */}
          <svg width="16" height="16" viewBox="0 0 24 24" className="text-emerald-200">
            <path d="M13 3L4 14h6l-1 7 9-11h-6l1-7z" fill="currentColor"/>
          </svg>
        </span>
        <div className="flex-1">
          <h2 className="h1">최근 체결</h2>
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
                  <td className="td"><WalletCell addr={t.지갑} small /></td>
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

        {/* 모바일 타임라인 카드 */}
        <div className="mobile-only space-y-3">
          {rows.map((t, i) => (
            <div key={`${t.트랜잭션}-${i}`} className={`mcard mcard-trade ${t.매수_매도 === "매수" ? "border-emerald-500/60" : "border-rose-500/60"}`}>
              <div className="mrow">
                <div className="mkey">시각</div>
                <div className="mval">{fmtTime(t.시각)}</div>
              </div>
              <div className="mrow">
                <div className="mkey">지갑</div>
                <div className="mval"><WalletCell addr={t.지갑} small /></div>
              </div>
              <div className="mrow">
                <div className="mkey">유형</div>
                <div className="mval">
                  <span className={t.매수_매도 === "매수" ? "chip-buy" : "chip-sell"}>{t.매수_매도}</span>
                </div>
              </div>
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
    </section>
  );
}
