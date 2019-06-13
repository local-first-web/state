declare const FEED_ADD_ACTION = "FEED_ADD_ACTION";
declare const addFeedAction: (action: any) => {
    type: string;
    payload: {
        action: any;
    };
};
