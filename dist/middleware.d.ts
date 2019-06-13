import { Middleware } from 'redux';
declare type Options = {
    key: string;
};
export declare const middleware: ({ key }: Options) => Middleware<{}, any, import("redux").Dispatch<import("redux").AnyAction>>;
export {};
