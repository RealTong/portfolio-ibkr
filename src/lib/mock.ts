import type { IBKRAccountInfo, ILedger, ILedgerItem, IPositionItem } from "@/types/ibkr";

function isTruthyEnv(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "y", "on"].includes(value.toLowerCase());
}

export const MOCK_MODE_ENABLED = isTruthyEnv(process.env.PORTFOLIO_MOCK);

function toSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.floor(value), min), max);
}

export function getMockAccountId(): string {
  return process.env.MOCK_ACCOUNT_ID || "U00000000";
}

export function getMockAccountInfo(): IBKRAccountInfo {
  const accountId = getMockAccountId();
  return {
    id: "DEMO",
    accountTitle: "Demo Portfolio",
    accountVan: "VAN-DEMO",
    displayName: "Demo Account",
    accountId,
    currency: "USD",
  };
}

type MockPositionSeed = {
  conid: number;
  symbol: string;
  name: string;
  chineseName: string;
  qty: number;
  price: number;
  avgPrice: number;
  exchange?: string;
};

const MOCK_POSITIONS: MockPositionSeed[] = [
  {
    conid: 4815747,
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    chineseName: "英伟达",
    qty: 120,
    price: 615.25,
    avgPrice: 560.1,
    exchange: "NASDAQ",
  },
  {
    conid: 265598,
    symbol: "AAPL",
    name: "Apple Inc.",
    chineseName: "苹果",
    qty: 150,
    price: 195.12,
    avgPrice: 170.0,
    exchange: "NASDAQ",
  },
  {
    conid: 272093,
    symbol: "MSFT",
    name: "Microsoft Corporation",
    chineseName: "微软",
    qty: 60,
    price: 415.4,
    avgPrice: 360.0,
    exchange: "NASDAQ",
  },
  {
    conid: 76792991,
    symbol: "TSLA",
    name: "Tesla, Inc.",
    chineseName: "特斯拉",
    qty: 80,
    price: 210.55,
    avgPrice: 240.5,
    exchange: "NASDAQ",
  },
  {
    conid: 756733,
    symbol: "SPY",
    name: "SPDR S&P 500 ETF Trust",
    chineseName: "标普500ETF",
    qty: 100,
    price: 492.03,
    avgPrice: 470.0,
    exchange: "ARCA",
  },
  {
    conid: 653148986,
    symbol: "IBIT",
    name: "iShares Bitcoin Trust ETF",
    chineseName: "比特币ETF",
    qty: 300,
    price: 36.02,
    avgPrice: 32.1,
    exchange: "NASDAQ",
  },
  {
    conid: 22253472,
    symbol: "BABA",
    name: "Alibaba Group Holding Limited",
    chineseName: "阿里巴巴",
    qty: 200,
    price: 75.12,
    avgPrice: 82.0,
    exchange: "NYSE",
  },
];

export function getMockPositions(accountId: string): IPositionItem[] {
  const realizedPnlByConid: Record<number, number> = {
    4815747: 1250,
    265598: 820,
    272093: 600,
    76792991: -350,
    756733: 420,
    653148986: 0,
    22253472: -180,
  };

  return MOCK_POSITIONS.map((p) => {
    const mktValue = p.qty * p.price;
    const unrealizedPnl = (p.price - p.avgPrice) * p.qty;
    return {
      acctId: accountId,
      conid: p.conid,
      contractDesc: p.symbol,
      position: p.qty,
      mktPrice: p.price,
      mktValue,
      currency: "USD",
      avgCost: p.avgPrice * p.qty,
      avgPrice: p.avgPrice,
      realizedPnl: realizedPnlByConid[p.conid] ?? 0,
      unrealizedPnl,
      chineseName: p.chineseName,
      listingExchange: p.exchange ?? "SMART",
      fullName: p.name,
    };
  });
}

export function getMockLedger(accountId: string): ILedgerItem {
  const positions = getMockPositions(accountId);
  const stockMarketValue = positions.reduce((sum, p) => sum + p.mktValue, 0);
  const totalUnrealized = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);

  const cashBalance = 32150.55;
  const settledCash = 30125.2;
  const realizedPnl = 5410.25;
  const dividends = 182.4;
  const interest = 46.12;

  const equity = stockMarketValue + cashBalance;

  const timestamp = Date.now();

  const usd: ILedger = {
    commoditymarketvalue: 0,
    futuremarketvalue: 0,
    settledcash: settledCash,
    exchangerate: 1,
    sessionid: 0,
    cashbalance: cashBalance,
    corporatebondsmarketvalue: 0,
    warrantsmarketvalue: 0,
    netliquidationvalue: equity,
    interest,
    unrealizedpnl: totalUnrealized,
    stockmarketvalue: stockMarketValue,
    moneyfunds: 0,
    currency: "USD",
    realizedpnl: realizedPnl,
    funds: 0,
    acctcode: accountId,
    issueroptionsmarketvalue: 0,
    key: "USD",
    timestamp,
    severity: 0,
    stockoptionmarketvalue: 0,
    futuresonlypnl: 0,
    tbondsmarketvalue: 0,
    futureoptionmarketvalue: 0,
    cashbalancefxsegment: cashBalance,
    secondkey: "BASE",
    tbillsmarketvalue: 0,
    endofbundle: 1,
    dividends,
  };

  const base: ILedger = {
    ...usd,
    key: "BASE",
    secondkey: "USD",
    currency: "USD",
  };

  return { USD: usd, BASE: base };
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
      return now - 3 * 365 * day;
  }
}

function getMockEquityRangeConfig(range: RangeKey): { startMultiplier: number; noiseMultiplier: number } {
  switch (range) {
    case "1d":
      return { startMultiplier: 0.997, noiseMultiplier: 0.0012 };
    case "7d":
      return { startMultiplier: 0.99, noiseMultiplier: 0.0025 };
    case "1y":
      return { startMultiplier: 0.92, noiseMultiplier: 0.006 };
    case "all":
      return { startMultiplier: 0.85, noiseMultiplier: 0.008 };
  }
}

export function getMockEquityHistory({
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
}): { points: Array<{ timestamp: number; equity: number }>; bucketMs: number; fromTs: number; toTs: number } {
  const now = Date.now();
  const to = Number.isFinite(toTs) && (toTs as number) > 0 ? (toTs as number) : now;
  const from =
    Number.isFinite(fromTs) && (fromTs as number) >= 0
      ? (fromTs as number)
      : getRangeStartTs(range, to);

  const safeMaxPoints = clampInt(maxPoints, 10, 2000);
  const span = Math.max(1, to - from);
  const bucketMs = Math.max(30_000, Math.ceil(span / safeMaxPoints));
  const pointsCount = Math.min(safeMaxPoints, Math.floor(span / bucketMs) + 1);

  const { USD } = getMockLedger(accountId);
  const endEquity = USD.netliquidationvalue;

  const { startMultiplier, noiseMultiplier } = getMockEquityRangeConfig(range);
  const startEquity = endEquity * startMultiplier;

  const seed = toSeed(`${accountId}:${range}:${process.env.MOCK_SEED || "0"}`);
  const rand = mulberry32(seed);

  const noiseAmplitude = endEquity * noiseMultiplier;
  const points: Array<{ timestamp: number; equity: number }> = [];

  let walk = 0;
  for (let i = 0; i < pointsCount; i++) {
    const progress = pointsCount <= 1 ? 1 : i / (pointsCount - 1);
    const timestamp = from + Math.round(progress * span);

    const trend = startEquity + (endEquity - startEquity) * progress;
    walk += (rand() - 0.5) * noiseAmplitude * 0.35;
    walk *= 0.92;

    const cycle = Math.sin(progress * Math.PI * 2 * 2) * noiseAmplitude * 0.45;
    const noise = (rand() - 0.5) * noiseAmplitude * 0.25;
    const equity = Math.max(0, trend + walk + cycle + noise);

    points.push({ timestamp, equity: Math.round(equity * 100) / 100 });
  }

  if (points.length) {
    points[points.length - 1] = { timestamp: to, equity: Math.round(endEquity * 100) / 100 };
  }

  return { points, bucketMs, fromTs: from, toTs: to };
}

