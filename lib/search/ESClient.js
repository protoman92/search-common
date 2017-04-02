const elastic = require('elasticsearch');
const rx = require('rx');

const {
  Index,
  Mapping,
  Params,
  Reindex,
  SearchItem,
  SearchResult,
  Sort,
} = require('./model');

const {
  environment: env,
  typeChecker,
  utils,
} = require('../../../node-common/lib/util');

const ESVersion = require('./version.js');

let client;

const main = exports;

exports.client = function () {
  return client;
};

exports.MAX_SEARCH_PAGE_SIZE = 10000;
exports.MIN_TIME_OUT = 30000;

exports.timeout = function () {
  return main.MIN_TIME_OUT;
};

/**
 * We expect that our deployment will have two config vars called
 * ELASTICSEARCH_(DEBUG/RELEASE)_VERSION.
 * @return {String} ElasticSearch host url.
 */
exports.hostUrl = function () {
  if (env.isDebugging()) {
    return process.env.ELASTICSEARCH_DEBUG_URL;
  }

  return process.env.ELASTICSEARCH_RELEASE_URL;
};

/**
 * Start ElasticSearch service.
 * @param  {object} args Placeholder parameters
 * @return {rx.Observable} An Observable object.
 */
exports.rxStartService = function (args) {
  let esClient;

  if (args) {
    esClient = new elastic.Client(args);
  } else {
    const apiVersion = ESVersion.currentVersion();
    const host = main.hostUrl();
    const log = env.isDebugging() ? 'error' : 'error';
    esClient = new elastic.Client({ apiVersion, host, log });
  }

  client = esClient;
  return rx.Observable.from(() => esClient.cluster.health({}));
};

/**
 * Send a HEAD request to check whether ElasticSearch service is operational.
 * @return {rx.Observable} An Observable object.
 */
exports.rxCheckAvailability = function () {
  if (client) {
    return rx.Observable.fromPromise(() => client.ping());
  }

  return rx.Observable.just(false);
};

/**
 * Create indexes as specified by args.
 * @param  {object} args This parameter must contain the indexes key,
 * which represents an Array of Index object to be created.
 */
exports.rxCreateIndexes = function (args) {
  if (client && args && Array.isInstance(args.index)) {
    return rx.Observable.from(args.index)
      .filter(index => Index.isInstance(index))
      .filter(index => index.hasAllRequiredInformation())
      .flatMap(index => rx.Observable
        .just({ index: index[Index.NAME_KEY] })
        .flatMap(params => client.indices.exists(params))
        .filter(exists => !exists)
        .flatMap(() => client.indices.create(index.json())),
      );
  }

  Error.debugException(args);
  return rx.Observable.empty();
};

/**
 * Delete indexes as specified by args.
 * @param  {object} args This parameter may contain the indexes key,
 * which represents an Array of Index object to be created. If not specified,
 * all indexes will be deleted.
 */
exports.rxDeleteIndexes = function (args) {
  if (client && args) {
    return rx.Observable.just(args.index)
      .filter(index => Array.isInstance(index))
      .map(indexes => indexes.map(index => index[Index.NAME_KEY]))
      .defaultIfEmpty('_all')
      .map(index => ({ index }))
      .flatMap(deleteArgs => client.indices.delete(deleteArgs));
  }

  Error.debugException(args);
  return rx.Observable.empty();
};

/**
 * Update aliases for old and new indexes. We need to individually check the
 * existence of each index before attempting to delete/add alisases.
 * @param  {object} args This parameter must contain the Index objects for
 * which aliases will be altered.
 * @return {rx.Observable} An Observable object.
 */
exports.rxUpdateAliases = function (args) {
  if
    (client && args &&
    (Array.isInstance(args.oldIndex, args.newIndex)) &&
    (args.oldIndex.length && args.newIndex.length) &&
    (Index.isInstance(args.oldIndex[0], args.newIndex[0]))) {
    const oldIndex = args.oldIndex;
    const newIndex = args.newIndex;
    const update = { remove: oldIndex, add: newIndex };

    return rx.Observable.just(update)
      .flatMap((updateArgs) => {
        const actions = utils.getKeys(updateArgs);

        return rx.Observable.from(actions)
          .flatMap(action => rx.Observable
            .from(args[action])
            .filter(index => index && Index.isInstance(index))
            .flatMap(index => rx.Observable
              .fromPromise(() => client.indices.exists({
                index: index[Index.NAME_KEY],
              }))
              .filter(exists => exists)
              .map(() => [
                index[Index.INDEX_ALIAS_KEY],
                index[Index.SEARCH_ALIAS_KEY],
              ])
              .flatMap(aliases => rx.Observable.from(aliases))
              .map((alias) => {
                const json = {};
                json[action] = { index: index[Index.NAME_KEY], alias };
                return json;
              })));
      })
      .toArray()
      .flatMap(scripts => client.indices.updateAliases({
        body: {
          actions: scripts,
        },
      }));
  }

  Error.debugException(args);
  return rx.Observable.empty();
};

/**
 * Supply the index and type if they are not available in the args parameter.
 * For e.g., if index is not supplied, search all indexes, and if type if not
 * supplied, search all types.
 * @param  {object} args This parameter can contain (optionally) the index and
 * type keys.
 * @return {rx.Observable} An Observable object.
 */
exports.rxSupplyIndexAndType = function (args) {
  let indexObservable;
  let typeObservableFcn;
  const index = (args || {}).index || undefined;
  const type = (args || {}).type || undefined;

  if (Array.isInstance(index)) {
    indexObservable = rx.Observable.from(index);
  } else if (index && String.isInstance(index)) {
    indexObservable = rx.Observable.just(index);
  } else {
    indexObservable = main.rxGetAllIndexesAndAliases(args)
      .map(indexes => utils.getKeys(indexes))
      .flatMap(indexes => rx.Observable.from(indexes));
  }

  if (Array.isInstance(type)) {
    typeObservableFcn = () => rx.Observable.from(type);
  } else if (type && String.isInstance(type)) {
    typeObservableFcn = () => rx.Observable.just(type);
  } else {
    typeObservableFcn = typeArgs => main
      .rxGetAllTypes(typeArgs)
      .map(types => utils.getKeys(types))
      .flatMap(types => rx.Observable.from(types));
  }

  return rx.Observable.just(args)
    .flatMap(originArgs => indexObservable
      .map(newIndex => ({ index: newIndex }))
      .flatMap(indexArgs => typeObservableFcn(indexArgs)
        .map((newType) => {
          const newArgs = utils.clone(originArgs);
          newArgs.index = indexArgs.index;
          newArgs.type = newType;
          return newArgs;
        })));
};

/**
 * Index a document (e.g. create if not present).
 * @param  {object} args This parameter must contain keys such as index, id,
 * type and data. These keys identify values that will be passed to the
 * client's method.
 * @return {rx.Observable} An Observable object.
 */
exports.rxIndexDocument = function (args) {
  if (client && args) {
    return rx.Observable.fromPromise(() => client.index(args));
  }

  Error.debugException(args);
  return rx.Observable.empty();
};

/**
 * Delete a document (e.g. delete if present).
 * @param  {object} args This parameter must contain keys such as index, id,
 * type and data. These keys identify values that will be passed to the
 * client's method.
 * @return {rx.Observable} An Observable object.
 */
exports.rxDeleteDocument = function (args) {
  if (client && args) {
    return main.rxSupplyIndexAndType(args)
      .flatMap(indexTypeArgs => client.delete(indexTypeArgs));
  }

  Error.debugException(args);
  return rx.Observable.empty();
};

/**
 * Delete documents by query.
 * @param  {object} args This parameter must contain keys such as index,
 * type and body. The query body should contain queries that identify the
 * appropriate documents to delete.
 * @return {rx.Observable} An Observable object.
 */
exports.rxDeleteByQuery = function (args) {
  if (client && args) {
    return rx.Observable.fromPromise(client.deleteByQuery(args));
  }

  Error.debugException(args);
  return rx.Observable.empty();
};

/**
 * Get a document by id.
 * @param  {object} args This parameter must contain keys such as index, id,
 * type and data. These keys identify values that will be passed to the
 * client's method.
 * @return {rx.Observable} An Observable object.
 */
exports.rxGetDocument = function (args) {
  if
    (client && args && args.id &&
    /**
     * id can be a {@link Number} integer as well.
     */
    (typeChecker.isInstanceOfClasses(args.id, Number, String))) {
    return main.rxSupplyIndexAndType(args)
      .flatMap(itArgs => client.get(itArgs))
      .map(data => SearchItem.newBuilder()
        .withSearchItem(data)
        .withScore(1)
        .build());
  }

  Error.debugException(args);
  return rx.Observable.empty();
};

/**
 * Check if a document exists in {@link ElasticSearch}.
 * @param  {object} args This parameter must contain keys such as index, id,
 * type and data. These keys identify values that will be passed to the
 * client's method.
 * @return {rx.Observable} An Observable object.
 */
exports.rxDocumentExists = function (args) {
  return main.rxSupplyIndexAndType(args)
    .flatMap(indexTypeArgs => main
      .rxGetDocument(indexTypeArgs)
      .filter(utils.hasConcreteValue)
      .catchSwitchToEmpty())
    .first()
    .map(() => true)
    /**
     * If we don't use catchReturn(), first() may throw an Error with message
     * 'sequence contains no elements' if the document could not be found
     * on any index/type combination.
     */
    .catchReturn(false);
};

/**
 * Update a document with doc or script.
 * @param  {object} args This parameter must contain the update body. The body
 * must contain either the doc or script key, and not both.
 * @return {rx.Observable} An Observable object.
 */
exports.rxUpdateDocument = function (args) {
  if
    (client && args && args.id &&

    /**
     * id can be a {@link Number} integer as well.
     */
    (typeChecker.isInstanceOfClasses(args[Params.ID_KEY], Number, String))) {
    let update = args;

    /**
     * The args parameter could be an instance of {@link Params.Update}. If
     * that is the case, we need to extract its {@link #json};
     */
    if (Params.isInstance(args)) {
      update = args.json();
    }

    return main.rxSupplyIndexAndType(update)
      .flatMap(updateArgs => client.update(updateArgs));
  }

  Error.debugException(args);
  return rx.Observable.empty();
};

/**
 * Bulk-update with an Array of json or Bulk Request objects.
 * @param  {object} args This parameter must contain the body key - which
 * represents either an Array of json or Bulk Request objects.
 * @return {rx.Observable} An Observable object.
 */
exports.rxBulkUpdate = function (args) {
  if (client && args && Array.isInstance(args.body)) {
    const newArgs = utils.clone(args);
    let body;

    if (Params.isInstance(args.body[0])) {
      body = args.body
        .filter(request => request.hasAllRequiredInformation())
        .map(request => request.jsonArray())
        .reduce((a, b) => a.concat(b), []);
    } else {
      body = utils.clone(args.body);
    }

    newArgs.body = body;
    return rx.Observable.fromPromise(() => client.bulk(newArgs));
  }

  Error.debugException(args);
  return rx.Observable.empty();
};

/**
 * Search for documents with query or filter. The result will be wrapped in
 * a {@link SearchResult} object.
 * @param  {object} args This parameter must contain the update body. The
 * index and type keys are optional - if they are not specified, ElasticSearch
 * will search all indexes/types. This is to accommodate indexes with
 * different languages but same mappings.
 * @return {rx.Observable} An Observable object.
 */
exports.rxSearchDocument = function (args) {
  console.log(JSON.stringify(args.body));
  if (client && args) {
    const sortBody = (args.body || {}).sort;
    const newArgs = utils.clone(args);

    /**
     * We can either pass an object of type Sort, or an array of Sort
     * objects. If this is the case, we need to call .json() to convert
     * the object(s) into the correct search format.
     */
    if (sortBody) {
      let sorts = [];

      if (Sort.isInstance(sortBody)) {
        sorts = [sortBody];
      } else if (Array.isInstance(sortBody) && Sort.isInstance(sortBody[0])) {
        sorts = sortBody;
      }

      const newSorts = sorts
        .filter(sort => Sort.isInstance(sort))
        .filter(sort => sort.hasAllRequiredInformation())
        .map(sort => sort.json());

      if (newSorts.length) {
        newArgs.body.sort = newSorts;
      }
    }

    return rx.Observable.just(newArgs)
      .flatMap(searchArgs => client.search(searchArgs))
      .map(data => SearchResult.newBuilder()
        .withSearchResult(data)
        .build()
        .json());
  }

  Error.debugException(args);
  return rx.Observable.empty();
};

/**
 * Invoke the scroll API and continually emit the results until there are no
 * more docs left to deliver.
 * @param  {object} args This parameter must contain the values needed to pass
 * to the scroll method.
 * @return {rx.Observable} An Observable object.
 */
exports.rxScrollDocument = function (args) {
  if
    (client && args && args.scroll &&
    (String.isInstance(args.scroll)) &&

    /**
     * We need to check if the scroll parameter represents a correct
     * duration, e.g. '30s', '30m', '30h'.
     */
    (args.scroll.match(/\d+(s|m|h){1}$/))) {
    const scrollDuration = args.scroll;

    /**
     * We need to loop this method until there are no more hits (i.e.
     * the SearchResult's items Array is empty).
     * @param  {object} result If this parameter is undefined, we are
     * at the first loop i.e. need to call search first before a
     * scrollId is returned, which we shall then use to invoke the
     * scroll method.
     * @return {rx.Observable} An Observable object.
     */
    const scrollUntilDone = function (result, scrollArgs) {
      let source;

      if (result) {
        source = rx.Observable.fromPromise(() => client.scroll({
          scrollId: result[SearchResult.SCROLL_ID_KEY],
          scroll: scrollDuration,
        }));
      } else {
        source = rx.Observable.fromPromise(() => client.search(scrollArgs));
      }

      return source
        .map(data => SearchResult.newBuilder()
          .withSearchResult(data)
          .build()
          .json())
        .filter(newResult => newResult.hits && newResult.hits.length)
        .emitThenResume((newResult) => {
          const scrollKey = SearchResult.SCROLL_ID_KEY;

          if (result && result[scrollKey] !== newResult[scrollKey]) {
            client.clearScroll({ scrollId: result[scrollKey] });
          }

          return scrollUntilDone(newResult, scrollArgs);
        })
        .doOnCompleted(() => {
          const scrollKey = SearchResult.SCROLL_ID_KEY;

          if (result && result[scrollKey]) {
            client.clearScroll({ scrollId: result[scrollKey] });
          }
        });
    };

    return scrollUntilDone(null, args);
  }

  Error.debugException(args);
  return rx.Observable.empty();
};

/**
 * Transfer data from one index to another using scroll. Used for reindexing.
 * @param  {object} args This parameter must contain the oldIndexes and
 * newIndexes keys, which we will pass to Reindex's static method in order to
 * get an Array of Reindex object.
 * @return {rx.Observable} An Observable object.
 */
exports.rxTransferData = function (args) {
  if (client && args) {
    return rx.Observable.just(args)
      .flatMap(reindexArgs => rx.Observable
        .from(Reindex.fromIndexArrays(reindexArgs))
        .flatMap(reindex => main
          .rxScrollDocument({
            index: reindex[Reindex.OLD_INDEX_KEY],
            scroll: args.scroll || '1m',
            body: reindex[Reindex.SCROLL_QUERY_KEY],
          })
          .flatMap(result => main.rxBulkUpdate({
            body: result.hits
              .map(item => Params.BulkIndex.newBuilder()
                .withIndex(reindex[Reindex.NEW_INDEX_KEY])
                .withType(item[SearchItem.TYPE_KEY])
                .withId(item[SearchItem.ID_KEY])
                .withUpdate(item[SearchItem.DATA_KEY])
                .withParent(item[SearchItem.PARENT_KEY])
                .build()),
          }))));
  }

  Error.debugException(args);
  return rx.Observable.empty();
};

/**
 * Run through the entire process of creating the new indexes, transfer data
 * via scroll, update aliases and delete old indexes.
 * @param  {object} args This parameter must contain the oldIndexes and
 * newIndexes keys.
 * @return {rx.Observable} An Observable object.
 */
exports.rxReindex = function (args) {
  if
    (client && args &&
    (Array.isInstance(args.oldIndex, args.newIndex)) &&
    (args.oldIndex.length && args.newIndex.length)) {
    return rx.Observable.just(args)
      .flatMap((reindexArgs) => {
        const oldIndex = reindexArgs.oldIndex;
        const newIndex = reindexArgs.newIndex;

        return rx.Observable.just(newIndex)
          .flatMapIfSatisfied(
            () => Boolean.cast(reindexArgs.createNewIndexes),

            val => main.rxCreateIndexes({ index: val }),
          )
          .flatMapIfSatisfied(
            () => Boolean.cast(reindexArgs.transferData),

            () => main
              .rxTransferData(reindexArgs)
              .toArray(),
          )
          .flatMapIfSatisfied(
            () => Boolean.cast(reindexArgs.updateAliases),

            () => main.rxUpdateAliases(reindexArgs),
          )
          .flatMapIfSatisfied(
            () => Boolean.cast(reindexArgs.removeOldIndexes),

            () => main.rxDeleteIndexes({ index: oldIndex }),
          );
      });
  }

  Error.debugException(args);
  return rx.Observable.empty();
};

/**
 * Get all existing indexes by querying the _aliases endpoint. We also need to
 * parse the String into an Array of index names.
 * @param  {object} args Placeholder parameter.
 * @return {rx.Observable} An Observable object.
 */
exports.rxGetAllIndexesAndAliases = function (args) {
  if (client) {
    return rx.Observable
      .fromPromise(() => client.cat.aliases({
        h: ['index', 'alias'],
      }))
      .filter(index => index)
      .map(index => index.split('\n'))
      .flatMap(index => rx.Observable.from(index))
      .map(index => index.split(' '))
      .filter(index => index[0])
      .map(index => ({ index: index[0], alias: index[1] }))
      .reduce((acc, x) => {
        const index = x.index;
        const alias = x.alias;
        const value = acc[index];
        let aliases;

        if (value) {
          if (alias && value.aliases) {
            aliases = value.aliases;
          } else {
            aliases = [];
          }
        } else {
          acc[index] = {};
          aliases = [];
        }

        if (alias) {
          aliases.addUnique(alias);
        }

        acc[index].aliases = aliases;
        return acc;
      }, {})
      .defaultIfEmpty({});
  }

  Error.debugException(args);
  return rx.Observable.just({});
};

/**
 * Get all registered types for a specific index.
 * @param  {object} args This parameter must contain the index key.
 * @return {rx.Observable} An Observable object.
 */
exports.rxGetAllTypes = function (args) {
  if (args && args.index && String.isInstance(args.index)) {
    return rx.Observable.just(args.index)
      .flatMap(indexName => rx.Observable
        .fromPromise(() => client.indices.getMapping({
          index: indexName,
        }))
        .map(indexes => indexes[indexName])
        .filter(index => index && index.mappings)
        .defaultIfEmpty([])
        .map(index => index.mappings));
  }

  Error.debugException(args);
  return rx.Observable.just([]);
};

/**
 * Get mappings for a particular index.
 * @param  {object} args This parameter must contain the index name for which
 * the mapping will be fetched.
 * @return {rx.Observable} An Observable object.
 */
exports.rxGetMappings = function (args) {
  if (client) {
    return rx.Observable
      .fromPromise(() => client.indices.getMapping(args))
      .map((value) => {
        const keys = utils.getKeys(value);
        const mappings = [];

        for (let i = 0, length = keys.length; i < length; i++) {
          const key = keys[i];
          const val = (value[key] || {}).mappings || {};

          const mapping = Mapping.newBuilder()
            .withIndex(key)
            .withMappingData(val)
            .build();

          if (mapping.hasAllRequiredInformation()) {
            mappings.push(mapping);
          }
        }

        return mappings;
      });
  }

  Error.debugException(args);
  return rx.Observable.just({});
};

/**
 * Use a Subject to implement search-as-you-type autocomplete search.
 * @param  {object} args This parameter should contain some optional arguments,
 * such as debounce i.e. the time interval required to filter out fast-emitted
 * elements.
 * @return {object} An object with one key method - search, which is a function
 * that accepts an object as a parameter (this object should contain the
 * arguments necessary to populate an ElasticSearch query).
 */
exports.autocompleteSearchEngine = function (args) {
  if
    (client && args &&

    /**
     * onResult and onError are two functions that handle search result
     * and error, respectively. We do not want to return an Observable
     * here due to the fact that this utility is often used to update UI
     * only. By default, an empty SearchResult will be returned on error,
     * so onError must be inserted before catchReturn() to catch the
     * error and handle it appropriately.
     */
    (Function.isInstance(args.onResult, args.onError))) {
    const engine = new rx.Subject();

    const observable = engine
      /**
       * Since users tend to type fast, we need to discard old
       * values that are not meant to be searched on, by using
       * debounce with a millisecond time limit. This means when
       * a value is emitted, another value can only be emitted if
       * the specified time interval has passed.
       */
      .debounce(args.debounce || 500)
      /**
       * flatMapLatest is used to trim stale results i.e. results
       * that were based on old search queries. If we had used
       * flatMap, all search results, both old and new, will be
       * emitted.
       */
      .flatMapLatest(searchArgs => main
        .rxSearchDocument(searchArgs)
        .doOnError((err) => {
          args.onError(err);
        })
        .catchReturn(SearchResult.EMPTY))
        .doOnNext((val) => {
          args.onResult(val);
        });

    const subscription = observable.subscribe();

    return {
      search(searchArgs) {
        engine.onNext(searchArgs);
      },

      stop() {
        /**
         * After the subscription is disposed, the engine will
         * shutdown and no longer emit any more item. We usually call
         * this method when the user leaves the search page, for
         * example.
         */
        subscription.dispose();
      },
    };
  }

  Error.debugException(args);
  return rx.Observable.empty();
};
