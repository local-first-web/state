export interface Action {
    type: string;
    payload: any;
}
declare type ChangeFn<T> = (doc: T) => void;
export declare type ProxyReducer<T> = (action: Action) => ChangeFn<T> | null;
export {};
