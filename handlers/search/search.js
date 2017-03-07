const
	elastic = require("elasticsearch"),
	rx = require("rx"),
	baseDir = "../../..",
	sharedDir = baseDir + "/node-common",
	sharedHandlerDir = sharedDir + "/handlers",
	sharedUtilDir = sharedHandlerDir + "/util",
	sharedSearchDir = __dirname,
	utils = require(sharedUtilDir + "/common.js"),
	env = require(sharedUtilDir + "/environment.js"),
	Index = require(sharedSearchDir + "/index.js"),
	Mapping = require(sharedSearchDir + "/mapping.js"),
	Params = require(sharedSearchDir + "/params.js"),
	Reindex = require(sharedSearchDir + "/reindex.js"),
	SearchItem = require(sharedSearchDir + "/searchItem.js"),
	SearchResult = require(sharedSearchDir + "/searchResult.js"),
	Sort = require(sharedSearchDir + "/sort.js");

var client = undefined;
const main = this;

exports.client = function() {
	return client;
};

exports.MAX_SEARCH_PAGE_SIZE = 10000;

/**
 * We expect that our deployment will have two config vars called
 * ELASTICSEARCH_(DEBUG/RELEASE)_VERSION.
 * @return {String} The current version number.
 */
exports.currentVersion = function() {
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
exports.hostUrl = function() {
	if (env.isDebugging()) {
		return process.env.ELASTICSEARCH_DEBUG_URL;
	} else {
		return process.env.ELASTICSEARCH_RELEASE_URL;
	}
};

/**
 * Version 2.x and 5.x differs in several aspects, so we need to check the
 * current version whenever possible to determine which set of APIs to use.
 * @return {Boolean} Whether the current version matches 2.x.
 */
exports.isVersion2x = function() {
	return /^2.\w+/.exec(this.currentVersion()) ? true : false;
};

/**
 * Version 2.x and 5.x differs in several aspects, so we need to check the
 * current version whenever possible to determine which set of APIs to use.
 * @return {Boolean} Whether the current version matches 5.x.
 */
exports.isVersion5x = function() {
	return /^5.\w+/.exec(this.currentVersion()) ? true : false;
};

/**
 * Start ElasticSearch service.
 * @param  {object} args Placeholder parameters
 */
exports.startService = function(args) {
	const 
		apiVersion = main.currentVersion(), 
		host = main.hostUrl();

	var log;

	if (env.isDebugging()) {
		log = "error";
	} else {
		log = "error";
	}

	client = new elastic.Client({
		apiVersion : apiVersion,
		host: host, 
		log: log
	});
};

/**
 * Send a HEAD request to check whether ElasticSearch service is operational.
 * @return {rx.Observable} An Observable object.
 */
exports.checkAvailabilityObservable = function() {
	const client = main.client();

	if (client) {
		return rx.Observable.fromPromise(client.ping());
	} else {
		return rx.Observable.just(false);
	}
};

/**
 * Create indexes as specified by args.
 * @param  {object} args This parameter must contain the indexes key, 
 * which represents an Array of Index object to be created.
 */
exports.createIndexesObservable = function(args) {
	const client = main.client();

	if (client && args && Array.isInstance(args.index)) {
		return rx.Observable.from(args.index)
			.filter(index => Index.isInstance(index))
			.filter(index => index.hasAllRequiredInformation())
			.flatMap(index => rx.Observable
				.just({index : index.getName()})
				.flatMap(params => client.indices.exists(params))
				.filter(exists => !exists)
				.flatMap(exists => client.indices.create(index.json()))
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
exports.deleteIndexesObservable = function(args) {
	const client = main.client();

	if (client && args) {
		return rx.Observable.just(args.index)
			.filter(index => Array.isInstance(index))
			.map(index => index.map(index => index[Index.NAME_KEY]))
			.defaultIfEmpty("_all")
			.map(function(index) {
				return {index : index};
			})
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
exports.updateAliasesObservable = function(args) {
	const client = main.client();

	if 
		(client && args &&
		(Array.isInstance(args.oldIndex, args.newIndex)) &&
		(args.oldIndex.length && args.newIndex.length) &&
		(Index.isInstance(args.oldIndex[0], args.newIndex[0])))
	{
		const 
			oldIndex = args.oldIndex, 
			newIndex = args.newIndex,
			update = {remove : oldIndex, add : newIndex};

		return rx.Observable.just(update)
			.flatMap(function(args) {
				const actions = utils.getKeys(args);

				return rx.Observable.from(actions)
					.flatMap(action => rx.Observable
						.from(args[action])
						.filter(index => index && Index.isInstance(index))
						.flatMap(index => rx.Observable
							.fromPromise(client.indices.exists({
								index : index.getName()
							}))
							.filter(exists => exists)
							.map(exists => [
								index.getIndexAlias(), 
								index.getSearchAlias()
							])
							.flatMap(aliases => rx.Observable.from(aliases))
							.map(function(alias) {
								var json = {};

								json[action] = {
									index : index.getName(),
									alias : alias
								};	

								return json;
							})));
			})
			.toArray()
			.flatMap(scripts => client.indices.updateAliases({
				body : {
					actions : scripts
				}
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
exports.supplyIndexAndTypeObservable = function(args) {
	var indexObservable, typeObservableFcn;
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
			.map(function(index) {
				return {index : index};
			})
			.flatMap(function(indexArgs) {
				const type = (args || {}).type || undefined;

				if (Array.isInstance(type)) {
					typeObservable = args => rx.Observable.from(type);
				} else if (type && String.isInstance(type)) {
					typeObservable = args => rx.Observable.just(type);
				} else {
					typeObservable = args => main
						.getAllTypesObservable(args)
						.map(types => utils.getKeys(types))
						.flatMap(types => rx.Observable.from(types));
				}

				return typeObservable(indexArgs)
					.map(function(type) {
						var newArgs = utils.clone(args);
						newArgs.index = indexArgs.index;
						newArgs.type = type;
						return newArgs;
					});
			})
		);
};

/**
 * Index a document (e.g. create if not present).
 * @param  {object} args This parameter must contain keys such as index, id, 
 * type and data. These keys identify values that will be passed to the 
 * client's method.
 * @return {rx.Observable} An Observable object.
 */
exports.indexDocumentObservable = function(args) {
	const client = main.client();

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
exports.deleteDocumentObservable = function(args) {
	const client = main.client();

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
exports.getDocumentObservable = function(args) {
	const client = main.client();

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
exports.updateDocumentObservable = function(args) {
	const client = main.client();

	if (client && args && args.id && String.isInstance(args[Params.ID_KEY])) {
		var update = args;

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
exports.bulkUpdateObservable = function(args) {
	const client = main.client();

	if (client && args && args.body && Array.isInstance(args.body)) {
		var newArgs = utils.clone(args), body;

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
}

/**
 * Search for documents with query or filter
 * @param  {object} args This parameter must contain the update body. The 
 * index and type keys are optional - if they are not specified, ElasticSearch 
 * will search all indexes/types. This is to accommodate indexes with 
 * different languages but same mappings.
 * @return {rx.Observable} An Observable object.
 */
exports.searchDocumentObservable = function(args) {
	const client = main.client();

	if (client && args) {
		const sort = (args.body || {}).sort;
		var newArgs = utils.clone(args);

		/**
		 * We can either pass an object of type Sort, or an array of Sort
		 * objects. If this is the case, we need to call .json() to convert
		 * the object(s) into the correct search format.
		 */
		if (sort) {
			var sorts = [];

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
exports.scrollDocumentsObservable = function(args) {
	const client = main.client();

	if 
		(client && args && args.scroll && 
		(String.isInstance(args.scroll)) &&
		
		/**
		 * We need to check if the scroll parameter represents a correct 
		 * duration, e.g. '30s', '30m', '30h'.
		 */
		(args.scroll.match(/\d+(s|m|h){1}$/))) 
	{
		const 
			scrollDuration = args.scroll,

			/**
			 * We need to loop this method until there are no more hits (i.e. 
			 * the SearchResult's items Array is empty).
			 * @param  {object} result If this parameter is undefined, we are 
			 * at the first loop i.e. need to call search first before a 
			 * scrollId is returned, which we shall then use to invoke the 
			 * scroll method.
			 * @return {rx.Observable} An Observable object.
			 */
			scrollUntilDone = function(result, args) {
				var source;

				if (result) {
					source = rx.Observable.fromPromise(client.scroll({
						scrollId : result.scrollId,
						scroll : scrollDuration
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
					.emitThenResume(function(newResult, obs) {
						if (result && result.scrollId != newResult.scrollId) {
							client.clearScroll({scrollId : result.scrollId});
						}

						return scrollUntilDone(newResult, args);
					})
					.doOnCompleted(function() {
						if (result && result.scrollId) {
							client.clearScroll({scrollId : result.scrollId});
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
exports.transferDataObservable = function(args) {
	const client = main.client();

	if (client && args) {
		return rx.Observable.just(args)
			.flatMap(args => rx.Observable
				.from(Reindex.fromIndexArrays(args))
				.flatMap(reindex => main
					.scrollDocumentsObservable({
						index : reindex[Reindex.OLD_INDEX_KEY],
						scroll : args.scroll || "1m",
						body : reindex[Reindex.SCROLL_QUERY_KEY]
					})
					.flatMap(result => main.bulkUpdateObservable({
						body : result.items
							.map(item => Params.BulkIndex.newBuilder()
								.withIndex(reindex[Reindex.NEW_INDEX_KEY])
								.withType(item.type)
								.withId(item.id)
								.withUpdate(item.data)
								.withParent(item.parent)
								.build())
						})
					)
				)
			);
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
exports.reindexObservable = function(args) {
	const client = main.client();

	if 
		(client && args && 
		(Array.isInstance(args.oldIndex, args.newIndex)) &&
		(args.oldIndex.length && args.newIndex.length))
	{
		return rx.Observable.just(args)
			.flatMap(function(args) {
				const oldIndex = args.oldIndex, newIndex = args.newIndex;

				return rx.Observable.just(newIndex)
					.flatMapIfSatisfied(
						val => Boolean.cast(args.createNewIndexes),

						(val, obs) => main.createIndexesObservable({
							index : val
						})
					)
					.flatMapIfSatisfied(
						val => Boolean.cast(args.transferData),

						(val, obs) => main
							.transferDataObservable(args)
							.toArray()
					)
					.flatMapIfSatisfied(
						val => Boolean.cast(args.updateAliases),

						(val, obs) => main.updateAliasesObservable(args)
					)
					.flatMapIfSatisfied(
						val => Boolean.cast(args.removeOldIndexes),

						(val, obs) => main.deleteIndexesObservable({
							index : oldIndex
						})
					);
				}
			);
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
exports.getAllIndexesAndAliasesObservable = function(args) {
	const client = main.client();

	if (client) {
		return rx.Observable
			.fromPromise(client.cat.aliases({
				h : ["index", "alias"]
			}))
			.filter(index => index)
			.map(index => index.split("\n"))
			.flatMap(index => rx.Observable.from(index))
			.map(index => index.split(" "))
			.filter(index => index[0])
			.map(function(index) {
				return {index : index[0], alias : index[1]};
			})
			.reduce(function(acc, x, idx, obs) {
				const index = x.index, alias = x.alias, value = acc[index];
				var aliases;

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
exports.getAllTypesObservable = function(args) {
	if (args && args.index && String.isInstance(args.index)) {
		return rx.Observable.just(args.index)
			.flatMap(indexName => rx.Observable
				.fromPromise(client.indices.getMapping({
					index : indexName
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
exports.getMappingsObservable = function(args) {
	const client = main.client();

	if (client) {
		return rx.Observable
			.fromPromise(client.indices.getMapping(args))
			.map(function(value) {
				const keys = utils.getKeys(value);
				var mappings = [];

				for (var i = 0, length = keys.length; i < length; i++) {
					const 
						key = keys[i], 
						val = (value[key] || {}).mappings || {},

						mapping = Mapping.newBuilder()
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