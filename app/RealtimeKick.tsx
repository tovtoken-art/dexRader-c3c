"use client";
import { supabase as sbClient } from "../lib/supabase";
import { useEffect } from "react";

export default function RealtimeKick() {
  useEffect(() => {
    const ch = sbClient
      .channel("te_insert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trade_events" },
        () => window.location.reload()
      )
      .subscribe();
    return () => {
      sbClient.removeChannel(ch);
    };
  }, []);
  return null;
}
