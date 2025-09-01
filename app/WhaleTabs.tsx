"use client";

import { useMemo, useState } from "react";
import WalletCell from "./components/WalletCell";
import { nf6, sign0, sign6, tone, shortAddress } from "../lib/utils/format";
import cls from "../lib/utils/cls";
import { useWatchlist } from "../lib/hooks/useWatchlist";
import { useWalletLabels } from "../lib/hooks/useWalletLabels";

type Whale = Record<string, any>;

function findKey(row: Record<string, any>, needles: string[]) {
  const keys = Object.keys(row || {});
  const hit = keys.find((k) => {
    const kk = k.toLowerCase();
    return needles.some((n) => kk.includes(n));
  });
  return hit || "";
}

export default function WhaleTabs({
  whales,
  lastPriceSOLperC3C,
}: {
  whales: Whale[];
  lastPriceSOLperC3C: number;
}) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [hover, setHover] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [watchOnly, setWatchOnly] = useState(false);
  const { watch, toggle } = useWatchlist();

  // Heuristically detect column keys (to survive garbled/locale names)
  const sample = whales?.[0] || {};
  const walletKey = useMemo(
    () =>
      findKey(sample, ["wallet", "address", "addr", "owner", "지", "주소"]) ||
      "wallet",
    [sample]
  );
  const c3cKey = useMemo(
    () => findKey(sample, ["c3c", "토큰", "amount_c3c", "매수c3c", "순", "매매"]) || "c3c",
    [sample]
  );
  const solKey = useMemo(
    () => findKey(sample, ["sol", "amount_sol", "솔", "매수sol"]) || "sol",
    [sample]
  );

  const walletsAll = useMemo(
    () => (whales ?? []).map((w) => String(w[walletKey] ?? "")).filter(Boolean),
    [whales, walletKey]
  );
  const { labels, upsertLabel } = useWalletLabels(walletsAll);

  const byC3C = useMemo(
    () =>
      [...(whales ?? [])]
        .sort(
          (a, b) => Number(b[c3cKey] || 0) - Number(a[c3cKey] || 0)
        )
        .map((w, i) => ({ ...w, _rank: i + 1 })),
    [whales, c3cKey]
  );
  const bySOL = useMemo(
    () =>
      [...(whales ?? [])]
        .sort(
          (a, b) => Number(b[solKey] || 0) - Number(a[solKey] || 0)
        )
        .map((w, i) => ({ ...w, _rank: i + 1 })),
    [whales, solKey]
  );

  const rowsBase = tab === "buy" ? byC3C : bySOL;
  const rows = rowsBase.filter((w: any) => {
    const wallet = String(w[walletKey] || "");
    const okSearch =
      !q ||
      wallet.toLowerCase().includes(q.toLowerCase()) ||
      (labels[wallet] || "").includes(q);
    const okWatch = !watchOnly || watch.includes(wallet);
    return okSearch && okWatch;
  });

  const maxMetric = useMemo(() => {
    const nums = rows.map((w) =>
      Math.abs(Number(tab === "buy" ? w[c3cKey] : w[solKey]) || 0)
    );
    return Math.max(1, ...nums);
  }, [rows, tab, c3cKey, solKey]);

  async function setLabel(wallet: string) {
    const current = labels[wallet] || "";
    const label = window.prompt("지갑 라벨 입력", current ?? "");
    if (label == null) return;
    const ok = await upsertLabel(wallet, label);
    if (!ok) alert("라벨 저장 실패");
  }

  return (
    <section className="card card-rank">
      <div className="section-head head-rank">
        <span className="head-icon icon-rank">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            className="text-violet-200"
            fill="currentColor"
          >
            <path d="M3 11c0 3.5 3 6 7.5 6h3.3c3.1 0 5.7-2.3 6.1-5.4l.1-.6c.1-1-.7-1.8-1.6-1.8h-3.1c-.7 0-1.3-.3-1.8-.8l-1-1a2 2 0 0 0-1.4-.6H9c-3.3 0-6 2.2-6 4.2Zm5.5-.8a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6Z" />
          </svg>
        </span>
        <div className="flex-1">
          <h2 className="h1">고래 랭킹</h2>
          <p className="sub">
            {tab === "buy" ? "C3C 기준 랭킹" : "SOL 기준 랭킹"} · 기준가 {nf6.format(
              lastPriceSOLperC3C
            )} SOL/C3C
          </p>
        </div>
        <span className="kicker kicker-violet">RANK</span>
      </div>

      <div className="section-body">
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto mb-4">
          <div className="flex gap-2 bg-neutral-900/60 border border-neutral-700 rounded-xl p-1">
            <button
              onClick={() => setTab("buy")}
              className={cls(
                "px-3 py-1 rounded-lg touch",
                tab === "buy" ? "bg-violet-500/20" : "hover:bg-white/5"
              )}
            >
              매수 기준
            </button>
            <button
              onClick={() => setTab("sell")}
              className={cls(
                "px-3 py-1 rounded-lg touch",
                tab === "sell" ? "bg-violet-500/20" : "hover:bg-white/5"
              )}
            >
              매도 기준
            </button>
          </div>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="지갑/라벨 검색"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <label className="switch">
              <input
                type="checkbox"
                checked={watchOnly}
                onChange={(e) => setWatchOnly(e.target.checked)}
              />
              <span>관심만</span>
            </label>
          </div>
        </div>

        {/* Desktop table */}
        <div className="desktop-only overflow-x-auto">
          <table className="table">
            <thead className="thead-sticky">
              <tr>
                <th className="th">순위</th>
                <th className="th">지갑</th>
                <th className="th">{tab === "buy" ? "순매수 C3C" : "순매수 SOL"}</th>
                <th className="th">{tab === "buy" ? "순매수 SOL" : "순매수 C3C"}</th>
                <th className="th">미실현(PnL, SOL)</th>
                <th className="th">총손익(SOL)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w: any) => {
                const wallet = String(w[walletKey] || "");
                const netC3C = Number(w[c3cKey] || 0);
                const netSOL = Number(w[solKey] || 0);

                const posC3C = Math.max(0, netC3C);
                const unrealizedSOL = posC3C * Number(lastPriceSOLperC3C || 0);
                const totalSOL = netSOL + unrealizedSOL;

                const metric = Math.abs(Number(tab === "buy" ? netC3C : netSOL));
                const widthPct = Math.max(
                  2,
                  Math.min(100, Math.round((100 * metric) / maxMetric))
                );

                return (
                  <tr
                    key={wallet}
                    onMouseEnter={() => setHover(wallet)}
                    onMouseLeave={() => setHover(null)}
                    className={cls(
                      "transition",
                      hover === wallet &&
                        "bg-violet-900/10 ring-1 ring-violet-700/30"
                    )}
                  >
                    <td className="td">{w._rank}</td>
                    <td className="td">
                      <WalletCell
                        addr={wallet}
                        label={labels[wallet]}
                        onEdit={() => setLabel(wallet)}
                        onWatchToggle={() => toggle(wallet)}
                        watched={watch.includes(wallet)}
                      />
                    </td>

                    <td className={cls("td", tone(tab === "buy" ? netC3C : netSOL))}>
                      <div className="flex items-center justify-between gap-3">
                        <span>
                          {tab === "buy" ? sign0(netC3C) : sign6(netSOL)}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {widthPct}%
                        </span>
                      </div>
                      <div className="rankwrap">
                        <div className="rankbar" style={{ width: `${widthPct}%` }} />
                      </div>
                    </td>

                    <td className={cls("td", tone(tab === "buy" ? netSOL : netC3C))}>
                      {tab === "buy" ? sign6(netSOL) : sign0(netC3C)}
                    </td>

                    <td className={cls("td", tone(unrealizedSOL))}>
                      {sign6(unrealizedSOL)}
                    </td>
                    <td className={cls("td", tone(totalSOL))}>{sign6(totalSOL)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mobile-only space-y-3">
          {rows.map((w: any) => {
            const wallet = String(w[walletKey] || "");
            const netC3C = Number(w[c3cKey] || 0);
            const netSOL = Number(w[solKey] || 0);
            const posC3C = Math.max(0, netC3C);
            const unrealizedSOL = posC3C * Number(lastPriceSOLperC3C || 0);
            const totalSOL = netSOL + unrealizedSOL;
            const metric = Math.abs(Number(tab === "buy" ? netC3C : netSOL));
            const widthPct = Math.max(
              2,
              Math.min(100, Math.round((100 * metric) / maxMetric))
            );

            return (
              <div key={wallet} className="mcard mcard-rank">
                <div className="mrow">
                  <div className="font-mono">{shortAddress(wallet)}</div>
                  {labels[wallet] && (
                    <span className="badge badge-emerald">{labels[wallet]}</span>
                  )}
                </div>
                <div className="mrow">
                  <span className="mkey">순위</span>
                  <span className="mval">{w._rank}</span>
                </div>
                <div className="mrow">
                  <span className="mkey">
                    {tab === "buy" ? "순매수 C3C" : "순매수 SOL"}
                  </span>
                  <span className="mval">
                    {tab === "buy" ? sign0(netC3C) : sign6(netSOL)}
                  </span>
                </div>
                <div className="rankwrap">
                  <div className="rankbar" style={{ width: `${widthPct}%` }} />
                </div>
                <div className="mrow">
                  <span className="mkey">
                    {tab === "buy" ? "순매수 SOL" : "순매수 C3C"}
                  </span>
                  <span className="mval">
                    {tab === "buy" ? sign6(netSOL) : sign0(netC3C)}
                  </span>
                </div>
                <div className="mrow">
                  <span className="mkey">미실현(SOL)</span>
                  <span className={cls("mval", tone(unrealizedSOL))}>
                    {sign6(unrealizedSOL)}
                  </span>
                </div>
                <div className="mrow">
                  <span className="mkey">총손익(SOL)</span>
                  <span className={cls("mval", tone(totalSOL))}>{sign6(totalSOL)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

