import { Middleware, Reducer, Store } from 'redux';
export declare const keyString = "ecc6212465b39a9a704d564f07da0402af210888e730f419a7faf5f347a33b3d";
export declare const secretKeyString = "2234567890abcdef1234567880abcdef1234567890abcdef1234567890fedcba";
interface CevitxeStoreOptions {
    reducer: Reducer;
    preloadedState?: any;
    middlewares?: Middleware[];
    databaseName?: string;
    peerHubs?: string[];
}
export declare const createStore: (options: CevitxeStoreOptions) => Store<any, import("redux").AnyAction>;
export {};
