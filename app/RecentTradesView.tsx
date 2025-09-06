"use client";

import { useEffect, useRef, useState } from "react";
import { TradeRow } from "./TabsContainer";

const nf3 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });
const nf6 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });

function short(x: string) {
  return x?.length > 12 ? `${x.slice(0, 6)}…${x.slice(-6)}` : x || "";
}
function fmtTime(iso: string, loading?: boolean) {
  if (!iso || loading) return "…";
  try { return new Date(iso).toLocaleString("ko-KR", { hour12: false }); }
  catch { return iso || ""; }
}

/** 데스크톱 테이블용: 절대배치 배경(레이아웃 영향 0) + 11칸 규칙 */
function renderSolCellDesktop(side: "BUY" | "SELL", raw: number) {
  const val = Math.abs(Number(raw) || 0);
  if (!Number.isFinite(val)) return "…";
  if (val < 1) return <span className="relative z-10">{nf6.format(val)}</span>;

  // 11칸 게이지: 1SOL→2칸, 2SOL→3칸 … 10SOL→11칸(가득)
  const total = 11;
  const over10 = val >= 10;
  const level = Math.min(total, Math.max(2, Math.floor(val) + 1)); // 2..11
  const pct = over10 ? 100 : Math.round((level / total) * 100);

  const hue = side === "BUY" ? 152 : 350;  // 초록 / 로즈
  const stepLight = 64 - level * 2.5;      // 옅→짙
  const base = `hsla(${hue}, 90%, ${stepLight}%, 0.24)`;
  const deep = `hsla(${hue}, 85%, ${stepLight - 6}%, 0.35)`;
  const bg = over10 ? `linear-gradient(90deg, ${base}, ${deep})` : base;
  const ring = `inset 0 0 0 1px hsla(${hue}, 85%, 55%, .30)`;

  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-6 rounded-md"
        style={{ width: `calc(${pct}% - .75rem)`, background: bg, boxShadow: ring }}
      />
      <span className="relative z-10">{nf6.format(val)}</span>
    </>
  );
}

/** 모바일 카드용: pill 스타일 (11칸 규칙) */
function solHeatStyle(side: "BUY" | "SELL", solRaw: number): React.CSSProperties | undefined {
  const val = Math.abs(Number(solRaw) || 0);
  if (val < 1) return;

  const isBuy = side === "BUY";
  const hue = isBuy ? 152 : 356;
  const sat = 82;

  const total = 11;
  const over10 = val >= 10;
  const filled = over10 ? total : Math.min(total, Math.max(2, Math.floor(val) + 1));
  const pct = (filled / total) * 100;

  const base  = `hsla(${hue}, ${sat}%, 45%, 0.24)`;
  const deep  = `hsla(${hue}, ${sat}%, 50%, 0.48)`;
  const ring  = `inset 0 0 0 1px hsla(${hue}, ${sat}%, 30%, 0.35)`;

  const common: React.CSSProperties = {
    borderRadius: 8,
    padding: "2px 6px",
    display: "inline-flex",
    justifyContent: "flex-end",
    minWidth: 96,
    lineHeight: 1.25,
    fontVariantNumeric: "tabular-nums",
    boxShadow: ring,
  };

  if (over10) {
    return { ...common, backgroundImage: `linear-gradient(90deg, ${base} 0%, ${deep} 100%)` };
  }
  return {
    ...common,
    backgroundImage: `linear-gradient(90deg, ${base} 0%, ${base} ${pct}%, transparent ${pct}%)`,
  };
}

/* ------------------------------ */
/* 🔊 효과음: rows 갱신에 반응해서 재생 */
/* ------------------------------ */
function soundFor(side: "BUY" | "SELL", solAmount: number) {
  const s = Math.abs(Number(solAmount) || 0);
  if (s >= 10) return `/sounds/${side}_10sol_Transaction.mp3`;
  if (s >= 7)  return `/sounds/${side}_7sol_Transaction.mp3`;
  if (s >= 5)  return `/sounds/${side}_5sol_Transaction.mp3`;
  if (s >= 3)  return `/sounds/${side}_3sol_Transaction.mp3`;
  if (s >= 1)  return `/sounds/1sol_Transaction.mp3`;
  return `/sounds/New_Transaction.mp3`;
}

/* ------------------------------ */
/* 🖼️ 알림 아이콘: 캔버스로 즉석 생성(BUY/SELL 전용 원형 배지) */
/* ------------------------------ */
function makeNotifIcon(side: "BUY" | "SELL"): string | undefined {
  if (typeof document === "undefined") return undefined;
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return undefined;

  const isBuy = side === "BUY";
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  if (isBuy) {
    grad.addColorStop(0, "#22c55e");
    grad.addColorStop(1, "#16a34a");
  } else {
    grad.addColorStop(0, "#f43f5e");
    grad.addColorStop(1, "#dc2626");
  }
  // 배경
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // 안쪽 은은한 원
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath(); ctx.arc(size/2, size/2, size*0.46, 0, Math.PI*2); ctx.fill();

  // 화살표
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  if (isBuy) {
    // ⬆️
    ctx.moveTo(size*0.50, size*0.26);
    ctx.lineTo(size*0.75, size*0.51);
    ctx.lineTo(size*0.63, size*0.63);
    ctx.lineTo(size*0.54, size*0.55);
    ctx.lineTo(size*0.54, size*0.76);
    ctx.lineTo(size*0.46, size*0.76);
    ctx.lineTo(size*0.46, size*0.55);
    ctx.lineTo(size*0.37, size*0.63);
    ctx.lineTo(size*0.25, size*0.51);
    ctx.closePath();
  } else {
    // ⬇️
    ctx.moveTo(size*0.50, size*0.74);
    ctx.lineTo(size*0.25, size*0.49);
    ctx.lineTo(size*0.37, size*0.37);
    ctx.lineTo(size*0.46, size*0.45);
    ctx.lineTo(size*0.46, size*0.24);
    ctx.lineTo(size*0.54, size*0.24);
    ctx.lineTo(size*0.54, size*0.45);
    ctx.lineTo(size*0.63, size*0.37);
    ctx.lineTo(size*0.75, size*0.49);
    ctx.closePath();
  }
  ctx.fill();

  return c.toDataURL("image/png");
}

export default function RecentTradesView({ rows }: { rows: TradeRow[] }) {
  // 이미 본 트랜잭션(중복 재생 방지)
  const seenTx = useRef<Set<string>>(new Set());
  // 초기 로드 이후부터만 사운드 허용
  const readyAfterMount = useRef(false);
  // 브라우저 자동재생 제한 해제(최초 사용자 상호작용 후)
  const audioUnlocked = useRef(false);
  // 오디오 캐시
  const audioCache = useRef<Record<string, HTMLAudioElement>>({});
  // 🔔 알림 권한 요청 중복 방지
  const notifPrompted = useRef(false);

  // 🔊 사운드 on/off (기본 ON, localStorage 보존)
  const [soundOn, setSoundOn] = useState(true);
  const soundOnRef = useRef(soundOn);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);
  useEffect(() => {
    try { const v = localStorage.getItem("trades_sound_on"); if (v === "0") setSoundOn(false); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("trades_sound_on", soundOn ? "1" : "0"); } catch {}
  }, [soundOn]);

  // 🔔 브라우저 알림 (탭이 숨겨진 경우 시스템 알림)
  const [notifyOnHidden, setNotifyOnHidden] = useState(true);
  useEffect(() => {
    try { const v = localStorage.getItem("trades_notify_on_hidden"); if (v === "0") setNotifyOnHidden(false); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("trades_notify_on_hidden", notifyOnHidden ? "1" : "0"); } catch {}
  }, [notifyOnHidden]);

  const askNotificationPermission = async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    try { return (await Notification.requestPermission()) === "granted"; }
    catch { return false; }
  };

  // 알림 아이콘 캐시
  const notifIconCache = useRef<{ BUY?: string; SELL?: string }>({});

  const getNotifIcon = (side: "BUY" | "SELL") => {
    let u = notifIconCache.current[side];
    if (!u) {
      u = makeNotifIcon(side) || undefined;
      if (u) notifIconCache.current[side] = u;
    }
    return u;
  };

  // mount: 초기 rows는 seen으로만 등록(소리 X) + 사용자 상호작용으로 오디오 언락
  useEffect(() => {
    for (const r of rows || []) {
      if (r.tx_signature) seenTx.current.add(r.tx_signature);
    }
    const tid = setTimeout(() => { readyAfterMount.current = true; }, 300);

    const unlock = () => {
      audioUnlocked.current = true;

      // 권한이 아직 default면 상호작용 시 한 번 더 요청
      if ("Notification" in window && Notification.permission === "default" && !notifPrompted.current) {
        notifPrompted.current = true;
        askNotificationPermission().finally(() => {
          try { localStorage.setItem("trades_notif_prompted_v1", "1"); } catch {}
        });
      }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });

    return () => {
      clearTimeout(tid);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 처음 접속하면 한 번 권한을 물어봄(가능한 브라우저에서만)
  useEffect(() => {
    if (!("Notification" in window) || !("requestPermission" in Notification)) return;
    try {
      if (localStorage.getItem("trades_notif_prompted_v1") === "1") return;
    } catch {}

    if (Notification.permission === "default") {
      notifPrompted.current = true;
      askNotificationPermission().finally(() => {
        try { localStorage.setItem("trades_notif_prompted_v1", "1"); } catch {}
      });
    }
  }, []);

  // 새 거래 감지 → 사운드 + (백그라운드면) 시스템 알림
  useEffect(() => {
    if (!readyAfterMount.current || !audioUnlocked.current) return;
    if (!rows?.length) return;

    const newlyArrived: TradeRow[] = [];
    for (const r of rows) {
      const tx = r.tx_signature;
      if (!tx) continue;
      if (!seenTx.current.has(tx)) newlyArrived.push(r);
    }

    if (newlyArrived.length) {
      const top = newlyArrived[0];
      const url = soundFor(top.side as "BUY" | "SELL", Number(top.sol_amount) || 0);

      // 🔊 효과음
      if (soundOnRef.current) {
        try {
          let a = audioCache.current[url];
          if (!a) {
            a = new Audio(url);
            a.preload = "auto";
            audioCache.current[url] = a;
          }
          a.currentTime = 0;
          a.play().catch(() => {});
        } catch {}
      }

      // 🔔 탭이 숨겨져 있으면 시스템 알림 (권한 허용 시)
      const hidden = typeof document !== "undefined" && document.visibilityState !== "visible";
      if (hidden && notifyOnHidden && "Notification" in window) {
        (async () => {
          const ok = await askNotificationPermission();
          if (!ok) return;
          try {
            const isBuy = top.side === "BUY";
            const emoji = isBuy ? "🟢" : "🔴";
            const title = `${emoji} ${isBuy ? "매수" : "매도"} ${nf6.format(Math.abs(Number(top.sol_amount) || 0))} SOL`;
            const body  = `${short(top.wallet)} · ${nf3.format(Number(top.c3c_amount) || 0)} C3C · ${nf6.format(Number(top.price_sol_per_c3c) || 0)} SOL/C3C`;

            const icon = getNotifIcon(top.side as "BUY" | "SELL");
            const ts = Date.parse((top as any)?.ts || "") || Date.now();

            // TS의 NotificationOptions에는 없는 필드가 있어 any로 우회
            const opts: any = {
              body,
              icon,
              badge: icon,
              lang: "ko-KR",
              tag: "trades",
              silent: true,
              requireInteraction: false,
            };
            opts.timestamp = ts;
            opts.renotify = true;

            const n = new Notification(title, opts as any);

            n.onclick = () => {
              try {
                if (top.tx_signature) window.open(`https://solscan.io/tx/${top.tx_signature}`, "_blank");
                window.focus();
                n.close();
              } catch {}
            };
          } catch {}
        })();
      }

      // 본 것으로 처리
      for (const r of newlyArrived) {
        if (r.tx_signature) seenTx.current.add(r.tx_signature);
      }
    }
  }, [rows, notifyOnHidden]);

  // 🔕 OFF로 바꾸면 재생 중인 소리도 즉시 멈춤
  const toggleSound = () => {
    setSoundOn(prev => {
      const next = !prev;
      if (!next) {
        for (const a of Object.values(audioCache.current)) {
          try { a.pause(); a.currentTime = 0; } catch {}
        }
      }
      return next;
    });
  };

  const toggleNotify = async () => {
    if (!notifyOnHidden) {
      const ok = await askNotificationPermission();
      if (!ok) return;
    }
    setNotifyOnHidden(v => !v);
  };

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
          <p className="sub">최신 500건 · 실시간 반영</p>
        </div>

        {/* 🔊 사운드 토글 */}
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundOn}
          title={soundOn ? "효과음 끄기" : "효과음 켜기"}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium border transition mr-2
            ${soundOn
              ? "bg-emerald-500/10 text-emerald-200 border-emerald-500/30 hover:bg-emerald-500/20"
              : "bg-neutral-800/60 text-neutral-300 border-neutral-700 hover:bg-neutral-700/60"
            }`}
        >
          {soundOn ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0" fill="currentColor">
                <path d="M5 10v4h3l4 3V7l-4 3H5zm11.6 2a4.6 4.6 0 0 0-2.3-4v8a4.6 4.6 0 0 0 2.3-4Z"/>
              </svg>
              <span className="hidden sm:inline">Sound</span>
              <span className="sm:hidden">ON</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0" fill="currentColor">
                <path d="M16.5 12a4.5 4.5 0 0 0-2.2-3.9v-1a6 6 0 0 1 3.1 4.9m1.9 0A7.9 7.9 0 0 0 14.3 5l1.4-1.4A9.9 9.9 0 0 1 20.3 12M3.3 2L2 3.3 8.7 10H5v4h3l4 3v-5.7l5 5L18.7 18 3.3 2Z"/>
              </svg>
              <span className="hidden sm:inline">Muted</span>
              <span className="sm:hidden">OFF</span>
            </>
          )}
        </button>

        {/* 🔔 백그라운드 알림 토글 */}
        {"Notification" in globalThis && (
          <button
            type="button"
            onClick={toggleNotify}
            aria-pressed={notifyOnHidden}
            title={notifyOnHidden ? "탭이 숨겨져도 알림 끄기" : "탭이 숨겨져도 알림 켜기"}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium border transition mr-2
              ${notifyOnHidden
                ? "bg-cyan-500/10 text-cyan-200 border-cyan-500/30 hover:bg-cyan-500/20"
                : "bg-neutral-800/60 text-neutral-300 border-neutral-700 hover:bg-neutral-700/60"
              }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0" fill="currentColor">
              <path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6v-5a6 6 0 0 0-5-5.9V4a1 1 0 0 0-2 0v1.1A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2Z"/>
            </svg>
            <span className="hidden sm:inline">Notify</span>
            <span className="sm:hidden">{notifyOnHidden ? "ON" : "OFF"}</span>
          </button>
        )}

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
                <tr key={`${t.tx_signature || i}-${i}`} className={t.side === "BUY" ? "left-buy" : "left-sell"}>
                  <td className="td">{fmtTime(t.ts, t._loading)}</td>
                  <td className="td font-mono">{t._loading ? "…" : short(t.wallet)}</td>
                  <td className="td">
                    <span className={t.side === "BUY" ? "chip-buy" : "chip-sell"}>{t.side === "BUY" ? "매수" : "매도"}</span>
                  </td>
                  <td className="td">{t._loading ? "…" : nf3.format(Number(t.c3c_amount || 0))}</td>

                  {/* 데스크톱: 절대배경 게이지(11칸) */}
                  <td className="td relative overflow-hidden">
                    {t._loading ? "…" : renderSolCellDesktop(t.side, Number(t.sol_amount || 0))}
                  </td>

                  <td className="td">{t._loading ? "…" : nf6.format(Number(t.price_sol_per_c3c || 0))}</td>
                  <td className="td">
                    {t.tx_signature ? (
                      <a className="btn-ghost" href={`https://solscan.io/tx/${t.tx_signature}`} target="_blank" rel="noreferrer">열기</a>
                    ) : (
                      <span className="text-neutral-500">…</span>
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
              <div className="mt-1 font-mono">{t._loading ? "…" : short(t.wallet)}</div>
              <div className="mrow"><div className="mkey">C3C</div><div className="mval">{t._loading ? "…" : nf3.format(Number(t.c3c_amount || 0))}</div></div>
              <div className="mrow">
                <div className="mkey">SOL</div>
                <div className="mval">
                  {t._loading ? "…" : (
                    <span style={solHeatStyle(t.side, Number(t.sol_amount || 0))} title={`${t.sol_amount} SOL`}>
                      {nf6.format(Number(t.sol_amount || 0))}
                    </span>
                  )}
                </div>
              </div>
              <div className="mrow"><div className="mkey">가격</div><div className="mval">{t._loading ? "…" : `${nf6.format(Number(t.price_sol_per_c3c || 0))} SOL/C3C`}</div></div>
              <div className="mt-2">
                {t.tx_signature ? (
                  <a className="btn touch w-full justify-center" href={`https://solscan.io/tx/${t.tx_signature}`} target="_blank" rel="noreferrer">Solscan 열기</a>
                ) : (
                  <span className="btn touch w-full justify-center text-neutral-500">대기…</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
