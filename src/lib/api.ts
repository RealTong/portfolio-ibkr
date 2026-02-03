import { IbkrClient } from 'ibkr-client';
import fs from 'fs';
import type { IBKRAccountInfo, ILedgerItem, IPositionItem } from '@/types/ibkr';


function getOauthConfigPath(): string {
    return process.env.IBKR_OAUTH_PATH || 'oauth.json';
}

let clientPromise: Promise<IbkrClient> | null = null;

async function getClient(): Promise<IbkrClient> {
    if (clientPromise) return clientPromise;

    clientPromise = (async () => {
        const configPath = getOauthConfigPath();
        let raw: string;
        try {
            raw = fs.readFileSync(configPath, 'utf8');
        } catch (error) {
            const hint = configPath === 'oauth.json'
                ? "Mount your OAuth config at './oauth.json' (or set IBKR_OAUTH_PATH)."
                : `Check that IBKR_OAUTH_PATH points to an existing file: ${configPath}`;
            throw new Error(
                `IBKR OAuth config file not found.\n` +
                `Tried: ${configPath}\n` +
                `${hint}`,
                { cause: error },
            );
        }

        let config: unknown;
        try {
            config = JSON.parse(raw);
        } catch (error) {
            throw new Error(
                `Failed to parse IBKR OAuth config JSON.\n` +
                `File: ${configPath}`,
                { cause: error },
            );
        }

        const client = new IbkrClient(config as any);
        await client.init();
        return client;
    })();

    return clientPromise;
}

export async function getIBKRAccountInfo(): Promise<IBKRAccountInfo> {
    const client = await getClient();
    const response = await client.request({
        path: 'portfolio/accounts',
        method: 'GET',
    }) as IBKRAccountInfo[];
    return response[0];
}


export async function getIBKRPositions(accountId: string, pageId: string = '0'): Promise<IPositionItem[]> {
    const client = await getClient();
    const response = await client.request({
        path: `portfolio/${accountId}/positions/${pageId}`,
        method: 'GET',
    })
    return response as IPositionItem[];
}


export async function getConDetail(accountId: string, conId: string = '0'): Promise<any> {
    const client = await getClient();
    const response = await client.request({
        path: `portfolio/${accountId}/positions/${conId}`,
        method: 'GET',
    })
    return response
}

export async function getLedger(accountId: string): Promise<ILedgerItem> {
    const client = await getClient();
    const response = await client.request({
        path: `portfolio/${accountId}/ledger`,
        method: 'GET',
    })
    return response as ILedgerItem
}
