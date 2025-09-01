export type TradeRow = {
  ts: string; // ISO string
  wallet: string;
  side: "BUY" | "SELL";
  c3c_amount: number;
  sol_amount: number;
  price_sol_per_c3c: number;
  tx_signature: string;
  _loading?: boolean;
  _createdAt?: number;
};

export type WhaleStat = {
  wallet: string;
  netC3C: number;
  netSOL: number;
  // Additional fields can be added as needed
  [k: string]: any;
};

