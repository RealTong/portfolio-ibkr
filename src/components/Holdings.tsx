import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { HoldingCharts } from "./HoldingCharts";
import { HoldingTables } from "./HoldingTables";
import { useApp } from "../contexts/AppContext";

// 格式化金额显示，正数显示绿色，负数显示红色
function formatCurrency(value: number): { text: string; className: string } {
    const isPositive = value >= 0;
    const className = isPositive ? 'text-green-500' : 'text-red-500';
    return {
        text: `$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        className
    };
}

export function Holdings() {
    const { state } = useApp();
    
    // 格式化显示数据
    const unrealizedPnLDisplay = formatCurrency(state.ledger?.USD?.unrealizedpnl || 0);
    const cashBalanceDisplay = formatCurrency(state.ledger?.USD?.cashbalance || 0);
    
    // 加载状态
    if (state.loading.ledger) {
        return (
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>Asset Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="w-full flex flex-col md:flex-row gap-4">
                        <div className="w-full md:w-1/2">
                            <div className="animate-pulse bg-gray-300 h-[250px] rounded"></div>
                        </div>
                        <div className="w-full md:w-1/2 flex flex-col gap-4 justify-center">
                            <div className="border rounded-md py-4">
                                <CardHeader>
                                    <CardTitle className="animate-pulse bg-gray-300 h-6 rounded"></CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="animate-pulse bg-gray-300 h-8 rounded"></div>
                                </CardContent>
                            </div>
                            <div className="border rounded-md py-4">
                                <CardHeader>
                                    <CardTitle className="animate-pulse bg-gray-300 h-6 rounded"></CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="animate-pulse bg-gray-300 h-8 rounded"></div>
                                </CardContent>
                            </div>
                        </div>
                    </div>
                    <div className="w-full flex flex-col md:flex-row gap-4 mt-4">
                        <div className="animate-pulse bg-gray-300 h-[200px] rounded"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="w-full flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-1/2">
                        <HoldingCharts />
                    </div>
                    <div className="w-full md:w-1/2 flex flex-col gap-4 justify-center">
                        <div className="border rounded-md py-4">
                            <CardHeader>
                                <CardTitle>Current unrealized PnL:</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xl font-semibold">
                                <span className={unrealizedPnLDisplay.className}>
                                    {unrealizedPnLDisplay.text}
                                </span>
                            </CardContent>
                        </div>
                        <div className="border rounded-md py-4">
                            <CardHeader>
                                <CardTitle>Current Cash Balance:</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xl font-semibold">
                                {cashBalanceDisplay.text}
                            </CardContent>
                        </div>
                    </div>
                </div>
                <div className="w-full flex flex-col md:flex-row gap-4">
                    <HoldingTables />
                </div>
            </CardContent>
        </Card>
    );
}
