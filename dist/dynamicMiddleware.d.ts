import { Middleware } from 'redux';
declare const createDynamicMiddlewares: () => {
    enhancer: Middleware<{}, any, import("redux").Dispatch<import("redux").AnyAction>>;
    addMiddleware: (...middlewares: Middleware<{}, any, import("redux").Dispatch<import("redux").AnyAction>>[]) => void;
    removeMiddleware: (middleware: Middleware<{}, any, import("redux").Dispatch<import("redux").AnyAction>>) => void;
    resetMiddlewares: () => void;
};
export declare const cevitxeMiddleware: Middleware<{}, any, import("redux").Dispatch<import("redux").AnyAction>>;
export declare const addMiddleware: (...middlewares: Middleware<{}, any, import("redux").Dispatch<import("redux").AnyAction>>[]) => void, removeMiddleware: (middleware: Middleware<{}, any, import("redux").Dispatch<import("redux").AnyAction>>) => void, resetMiddlewares: () => void;
export { createDynamicMiddlewares };
