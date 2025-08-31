// app/page.tsx

import { unstable_noStore as noStore } from "next/cache";
import LiveRefresh from "./LiveRefresh";
import { supabase } from "../lib/supabase";
import WhaleTabs from "./WhaleTabs";
import RecentTrades from "./RecentTrades";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  noStore();

  // 1) 고래 데이터
  const { data: whales } = await supabase
    .from("whale_ranking")
    .select("*")
    .limit(200);

  // 2) 최근 체결 15건 + 최신가
  const { data: tradesRaw } = await supabase
    .from("trade_events")
    .select(
      "ts,wallet,side,c3c_amount,sol_amount,price_c3c_per_sol,price_sol_per_c3c,tx_signature"
    )
    .order("ts", { ascending: false })
    .limit(15);

  const latest = tradesRaw?.[0];
  const lastPriceSOLperC3C =
    Number(latest?.price_sol_per_c3c) ||
    (Number(latest?.price_c3c_per_sol)
      ? 1 / Number(latest?.price_c3c_per_sol)
      : 0);

  const initialTrades =
    (tradesRaw ?? []).map((r: any) => ({
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

  return (
    <>
      {/* 클라이언트 쪽에서만 동작하는 자동 새로고침 컨트롤러 */}
      <LiveRefresh />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="h1">요약</h1>
          <span className="badge badge-emerald">
            최신가&nbsp;
            {lastPriceSOLperC3C ? lastPriceSOLperC3C.toFixed(6) : "—"}
            &nbsp;SOL/C3C
          </span>
        </div>

        <WhaleTabs
          whales={whales ?? []}
          lastPriceSOLperC3C={lastPriceSOLperC3C}
        />
        <RecentTrades initial={initialTrades} />
      </div>
    </>
  );
}
