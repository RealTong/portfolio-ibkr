import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useApp } from "../contexts/AppContext"

// 格式化金额显示，正数显示绿色，负数显示红色
function formatCurrency(value: number): { text: string; className: string } {
    const isPositive = value >= 0;
    const className = isPositive ? 'text-green-500' : 'text-red-500';
    return {
        text: `$${Math.abs(value).toFixed(2)}`,
        className
    };
}

export function HoldingTables() {
    const { state } = useApp()

    // 加载状态
    if (state.loading.positions) {
        return (
            <div className="w-full">
                <div className="animate-pulse">
                    <div className="h-12 bg-gray-300 rounded mb-2"></div>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-10 bg-gray-300 rounded mb-1"></div>
                    ))}
                </div>
            </div>
        );
    }

    // 错误状态
    if (state.error.positions) {
        return (
            <div className="w-full text-center py-8">
                <p className="text-red-500">Error loading positions: {state.error.positions}</p>
            </div>
        );
    }

    // 无数据状态
    if (!state.positions.length) {
        return (
            <div className="w-full text-center py-8">
                <p className="text-gray-500">No positions available.</p>
            </div>
        );
    }

    return (
        <Table>
            <TableCaption>A list of your recent holdings.</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">Symbol</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Avg Price</TableHead>
                    <TableHead>Mkt Price</TableHead>
                    <TableHead>Unrealized PnL</TableHead>
                    <TableHead className="text-right">Exchange</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {state.positions.map((position) => {
                    const unrealizedPnLDisplay = formatCurrency(position.unrealizedPnl);
                    return (
                        <TableRow key={position.conid}>
                            <TableCell className="font-medium">{position.fullName}</TableCell>
                            <TableCell>{position.position}</TableCell>
                            <TableCell>${position.avgPrice.toFixed(2)}</TableCell>
                            <TableCell>${position.mktPrice.toFixed(2)}</TableCell>
                            <TableCell>
                                <span className={unrealizedPnLDisplay.className}>
                                    {unrealizedPnLDisplay.text}
                                </span>
                            </TableCell>
                            <TableCell className="text-right">{position.listingExchange}</TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    )
}
