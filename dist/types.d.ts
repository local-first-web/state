import { Reducer } from 'redux';
export interface Action {
    type: string;
    payload: any;
}
export declare type ProxyReducer<T> = (action: Action) => ChangeFn<T> | null;
export declare type ReducerAdapter = <T>(proxy: ProxyReducer<T>) => Reducer<T | undefined, Action>;
declare type ChangeFn<T> = (doc: T) => void;
export interface Change {
}
export {};
