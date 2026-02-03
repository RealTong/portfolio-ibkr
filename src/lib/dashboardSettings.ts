export type DashboardTheme = "dark" | "light";
export type HistoryRange = "1d" | "7d" | "1y" | "all";

export type DashboardSettings = {
    theme: DashboardTheme;
    historyRange: HistoryRange;
    autoRefreshMs: number;
};

const STORAGE_KEY = "ibkr-portfolio-dashboard-settings-v1";

const MIN_AUTO_REFRESH_MS = 5_000;
const MAX_AUTO_REFRESH_MS = 60 * 60_000;

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
    theme: "dark",
    historyRange: "1d",
    autoRefreshMs: 30_000,
};

function isDashboardTheme(value: unknown): value is DashboardTheme {
    return value === "dark" || value === "light";
}

function isHistoryRange(value: unknown): value is HistoryRange {
    return value === "1d" || value === "7d" || value === "1y" || value === "all";
}

function normalizeAutoRefreshMs(value: unknown): number {
    const ms = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(ms)) return DEFAULT_DASHBOARD_SETTINGS.autoRefreshMs;
    return Math.min(MAX_AUTO_REFRESH_MS, Math.max(MIN_AUTO_REFRESH_MS, Math.round(ms)));
}

export function normalizeDashboardSettings(value: unknown): DashboardSettings {
    const record =
        typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

    return {
        theme: isDashboardTheme(record.theme) ? record.theme : DEFAULT_DASHBOARD_SETTINGS.theme,
        historyRange: isHistoryRange(record.historyRange)
            ? record.historyRange
            : DEFAULT_DASHBOARD_SETTINGS.historyRange,
        autoRefreshMs: normalizeAutoRefreshMs(record.autoRefreshMs),
    };
}

export function loadDashboardSettings(): DashboardSettings {
    if (typeof window === "undefined") return DEFAULT_DASHBOARD_SETTINGS;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_DASHBOARD_SETTINGS;
        const parsed = JSON.parse(raw) as unknown;
        return normalizeDashboardSettings(parsed);
    } catch {
        return DEFAULT_DASHBOARD_SETTINGS;
    }
}

export function saveDashboardSettings(settings: DashboardSettings): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // Ignore write errors (e.g. private mode / disabled storage).
    }
}

