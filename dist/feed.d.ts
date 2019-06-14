import { Reducer, Action, StoreEnhancer, Store, DeepPartial } from 'redux';
export declare const createFeed: (options: any) => {
    createStore: {
        <S, A extends Action<any>>(reducer: Reducer<S, A>, enhancer?: StoreEnhancer<any, {}> | undefined): Store<S, A>;
        <S, A extends Action<any>>(reducer: Reducer<S, A>, preloadedState?: DeepPartial<S> | undefined, enhancer?: StoreEnhancer<any, {}> | undefined): Store<S, A>;
    };
};
