const elastic = require('elasticsearch');
const rx = require('rx');

const baseDir = '../../..';
const sharedDir = `${baseDir}/node-common`;
const sharedHandlerDir = `${sharedDir}/handlers`;
const sharedUtilDir = `${sharedHandlerDir}/util`;
const sharedSearchDir = __dirname;

const utils = require(`${sharedUtilDir}/common.js`);
const env = require(`${sharedUtilDir}/environment.js`);
const Index = require(`${sharedSearchDir}/index.js`);
const Mapping = require(`${sharedSearchDir}/mapping.js`);
const Params = require(`${sharedSearchDir}/params.js`);
const Reindex = require(`${sharedSearchDir}/reindex.js`);
const SearchItem = require(`${sharedSearchDir}/searchItem.js`);
const SearchResult = require(`${sharedSearchDir}/searchResult.js`);
const Sort = require(`${sharedSearchDir}/sort.js`);

let client;
const main = exports;

exports.client = function () {
  return client;
};

exports.MAX_SEARCH_PAGE_SIZE = 10000;

/**
 * We expect that our deployment will have two config vars called
 * ELASTICSEARCH_(DEBUG/RELEASE)_VERSION.
 * @return {String} The current version number.
 */
exports.currentVersion = function () {
  if (env.isDebugging()) {
    return process.env.ELASTICSEARCH_DEBUG_VERSION;
  } else {
    return process.env.ELASTICSEARCH_RELEASE_VERSION;
  }
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
 * Version 2.x and 5.x differs in several aspects, so we need to check the
 * current version whenever possible to determine which set of APIs to use.
 * @return {Boolean} Whether the current version matches 2.x.
 */
exports.isVersion2x = function () {
  return /^2.\w+/.exec(main.currentVersion());
};

/**
 * Version 2.x and 5.x differs in several aspects, so we need to check the
 * current version whenever possible to determine which set of APIs to use.
 * @return {Boolean} Whether the current version matches 5.x.
 */
exports.isVersion5x = function () {
  return /^5.\w+/.exec(main.currentVersion());
};

/**
 * Start ElasticSearch service.
 * @param  {object} args Placeholder parameters
 */
exports.startService = function (args) {
  const apiVersion = main.currentVersion();
  const host = main.hostUrl();

  let log;

  if (env.isDebugging()) {
    log = 'error';
  } else {
    log = 'error';
  }

  client = new elastic.Client({
    apiVersion,
    host,
    log,
  });
};

/**
 * Send a HEAD request to check whether ElasticSearch service is operational.
 * @return {rx.Observable} An Observable object.
 */
exports.checkAvailabilityObservable = function () {
  if (client) {
    return rx.Observable.fromPromise(client.ping());
  }

  return rx.Observable.just(false);
};

/**
 * Create indexes as specified by args.
 * @param  {object} args This parameter must contain the indexes key,
 * which represents an Array of Index object to be created.
 */
exports.createIndexesObservable = function (args) {
  if (client && args && Array.isInstance(args.index)) {
    return rx.Observable.from(args.index)
      .filter(index => Index.isInstance(index))
      .filter(index => index.hasAllRequiredInformation())
      .flatMap(index => rx.Observable
        .just({ index: index.getName() })
        .flatMap(params => client.indices.exists(params))
        .filter(exists => !exists)
        .flatMap(exists => client.indices.create(index.json())),
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
exports.deleteIndexesObservable = function (args) {
  if (client && args) {
    return rx.Observable.just(args.index)
      .filter(index => Array.isInstance(index))
      .map(index => index.map(index => index[Index.NAME_KEY]))
      .defaultIfEmpty('_all')
      .map(index => ({ index }))
      .flatMap(args => client.indices.delete(args));
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
exports.updateAliasesObservable = function (args) {
  if
    (client && args &&
    (Array.isInstance(args.oldIndex, args.newIndex)) &&
    (args.oldIndex.length && args.newIndex.length) &&
    (Index.isInstance(args.oldIndex[0], args.newIndex[0]))) {
    const oldIndex = args.oldIndex;
    const newIndex = args.newIndex;
    const update = { remove: oldIndex, add: newIndex };

    return rx.Observable.just(update)
      .flatMap((args) => {
        const actions = utils.getKeys(args);

        return rx.Observable.from(actions)
          .flatMap(action => rx.Observable
            .from(args[action])
            .filter(index => index && Index.isInstance(index))
            .flatMap(index => rx.Observable
              .fromPromise(client.indices.exists({
                index: index.getName(),
              }))
              .filter(exists => exists)
              .map(exists => [
                index.getIndexAlias(),
                index.getSearchAlias(),
              ])
              .flatMap(aliases => rx.Observable.from(aliases))
              .map((alias) => {
                const json = {};

                json[action] = {
                  index: index.getName(),
                  alias,
                };

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
exports.supplyIndexAndTypeObservable = function (args) {
  let indexObservable;
  let typeObservableFcn;

  const index = (args || {}).index || undefined;

  if (Array.isInstance(index)) {
    indexObservable = rx.Observable.from(index);
  } else if (index && String.isInstance(index)) {
    indexObservable = rx.Observable.just(index);
  } else {
    indexObservable = main.getAllIndexesAndAliasesObservable(args)
      .map(index => utils.getKeys(index))
      .flatMap(index => rx.Observable.from(index));
  }

  return rx.Observable.just(args)
    .flatMap(args => indexObservable
      .map(index => ({ index }))
      .flatMap((indexArgs) => {
        const type = (args || {}).type || undefined;

        if (Array.isInstance(type)) {
          typeObservableFcn = args => rx.Observable.from(type);
        } else if (type && String.isInstance(type)) {
          typeObservableFcn = args => rx.Observable.just(type);
        } else {
          typeObservableFcn = args => main
            .getAllTypesObservable(args)
            .map(types => utils.getKeys(types))
            .flatMap(types => rx.Observable.from(types));
        }

        return typeObservableFcn(indexArgs)
          .map((type) => {
            const newArgs = utils.clone(args);
            newArgs.index = indexArgs.index;
            newArgs.type = type;
            return newArgs;
          });
      }),
    );
};

/**
 * Index a document (e.g. create if not present).
 * @param  {object} args This parameter must contain keys such as index, id,
 * type and data. These keys identify values that will be passed to the
 * client's method.
 * @return {rx.Observable} An Observable object.
 */
exports.indexDocumentObservable = function (args) {
  if (client && args) {
    return main.checkAvailabilityObservable()
      .filter(available => available)
      .defaultIfEmpty(false)
      .flatMap(available => client.index(args));
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
exports.deleteDocumentObservable = function (args) {
  if (client && args) {
    return main.supplyIndexAndTypeObservable(args)
      .flatMap(args => client.delete(args));
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
exports.getDocumentObservable = function (args) {
  if (client && args && args.id && String.isInstance(args.id)) {
    return main.supplyIndexAndTypeObservable(args)
      .flatMap(args => client.get(args))
      .map(data => SearchItem.newBuilder()
        .withSearchItem(data)
        .withScore(1)
        .build());
  }

  Error.debugException(args);
  return rx.Observable.empty();
};

/**
 * Update a document with doc or script.
 * @param  {object} args This parameter must contain the update body. The body
 * must contain either the doc or script key, and not both.
 * @return {rx.Observable} An Observable object.
 */
exports.updateDocumentObservable = function (args) {
  if (client && args && args.id && String.isInstance(args[Params.ID_KEY])) {
    let update = args;

    if (Params.isInstance(args)) {
      update = args.json();
    }

    return main.supplyIndexAndTypeObservable(update)
      .flatMap(args => client.update(args));
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
exports.bulkUpdateObservable = function (args) {
  const client = main.client();

  if (client && args && args.body && Array.isInstance(args.body)) {
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
    return rx.Observable.fromPromise(client.bulk(newArgs));
  }

  Error.debugException(args);
  return rx.Observable.empty();
};

/**
 * Search for documents with query or filter
 * @param  {object} args This parameter must contain the update body. The
 * index and type keys are optional - if they are not specified, ElasticSearch
 * will search all indexes/types. This is to accommodate indexes with
 * different languages but same mappings.
 * @return {rx.Observable} An Observable object.
 */
exports.searchDocumentObservable = function (args) {
  if (client && args) {
    const sort = (args.body || {}).sort;
    const newArgs = utils.clone(args);

    /**
     * We can either pass an object of type Sort, or an array of Sort
     * objects. If this is the case, we need to call .json() to convert
     * the object(s) into the correct search format.
     */
    if (sort) {
      let sorts = [];

      if (Sort.isInstance(sort)) {
        sorts = [sort];
      } else if (Array.isInstance(sort) && Sort.isInstance(sort[0])) {
        sorts = sort;
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
      .flatMap(args => client.search(args))
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
exports.scrollDocumentsObservable = function (args) {
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
    const scrollUntilDone = function (result, args) {
      let source;

      if (result) {
        source = rx.Observable.fromPromise(client.scroll({
          scrollId: result.scrollId,
          scroll: scrollDuration,
        }));
      } else {
        source = rx.Observable.fromPromise(client.search(args));
      }

      return source
        .map(data => SearchResult.newBuilder()
          .withSearchResult(data)
          .build()
          .json())
        .filter(result => result.items && result.items.length)
        .emitThenResume((newResult, obs) => {
          if (result && result.scrollId != newResult.scrollId) {
            client.clearScroll({ scrollId: result.scrollId });
          }

          return scrollUntilDone(newResult, args);
        })
        .doOnCompleted(() => {
          if (result && result.scrollId) {
            client.clearScroll({ scrollId: result.scrollId });
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
exports.transferDataObservable = function (args) {
  if (client && args) {
    return rx.Observable.just(args)
      .flatMap(args => rx.Observable
        .from(Reindex.fromIndexArrays(args))
        .flatMap(reindex => main
          .scrollDocumentsObservable({
            index: reindex[Reindex.OLD_INDEX_KEY],
            scroll: args.scroll || '1m',
            body: reindex[Reindex.SCROLL_QUERY_KEY],
          })
          .flatMap(result => main.bulkUpdateObservable({
            body: result.items
              .map(item => Params.BulkIndex.newBuilder()
                .withIndex(reindex[Reindex.NEW_INDEX_KEY])
                .withType(item.type)
                .withId(item.id)
                .withUpdate(item.data)
                .withParent(item.parent)
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
exports.reindexObservable = function (args) {
  if
    (client && args &&
    (Array.isInstance(args.oldIndex, args.newIndex)) &&
    (args.oldIndex.length && args.newIndex.length)) {
    return rx.Observable.just(args)
      .flatMap((args) => {
        const oldIndex = args.oldIndex;
        const newIndex = args.newIndex;

        return rx.Observable.just(newIndex)
          .flatMapIfSatisfied(
            () => Boolean.cast(args.createNewIndexes),

            val => main.createIndexesObservable({ index: val }),
          )
          .flatMapIfSatisfied(
            () => Boolean.cast(args.transferData),

            () => main
              .transferDataObservable(args)
              .toArray(),
          )
          .flatMapIfSatisfied(
            () => Boolean.cast(args.updateAliases),

            () => main.updateAliasesObservable(args),
          )
          .flatMapIfSatisfied(
            () => Boolean.cast(args.removeOldIndexes),

            () => main.deleteIndexesObservable({ index: oldIndex }),
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
exports.getAllIndexesAndAliasesObservable = function (args) {
  if (client) {
    return rx.Observable
      .fromPromise(client.cat.aliases({
        h: ['index', 'alias'],
      }))
      .filter(index => index)
      .map(index => index.split('\n'))
      .flatMap(index => rx.Observable.from(index))
      .map(index => index.split(' '))
      .filter(index => index[0])
      .map(index => ({ index: index[0], alias: index[1] }))
      .reduce((acc, x, idx, obs) => {
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
exports.getAllTypesObservable = function (args) {
  if (args && args.index && String.isInstance(args.index)) {
    return rx.Observable.just(args.index)
      .flatMap(indexName => rx.Observable
        .fromPromise(client.indices.getMapping({
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
exports.getMappingsObservable = function (args) {
  if (client) {
    return rx.Observable
      .fromPromise(client.indices.getMapping(args))
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

  Error.debugException();
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
     * so onError must be inserted before onErrorReturn() to catch the
     * error and handle it appropriately.
     */
    (Function.isInstance(args.onResult, args.onError)))	{
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
        .searchDocumentObservable(searchArgs)
        .doOnError((err) => {
          args.onError(err);
        })
        .onErrorReturn(SearchResult.EMPTY))
        .doOnNext((val) => {
          args.onResult(val);
        }),

      subscription = observable.subscribe();

    return {
      search(args) {
        engine.onNext(args);
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
