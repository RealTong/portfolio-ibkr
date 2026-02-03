import { RefreshButton } from './RefreshButton';

export function Header({
    accountId,
    accountName,
}: {
    accountId: string;
    accountName: string;
}) {
    return (
        <header className="w-full bg-gray-600 rounded-md">
            <div className="container mx-auto p-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold">{accountName} Portfolio</h1>
                <div className="flex items-center gap-4">
                    <div>Account ID: <code>{accountId}</code></div>
                    <RefreshButton />
                </div>
            </div>
        </header>
    );
}