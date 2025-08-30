import { supabase } from "../lib/supabase";
import RealtimeKick from "./RealtimeKick";

const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const nf6 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });

export default async function Page() {
  const { data: whales } = await supabase
    .from("whale_ranking")
    .select("*")
    .limit(50);

  const { data: trades } = await supabase
    .from("trade_events_ko")
    .select("*")
    .order("시각", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <section className="card">
        <div className="flex items-end justify-between mb-4">
          <h1 className="h1">고래 순위</h1>
          <p className="sub">순매수_C3C 기준</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="th">순위</th>
                <th className="th">지갑</th>
                <th className="th">순매수 C3C</th>
                <th className="th">순매수 SOL</th>
              </tr>
            </thead>
            <tbody>
              {whales?.map((w: any) => (
                <tr key={`${w["지갑"]}`}>
                  <td className="td">{w["순위"]}</td>
                  <td className="td font-mono">{short(w["지갑"])}</td>
                  <td className="td">{nf0.format(Number(w["순매수_C3C"] || 0))}</td>
                  <td className="td">{Number(w["순매수_SOL"] || 0).toFixed(6)}</td>
                </tr>
              )) ?? null}
            </tbody>
          </table>
        </div>
      </section>

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
                <th className="th">가격 C3C/SOL</th>
                <th className="th">트랜잭션</th>
              </tr>
            </thead>
            <tbody>
              {trades?.map((t: any, i: number) => (
                <tr key={`${t["트랜잭션"]}-${i}`]}>
                  <td className="td">{fmtTime(t["시각"])}</td>
                  <td className="td font-mono">{short(t["지갑"])}</td>
                  <td className="td">{t["매수_매도"]}</td>
                  <td className="td">{nf0.format(Number(t["C3C_수량"] || 0))}</td>
                  <td className="td">{nf6.format(Number(t["SOL_수량"] || 0))}</td>
                  <td className="td">{nf6.format(Number(t["가격_C3C_per_SOL"] || 0))}</td>
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
              )) ?? null}
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
  } catch { return iso; }
}
