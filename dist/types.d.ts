import Automerge from 'automerge';
export interface Action {
    type: string;
    payload: any;
}
export declare type ProxyReducer<T> = (action: Action) => Automerge.ChangeFn<T> | null;
