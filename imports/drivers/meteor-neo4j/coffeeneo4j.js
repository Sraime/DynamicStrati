// Generated by CoffeeScript 2.2.4
// from https://github.com/ccorcos/meteor-neo4j/

var Neo4j, Neo4jDb, ensureEnding, ensureTrailingSlash, parseUrl, regexify, stringify, transpose, url, zip;

stringify = function(value) {
  var k, pairs, v;
  // turn an object into a string that plays well with Cipher queries.
  if (_.isArray(value)) {
    return `[${value.map(stringify).join(',')}]`;
  } else if (U.isPlainObject(value)) {
    pairs = [];
    for (k in value) {
      v = value[k];
      pairs.push(`${k}:${stringify(v)}`);
    }
    return "{" + pairs.join(', ') + "}";
  } else if (_.isString(value)) {
    return `'${value.replace(/'/g, "\\'")}'`;
  } else if (value === void 0) {
    return null;
  } else {
    return `${value}`;
  }
};

regexify = function(string) {
  return `'(?i).*${string.replace(/'/g, "\\'").replace(/\//g, '\/')}.*'`;
};

// transpose a 2D array
transpose = function(xy) {
  // get the index, pull the nth item, pass that function to map
  return R.mapIndexed(R.pipe(R.nthArg(1), R.nth, R.map(R.__, xy)), R.head(xy));
};

// turns a matrix of rows by columns into rows with key values.
// zip(keys, rowsByColumns) -> [{key:val}, ...]
zip = R.curry(function(keys, data) {
  var z;
  z = R.useWith(R.map, R.zipObj);
  if (keys.length === 1) {
    return z(keys, data.map(function(elm) {
      return [elm];
    }));
  } else {
    return z(keys, data);
  }
});

ensureTrailingSlash = function(url) {
  if (url[url.length - 1] !== '/') {
    return url + '/';
  } else {
    return url;
  }
};

ensureEnding = function(url) {
  var ending;
  ending = 'db/data/';
  if (url.slice(url.length - ending.length, url.length) === ending) {
    return url;
  } else {
    return url + ending;
  }
};

parseUrl = function(url) {
  var auth, match;
  url = ensureTrailingSlash(url);
  url = ensureEnding(url);
  match = url.match(/^(.*\/\/)(.*)@(.*$)/);
  if (match) {
    // [ 'http://username:password@localhost:7474/',
    //   'http://',
    //   'username:password',
    //   'localhost:7474/']
    url = match[1] + match[3];
    auth = match[2];
    return {url, auth};
  } else {
    return {url};
  }
};

// create a Neo4j connection. you could potentially connect to multiple.
Neo4jDb = function(url) {
  var auth, db, log, warn;
  db = {};
  db.options = {};
  // configure url and auth
  url = url || 'http://localhost:7474/';
  ({url, auth} = parseUrl(url));
  db.url = url;
  if (auth) {
    db.options.auth = auth;
  }
  log = console.log.bind(console, `[${db.url}] neo4j`);
  warn = console.warn.bind(console, `[${db.url}] neo4j`);
  // run http queries catching errors with nice logs
  db.http = function(f) {
    var code, error, message;
    try {
      return f();
    } catch (error1) {
      error = error1;
      if (error.response) {
        code = error.response.statusCode;
        message = error.response.message;
        if (code === 401) {
          warn(`[${code}] auth error:\n`, db.options.auth, "\n" + message);
        } else {
          warn(`[${code}] error response:`, message);
        }
      } else {
        warn("error:", error.toString());
      }
    }
  };
  // test the connection
  db.connect = function() {
    return db.http(function() {
      log("connecting...");
      let response = HTTP.call('GET', db.url, db.options);
      if (response.statusCode === 200) {
        log("connected");
      } else {
        warn("could not connect\n", response.toString());
      }
    });
  };
  // test the database latency
  db.latency = function() {
    return db.http(function() {
      return R.mean([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function() {
        var start;
        start = Date.now();
        HTTP.call('GET', db.url, db.options);
        return Date.now() - start;
      }));
    });
  };
  // get a query. if theres only one column, the results are flattened. else
  // it returns a 2D array of rows by columns.
  db.query = function(statement, parameters = {}) {
    var result;
    result = db.http(function() {
      var params, response;
      params = R.merge(db.options, {
        data: {
          statements: [{statement, parameters}]
        }
      });
      response = HTTP.post(db.url + "transaction/commit", params);
      // neo4j can take multiple queries at once, but we're just doing one
      if (response.data.results.length === 1) {
        // get the first result
        result = response.data.results[0];
        // the result is a 2D array of rows by columns
        // if there was no return statement, then lets return nothing
        if (result.columns.length === 0) {
          return [];
        } else if (result.columns.length === 1) {
          // if theres only one column returned then lets flatten the results
          // so we just get that column across all rows
          return R.pipe(R.map(R.prop('row')), R.flatten)(result.data);
        } else {
          // if there are multiple columns, return an array of rows
          return R.map(R.prop('row'))(result.data);
        }
      }
    });
    // if we get an error, lets still just return an empty array of data
    // so we can map over it or whatever we expected to do originally.
    return result || [];
  };
  db.reset = function() {
    log("resetting...");
    db.query("MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE n,r");
    return log("reset");
  };
  db.isEmpty = function() {
    var n;
    [n] = Neo4j.query("MATCH (n) MATCH (n)-[r]-() RETURN count(n)+count(r)");
    return n === 0;
  };
  // some utils for generating cypher queries
  db.stringify = stringify;
  db.regexify = regexify;
  db.transpose = transpose;
  db.zip = zip;
  db.connect();
  return db;
};

// autoconnect to neo4j if given the appropriate settings or environment variable
if (url = Meteor.settings.neo4j_url) {
  Neo4j = Neo4jDb(url);
} else if (url = process.env.NEO4J_URL) {
  Neo4j = Neo4jDb(url);
}

export { Neo4jDb };


//# sourceMappingURL=neo4j.js.map
