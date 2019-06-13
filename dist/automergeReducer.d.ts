import { Reducer } from 'redux';
import { Action } from './types';
import { ProxyReducer } from './types';
declare type AR = <T>(proxyReducer: ProxyReducer<T>) => Reducer<T | undefined, Action>;
export declare const automergeReducer: AR;
export {};
