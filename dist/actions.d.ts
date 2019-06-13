import { Change } from './types';
export declare const actions: {
    applyChange: (change: Change) => {
        type: string;
        payload: {
            change: Change;
        };
    };
};
