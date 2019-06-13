(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('automerge'), require('redux'), require('buffer'), require('hypercore'), require('hypercore-crypto'), require('pump'), require('random-access-idb'), require('signalhub'), require('webrtc-swarm')) :
  typeof define === 'function' && define.amd ? define(['exports', 'automerge', 'redux', 'buffer', 'hypercore', 'hypercore-crypto', 'pump', 'random-access-idb', 'signalhub', 'webrtc-swarm'], factory) :
  (global = global || self, factory(global.cevitxe = {}, global.Automerge, global.redux, global.buffer, global.hypercore, global.crypto, global.pump, global.rai, global.signalhub, global.swarm));
}(this, function (exports, Automerge, redux, buffer, hypercore, crypto, pump, rai, signalhub, swarm) { 'use strict';

  Automerge = Automerge && Automerge.hasOwnProperty('default') ? Automerge['default'] : Automerge;
  hypercore = hypercore && hypercore.hasOwnProperty('default') ? hypercore['default'] : hypercore;
  crypto = crypto && crypto.hasOwnProperty('default') ? crypto['default'] : crypto;
  pump = pump && pump.hasOwnProperty('default') ? pump['default'] : pump;
  rai = rai && rai.hasOwnProperty('default') ? rai['default'] : rai;
  signalhub = signalhub && signalhub.hasOwnProperty('default') ? signalhub['default'] : signalhub;
  swarm = swarm && swarm.hasOwnProperty('default') ? swarm['default'] : swarm;

  var automergeReducer = function automergeReducer(proxyReducer) {
    return function (state, action) {
      var type = action.type,
          payload = action.payload;
      var msg = type + ": " + JSON.stringify(payload);
      var fn = proxyReducer({
        type: type,
        payload: payload
      });
      return fn && state ? Automerge.change(state, msg, fn) // return a modified Automerge object
      : state; // no matching change function was found, return state unchanged
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

  var CevitxeFeed = function CevitxeFeed(reduxStore, options) {
    var _this = this;

    // This middleware has an extra function at the beginning that takes
    // a 'store' param, which we're not using so it's omitted.
    // This is an implementation detail with redux-dynamic-middlewares
    this.feedMiddleware = function (store) {
      return function (next) {
        return function (action) {
          // this.feed.append(JSON.stringify(action.payload.action))
          var prevState = store.getState();
          var result = next(action);
          var nextState = store.getState();
          var changes = Automerge.getChanges(prevState, nextState);
          changes.forEach(function (c) {
            return _this.feed.append(JSON.stringify(c));
          });
          return result;
        };
      };
    }; // middleware = ({ key }: Options): Middleware => {
    //   return store => next => action => {
    //     const result = next(action)
    //     const nextState = store.getState()
    //     save(key, nextState)
    //     return result
    //   }
    // }
    // Read items from this and peer feeds,
    // then dispatch them to our redux store


    this.startStreamReader = function () {
      // Wire up reading from the feed
      var stream = _this.feed.createReadStream({
        live: true
      });

      stream.on('data', function (value) {
        try {
          var action = JSON.parse(value);
          console.log('onData', action); // duck typing so we only dispatch objects that are actions

          if (false) _this.reduxStore.dispatch(action);
        } catch (err) {
          console.log('feed read error', err);
          console.log('feed stream returned an unknown value', value);
        }
      });
    }; // Join our feed to the swarm and accept peers


    this.joinSwarm = function () {
      // could add option to disallow peer connectivity here
      var hub = signalhub(_this.getKeyHex(), _this.peerHubs);
      var sw = swarm(hub);
      sw.on('peer', _this.onPeerConnect);
    }; // When a feed peer connects, replicate our feed to them


    this.onPeerConnect = function (peer, id) {
      console.log('peer', id, peer);
      pump(peer, _this.feed.replicate({
        encrypt: false,
        live: true,
        upload: true,
        download: true
      }), peer);
    };

    this.getKeyHex = function () {
      return _this.key.toString('hex');
    };

    if (!options.key) throw new Error('Key is required, should be XXXX in length'); // hypercore seems to be happy when I turn the key into a discoveryKey,
    // maybe we could get away with just using a Buffer (or just calling discoveryKey with a string?)

    this.key = crypto.discoveryKey(buffer.Buffer.from(options.key));
    if (!options.secretKey) throw new Error('Secret key is required, should be XXXX in length'); // hypercore doesn't seem to like the secret key being a discoveryKey,
    // but rather just a Buffer

    this.secretKey = buffer.Buffer.from(options.secretKey);
    this.databaseName = options.databaseName || 'data';
    this.peerHubs = options.peerHubs || ['https://signalhub-jccqtwhdwc.now.sh/'];
    this.reduxStore = reduxStore; // Init an indexedDB
    // I'm constructing a name here using the key because re-using the same name
    // with different keys throws an error "Another hypercore is stored here"

    var todos = rai(this.databaseName + "-" + this.getKeyHex().substr(0, 12));

    var storage = function storage(filename) {
      return todos(filename);
    }; // Create a new hypercore feed


    this.feed = hypercore(storage, this.key, {
      secretKey: this.secretKey,
      valueEncoding: 'utf-8',
      crypto: mockCrypto
    });
    this.feed.on('error', function (err) {
      return console.log(err);
    });
    this.feed.on('ready', function () {
      console.log('ready', _this.key.toString('hex'));
      console.log('discovery', _this.feed.discoveryKey.toString('hex'));

      _this.joinSwarm();
    });
    this.startStreamReader(); // Inject our custom middleware using redux-dynamic-middlewares
    // I did this because we need a middleware that can use our feed instance
    // An alternative might be to instantiate Feed and then create the redux store,
    // then you'd just need a Feed.assignStore(store) method or something to give this
    // class a way to dispatch to the store.

    addMiddleware(this.feedMiddleware);
  };

  var initialize = function initialize(obj) {
    return Automerge.change(Automerge.init(), 'initialize', function (d) {
      for (var k in obj) {
        d[k] = obj[k];
      }
    });
  };

  var load = function load(key) {
    var history = localStorage.getItem(key);
    return history ? Automerge.load(history) : null;
  };

  var save = function save(key, state) {
    var history = Automerge.save(state);
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

  exports.Feed = CevitxeFeed;
  exports.addMiddleware = addMiddleware;
  exports.automergeReducer = automergeReducer;
  exports.cevitxeMiddleware = cevitxeMiddleware;
  exports.createDynamicMiddlewares = createDynamicMiddlewares;
  exports.initialize = initialize;
  exports.load = load;
  exports.middleware = middleware;
  exports.mockCrypto = mockCrypto;
  exports.removeMiddleware = removeMiddleware;
  exports.resetMiddlewares = resetMiddlewares;
  exports.save = save;

}));
//# sourceMappingURL=cevitxe.umd.development.js.map
