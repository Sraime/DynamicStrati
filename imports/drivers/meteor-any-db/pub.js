// Generated by CoffeeScript 2.2.4
(function() {
  var DB_KEY, createOrderedObserver, debug, obj2Fields, ref, ref1, salter;

  ({DB_KEY} = AnyDb); // Spoofing a Mongo collection name to hack around DDP

  debug = (function() {});

  if ((ref = Meteor.settings.public) != null ? (ref1 = ref.log) != null ? ref1.pub : void 0 : void 0) {
    debug = console.log.bind(console, 'pub');
  }

  // flatten a deep object into fields separated with '.'
  obj2Fields = function(obj = {}) {
    var deeperFields, dest, k, key, v, value;
    dest = {};
    for (key in obj) {
      value = obj[key];
      if (U.isPlainObject(value)) {
        deeperFields = obj2Fields(value);
        for (k in deeperFields) {
          v = deeperFields[k];
          dest[`${key}.${k}`] = v;
        }
      } else {
        dest[key] = R.clone(value);
      }
    }
    return dest;
  };

  salter = function() {
    return Random.hexString(10);
  };

  // publish with the subscriptionId and the position
  createOrderedObserver = function(pub, subId) {
    return {
      addedBefore: function(id, fields = {}, before) {
        U.set([DB_KEY, subId], `${salter()}.${before}`, fields);
        return pub.added(DB_KEY, id, obj2Fields(fields));
      },
      movedBefore: function(id, before) {
        var fields;
        fields = {};
        U.set([DB_KEY, subId], `${salter()}.${before}`, fields);
        return pub.changed(DB_KEY, id, obj2Fields(fields));
      },
      changed: function(id, fields) {
        return pub.changed(DB_KEY, id, fields);
      },
      removed: function(id) {
        return pub.removed(DB_KEY, id);
      }
    };
  };

  // pubs[name][serialize(query)][subId] = refresh
  AnyDb.pubs = {};

  AnyDb.refresh = function(name, queryCond) {
    var queries;
    if (AnyDb.pubs[name]) {
      queries = Object.keys(AnyDb.pubs[name]).map(U.deserialize).filter(queryCond).map(U.serialize);
      debug('refresh', name);
      return queries.map(function(query) {
        // defer these updates so they dont block methods or subscriptions
        return U.mapObj(AnyDb.pubs[name][query], function(subId, sub) {
          return Meteor.defer(function() {
            return sub.refresh();
          });
        });
      });
    }
  };

  AnyDb.transform = function(name, queryCond, xform) {
    var queries;
    if (AnyDb.pubs[name]) {
      queries = Object.keys(AnyDb.pubs[name]).map(U.deserialize).filter(queryCond).map(U.serialize);
      debug('transform', name);
      return queries.map(function(query) {
        // defer these transforms so they dont block methods or subscriptions
        return U.mapObj(AnyDb.pubs[name][query], function(subId, sub) {
          return Meteor.defer(function() {
            return sub.transform(xform);
          });
        });
      });
    }
  };

  AnyDb.publish = function(name, fetcher) {
    return Meteor.publish(name, function(query) {
      var key, pub, sub, subId;
      // unblock this publication so others can be processed while waiting
      // for HTTP requests so they arent fetched synchronously in order.
      // Thanks again Arunoda!
      this.unblock();
      // subscribe undefined comes through as null and this is annoying when you
      // want to refresh a publication matching undefined
      if (query === null) {
        query = void 0;
      }
      pub = this;
      subId = pub._subscriptionId;
      sub = {
        subId: subId,
        docs: [],
        name: name,
        query: query
      };
      // fetch documents
      sub.fetch = function() {
        return fetcher.call(pub, query);
      };
      // observer which sends DDP messages through merge-box through
      // the publication along with subId and position information.
      sub.observer = createOrderedObserver(pub, subId);
      // fetch document again, diff, and publish
      sub.refresh = function() {
        var lap, newDocs;
        lap = U.stopwatch();
        debug('refreshing', name, subId);
        newDocs = sub.fetch();
        DiffSequence.diffQueryChanges(true, sub.docs, newDocs, sub.observer);
        sub.docs = newDocs;
        return debug('refreshed', name, subId, lap(), 's');
      };
      // transform data, rather than refresh if we know for sure what the change
      // will be.
      sub.transform = function(xform) {
        var lap, newDocs;
        lap = U.stopwatch();
        debug('transforming', name, subId);
        newDocs = xform(R.clone(sub.data));
        DiffSequence.diffQueryChanges(true, sub.docs, newDocs, sub.observer);
        sub.docs = newDocs;
        return debug('transformed', name, subId, lap(), 's');
      };
      (function() {
        var lap;
        lap = U.stopwatch();
        debug('start', name, subId);
        sub.docs = sub.fetch();
        sub.docs.map(function(doc) {
          var fields, id;
          id = doc._id;
          fields = R.clone(doc);
          delete fields._id;
          return sub.observer.addedBefore(id, fields, null);
        });
        pub.ready();
        return debug('ready', name, subId, lap(), 's');
      })();
      // register and unregister publication
      key = U.serialize(query);
      U.set([name, key, subId], sub, AnyDb.pubs);
      return pub.onStop(function() {
        debug('stop', name, subId);
        return U.unset([name, key, subId], AnyDb.pubs);
      });
    });
  };

}).call(this);

//# sourceMappingURL=pub.js.map
