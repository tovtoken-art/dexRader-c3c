"use client";

import { useEffect, useRef, useState } from "react";
import { supabase as sb } from "./lib/supabase";
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
  const lastRefreshAt = useRef<number>(Date.now());

  useEffect(() => { setRows(initial || []); }, [initial]);

  // 공용: 최신 15건 당겨오기
  async function fetchLatest() {
    const { data, error } = await sb
      .from("trade_events")
      .select("ts,wallet,side,c3c_amount,sol_amount,price_c3c_per_sol,price_sol_per_c3c,tx_signature")
      .order("ts", { ascending: false })
      .limit(15);

    if (error) {
      console.warn("[fetchLatest] error", error);
      return;
    }

    const mapped: Row[] = (data ?? []).map((r: any) => ({
      시각: r.ts,
      지갑: r.wallet,
      매수_매도: r.side === "BUY" ? "매수" : "매도",
      C3C_수량: Number(r.c3c_amount) || 0,
      SOL_수량: Number(r.sol_amount) || 0,
      가격_SOL_per_C3C:
        Number(r.price_sol_per_c3c) ||
        (Number(r.price_c3c_per_sol) ? 1 / Number(r.price_c3c_per_sol) : 0),
      트랜잭션: r.tx_signature,
    }));

    setRows(mapped);
    lastRefreshAt.current = Date.now();
  }

  // payload -> Row 안전 변환
  function mapPayload(p: any): Row | null {
    const r = p?.new ?? p; // supabase payload.new
    if (!r) return null;

    const ts = r.ts;
    const wallet = r.wallet;
    const side = r.side;
    const c3 = Number(r.c3c_amount);
    const sol = Number(r.sol_amount);
    const psc = Number(r.price_sol_per_c3c);
    const pcs = Number(r.price_c3c_per_sol);

    // 필수 필드 검증: 하나라도 없으면 폴백
    if (!ts || !wallet || !side || !Number.isFinite(c3) || !Number.isFinite(sol)) return null;

    const price = Number.isFinite(psc)
      ? psc
      : Number.isFinite(pcs) && pcs !== 0
      ? 1 / pcs
      : 0;

    return {
      시각: ts,
      지갑: wallet,
      매수_매도: side === "BUY" ? "매수" : "매도",
      C3C_수량: c3,
      SOL_수량: sol,
      가격_SOL_per_C3C: price,
      트랜잭션: r.tx_signature,
    };
  }

  // Realtime 구독
  useEffect(() => {
    const ch = sb
      .channel("te_changes")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "trade_events" },
        async (payload) => {
          // 1) payload로 즉시 갱신 시도
          const row = mapPayload(payload);
          if (row && row.트랜잭션) {
            setRows(prev => {
              // de-dupe by tx
              const dedup = new Map<string, Row>();
              dedup.set(row.트랜잭션, row);
              for (const it of prev) {
                if (!dedup.has(it.트랜잭션)) dedup.set(it.트랜잭션, it);
              }
              return Array.from(dedup.values()).sort((a, b) =>
                new Date(b.시각).getTime() - new Date(a.시각).getTime()
              ).slice(0, 15);
            });
            lastRefreshAt.current = Date.now();
            return;
          }
          // 2) 불완전 이벤트면 안전하게 전체 재조회
          await fetchLatest();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") fetchLatest();
      });

    return () => { sb.removeChannel(ch); };
  }, []);

  // 폴백: 20초마다, 40초 이상 이벤트 없으면 한번 새로고침
  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() - lastRefreshAt.current > 40000) fetchLatest();
    }, 20000);
    return () => clearInterval(id);
  }, []);

  function fmtTime(iso: string) {
    try { return new Date(iso).toLocaleString("ko-KR", { hour12: false }); }
    catch { return iso; }
  }

  return (
    <section className="card card-trades">
      <div className="section-head head-trades">
        <span className="head-icon icon-trades">
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

        {/* 모바일 카드 뷰는 그대로 사용 */}
      </div>
    </section>
  );
}
