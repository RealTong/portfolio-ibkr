export interface AppConfig {
    consumerKey: string;
    signatureKeyPath: string;
    encryptionKeyPath: string;
    dhPrime: string;
    dhGenerator: number;
    realm: string;
    accessToken: string;
    accessTokenSecret: string;
}


export type HonoContext = {
    Variables: {
        accountId: string;
    }
}