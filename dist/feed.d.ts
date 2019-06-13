import { Middleware } from 'redux';
declare class CevitxeFeed {
    private reduxStore;
    private feed;
    private databaseName;
    private key;
    private secretKey;
    private peerHubs;
    constructor(reduxStore: any, options: any);
    feedMiddleware: Middleware;
    startStreamReader: () => void;
    joinSwarm: () => void;
    onPeerConnect: (peer: any, id: any) => void;
    getKeyHex: () => string;
}
export { CevitxeFeed as Feed };
