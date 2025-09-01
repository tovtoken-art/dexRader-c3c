"use client";

import { useEffect, useState } from "react";
import { supabase as sb } from "../supabase";

export type LabelMap = Record<string, string>;

export function useWalletLabels(wallets: string[]) {
  const [labels, setLabels] = useState<LabelMap>({});

  useEffect(() => {
    (async () => {
      const list = (wallets || []).filter(Boolean);
      if (!list.length) return;
      try {
        const { data } = await sb
          .from("wallet_labels")
          .select("wallet,label")
          .in("wallet", list.slice(0, 500));
        const map: LabelMap = {};
        for (const r of data ?? []) map[r.wallet] = r.label;
        setLabels(map);
      } catch {}
    })();
  }, [JSON.stringify(wallets)]);

  async function upsertLabel(wallet: string, label: string) {
    try {
      const { error } = await sb.from("wallet_labels").upsert({ wallet, label });
      if (error) throw error;
      setLabels((m) => ({ ...m, [wallet]: label }));
      return true;
    } catch {
      return false;
    }
  }

  return { labels, setLabels, upsertLabel } as const;
}

export default useWalletLabels;
