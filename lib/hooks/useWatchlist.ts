"use client";

import { useEffect, useState } from "react";

const KEY = "watchlist";

export function useWatchlist() {
  const [watch, setWatch] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(watch));
    } catch {}
  }, [watch]);

  const add = (addr: string) => setWatch((prev) => (prev.includes(addr) ? prev : [...prev, addr]));
  const remove = (addr: string) => setWatch((prev) => prev.filter((x) => x !== addr));
  const toggle = (addr: string) => setWatch((prev) => (prev.includes(addr) ? prev.filter((x) => x !== addr) : [...prev, addr]));

  return { watch, add, remove, toggle, setWatch } as const;
}

export default useWatchlist;

