import { IbkrClient } from 'ibkr-client';
import fs from 'fs';
import type { IBKRAccountInfo, ILedgerItem, IPositionItem } from '@/types/ibkr';


const config = JSON.parse(fs.readFileSync('oauth.json', 'utf8'));
const client = new IbkrClient(config);

await client.init();

export async function getIBKRAccountInfo(): Promise<IBKRAccountInfo> {
    const response = await client.request({
        path: 'portfolio/accounts',
        method: 'GET',
    }) as IBKRAccountInfo[];
    return response[0];
}


export async function getIBKRPositions(accountId: string, pageId: string = '0'): Promise<IPositionItem[]> {
    const response = await client.request({
        path: `portfolio/${accountId}/positions/${pageId}`,
        method: 'GET',
    })
    return response as IPositionItem[];
}


export async function getConDetail(accountId: string, conId: string = '0'): Promise<any> {
    const response = await client.request({
        path: `portfolio/${accountId}/positions/${conId}`,
        method: 'GET',
    })
    return response
}

export async function getLedger(accountId: string): Promise<ILedgerItem> {
    const response = await client.request({
        path: `portfolio/${accountId}/ledger`,
        method: 'GET',
    })
    return response as ILedgerItem
}