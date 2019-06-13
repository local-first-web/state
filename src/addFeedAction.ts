const FEED_ADD_ACTION = 'FEED_ADD_ACTION'

// Method to wrap an action in a feed item action
// Possible alternatives to this approach:
// 1: Assume all actions are meant for the feed,
//    remove the type check in our middleware
// 2: Add a special prop to any action objects meant for the feed,
//    then catch actions containing that prop in the middleware
//    e.g. { action: 'foo', payload: { ... }, isFeedAction: true }
const addFeedAction = (action: any) => {
  console.log('addFeedAction', action)
  return { type: FEED_ADD_ACTION, payload: { action } }
}
