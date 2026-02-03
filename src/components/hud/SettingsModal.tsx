import { useEffect, useMemo, useState, type ReactNode } from "react";

import { type DashboardSettings, type DashboardTheme, type HistoryRange, normalizeDashboardSettings } from "@/lib/dashboardSettings";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { Panel } from "./Panel";

const THEME_OPTIONS: Array<{ value: DashboardTheme; label: string; icon: ReactNode }> = [
    { value: "dark", label: "DARK", icon: <Moon className="w-4 h-4" /> },
    { value: "light", label: "LIGHT", icon: <Sun className="w-4 h-4" /> },
];

const HISTORY_RANGE_OPTIONS: Array<{ value: HistoryRange; label: string }> = [
    { value: "1d", label: "1D" },
    { value: "7d", label: "7D" },
    { value: "1y", label: "1Y" },
    { value: "all", label: "ALL" },
];

const AUTO_REFRESH_PRESETS: Array<{ seconds: number; label: string }> = [
    { seconds: 10, label: "10S" },
    { seconds: 30, label: "30S" },
    { seconds: 60, label: "60S" },
    { seconds: 300, label: "5M" },
];

export type SettingsModalProps = {
    settings: DashboardSettings;
    onSave: (next: DashboardSettings) => void;
    onClose: () => void;
};

export function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
    const [draft, setDraft] = useState<DashboardSettings>(settings);

    useEffect(() => {
        setDraft(settings);
    }, [settings]);

    const isDirty =
        draft.theme !== settings.theme ||
        draft.historyRange !== settings.historyRange ||
        draft.autoRefreshMs !== settings.autoRefreshMs;

    const autoRefreshSeconds = useMemo(() => Math.round(draft.autoRefreshMs / 1000), [draft.autoRefreshMs]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose]);

    const handleSave = () => {
        onSave(normalizeDashboardSettings(draft));
        onClose();
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <Panel
                title="SETTINGS"
                titleRight={
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-2 py-1 border rounded-sm border-hud-line/60 text-hud-text-dim hover:text-hud-text hover:border-hud-primary transition-colors"
                    >
                        <span className="hud-label">CLOSE</span>
                    </button>
                }
                className="w-full max-w-lg max-h-[85vh]"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="flex flex-col gap-5">
                    <div>
                        <div className="hud-label mb-2">Theme</div>
                        <div className="flex items-center gap-2">
                            {THEME_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setDraft((prev) => ({ ...prev, theme: opt.value }))}
                                    className={cn(
                                        "px-3 py-2 border rounded-sm transition-colors",
                                        draft.theme === opt.value
                                            ? "border-hud-primary text-hud-primary"
                                            : "border-hud-line/60 text-hud-text-dim hover:text-hud-text",
                                    )}
                                >
                                    <span className="flex items-center gap-2">
                                        {opt.icon}
                                        <span className="hud-label">{opt.label}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-hud-line pt-4">
                        <div className="hud-label mb-2">Portfolio Performance Range</div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {HISTORY_RANGE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setDraft((prev) => ({ ...prev, historyRange: opt.value }))}
                                    className={cn(
                                        "px-3 py-2 border rounded-sm transition-colors",
                                        draft.historyRange === opt.value
                                            ? "border-hud-primary text-hud-primary"
                                            : "border-hud-line/60 text-hud-text-dim hover:text-hud-text",
                                    )}
                                >
                                    <span className="hud-label">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-hud-line pt-4">
                        <div className="hud-label mb-2">Auto Refresh</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-1">
                                <label className="hud-label block mb-2">Interval (seconds)</label>
                                <input
                                    type="number"
                                    min={5}
                                    max={3600}
                                    step={5}
                                    value={autoRefreshSeconds}
                                    onChange={(event) => {
                                        const seconds = Number(event.target.value);
                                        if (!Number.isFinite(seconds)) return;
                                        setDraft((prev) => ({ ...prev, autoRefreshMs: seconds * 1000 }));
                                    }}
                                    className="hud-input w-full"
                                />
                                <div className="mt-2 text-xs text-hud-text-dim">Min 5s, max 1h</div>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="hud-label block mb-2">Presets</label>
                                <div className="flex flex-wrap gap-2">
                                    {AUTO_REFRESH_PRESETS.map((preset) => {
                                        const selected = autoRefreshSeconds === preset.seconds;
                                        return (
                                            <button
                                                key={preset.seconds}
                                                type="button"
                                                onClick={() =>
                                                    setDraft((prev) => ({ ...prev, autoRefreshMs: preset.seconds * 1000 }))
                                                }
                                                className={cn(
                                                    "px-3 py-2 border rounded-sm transition-colors",
                                                    selected
                                                        ? "border-hud-primary text-hud-primary"
                                                        : "border-hud-line/60 text-hud-text-dim hover:text-hud-text",
                                                )}
                                            >
                                                <span className="hud-label">{preset.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-hud-line pt-4 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border rounded-sm border-hud-line/60 text-hud-text-dim hover:text-hud-text hover:border-hud-primary transition-colors"
                        >
                            <span className="hud-label">CANCEL</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!isDirty}
                            className={cn(
                                "px-4 py-2 border rounded-sm transition-colors",
                                isDirty
                                    ? "border-hud-primary text-hud-primary hover:bg-hud-primary hover:text-hud-bg"
                                    : "border-hud-line/60 text-hud-text-dim opacity-60 cursor-not-allowed",
                            )}
                        >
                            <span className="hud-label">SAVE</span>
                        </button>
                    </div>
                </div>
            </Panel>
        </div>
    );
}
