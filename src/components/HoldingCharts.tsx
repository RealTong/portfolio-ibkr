import { useMemo } from "react";
import { LabelList, Pie, PieChart } from "recharts";

import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { type ChartConfig } from "@/components/ui/chart";
import { useApp } from "../contexts/AppContext";

export const description = "A pie chart with a label list";

const COLOR_SCALE = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--chart-6)",
];

const chartConfig = {} satisfies ChartConfig;

export function HoldingCharts() {
    const { state } = useApp();

    const chartData = useMemo(
        () =>
            state.positions
                .filter((position) => Number.isFinite(position.mktValue))
                .map((position, index) => {
                    const value = Math.abs(position.mktValue);
                    return {
                        symbol:
                            position.contractDesc ||
                            position.fullName ||
                            String(position.conid),
                        value,
                        fill: COLOR_SCALE[index % COLOR_SCALE.length],
                    };
                })
                .filter((item) => item.value > 0)
                .sort((a, b) => b.value - a.value),
        [state.positions],
    );

    if (state.loading.positions) {
        return (
            <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                Loading holdings chart…
            </div>
        );
    }

    if (state.error.positions) {
        return (
            <div className="flex h-[250px] items-center justify-center text-sm text-destructive">
                {state.error.positions}
            </div>
        );
    }

    if (!chartData.length) {
        return (
            <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                No holdings data available.
            </div>
        );
    }

    return (
        <ChartContainer
            config={chartConfig}
            className="[&_.recharts-text]:fill-background mx-auto aspect-square max-h-[250px]"
        >
            <PieChart>
                <ChartTooltip
                    content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                    data={chartData}
                    innerRadius={30}
                    dataKey="value"
                    nameKey="symbol"
                    radius={10}
                    cornerRadius={8}
                    paddingAngle={4}
                >
                    <LabelList
                        dataKey="symbol"
                        stroke="none"
                        fontSize={12}
                        fontWeight={500}
                        fill="currentSymbol"
                        formatter={(value: string) => value}
                    />
                </Pie>
            </PieChart>
        </ChartContainer>
    );
}
