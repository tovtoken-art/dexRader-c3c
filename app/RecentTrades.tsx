"use client";

import { useEffect, useState } from "react";
import { supabase as sb } from "../lib/supabase";

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

  useEffect(() => {
    setRows(initial || []);
  }, [initial]);

  useEffect(() => {
    const ch = sb
      .channel("te_insert_only")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trade_events" },
        async () => {
          // 새 데이터 들어오면 최신 15건만 다시 로드
          const { data } = await sb
            .from("trade_events")
            .select(
              "ts,wallet,side,c3c_amount,sol_amount,price_c3c_per_sol,price_sol_per_c3c,tx_signature"
            )
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

    return () => {
      sb.removeChannel(ch);
    };
  }, []);

  function short(x: string) {
    return x?.length > 12 ? `${x.slice(0, 6)}…${x.slice(-6)}` : x;
  }
  function fmtTime(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleString("ko-KR", { hour12: false });
    } catch {
      return iso;
    }
  }

  return (
    <section className="card">
      <div className="flex items-end justify-between mb-4">
        <h1 className="h1">최근 체결</h1>
        <p className="sub">최신 15건</p>
      </div>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="th">시각</th>
              <th className="th">지갑</th>
              <th className="th">매수/매도</th>
              <th className="th">C3C 수량</th>
              <th className="th">SOL 수량</th>
              <th className="th">가격 SOL/C3C</th>
              <th className="th">트랜잭션</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => (
              <tr key={`${t.트랜잭션}-${i}`}>
                <td className="td">{fmtTime(t.시각)}</td>
                <td className="td font-mono">{short(t.지갑)}</td>
                <td className={`td ${t.매수_매도 === "매수" ? "text-emerald-400" : "text-red-400"}`}>
                  {t.매수_매도}
                </td>
                <td className="td">{nf0.format(Number(t.C3C_수량 || 0))}</td>
                <td className="td">{nf6.format(Number(t.SOL_수량 || 0))}</td>
                <td className="td">{nf6.format(Number(t.가격_SOL_per_C3C || 0))}</td>
                <td className="td">
                  <a
                    className="text-blue-400 hover:underline"
                    href={`https://solscan.io/tx/${t.트랜잭션}`}
                    target="_blank"
                  >
                    열기
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
