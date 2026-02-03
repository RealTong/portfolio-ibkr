import { Database } from "bun:sqlite";
import fs from "fs";
import path from "path";

import type { ILedger } from "@/types/ibkr";

export type EquityHistoryPoint = {
  timestamp: number;
  equity: number;
};

function resolveDbPath(): string {
  const envPath = process.env.PORTFOLIO_DB_PATH;
  if (envPath) {
    if (envPath === ":memory:") return envPath;
    return path.resolve(envPath);
  }
  return path.join(process.cwd(), "data", "ibkr-portfolio.sqlite");
}

const DB_PATH = resolveDbPath();

if (DB_PATH !== ":memory:") {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const db = new Database(DB_PATH);
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
`);

db.exec(`
CREATE TABLE IF NOT EXISTS equity_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  equity REAL NOT NULL,
  cash_balance REAL,
  settled_cash REAL,
  stock_market_value REAL,
  unrealized_pnl REAL,
  realized_pnl REAL,
  currency TEXT
);
CREATE INDEX IF NOT EXISTS idx_equity_snapshots_account_ts
  ON equity_snapshots(account_id, ts);
`);

const insertSnapshot = db.query(`
  INSERT INTO equity_snapshots (
    account_id,
    ts,
    equity,
    cash_balance,
    settled_cash,
    stock_market_value,
    unrealized_pnl,
    realized_pnl,
    currency
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const getLatestSnapshot = db.query(`
  SELECT ts, equity
  FROM equity_snapshots
  WHERE account_id = ?
  ORDER BY ts DESC
  LIMIT 1
`);

const selectBucketedHistory = db.query(`
WITH buckets AS (
  SELECT CAST(ts / ? AS INTEGER) AS b, MAX(ts) AS max_ts
  FROM equity_snapshots
  WHERE account_id = ? AND ts >= ? AND ts <= ?
  GROUP BY b
)
SELECT e.ts AS timestamp, e.equity AS equity
FROM equity_snapshots e
JOIN buckets b
  ON CAST(e.ts / ? AS INTEGER) = b.b AND e.ts = b.max_ts
WHERE e.account_id = ?
ORDER BY e.ts ASC
`);

export function recordLedgerSnapshot(accountId: string, ledger?: ILedger | null) {
  if (!ledger) return;

  const equity = ledger.netliquidationvalue;
  if (!Number.isFinite(equity) || equity === 0) return;

  const ts = Date.now();
  const last = getLatestSnapshot.get(accountId) as { ts: number; equity: number } | null;
  if (
    last &&
    Math.abs(ts - last.ts) < 10_000 &&
    Number.isFinite(last.equity) &&
    Math.abs(equity - last.equity) < 0.01
  ) {
    return;
  }

  insertSnapshot.run(
    accountId,
    ts,
    equity,
    ledger.cashbalance,
    ledger.settledcash,
    ledger.stockmarketvalue,
    ledger.unrealizedpnl,
    ledger.realizedpnl,
    ledger.currency,
  );
}

type RangeKey = "1d" | "7d" | "1y" | "all";

function getRangeStartTs(range: RangeKey, now: number): number {
  const day = 24 * 60 * 60 * 1000;
  switch (range) {
    case "1d":
      return now - day;
    case "7d":
      return now - 7 * day;
    case "1y":
      return now - 365 * day;
    case "all":
      return 0;
  }
}

export function getEquityHistory({
  accountId,
  range,
  fromTs,
  toTs,
  maxPoints = 600,
}: {
  accountId: string;
  range: RangeKey;
  fromTs?: number;
  toTs?: number;
  maxPoints?: number;
}): { points: EquityHistoryPoint[]; bucketMs: number; fromTs: number; toTs: number } {
  const now = Date.now();
  const to = Number.isFinite(toTs) && (toTs as number) > 0 ? (toTs as number) : now;
  const from =
    Number.isFinite(fromTs) && (fromTs as number) >= 0
      ? (fromTs as number)
      : getRangeStartTs(range, to);

  const safeMaxPoints = Math.min(Math.max(Math.floor(maxPoints), 10), 2000);
  const span = Math.max(1, to - from);
  const bucketMs = Math.max(30_000, Math.ceil(span / safeMaxPoints));

  const points = selectBucketedHistory.all(
    bucketMs,
    accountId,
    from,
    to,
    bucketMs,
    accountId,
  ) as EquityHistoryPoint[];

  return { points, bucketMs, fromTs: from, toTs: to };
}
