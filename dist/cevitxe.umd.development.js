(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('automerge'), require('redux'), require('buffer'), require('hypercore'), require('hypercore-crypto'), require('pump'), require('random-access-idb'), require('signalhub'), require('webrtc-swarm')) :
  typeof define === 'function' && define.amd ? define(['exports', 'automerge', 'redux', 'buffer', 'hypercore', 'hypercore-crypto', 'pump', 'random-access-idb', 'signalhub', 'webrtc-swarm'], factory) :
  (global = global || self, factory(global.cevitxe = {}, global.automerge, global.redux, global.buffer, global.hypercore, global.crypto, global.pump, global.rai, global.signalhub, global.swarm));
}(this, function (exports, automerge, redux, buffer, hypercore, crypto, pump, rai, signalhub, swarm) { 'use strict';

  automerge = automerge && automerge.hasOwnProperty('default') ? automerge['default'] : automerge;
  hypercore = hypercore && hypercore.hasOwnProperty('default') ? hypercore['default'] : hypercore;
  crypto = crypto && crypto.hasOwnProperty('default') ? crypto['default'] : crypto;
  pump = pump && pump.hasOwnProperty('default') ? pump['default'] : pump;
  rai = rai && rai.hasOwnProperty('default') ? rai['default'] : rai;
  signalhub = signalhub && signalhub.hasOwnProperty('default') ? signalhub['default'] : signalhub;
  swarm = swarm && swarm.hasOwnProperty('default') ? swarm['default'] : swarm;

  var APPLY_CHANGE = 'cevitxe/APPLY_CHANGE';

  var actions = {
    applyChange: function applyChange(change) {
      return {
        type: APPLY_CHANGE,
        payload: {
          change: change
        }
      };
    }
  };

  var adaptReducer = function adaptReducer(proxyReducer) {
    return function (state, _ref) {
      var type = _ref.type,
          payload = _ref.payload;

      switch (type) {
        case APPLY_CHANGE:
          {
            console.log('APPLY_CHANGE REDUCER!!!!', payload);
            var newState = automerge.applyChanges(state, [payload.change]);
            console.log(newState);
            return newState;
          }

        default:
          {
            var msg = type + ": " + JSON.stringify(payload);
            var fn = proxyReducer({
              type: type,
              payload: payload
            });
            return fn && state ? automerge.change(state, msg, fn) // return a modified Automerge object
            : state; // no matching change function was found, return state unchanged
          }
      }
    };
  };

  var createDynamicMiddlewares = function createDynamicMiddlewares() {
    var allDynamicMiddlewares = [];

    var enhancer = function enhancer(store) {
      return function (next) {
        return function (action) {
          var chain = allDynamicMiddlewares.map(function (middleware) {
            return middleware(store);
          });
          return redux.compose.apply(void 0, chain)(next)(action);
        };
      };
    };

    var addMiddleware = function addMiddleware() {
      for (var _len = arguments.length, middlewares = new Array(_len), _key = 0; _key < _len; _key++) {
        middlewares[_key] = arguments[_key];
      }

      allDynamicMiddlewares = [].concat(allDynamicMiddlewares, middlewares);
    };

    var removeMiddleware = function removeMiddleware(middleware) {
      var index = allDynamicMiddlewares.findIndex(function (d) {
        return d === middleware;
      });

      if (index === -1) {
        console.error('Middleware does not exist!', middleware);
        return;
      }

      allDynamicMiddlewares = allDynamicMiddlewares.filter(function (_, mdwIndex) {
        return mdwIndex !== index;
      });
    };

    var resetMiddlewares = function resetMiddlewares() {
      allDynamicMiddlewares = [];
    };

    return {
      enhancer: enhancer,
      addMiddleware: addMiddleware,
      removeMiddleware: removeMiddleware,
      resetMiddlewares: resetMiddlewares
    };
  };

  var dynamicMiddlewaresInstance =
  /*#__PURE__*/
  createDynamicMiddlewares();
  var cevitxeMiddleware = dynamicMiddlewaresInstance.enhancer;
  var addMiddleware = dynamicMiddlewaresInstance.addMiddleware,
      removeMiddleware = dynamicMiddlewaresInstance.removeMiddleware,
      resetMiddlewares = dynamicMiddlewaresInstance.resetMiddlewares;

  // This is a hack because I was getting errors verifying the remove signature
  // I took the code from hypercore and am just always returning true for the verification
  // We need to look deeper into why it's not signing properly or maybe just provide our
  // own crypto methods here.

  var mockCrypto = {
    sign: function sign(data, sk, cb) {
      return cb(null, crypto.sign(data, sk));
    },
    verify: function verify(_sig, _data, _pk, cb) {
      // Always say it's a valid signature (for testing)
      return cb(null, true);
    }
  };

  //import automerge from 'automerge'

  var CevitxeFeed = function CevitxeFeed() {
    // private reduxStore: Store
    var feed;
    var databaseName;
    var key;
    var secretKey;
    var peerHubs;

    var createFeed = function createFeed(options) {
      if (!options.key) throw new Error('Key is required, should be XXXX in length'); // hypercore seems to be happy when I turn the key into a discoveryKey,
      // maybe we could get away with just using a Buffer (or just calling discoveryKey with a string?)

      key = crypto.discoveryKey(buffer.Buffer.from(options.key));
      if (!options.secretKey) throw new Error('Secret key is required, should be XXXX in length'); // hypercore doesn't seem to like the secret key being a discoveryKey,
      // but rather just a Buffer

      secretKey = buffer.Buffer.from(options.secretKey);
      databaseName = options.databaseName || 'data';
      peerHubs = options.peerHubs || ['https://signalhub-jccqtwhdwc.now.sh/']; // Init an indexedDB
      // I'm constructing a name here using the key because re-using the same name
      // with different keys throws an error "Another hypercore is stored here"

      var todos = rai(databaseName + "-" + getKeyHex().substr(0, 12));

      var storage = function storage(filename) {
        return todos(filename);
      }; // Create a new hypercore feed


      feed = hypercore(storage, key, {
        secretKey: secretKey,
        valueEncoding: 'utf-8',
        crypto: mockCrypto
      });
      feed.on('error', function (err) {
        return console.log(err);
      });
      feed.on('ready', function () {
        console.log('ready', key.toString('hex'));
        console.log('discovery', feed.discoveryKey.toString('hex'));
        joinSwarm();
      });
      startStreamReader(); // Inject our custom middleware using redux-dynamic-middlewares
      // I did this because we need a middleware that can use our feed instance
      // An alternative might be to instantiate Feed and then create the redux store,
      // then you'd just need a Feed.assignStore(store) method or something to give this
      // class a way to dispatch to the store.
      //addMiddleware(feedMiddleware)

      return {
        createStore: createStore
      };
    }; // This middleware has an extra function at the beginning that takes
    // a 'store' param, which we're not using so it's omitted.
    // This is an implementation detail with redux-dynamic-middlewares
    // const feedMiddleware: Middleware = store => next => action => {
    //   // feed.append(JSON.stringify(action.payload.action))
    //   const prevState = store.getState()
    //   const result = next(action)
    //   const nextState = store.getState()
    //   const changes = automerge.getChanges(prevState, nextState)
    //   changes.forEach(c => feed.append(JSON.stringify(c)))
    //   return result
    // }
    // Read items from this and peer feeds,
    // then dispatch them to our redux store


    var startStreamReader = function startStreamReader() {
      // Wire up reading from the feed
      var stream = feed.createReadStream({
        live: true
      });
      stream.on('data', function (value) {
        try {
          var change = JSON.parse(value);
          console.log('onData', change); //reduxStore.dispatch(actions.applyChange(change))
        } catch (err) {
          console.log('feed read error', err);
          console.log('feed stream returned an unknown value', value);
        }
      });
    }; // Join our feed to the swarm and accept peers


    var joinSwarm = function joinSwarm() {
      // could add option to disallow peer connectivity here
      var hub = signalhub(getKeyHex(), peerHubs);
      var sw = swarm(hub);
      sw.on('peer', onPeerConnect);
    }; // When a feed peer connects, replicate our feed to them


    var onPeerConnect = function onPeerConnect(peer, id) {
      console.log('peer', id, peer);
      pump(peer, feed.replicate({
        encrypt: false,
        live: true,
        upload: true,
        download: true
      }), peer);
    };

    var getKeyHex = function getKeyHex() {
      return key.toString('hex');
    };

    function createStore(reducer, preloadedState_orEnhancer, enhancer_or_undefined) {
      var enhancer;
      var preloadedState;

      if (enhancer_or_undefined !== undefined) {
        preloadedState = preloadedState_orEnhancer;
        enhancer = enhancer_or_undefined;
      } else {
        enhancer = preloadedState_orEnhancer;
      }

      console.log('add a feed-enabled reducer here'); // inject our reducer here

      if (preloadedState !== undefined) return redux.createStore(reducer, preloadedState, enhancer);
      return redux.createStore(reducer, enhancer);
    }

    return {
      createFeed: createFeed
    };
  };

  var feedInstance =
  /*#__PURE__*/
  CevitxeFeed();
  var createFeed = feedInstance.createFeed; // export const { CevitxeFeed as Feed }

  var initialize = function initialize(obj) {
    return automerge.change(automerge.init(), 'initialize', function (d) {
      for (var k in obj) {
        d[k] = obj[k];
      }
    });
  };

  var load = function load(key) {
    var history = localStorage.getItem(key);
    return history ? automerge.load(history) : null;
  };

  var save = function save(key, state) {
    var history = automerge.save(state);
    localStorage.setItem(key, history);
  };

  var middleware = function middleware(_ref) {
    var key = _ref.key;
    return function (store) {
      return function (next) {
        return function (action) {
          var result = next(action);
          var nextState = store.getState();
          save(key, nextState);
          return result;
        };
      };
    };
  };

  exports.APPLY_CHANGE = APPLY_CHANGE;
  exports.actions = actions;
  exports.adaptReducer = adaptReducer;
  exports.addMiddleware = addMiddleware;
  exports.cevitxeMiddleware = cevitxeMiddleware;
  exports.createDynamicMiddlewares = createDynamicMiddlewares;
  exports.createFeed = createFeed;
  exports.initialize = initialize;
  exports.load = load;
  exports.middleware = middleware;
  exports.mockCrypto = mockCrypto;
  exports.removeMiddleware = removeMiddleware;
  exports.resetMiddlewares = resetMiddlewares;
  exports.save = save;

}));
//# sourceMappingURL=cevitxe.umd.development.js.map
