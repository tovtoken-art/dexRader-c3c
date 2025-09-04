export const dynamic = "force-dynamic";
export const revalidate = 0;
import { unstable_noStore as noStore } from "next/cache";
import { supabase } from "../lib/supabase";
import TabsContainer, { TradeRow } from "./TabsContainer";

const nf6 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });

export default async function Page() {
  noStore();

  // 1) 고래 랭킹
  const { data: whales } = await supabase
    .from("whale_ranking")
    .select("*")
    .limit(200);

  // 2) 최근 체결 15건 + 최신가
  const { data: tradesRaw } = await supabase
    .from("trade_events")
    .select("ts,wallet,side,c3c_amount,sol_amount,price_c3c_per_sol,price_sol_per_c3c,tx_signature")
    .order("ts", { ascending: false })
    .limit(500);

  const latest = tradesRaw?.[0];
  const lastPriceSOLperC3C =
    Number(latest?.price_sol_per_c3c) ||
    (Number(latest?.price_c3c_per_sol) ? 1 / Number(latest?.price_c3c_per_sol) : 0) || 0;

  const trades: TradeRow[] = (tradesRaw ?? []).map((r: any) => ({
    ts: r.ts,
    wallet: r.wallet,
    side: r.side === "BUY" ? "BUY" : "SELL",
    c3c_amount: Number(r.c3c_amount || 0),
    sol_amount: Number(r.sol_amount || 0),
    price_sol_per_c3c:
      Number(r.price_sol_per_c3c) ||
      (Number(r.price_c3c_per_sol) ? 1 / Number(r.price_c3c_per_sol) : 0),
    tx_signature: r.tx_signature,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="h1">DEX_Rader</h1>
        <span className="badge badge-emerald">최신가 {nf6.format(Number(lastPriceSOLperC3C || 0))} SOL/C3C</span>
      </div>

      <TabsContainer
        whalesInit={whales ?? []}
        tradesInit={trades}
        lastPriceInitSOLperC3C={lastPriceSOLperC3C}
      />
    </div>
  );
}

