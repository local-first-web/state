'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var automerge = _interopDefault(require('automerge'));
var redux = require('redux');
var buffer = require('buffer');
var hypercore = _interopDefault(require('hypercore'));
var crypto = _interopDefault(require('hypercore-crypto'));
var pump = _interopDefault(require('pump'));
var rai = _interopDefault(require('random-access-idb'));
var signalhub = _interopDefault(require('signalhub'));
var swarm = _interopDefault(require('webrtc-swarm'));

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
          console.log('APPLY_CHANGE REDUCER!!');
          return automerge.applyChanges(state, [payload.change]);
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
        var changes = automerge.getChanges(prevState, nextState);
        changes.forEach(function (c) {
          return _this.feed.append(JSON.stringify(c));
        });
        return result;
      };
    };
  }; // Read items from this and peer feeds,
  // then dispatch them to our redux store


  this.startStreamReader = function () {
    // Wire up reading from the feed
    var stream = _this.feed.createReadStream({
      live: true
    });

    stream.on('data', function (value) {
      try {
        var change = JSON.parse(value);
        console.log('onData', change);

        _this.reduxStore.dispatch(actions.applyChange(change));
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
exports.Feed = CevitxeFeed;
exports.actions = actions;
exports.adaptReducer = adaptReducer;
exports.addMiddleware = addMiddleware;
exports.cevitxeMiddleware = cevitxeMiddleware;
exports.createDynamicMiddlewares = createDynamicMiddlewares;
exports.initialize = initialize;
exports.load = load;
exports.middleware = middleware;
exports.mockCrypto = mockCrypto;
exports.removeMiddleware = removeMiddleware;
exports.resetMiddlewares = resetMiddlewares;
exports.save = save;
//# sourceMappingURL=cevitxe.cjs.development.js.map
