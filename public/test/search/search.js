require("dotenv").load();

/**
 * We need to initialize the search dependency first because there are
 * some fields that require methods exported by this module. For e.g.
 * field.js requires the use of search.isVersion5x() to check ES version.
 */
const 
	baseDir = "../../../..",
	sharedDir = baseDir + "/node-common",
	sharedHandlerDir = sharedDir + "/handlers",
	sharedPublicDir = sharedDir + "/public",
	sharedSearchDir = baseDir + "/search-common/handlers/search",
	search = require(sharedSearchDir + "/search.js");

search.currentVersion = function() {
	return "5.0";
};

const
	assert = require("chai").assert,
	rx = require("rx"),
	sinon = require("sinon"),
	faker = require(sharedPublicDir + "/test/util/faker.js"),
	utils = require(sharedHandlerDir + "/util/common.js"),
	Analyzer = require(sharedSearchDir + "/analyzer.js"),
	AnalyzerSet = require(sharedSearchDir + "/default/analyzerSet.js"),
	CharFilter = require(sharedSearchDir + "/charFilter.js"),
	FieldSet = require(sharedSearchDir + "/default/fieldSet.js"),
	Index = require(sharedSearchDir + "/index.js"),
	Mapping = require(sharedSearchDir + "/mapping.js"),
	SearchItem = require(sharedSearchDir + "/searchItem.js"),
	SearchResult = require(sharedSearchDir + "/searchResult.js"),
	Tokenizer = require(sharedSearchDir + "/tokenizer.js"),
	TokenFilter = require(sharedSearchDir + "/tokenFilter.js"),
	Type = require(sharedSearchDir + "/type.js"),
	Field = require(sharedSearchDir + "/field.js");

utils.includeUtils();

const delay = 5000, clearDataOnStop = true;

describe("Model Tests", function() {
	it(
		"Models should be correctly created",
		function(done) {
			const field1 = Field.newBuilder()
				.withName("TestField1")
				.withType(Field.Type.TEXT.value)
				.withIndexMode(Field.IndexMode.ANALYZED.value)
				.withIndexAnalyzer(Analyzer.Type.STANDARD.value)
				.withSearchAnalyzer(Analyzer.Type.SIMPLE.value)
				.build();

			const field2 = Field.newBuilder()
				.withName("TestField2")
				.withType(Field.Type.INTEGER.value)
				.withIndexMode(Field.IndexMode.ANALYZED.value)
				.withIndexAnalyzer(Analyzer.Type.STANDARD.value)
				.withSearchAnalyzer(Analyzer.Type.SIMPLE.value)
				.build();

			const
				field1Json = field1.json()[field1.getName()],
				field2Json = field2.json()[field2.getName()];

			assert.isTrue(field1Json.hasOwnProperty("index"));
			assert.isTrue(field1Json.hasOwnProperty("analyzer"));
			assert.isTrue(field1Json.hasOwnProperty("search_analyzer"));
			assert.isFalse(field2Json.hasOwnProperty("index"));
			assert.isFalse(field2Json.hasOwnProperty("analyzer"));
			assert.isFalse(field2Json.hasOwnProperty("search_analyzer"));

			const type1 = Type.newBuilder()
				.withName("type1")
				.withFields([field1, field2])
				.shouldEnableAll(true)
				.shouldIncludeInAll(true)
				.shouldEnableSource(false)
				.build();

			const mapping1 = Mapping.newBuilder()
				.withTypes([type1])
				.build();

			const
				tokenizer1 = Tokenizer.newBuilder()
					.withName("TestTokenizer1")
					.withType(Tokenizer.Type.STANDARD.value)
					.build(),
				tokenizer2 = Tokenizer.Default().STANDARD,
				tokenFilter1 = TokenFilter.newBuilder()
					.withName("TestTokenFilter1")
					.withType(TokenFilter.Type.ASCII_FOLDING.value)
					.withAdditionalSettingsFunction(function() {
						return {
							"preserve_original" : true
						}
					})
					.build(),
				tokenFilter2 = TokenFilter.Default().STANDARD,
				charFilter1 = CharFilter.newBuilder()
					.withName("TestCharFilter1")
					.withType(CharFilter.Type.HTML_STRIP.value)
					.build(),
				charFilter2 = CharFilter.Default().MAPPING,
				analyzer1 = Analyzer.newBuilder()
					.withName("TestAnalyzer1")
					.withType(Analyzer.Type.STANDARD.value)
					.withTokenizer(tokenizer1)
					.withTokenFilters([
						tokenFilter1,
						tokenFilter2
					])
					.withCharFilters([
						charFilter1,
						charFilter2
					])
					.build(),
				analyzer2 = Analyzer.Default().STANDARD,
				analyzer3 = Analyzer.newBuilder()
					.withName("TestAnalyzer2")
					.withType(Analyzer.Type.STANDARD.value)
					.withTokenizer(tokenizer2)
					.build();

			const index1 = Index.newBuilder()
				.withName("TestIndex")
				.withNumberOfShards(10)
				.withNumberOfReplicas(20)
				.withIndexAlias("TestIndex-Index")
				.withSearchAlias("TestIndex-Search")
				.withMapping(mapping1)
				.withAnalyzers([analyzer1, analyzer2, analyzer3])
				.build();

			done();
		}
	);
});

describe("Function Tests", function() {
	const
		indexGetFcn = "getAllIndexesAndAliasesObservable",
		typeGetFcn = "getAllTypesObservable";

	beforeEach(function(done) {
		const
			indexGetStub = sinon.stub(search, indexGetFcn, () => {
				return rx.Observable.just({
					"Index1" : {}, 
					"Index2" : {},
					"Index3" : {}
				});
			}),
			typeGetStub = sinon.stub(search, typeGetFcn, () => {
				return rx.Observable.just({
					"Type1" : {},
					"Type2" : {},
					"Type3" : {}
				});
			});

		done();
	});

	afterEach(function(done) {
		[indexGetFcn, typeGetFcn].forEach(fcn => search[fcn].restore());
		done();
	});

	const observer = function(done) {
		return rx.Observer.create(
			function(val) {
				assert.isDefined(val.index);
				assert.isDefined(val.type);
				assert.isTrue(String.isInstance(val.index));
				assert.isTrue(String.isInstance(val.type));
			},

			function(err) {
				console.log(err);
				throw err;
			},

			function() {
				done();
			}
		);
	}

	it(
		"Index and type supply functions should work when no index/type \
		supplied",
		function(done) {
			search.supplyIndexAndTypeObservable({}).subscribe(observer(done));
		}
	);

	it(
		"Index and type supply functions should work when one index/no type \
		supplied",
		function(done) {
			search.supplyIndexAndTypeObservable({
				index : "TestIndex"
			}).subscribe(observer(done));
		}
	);

	it(
		"Index and type supply functions should work when index array/no \
		type supplied",
		function(done) {
			search.supplyIndexAndTypeObservable({
				index : ["TestIndex1", "TestIndex2"]
			}).subscribe(observer(done));
		}
	);

	it(
		"Index and type supply functions should work when no index/one \
		type supplied",
		function(done) {
			search.supplyIndexAndTypeObservable({
				type : "TestType"
			}).subscribe(observer(done));
		}
	);

	it(
		"Index and type supply functions should work when no index/type array \
		supplied",
		function(done) {
			search.supplyIndexAndTypeObservable({
				type : ["TestType1", "TestType2"]
			}).subscribe(observer(done));
		}
	);

	it(
		"Index and type supply functions should work when index array/type \
		array supplied",
		function(done) {
			search.supplyIndexAndTypeObservable({
				index : ["TestIndex1", "TestIndex2"],
				type : ["TestType1", "TestType2"]
			}).subscribe(observer(done));
		}
	);
});

function TestModel1() {
	this.text1 = "";
	this.text2 = "";
	this.text3 = "";
	this.array1 = [];
	this.array2 = [];
	this.integer1 = 0;
	this.integer2 = 0;
	this.double1 = 0;
	this.double2 = 0;

	this.json = function() {
		const keys = this.allKeys();
		var json = {};

		for (var i = 0, length = keys.length; i < length; i++) {
			const key = keys[i];
			json[key] = this[key];
		}

		return json;
	};

	this.allKeys = function() {
		const instance = this;

		return utils.getKeys(instance)
			.filter(key => !Function.isInstance(instance[key]));
	};

	this.randomFieldValue = function() {
		const 
			key = this.allKeys().randomValue(),
			value = this[key];

		if (Array.isInstance(value)) {
			const random = value.randomValue();
			return String(random);
		} else {
			return String(value);
		}
	};

	this.containsValue = function(value) {
		const 
			instance = this,
			keys = utils.getKeys(this);

		return keys
			.map(key => instance[key])
			.reduce(function(a, b) {
				if (Array.isInstance(b)) {
					return a.concat(b);
				} else {
					a.push(b);
					return a;
				}
			}, [])
			.filter(val => val == value)
			.length > 0;
	};
};

TestModel1.fromData = function(data) {
	var model = new TestModel1();
	const keys = utils.getKeys(data);

	for (var i = 0, length = keys.length; i < length; i++) {
		const key = keys[i], value = data[key];

		if (utils.hasConcreteValue(value)) {
			model[key] = value;
		}
	}

	return model;
};

TestModel1.Fields = function(args) {
	const 
		defAnalyzer = Analyzer.Default();
		autocompleteFields = FieldSet.autocomplete(args).fields(),
		defFieldSet = FieldSet.fromLanguage(args).fields();

	return [
		Field.newBuilder()
			.withName("text1")
			.withType(Field.Type.TEXT.value)
			.addFields(defFieldSet)
			.addFields(autocompleteFields)
			.withIndexMode(Field.IndexMode.ANALYZED.value)
			.withIndexAnalyzer(defAnalyzer.STANDARD)
			.withSearchAnalyzer(defAnalyzer.STANDARD)
			.build(),

		Field.newBuilder()
			.withName("text2")
			.withType(Field.Type.TEXT.value)
			.addFields(defFieldSet)
			.addFields(autocompleteFields)
			.withIndexMode(Field.IndexMode.ANALYZED.value)
			.withIndexAnalyzer(defAnalyzer.STANDARD)
			.withSearchAnalyzer(defAnalyzer.STANDARD)
			.build(),

		Field.newBuilder()
			.withName("text3")
			.withType(Field.Type.TEXT.value)
			.addFields(defFieldSet)
			.addFields(autocompleteFields)
			.withIndexMode(Field.IndexMode.ANALYZED.value)
			.withIndexAnalyzer(defAnalyzer.STANDARD)
			.withSearchAnalyzer(defAnalyzer.STANDARD)
			.build(),

		Field.newBuilder()
			.withName("array1")
			.withType(Field.Type.TEXT.value)
			.addFields(defFieldSet)
			.addFields(autocompleteFields)
			.withIndexMode(Field.IndexMode.ANALYZED.value)
			.withIndexAnalyzer(defAnalyzer.STANDARD)
			.withSearchAnalyzer(defAnalyzer.STANDARD)
			.build(),

		Field.newBuilder()
			.withName("array2")
			.withType(Field.Type.DOUBLE.value)
			.build(),

		Field.newBuilder()
			.withName("integer1")
			.withType(Field.Type.INTEGER.value)
			.build(),

		Field.newBuilder()
			.withName("integer2")
			.withType(Field.Type.INTEGER.value)
			.build(),

		Field.newBuilder()
			.withName("double1")
			.withType(Field.Type.DOUBLE.value)
			.build(),

		Field.newBuilder()
			.withName("double2")
			.withType(Field.Type.DOUBLE.value)
			.build()
	];
};

function TestType(args) {
	return Type.newBuilder()
		.withName("test-type")
		.withFields(TestModel1.Fields(args))
		.shouldEnableAll(true)
		.shouldIncludeInAll(true)
		.shouldEnableSource(false)
		.build()
};

function TestMapping(args) {
	return Mapping.newBuilder().withTypes([new TestType(args)]).build();
};

function TestIndex(args) {
	return Index.newBuilder()
		.withName("test-index-v" + args.version)
		.withNumberOfShards(10)
		.withNumberOfReplicas(10)
		.withIndexAlias("test-index-index")
		.withSearchAlias("test-index-search")
		.withMapping(new TestMapping(args))
		.addAnalyzers(AnalyzerSet.fromLanguage(args).analyzers())
		.addAnalyzers(AnalyzerSet.autocomplete().analyzers())
		.build();
};


describe("Index and Search Tests", function() {
	this.timeout(100000);

	const 
		currentVersion = 1,

		testIndex = new TestIndex({
			language : ["en-us"],
			version : currentVersion
		}),

		testIndexes = [testIndex],
		objectCount = 50,
		stringLength = 10,
		arrayLength = 2;

	const objectArray = new Array(objectCount)
		.fill("")
		.map(val => TestModel1.fromData({
			text1 : String.randomString(stringLength),
			text2 : String.randomString(stringLength),
			text3 : String.randomString(stringLength),

			array1 : function() {
				return new Array(arrayLength)
					.fill("")
					.map(val => String.randomString(stringLength));
			}()
		}));

	before(function(done) {
		search.startService();
		done();
	});

	beforeEach(function(done) {
		search.createIndexesObservable({index: testIndexes})
			.flatMap(val => rx.Observable.from(testIndexes))
			.flatMap(index => rx.Observable.from(objectArray)
				.map(function(object) {
					return {
						index : index.getName(),
						type : "test-type",
						body : object.json()
					};
				})
				.flatMap(args => search.indexDocumentObservable(args)))
			/**
			 * Delay the subscription in order for ElasticSearch to register 
			 * the data to be available to searches and scrolls.
			 */
			.delay(delay)
			.subscribe(
				function(val) {},

				function(err) {
					throw err;
				},

				function() {
					done();
				}
			);
	});

	afterEach(function(done) {
		if (clearDataOnStop) {
			search.deleteIndexesObservable({})
				.delay(delay)
				.subscribe(
					function(val) {},

					function(err) {
						utils.log(err);
						done();
					},

					function() {
						done();
					}
				);
		} else {
			done();
		}
	});

	it(
		"Autocomplete should work as intended",
		function(done) {
			const 
				queryCount = 1;
				queries = new Array(queryCount)
					.fill("")
					.map(val => {
						const 
							object = objectArray.randomValue(),
							value = object.randomFieldValue();
						
						return value;
					});

			rx.Observable
				.from(queries)
				.map(query => {
					const args = {
						body : {
							query : {
								multi_match : {
									query : query,
									fields : [
										"text1.autocomplete",
										"text2.autocomplete",
										"text3.autocomplete",
										"array1.autocomplete"
									]
								}
							}
						}
					};

					return args;
				})
				.flatMap(args => {
					return search.searchDocumentObservable(args)
				})
				.subscribe(
					function(val) {
						assert.notEqual(val.itemCount, 0);
					},

					function(err) {
						utils.log(err);
					},

					() => {
						done();
					}
				);
		}
	);

	it(
		"Index and type supply functions should work correctly, even if no \
		index/type specified",
		function(done) {
			search.searchDocumentObservable({index : "test*"})
				.map(result => result.items)
				.flatMap(items => rx.Observable.from(items))
				.map(item => item.id)
				.flatMap(id => search.updateDocumentObservable({
					id : id,

					body : {
						doc : {
							"text1" : "Test"
						}
					}
				}))
				.onErrorResumeNext(rx.Observable.empty())
				.subscribe(
					function(val) {
						assert.equal(val["result"], "updated");
					},

					function(err) {
						console.log(err);
						throw err;
					},

					() => {
						done();
					}
				)
		}
	);

	it(
		"Scroll should loop and get all data while periodically emitting \
		the results",
		function(done) {
			var counter = 0, allItems = [], scrollItems = [];
			const size = 100;

			search.searchDocumentObservable({size : 10000})
				.flatMap(function(result) {
					allItems = result.items;

					return search.scrollDocumentsObservable({
						scroll : "1m",
						size : size
					})
				})
				.subscribe(
					function(val) {
						++counter;
						scrollItems = scrollItems.concat(val.items);
						assert.isTrue(val.items.length <= size);
					},

					function(err) {
						console.log(err);
						throw err;
					},

					function() {
						const sort = function(a1, a2) {
							return a1.text1.localeCompare(a2.text1);
						};

						const 
							allData = allItems
								.map(item => item.data).sort(sort);

							scrollData = scrollItems
								.map(item => item.data).sort(sort);

						assert.equal(allData.length, scrollData.length);
						assert.deepEqual(allData, scrollData);
						done();
					}
				);
		}
	);

	it(
		"Reindex with scroll should copy all data from one index to another",
		function(done) {
		 	const 
		 		newIndex = new TestIndex({
					language : ["en-us"],
					version : currentVersion + Number.randomBetween(1, 10000)
				}),

				newIndexes = [newIndex];		

			search
				.reindexObservable({
					oldIndex : testIndexes,
					newIndex : newIndexes,
					createNewIndexes : true,
					removeOldIndexes : false,
					transferData : true
				})
				/**
				 * We need to delay because the bulk update will take a few 
				 * seconds to be visible to search operations.
				 */
				.delay(delay)
				.toArray()
				.flatMap(val => rx.Observable
					.concat(
						search.searchDocumentObservable({
							index : testIndexes.map(index => index.getName()),
							size : 10000
						}),

						search.searchDocumentObservable({
							index : newIndexes.map(index => index.getName()),
							size : 10000
						})
					))
					.toArray()
					.doOnNext(function(resultArray) {
						const 
							sort = function(a1, a2) {
								return a1.text1.localeCompare(a2.text1);
							},

							a = resultArray[0], 
							b = resultArray[1],
						 	aItems = a.items.map(item => item.data).sort(sort), 
						 	bItems = b.items.map(item => item.data).sort(sort);

						assert.equal(a.itemCount, b.itemCount);
						assert.equal(aItems.length, bItems.length);
						assert.deepEqual(aItems, bItems);
					})
					.flatMap(val => search.getAllIndexesAndAliasesObservable())
					.doOnNext(function(aliases) {
						const compare = function(indexes, value) {
							assert.equal(indexes
								.map(index => index.getName())

								.map(index => 
									(aliases[index] || {}).aliases || [])

								.reduce((a, b) => 
									a.concat(b), []).length, value);
						};

						compare(testIndexes, 0);
						compare(newIndexes, newIndexes.length * 2);
					})
				.subscribe(
					function(val) {},

					function(err) {
						console.log(err);
						throw err;
					},

					function() {
						done();
					}
				);
		}
	);
});

describe("Re-Mapping Tests", function() {
	const 
		testIndex = new TestIndex({language : ["en-us"], version : 1}),
		testIndexes = [testIndex],
		oldFieldFcn = TestModel1.Fields;

	var oldFields = oldFieldFcn();

	oldFields.push(Field.newBuilder()
		.withName("mock1")
		.withType(Field.Type.INTEGER.value)
		.build());

	TestModel1.Fields = args => oldFields;

	const 
		newIndex = new TestIndex({language : "en-us", version : 2}),
		newIndexes = [newIndex];

	before(function(done) {
		search.startService();
		done();
	});

	after(function(done) {
		TestModel1.Fields = oldFieldFcn;
		done();
	});

	beforeEach(function(done) { 
		search.createIndexesObservable({index: testIndexes})
			.onErrorReturn(true)
			.subscribe(
				function(val) {},

				function(err) {
					throw err;
				},

				function() {
					done();
				}
			);
	});

	afterEach(function(done) {
		if (clearDataOnStop) {
			search.deleteIndexesObservable({})
				.subscribe(
					function(val) {},

					function(err) {
						console.log(err);
						throw err;
					},

					function() {
						done();
					}
				);
		} else {
			done();
		}
	});

	it(
		"When a re-mapping is carried out, it should be reflected in the \
		new index",
		function(done) {
			search
				.reindexObservable({
					oldIndex: testIndexes,
					newIndex : newIndexes,
					createNewIndexes : true,
					removeOldIndexes : false,
					transferData : false
				})
				.flatMap(val => search.getMappingsObservable({
					index : [testIndex.getName(), newIndex.getName()]
				}))
				.doOnNext(function(mappings) {
					const
						tIndex = testIndex.name,
						nIndex = newIndex.name,

						tMapping = mappings
							.filter(val => val.index == tIndex)[0],

						nMapping = mappings
							.filter(val => val.index == nIndex)[0];

					assert.isUndefined(tMapping
						.types[0]
						.fields
						.filter(field => field.name == "mock1")[0]);

					assert.isDefined(nMapping
						.types[0]
						.fields
						.filter(field => field.name == "mock1")[0]);
				})
				.subscribe(
					function(val) {},

					function(err) {
						console.log(err);
						throw err;
					},

					function() {
						done();
					}
				);
		}
	);
});

describe("Nested Object Tests", function() {
	this.timeout(1000000);

	const 
		testIndex = new TestIndex({language : ["en-us"], version : 1}),
		testIndexes = [testIndex],
		oldModel = TestModel1,
		oldFieldFcn = TestModel1.Fields;

	var fields = oldFieldFcn();

	fields.push(Field.newBuilder()
		.withName("nested1")
		.withType(Field.Type.NESTED.value)
		.withFields([
			Field.newBuilder()
				.withName("text1")
				.withType(Field.Type.KEYWORD.value)
				.build(),

			Field.newBuilder()
				.withName("double1")
				.withType(Field.Type.DOUBLE.value)
				.build()
		])
		.build());

	TestModel1.Fields = () => fields;

	const
		objectCount = 5,
		nestedCount = 5,

		objectArray = Number.range(objectCount)
			.map(val => TestModel1.fromData({
				nested1 : function() {
					return Number.range(nestedCount)
						.map(function(val) {
							return {
								text1 : faker.word(),

								double1 : faker.amount()
							}
						});
				}()
			}));

	before(function(done) {
		search.startService();
		done();
	});

	after(function(done) {
		TestModel1 = oldModel;
		done();
	});

	beforeEach(function(done) {
		search.createIndexesObservable({index: testIndexes})
			.flatMap(val => rx.Observable.from(testIndexes))
			.flatMap(index => rx.Observable.from(objectArray)
				.map(function(object) {
					return {
						index : index.getName(),
						type : "test-type",
						body : object.json()
					};
				})
				.flatMap(args => search.indexDocumentObservable(args)))
			/**
			 * Delay the subscription in order for ElasticSearch to register 
			 * the data to be available to searches and scrolls.
			 */
			.delay(delay)
			.subscribe(
				function(val) {},

				function(err) {
					throw err;
				},

				function() {
					console.log("Created index");
					done();
				}
			);
	});

	afterEach(function(done) {
		if (clearDataOnStop) {
			search.deleteIndexesObservable({})
				.subscribe(
					function(val) {},

					function(err) {
						console.log(err);
						throw err;
					},

					function() {
						done();
					}
				);
		} else {
			done();
		}
	});

	it(
		"Sorting parent documents by nested children",
		function(done) {
			const 
				orders = ["asc", "desc"],
				modes = ["max", "min", "avg", "sum"];

			rx.Observable.from(orders)
				.flatMap(order => rx.Observable
					.from(modes)
					.flatMap(mode => search
						.searchDocumentObservable({
							index : testIndex.name,
							type : "test-type",

							body : {
								sort : [
									{
										"nested1.double1": { 
								  			order: order,
								  			mode : mode,
								  			nested_path : "nested1"
										}
									}
								],

								size : search.MAX_SEARCH_PAGE_SIZE
							}
						})
						.map(result => result.items)
						.map(items => items.map(item => item.data))
						.map(items => items.map(item => item.nested1))
						.map(items => 
							items.map(item => item.map(obj => obj.double1)))
						.doOnNext(function(val) {
							assert.isTrue(val.length > 0);

							var sortMode, sortOrder;

							const original = objectArray
								.map(obj => obj.nested1)
								.map(obj => obj.map(item => item.double1));

							switch (mode) {
								case "max":
									sortMode = val => Math.maximum(val);
									break;

								case "min":
									sortMode = val => Math.minimum(val);
									break;

								case "median":
									sortMode = val => Math.median(val);
									break;

								case "sum":
									sortMode = val => Math.sum(val);
									break;

								case "avg":
								default:
									sortMode = val => Math.mean(val);
									break;
							}

							switch (order) {
								case "asc":
									sortOrder = (a, b) => a - b;
									break;

								case "desc":
								default:
									sortOrder = (a, b) => b - a;
									break;						
							}

							const 
								pOriginal = original
									.map(sortMode)
									.sort(sortOrder),

								pResult = val.map(sortMode);

							console.log({
								order : order,
								mode : mode,
								search_result : val, 
								processed_result : pResult, 
								original : original, 
								processed_original : pOriginal
							});

							assert.deepEqual(pResult, pOriginal);
						})
					)
				)
				.subscribe(
					function(val) {},

					function(err) {
						throw err;
					},

					function() {
						done();
					}
				);
		}
	)
});