import { useEffect, useMemo, useRef, useState } from "react";

import { LineChart } from "@/components/hud/LineChart";
import { Metric, MetricInline } from "@/components/hud/Metric";
import { Panel } from "@/components/hud/Panel";
import { SettingsModal } from "@/components/hud/SettingsModal";
import { Sparkline } from "@/components/hud/Sparkline";
import { StatusBar, StatusIndicator } from "@/components/hud/StatusIndicator";
import { loadDashboardSettings, saveDashboardSettings, type DashboardSettings, type HistoryRange } from "@/lib/dashboardSettings";
import { useApp } from "../contexts/AppContext";
import { Settings } from "lucide-react";

type EquitySnapshot = { timestamp: number; equity: number };

const POSITION_COLORS = ["cyan", "purple", "yellow", "blue", "green"] as const;
const HISTORY_RANGES: Array<{ value: HistoryRange; label: string }> = [
    { value: "1d", label: "1D" },
    { value: "7d", label: "7D" },
    { value: "1y", label: "1Y" },
    { value: "all", label: "ALL" },
];

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

function formatPercent(value: number): string {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
}

function mulberry32(seed: number) {
    return () => {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function generatePriceHistory({
    currentPrice,
    avgPrice,
    points = 20,
    seed = 1,
}: {
    currentPrice: number;
    avgPrice?: number;
    points?: number;
    seed?: number;
}): number[] {
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) return [];
    const rand = mulberry32(seed);
    const startPrice =
        Number.isFinite(avgPrice) && (avgPrice ?? 0) > 0
            ? (avgPrice as number)
            : currentPrice * 0.97;

    const prices: number[] = [];
    for (let i = 0; i < points; i++) {
        const progress = points <= 1 ? 1 : i / (points - 1);
        const trend = startPrice + (currentPrice - startPrice) * progress;
        const noise = trend * (rand() - 0.5) * 0.015;
        prices.push(trend + noise);
    }
    prices[prices.length - 1] = currentPrice;
    return prices;
}

export function Dashboard() {
    const { fetchAccountInfo, refreshAll, state } = useApp();
    const [settings, setSettings] = useState<DashboardSettings>(() => loadDashboardSettings());
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [equityHistory, setEquityHistory] = useState<EquitySnapshot[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [portfolioTitle, setPortfolioTitle] = useState("IBKR Portfolio");
    const autoRefreshInFlightRef = useRef(false);
    const refreshAllRef = useRef(refreshAll);
    const fetchAccountInfoRef = useRef(fetchAccountInfo);
    const accountIdRef = useRef<string | null>(state.accountInfo?.accountId ?? null);

    useEffect(() => {
        const controller = new AbortController();

        const loadConfig = async () => {
            try {
                const res = await fetch("/api/config", { signal: controller.signal });
                if (!res.ok) return;
                const json = (await res.json()) as { title?: string } | null;
                if (json?.title && typeof json.title === "string") {
                    setPortfolioTitle(json.title);
                }
            } catch (error) {
                if (controller.signal.aborted) return;
            }
        };

        void loadConfig();
        return () => controller.abort();
    }, []);

    useEffect(() => {
        document.title = portfolioTitle;
    }, [portfolioTitle]);

    useEffect(() => {
        refreshAllRef.current = refreshAll;
    }, [refreshAll]);

    useEffect(() => {
        fetchAccountInfoRef.current = fetchAccountInfo;
    }, [fetchAccountInfo]);

    useEffect(() => {
        accountIdRef.current = state.accountInfo?.accountId ?? null;
    }, [state.accountInfo?.accountId]);

    useEffect(() => {
        const root = document.documentElement;
        const enabled = settings.theme === "light";
        root.classList.toggle("hud-light", enabled);
        return () => root.classList.remove("hud-light");
    }, [settings.theme]);

    useEffect(() => {
        saveDashboardSettings(settings);
    }, [settings]);

    const totalMarketValue = useMemo(() => {
        return state.positions.reduce((sum, position) => sum + Math.abs(position.mktValue), 0);
    }, [state.positions]);

    const totalUnrealizedPnL = useMemo(() => {
        return state.positions.reduce((sum, position) => sum + position.unrealizedPnl, 0);
    }, [state.positions]);

    const realizedPnL = state.ledger?.USD?.realizedpnl ?? 0;
    const equity = state.ledger?.USD?.netliquidationvalue ?? 0;
    const cashBalance = state.ledger?.USD?.cashbalance ?? 0;
    const settledCash = state.ledger?.USD?.settledcash ?? 0;
    const dividends = state.ledger?.USD?.dividends ?? 0;
    const interest = state.ledger?.USD?.interest ?? 0;

    const totalPnL = totalUnrealizedPnL + realizedPnL;
    const totalPnLPercentage = totalMarketValue > 0 ? (totalPnL / totalMarketValue) * 100 : 0;

    useEffect(() => {
        const tick = async () => {
            if (autoRefreshInFlightRef.current) return;
            autoRefreshInFlightRef.current = true;
            try {
                if (accountIdRef.current) {
                    await refreshAllRef.current();
                } else {
                    await fetchAccountInfoRef.current(true);
                }
            } finally {
                autoRefreshInFlightRef.current = false;
            }
        };

        void tick();
        const interval = setInterval(() => void tick(), settings.autoRefreshMs);
        return () => clearInterval(interval);
    }, [settings.autoRefreshMs]);

    useEffect(() => {
        const controller = new AbortController();

        const loadHistory = async () => {
            if (!state.accountInfo?.accountId) {
                setEquityHistory([]);
                setHistoryError(null);
                setHistoryLoading(false);
                return;
            }
            setHistoryLoading(true);
            setHistoryError(null);
            try {
                const params = new URLSearchParams();
                if (state.accountInfo?.accountId) {
                    params.set("accountId", state.accountInfo.accountId);
                }
                params.set("range", settings.historyRange);
                params.set("maxPoints", "600");

                const res = await fetch(`/api/equityHistory?${params.toString()}`, {
                    signal: controller.signal,
                });
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                const json = (await res.json()) as { points?: EquitySnapshot[] };
                const points = Array.isArray(json) ? (json as unknown as EquitySnapshot[]) : (json.points ?? []);
                setEquityHistory(points);
            } catch (error) {
                if (controller.signal.aborted) return;
                setHistoryError(error instanceof Error ? error.message : "Failed to fetch equity history");
            } finally {
                if (controller.signal.aborted) return;
                setHistoryLoading(false);
            }
        };

        void loadHistory();
        return () => controller.abort();
    }, [settings.historyRange, state.accountInfo?.accountId, state.lastFetch.ledger]);

    const equitySeries = useMemo(() => equityHistory.map((s) => s.equity), [equityHistory]);
    const equityLabels = useMemo(() => {
        return equityHistory.map((s) => {
            const date = new Date(s.timestamp);
            if (settings.historyRange === "1d") {
                return date.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                });
            }
            return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
        });
    }, [equityHistory, settings.historyRange]);

    const positionPriceHistories = useMemo(() => {
        const histories: Record<number, number[]> = {};
        for (const position of state.positions) {
            histories[position.conid] = generatePriceHistory({
                currentPrice: position.mktPrice,
                avgPrice: position.avgPrice,
                seed: position.conid,
            });
        }
        return histories;
    }, [state.positions]);

    const lastUpdated = state.lastFetch.ledger || state.lastFetch.positions;
    const lastUpdatedLabel = lastUpdated
        ? new Date(lastUpdated).toLocaleTimeString("en-US", { hour12: false })
        : "—";

    const isLoading = state.loading.accountInfo || state.loading.positions || state.loading.ledger;
    const error = state.error.accountInfo || state.error.positions || state.error.ledger;

    const connectionStatus = error ? "error" : isLoading ? "warning" : "active";
    const connectionLabel = error ? "ERROR" : isLoading ? "LOADING" : "CONNECTED";

    const topPositions = useMemo(() => {
        return [...state.positions]
            .sort((a, b) => Math.abs(b.mktValue) - Math.abs(a.mktValue))
            .slice(0, 5);
    }, [state.positions]);

    const normalizedPositionSeries = useMemo(() => {
        return topPositions
            .map((pos, idx) => {
                const history = positionPriceHistories[pos.conid] || [];
                if (history.length < 2) return null;
                const start = history[0] || 1;
                if (!Number.isFinite(start) || start === 0) return null;
                const data = history.map((price) => ((price - start) / start) * 100);
                const label = pos.contractDesc || pos.fullName || String(pos.conid);
                return {
                    label,
                    data,
                    variant: POSITION_COLORS[idx % POSITION_COLORS.length],
                };
            })
            .filter(Boolean) as Array<{
                label: string;
                data: number[];
                variant: (typeof POSITION_COLORS)[number];
            }>;
    }, [topPositions, positionPriceHistories]);

    const autoRefreshLabel = `${Math.round(settings.autoRefreshMs / 1000)}s`;

    if (error && !state.accountInfo && !state.ledger && state.positions.length === 0) {
        return (
            <div
                className={[
                    "h-screen bg-hud-bg flex items-center justify-center p-6 font-mono tracking-wider text-hud-text",
                    settings.theme === "light" ? "hud-light" : "",
                ].join(" ")}
            >
                <Panel title="CONNECTION ERROR" className="max-w-md w-full">
                    <div className="text-center py-8">
                        <div className="text-hud-error text-2xl mb-4">OFFLINE</div>
                        <p className="text-hud-text-dim text-sm mb-6">{error}</p>
                        <p className="text-hud-text-dim text-xs">Auto-retrying every {autoRefreshLabel}...</p>
                    </div>
                </Panel>
            </div>
        );
    }

    return (
        <div
            className={[
                "h-screen overflow-y-auto bg-hud-bg text-hud-text font-mono tracking-wider",
                settings.theme === "light" ? "hud-light" : "",
            ].join(" ")}
        >
            <div className="max-w-[1920px] mx-auto p-4 h-full flex flex-col">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-hud-line shrink-0">
                    <div className="flex items-center gap-4 md:gap-6">
                        <div className="flex items-baseline gap-2">
                            <span className="text-xl md:text-2xl font-light tracking-tight text-hud-text-bright">
                                {portfolioTitle}
                            </span>
                        </div>
                        <StatusIndicator
                            status={connectionStatus}
                            label={connectionLabel}
                            pulse={connectionStatus === "active"}
                        />
                    </div>

                    <div className="flex items-center gap-3 md:gap-6 flex-wrap">
                        <StatusBar
                            items={[
                                {
                                    label: "UPDATED",
                                    value: lastUpdatedLabel,
                                    status: connectionStatus,
                                },
                                {
                                    label: "POS",
                                    value: state.positions.length.toString(),
                                },
                            ]}
                        />
                        <button
                            type="button"
                            onClick={() => setSettingsOpen(true)}
                            aria-label="Open settings"
                            title="Settings"
                            className="p-2 border rounded-sm border-hud-line/60 text-hud-text-dim hover:text-hud-text hover:border-hud-primary transition-colors"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="mb-4 shrink-0">
                        <Panel title="ERROR">
                            <div className="text-hud-error text-sm">{error}</div>
                        </Panel>
                    </div>
                )}

                <div className="flex-1 min-h-0 grid grid-rows-2 gap-4">
                    <div className="min-h-0">
                        <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-4 h-full min-h-0">
                            <div className="col-span-4 md:col-span-4 lg:col-span-3 min-h-0">
                                <Panel title="ACCOUNT" className="h-full min-h-0" titleRight={state.accountInfo?.accountId || "—"}>
                                    {isLoading && !equity ? (
                                        <div className="text-hud-text-dim text-sm">Loading...</div>
                                    ) : (
                                        <div className="space-y-4">
                                            <Metric label="EQUITY" value={formatCurrency(equity)} size="xl" />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Metric label="CASH" value={formatCurrency(cashBalance)} size="md" />
                                                <Metric label="SETTLED" value={formatCurrency(settledCash)} size="md" />
                                            </div>
                                            <div className="pt-2 border-t border-hud-line space-y-2">
                                                <Metric
                                                    label="TOTAL P&L"
                                                    value={`${formatCurrency(totalPnL)} (${formatPercent(totalPnLPercentage)})`}
                                                    size="md"
                                                    color={totalPnL >= 0 ? "success" : "error"}
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <MetricInline
                                                        label="REALIZED"
                                                        value={formatCurrency(realizedPnL)}
                                                        color={realizedPnL >= 0 ? "success" : "error"}
                                                    />
                                                    <MetricInline
                                                        label="UNREALIZED"
                                                        value={formatCurrency(totalUnrealizedPnL)}
                                                        color={totalUnrealizedPnL >= 0 ? "success" : "error"}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Panel>
                            </div>

                            <div className="col-span-4 md:col-span-4 lg:col-span-5 min-h-0">
                                <Panel
                                    title="POSITIONS"
                                    titleRight={`${state.positions.length}`}
                                    className="h-full min-h-0"
                                    noPadding
                                >
                                    {state.positions.length === 0 ? (
                                        <div className="text-hud-text-dim text-sm py-8 text-center">No open positions</div>
                                    ) : (
                                        <div className="h-full overflow-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-hud-line/50">
                                                        <th className="hud-label text-left py-2 px-2">Symbol</th>
                                                        <th className="hud-label text-right py-2 px-2 hidden sm:table-cell">Qty</th>
                                                        <th className="hud-label text-right py-2 px-2 hidden md:table-cell">Value</th>
                                                        <th className="hud-label text-right py-2 px-2">P&amp;L</th>
                                                        <th className="hud-label text-center py-2 px-2">Trend</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {state.positions.map((position) => {
                                                        const symbol = position.contractDesc || position.fullName || String(position.conid);
                                                        const costBasis = position.mktValue - position.unrealizedPnl;
                                                        const denom = Math.abs(costBasis);
                                                        const plPct = denom > 0 ? (position.unrealizedPnl / denom) * 100 : 0;
                                                        const history = positionPriceHistories[position.conid] || [];

                                                        return (
                                                            <tr
                                                                key={position.conid}
                                                                className="border-b border-hud-line/20 hover:bg-hud-line/10"
                                                            >
                                                                <td className="hud-value-sm py-2 px-2">
                                                                    <span
                                                                        className="cursor-help border-b border-dotted border-hud-text-dim"
                                                                        title={position.fullName || symbol}
                                                                    >
                                                                        {symbol}
                                                                    </span>
                                                                </td>
                                                                <td className="hud-value-sm text-right py-2 px-2 hidden sm:table-cell">
                                                                    {position.position}
                                                                </td>
                                                                <td className="hud-value-sm text-right py-2 px-2 hidden md:table-cell">
                                                                    {formatCurrency(position.mktValue)}
                                                                </td>
                                                                <td
                                                                    className={[
                                                                        "hud-value-sm text-right py-2 px-2",
                                                                        position.unrealizedPnl >= 0 ? "text-hud-success" : "text-hud-error",
                                                                    ].join(" ")}
                                                                >
                                                                    <div>{formatCurrency(position.unrealizedPnl)}</div>
                                                                    <div className="text-xs opacity-70">{formatPercent(plPct)}</div>
                                                                </td>
                                                                <td className="py-2 px-2">
                                                                    <div className="flex justify-center">
                                                                        <Sparkline data={history} />
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </Panel>
                            </div>

                            <div className="col-span-4 md:col-span-8 lg:col-span-4 min-h-0">
                                <Panel title="LEDGER" className="h-full min-h-0" titleRight={state.accountInfo?.currency || "USD"}>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Metric label="EXPOSURE" value={formatCurrency(totalMarketValue)} size="lg" />
                                        <Metric label="CASH" value={formatCurrency(cashBalance)} size="lg" />
                                        <MetricInline label="DIVIDENDS" value={formatCurrency(dividends)} />
                                        <MetricInline label="INTEREST" value={formatCurrency(interest)} />
                                        <MetricInline
                                            label="REALIZED"
                                            value={formatCurrency(realizedPnL)}
                                            color={realizedPnL >= 0 ? "success" : "error"}
                                        />
                                        <MetricInline
                                            label="UNREALIZED"
                                            value={formatCurrency(totalUnrealizedPnL)}
                                            color={totalUnrealizedPnL >= 0 ? "success" : "error"}
                                        />
                                    </div>
                                </Panel>
                            </div>
                        </div>
                    </div>

                    <div className="min-h-0 flex flex-col">
                        <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-4 flex-1 min-h-0">
                            <div className="col-span-4 md:col-span-8 lg:col-span-8 min-h-0">
                                <Panel
                                    title="PORTFOLIO PERFORMANCE"
                                    titleRight={(
                                        <div className="flex items-center gap-1">
                                            {HISTORY_RANGES.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setSettings((prev) => ({ ...prev, historyRange: opt.value }))}
                                                    disabled={historyLoading}
                                                    className={[
                                                        "px-2 py-1 border rounded-sm transition-colors",
                                                        settings.historyRange === opt.value
                                                            ? "border-hud-primary text-hud-primary"
                                                            : "border-hud-line/50 text-hud-text-dim hover:text-hud-text",
                                                        historyLoading ? "opacity-60 cursor-not-allowed" : "",
                                                    ].join(" ")}
                                                >
                                                    <span className="hud-label">{opt.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    className="h-full min-h-0"
                                >
                                    {historyError ? (
                                        <div className="h-full flex items-center justify-center text-hud-error text-sm">
                                            {historyError}
                                        </div>
                                    ) : historyLoading && equityHistory.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-hud-text-dim text-sm">
                                            Loading history...
                                        </div>
                                    ) : equitySeries.length > 1 ? (
                                        <div className="h-full w-full">
                                            <LineChart
                                                series={[
                                                    {
                                                        label: "Equity",
                                                        data: equitySeries,
                                                        variant: totalPnL >= 0 ? "green" : "red",
                                                    },
                                                ]}
                                                labels={equityLabels}
                                                showArea={true}
                                                showGrid={true}
                                                showDots={false}
                                                formatValue={(v) => `$${(v / 1000).toFixed(1)}k`}
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-hud-text-dim text-sm">
                                            No history data for this range yet.
                                        </div>
                                    )}
                                </Panel>
                            </div>

                            <div className="col-span-4 md:col-span-8 lg:col-span-4 min-h-0">
                                <Panel title="POSITION PERFORMANCE" titleRight="% CHANGE" className="h-full min-h-0">
                                    {topPositions.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-hud-text-dim text-sm">
                                            No positions to display
                                        </div>
                                    ) : normalizedPositionSeries.length > 0 ? (
                                        <div className="h-full flex flex-col">
                                            <div className="flex flex-wrap gap-3 mb-2 pb-2 border-b border-hud-line/30 shrink-0">
                                                {topPositions.map((pos, idx) => {
                                                    const isPositive = pos.unrealizedPnl >= 0;
                                                    const costBasis = pos.mktValue - pos.unrealizedPnl;
                                                    const denom = Math.abs(costBasis);
                                                    const plPct = denom > 0 ? (pos.unrealizedPnl / denom) * 100 : 0;
                                                    const color = POSITION_COLORS[idx % POSITION_COLORS.length];
                                                    const label = pos.contractDesc || pos.fullName || String(pos.conid);

                                                    return (
                                                        <div key={pos.conid} className="flex items-center gap-1.5">
                                                            <div
                                                                className="w-2 h-2 rounded-full"
                                                                style={{ backgroundColor: `var(--color-hud-${color})` }}
                                                            />
                                                            <span className="hud-value-sm">{label}</span>
                                                            <span className={["hud-label", isPositive ? "text-hud-success" : "text-hud-error"].join(" ")}>
                                                                {formatPercent(plPct)}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex-1 min-h-0 w-full">
                                                <LineChart
                                                    series={normalizedPositionSeries}
                                                    showArea={false}
                                                    showGrid={true}
                                                    showDots={false}
                                                    formatValue={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-hud-text-dim text-sm">
                                            Loading position data...
                                        </div>
                                    )}
                                </Panel>
                            </div>
                        </div>

                        {settingsOpen && (
                            <SettingsModal
                                settings={settings}
                                onSave={(next) => setSettings(next)}
                                onClose={() => setSettingsOpen(false)}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
