import { supabase } from "../lib/supabase";
import RealtimeKick from "./RealtimeKick";
import WhaleTabs from "./WhaleTabs";

const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const nf6 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });

export default async function Page() {
  // 고래 데이터
  const { data: whales } = await supabase
    .from("whale_ranking")
    .select("*")
    .limit(100);

  // 최근 체결  원본 테이블에서 읽고 한글 키로 매핑
  const { data: tradesRaw } = await supabase
    .from("trade_events")
    .select(
      "ts,wallet,side,c3c_amount,sol_amount,price_c3c_per_sol,price_sol_per_c3c,tx_signature"
    )
    .order("ts", { ascending: false })
    .limit(50);

  const trades =
    (tradesRaw ?? []).map((r: any) => {
      const pSolPerC3 =
        Number(r.price_sol_per_c3c) ||
        (Number(r.price_c3c_per_sol) ? 1 / Number(r.price_c3c_per_sol) : 0);
      return {
        시각: r.ts,
        지갑: r.wallet,
        매수_매도: r.side === "BUY" ? "매수" : "매도",
        C3C_수량: r.c3c_amount,
        SOL_수량: r.sol_amount,
        가격_SOL_per_C3C: pSolPerC3, // ← 1 C3C 당 SOL
        트랜잭션: r.tx_signature,
      };
    });

  return (
    <div className="space-y-8">
      {/* 탭 UI 적용된 고래 순위 */}
      <WhaleTabs whales={whales ?? []} />

      {/* 최근 체결 */}
      <section className="card">
        <div className="flex items-end justify-between mb-4">
          <h1 className="h1">최근 체결</h1>
          <p className="sub">최신 50건</p>
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
                <th className="th">가격 SOL/C3C</th> {/* ← 라벨 변경 */}
                <th className="th">트랜잭션</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t: any, i: number) => (
                <tr key={`${t["트랜잭션"]}-${i}`}>
                  <td className="td">{fmtTime(t["시각"])}</td>
                  <td className="td font-mono">{short(t["지갑"])}</td>
                  <td className="td">{t["매수_매도"]}</td>
                  <td className="td">{nf0.format(Number(t["C3C_수량"] || 0))}</td>
                  <td className="td">{nf6.format(Number(t["SOL_수량"] || 0))}</td>
                  <td className="td">
                    {nf6.format(Number(t["가격_SOL_per_C3C"] || 0))}
                  </td>
                  <td className="td">
                    <a
                      className="text-blue-400 hover:underline"
                      href={`https://solscan.io/tx/${t["트랜잭션"]}`}
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

      <RealtimeKick />
    </div>
  );
}

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
