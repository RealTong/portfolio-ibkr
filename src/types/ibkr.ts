export interface IBKRAccountInfo {
    id: string;
    accountTitle: string;
    accountVan: string;
    displayName: string;

    accountId: string;
    currency: string
}

export interface IPositionItem {
    acctId: string;
    conid: number;
    contractDesc: string;
    position: number;
    mktPrice: number;
    mktValue: number;
    currency: string;
    avgCost: number;
    avgPrice: number;
    realizedPnl: number;
    unrealizedPnl: number;
    chineseName: string;
    listingExchange: string;

    fullName: string;
}

export interface ILedger {
    commoditymarketvalue: number,
    futuremarketvalue: number,
    settledcash: number,
    exchangerate: number,
    sessionid: number,
    cashbalance: number,
    corporatebondsmarketvalue: number,
    warrantsmarketvalue: number,
    netliquidationvalue: number,
    interest: number,
    unrealizedpnl: number,
    stockmarketvalue: number,
    moneyfunds: number,
    currency: string,
    realizedpnl: number,
    funds: number,
    acctcode: string,
    issueroptionsmarketvalue: number,
    key: string,
    timestamp: number,
    severity: number,
    stockoptionmarketvalue: number,
    futuresonlypnl: number,
    tbondsmarketvalue: number,
    futureoptionmarketvalue: number,
    cashbalancefxsegment: number,
    secondkey: string,
    tbillsmarketvalue: number,
    endofbundle: number,
    dividends: number
}

export interface ILedgerItem {
    "USD": ILedger
    "BASE": ILedger
}