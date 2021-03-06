// @flow

process.env.NODE_ENV = 'development';

const rx = require('rx');
const sinon = require('sinon');

const {
  Analyzer,
  AnalyzerSet,
  CharFilter,
  Client,
  FieldSet,
  Index,
  Mapping,
  Params,
  SearchItem,
  SearchResult,
  Tokenizer,
  TokenFilter,
  Type,
  Sort,
  Field,
} = require('../../../lib/search');

const { utils } = require('../../../../node-common/lib/util');
const { faker } = require('../../../../node-common/public/test/util');

Client.currentVersion = function () {
  return '5.0';
};

const delay = 5000;
const requestTimeout = 1000000;
const clearDataOnStop = true;

describe('Model Tests', () => {
  it(
    'Models should be correctly created',
    (done) => {
      const field1 = Field.newBuilder()
        .withName('TestField1')
        .withType(Field.Type.TEXT.value)
        .withIndexMode(Field.IndexMode.ANALYZED.value)
        .withIndexAnalyzer(Analyzer.Type.STANDARD.value)
        .withSearchAnalyzer(Analyzer.Type.SIMPLE.value)
        .build();

      const field2 = Field.newBuilder()
        .withName('TestField2')
        .withType(Field.Type.INTEGER.value)
        .withIndexMode(Field.IndexMode.ANALYZED.value)
        .withIndexAnalyzer(Analyzer.Type.STANDARD.value)
        .withSearchAnalyzer(Analyzer.Type.SIMPLE.value)
        .build();

      const field1Json = field1.json()[field1.getName()];
      const field2Json = field2.json()[field2.getName()];

      expect(field1Json.hasOwnProperty('index')).toBe(true);
      expect(field1Json.hasOwnProperty('analyzer')).toBe(true);
      expect(field1Json.hasOwnProperty('search_analyzer')).toBe(true);
      expect(field2Json.hasOwnProperty('index')).toBe(false);
      expect(field2Json.hasOwnProperty('analyzer')).toBe(false);
      expect(field2Json.hasOwnProperty('search_analyzer')).toBe(false);

      const type1 = Type.newBuilder()
        .withName('type1')
        .withFields([field1, field2])
        .shouldEnableAll(true)
        .shouldIncludeInAll(true)
        .shouldEnableSource(false)
        .build();

      const mapping1 = Mapping.newBuilder()
        .withTypes([type1])
        .build();

      const tokenizer1 = Tokenizer.newBuilder()
        .withName('TestTokenizer1')
        .withType(Tokenizer.Type.STANDARD.value)
        .build();

      const tokenizer2 = Tokenizer.Default().STANDARD;

      const tokenFilter1 = TokenFilter.newBuilder()
        .withName('TestTokenFilter1')
        .withType(TokenFilter.Type.ASCII_FOLDING.value)
        .withAdditionalSettingsFunction(() => ({
          preserve_original: true,
        }))
        .build();

      const tokenFilter2 = TokenFilter.Default().STANDARD;

      const charFilter1 = CharFilter.newBuilder()
        .withName('TestCharFilter1')
        .withType(CharFilter.Type.HTML_STRIP.value)
        .build();

      const charFilter2 = CharFilter.Default().MAPPING;
      const analyzer1 = Analyzer.newBuilder()
        .withName('TestAnalyzer1')
        .withType(Analyzer.Type.STANDARD.value)
        .withTokenizer(tokenizer1)
        .withTokenFilters([
          tokenFilter1,
          tokenFilter2,
        ])
        .withCharFilters([
          charFilter1,
          charFilter2,
        ])
        .build();

      const analyzer2 = Analyzer.Default().STANDARD;

      const analyzer3 = Analyzer.newBuilder()
        .withName('TestAnalyzer2')
        .withType(Analyzer.Type.STANDARD.value)
        .withTokenizer(tokenizer2)
        .build();

      const index1 = Index.newBuilder()
        .withName('TestIndex')
        .withNumberOfShards(10)
        .withNumberOfReplicas(20)
        .withIndexAlias('TestIndex-Index')
        .withSearchAlias('TestIndex-Search')
        .withMapping(mapping1)
        .withAnalyzers([analyzer1, analyzer2, analyzer3])
        .build();

      done();
    });
});

describe('Function Tests', () => {
  const indexGetFcn = 'rxGetAllIndexesAndAliases';
  const typeGetFcn = 'rxGetAllTypes';

  beforeEach((done) => {
    sinon.stub(Client, indexGetFcn).callsFake(() =>
      rx.Observable.just({
        Index1: {},
        Index2: {},
        Index3: {},
      }));

    sinon.stub(Client, typeGetFcn).callsFake(() =>
      rx.Observable.just({
        Type1: {},
        Type2: {},
        Type3: {},
      }));

    done();
  });

  afterEach((done) => {
    [indexGetFcn, typeGetFcn].forEach(fcn => Client[fcn].restore());
    done();
  });

  const observer = function (done) {
    return rx.Observer.create(
      (val) => {
        expect(val.index).toBeTruthy();
        expect(val.type).toBeTruthy();
        expect(String.isInstance(val.index)).toBe(true);
        expect(String.isInstance(val.type)).toBe(true);
      },

      (err) => {
        done.fail(err);
      },

      () => {
        done();
      },
    );
  };

  it(
    'Index and type supply functions should work when no index/type \
    supplied',
    (done) => {
      Client.rxSupplyIndexAndType({}).subscribe(observer(done));
    });

  it(
    'Index and type supply functions should work when one index/no type \
    supplied',
    (done) => {
      Client.rxSupplyIndexAndType({
        index: 'TestIndex',
      }).subscribe(observer(done));
    });

  it(
    'Index and type supply functions should work when index array/no \
    type supplied',
    (done) => {
      Client.rxSupplyIndexAndType({
        index: ['TestIndex1', 'TestIndex2'],
      }).subscribe(observer(done));
    });

  it(
    'Index and type supply functions should work when no index/one \
    type supplied',
    (done) => {
      Client.rxSupplyIndexAndType({
        type: 'TestType',
      }).subscribe(observer(done));
    });

  it(
    'Index and type supply functions should work when no index/type array \
    supplied',
    (done) => {
      Client.rxSupplyIndexAndType({
        type: ['TestType1', 'TestType2'],
      }).subscribe(observer(done));
    });

  it(
    'Index and type supply functions should work when index array/type \
    array supplied',
    (done) => {
      Client.rxSupplyIndexAndType({
        index: ['TestIndex1', 'TestIndex2'],
        type: ['TestType1', 'TestType2'],
      }).subscribe(observer(done));
    });
});

function TestModel1() {
  this.text1 = '';
  this.text2 = '';
  this.text3 = '';
  this.array1 = [];
  this.array2 = [];
  this.integer1 = 0;
  this.integer2 = 0;
  this.double1 = 0;
  this.double2 = 0;

  this.json = function () {
    const keys = this.allKeys();
    const json = {};

    for (let i = 0, length = keys.length; i < length; i++) {
      const key = keys[i];
      json[key] = this[key];
    }

    return json;
  };

  this.allKeys = function () {
    const instance = this;

    return utils.getKeys(instance)
      .filter(key => !Function.isInstance(instance[key]));
  };

  this.randomFieldValue = function () {
    const key = this.allKeys().randomValue();
    const value = this[key];

    if (Array.isInstance(value)) {
      const random = value.randomValue();
      return String(random);
    }

    return String(value);
  };

  this.containsValue = function (value) {
    const instance = this;
    const keys = utils.getKeys(this);

    return keys
      .map(key => instance[key])
      .reduce((a, b) => {
        if (Array.isInstance(b)) {
          return a.concat(b);
        }

        a.push(b);
        return a;
      }, [])
      .filter(val => val === value)
      .length > 0;
  };
}

TestModel1.fromData = function (data) {
  const model = new TestModel1();
  const keys = utils.getKeys(data);

  for (let i = 0, length = keys.length; i < length; i++) {
    const key = keys[i];
    const value = data[key];

    if (utils.hasConcreteValue(value)) {
      model[key] = value;
    }
  }

  return model;
};

TestModel1.Fields = function (args) {
  const defAnalyzer = Analyzer.Default();
  const autocompleteFields = FieldSet.autocomplete(args).fields();
  const defFieldSet = FieldSet.fromLanguage(args).fields();

  return [
    Field.newBuilder()
      .withName('text1')
      .withType(Field.Type.TEXT.value)
      .addFields(defFieldSet)
      .addFields(autocompleteFields)
      .withIndexMode(Field.IndexMode.ANALYZED.value)
      .withIndexAnalyzer(defAnalyzer.STANDARD)
      .withSearchAnalyzer(defAnalyzer.STANDARD)
      .build(),

    Field.newBuilder()
      .withName('text2')
      .withType(Field.Type.TEXT.value)
      .addFields(defFieldSet)
      .addFields(autocompleteFields)
      .withIndexMode(Field.IndexMode.ANALYZED.value)
      .withIndexAnalyzer(defAnalyzer.STANDARD)
      .withSearchAnalyzer(defAnalyzer.STANDARD)
      .build(),

    Field.newBuilder()
      .withName('text3')
      .withType(Field.Type.TEXT.value)
      .addFields(defFieldSet)
      .addFields(autocompleteFields)
      .withIndexMode(Field.IndexMode.ANALYZED.value)
      .withIndexAnalyzer(defAnalyzer.STANDARD)
      .withSearchAnalyzer(defAnalyzer.STANDARD)
      .build(),

    Field.newBuilder()
      .withName('array1')
      .withType(Field.Type.TEXT.value)
      .addFields(defFieldSet)
      .addFields(autocompleteFields)
      .withIndexMode(Field.IndexMode.ANALYZED.value)
      .withIndexAnalyzer(defAnalyzer.STANDARD)
      .withSearchAnalyzer(defAnalyzer.STANDARD)
      .build(),

    Field.newBuilder()
      .withName('array2')
      .withType(Field.Type.DOUBLE.value)
      .build(),

    Field.newBuilder()
      .withName('integer1')
      .withType(Field.Type.INTEGER.value)
      .build(),

    Field.newBuilder()
      .withName('integer2')
      .withType(Field.Type.INTEGER.value)
      .build(),

    Field.newBuilder()
      .withName('double1')
      .withType(Field.Type.DOUBLE.value)
      .build(),

    Field.newBuilder()
      .withName('double2')
      .withType(Field.Type.DOUBLE.value)
      .build(),
  ];
};

function TestType(args) {
  return Type.newBuilder()
    .withName('test-type')
    .withFields(TestModel1.Fields(args))
    .shouldEnableAll(true)
    .shouldIncludeInAll(true)
    .shouldEnableSource(false)
    .build();
}

function TestMapping(args) {
  return Mapping.newBuilder().withTypes([new TestType(args)]).build();
}

function TestIndex(args) {
  return Index.newBuilder()
    .withName(`test-index-v${args.version}`)
    .withNumberOfShards(10)
    .withNumberOfReplicas(10)
    .withIndexAlias('test-index-index')
    .withSearchAlias('test-index-search')
    .withMapping(new TestMapping(args))
    .addAnalyzers(AnalyzerSet.fromLanguage(args).analyzers())
    .addAnalyzers(AnalyzerSet.autocomplete().analyzers())
    .build();
}


describe('Index and Search Tests', () => {
  const currentVersion = 1;

  const testIndex = new TestIndex({
    language: ['en_us'],
    version: currentVersion,
  });

  const testIndexes = [testIndex];
  const objectCount = 100;
  const stringLength = 10;
  const arrayLength = 2;

  const objectArray = new Array(objectCount)
    .fill('')
    .map(() => TestModel1.fromData({
      text1: String.random(stringLength),
      text2: String.random(stringLength),
      text3: String.random(stringLength),

      array1: (function () {
        return new Array(arrayLength)
          .fill('')
          .map(() => String.random(stringLength));
      }()),
    }));

  beforeAll((done) => {
    Client.rxStartService({}).subscribe();

    Client.rxCreateIndexes({ index: testIndexes })
      .flatMap(() => rx.Observable.from(testIndexes))
      .flatMap(index => Client.rxBulkUpdate({
        index: index.name,
        type: 'test-type',
        body: objectArray.map(obj => Params.BulkIndex
          .newBuilder()
          .withIndex(index.name)
          .withType('test-type')
          .withId(faker.id())
          .withUpdate(obj.json())
          .build()),
      }))
      .catchReturn(false)
      /**
       * Delay the subscription in order for ElasticSearch to register
       * the data to be available to searches and scrolls.
       */
      .delay(delay)
      .subscribe(
        () => {},

        (err) => {
          done.fail(err);
        },

        () => {
          done();
        });
  }, requestTimeout);

  afterAll((done) => {
    if (clearDataOnStop) {
      Client.rxDeleteIndexes({})
        .delay(delay)
        .subscribe(
          () => {},

          (err) => {
            done.fail(err);
          },

        () => {
          done();
        });
    } else {
      done();
    }
  }, requestTimeout);

  xit(
    'Autocomplete should work as intended',
    (done) => {
      const queryCount = 1;
      const queries = new Array(queryCount)
        .fill('')
        .map(() => {
          const object = objectArray.randomValue();
          const value = object.randomFieldValue();
          return value;
        });

      rx.Observable
        .from(queries)
        .map((query) => {
          const args = {
            body: {
              query: {
                multi_match: {
                  query,
                  fields: [
                    'text1.autocomplete',
                    'text2.autocomplete',
                    'text3.autocomplete',
                    'array1.autocomplete',
                  ],
                },
              },
            },
          };

          return args;
        })
        .flatMap(args => Client.rxSearchDocument(args))
        .subscribe(
          (val) => {
            expect(val.total).toBeGreaterThan(0);
          },

          (err) => {
            done.fail(err);
          },

          () => {
            done();
          },
        );
    }, requestTimeout);

  it(
    'Autocomplete search with autocomplete engine should work correctly',
    (done) => {
      const oldSearch = Client.rxSearchDocument;

      /**
       * We stub out the search method with one that occasionally throws an
       * error, to see whether the search engine continues to function even
       * after the error. This makes sure that even when ES fails to search
       * for a term, when the user enters the next term the engine is still
       * good to go.
       */
      sinon.stub(Client, 'rxSearchDocument').callsFake((args) => {
        if (Boolean.random()) {
          return oldSearch(args);
        }

        return rx.Observable.throw(Error('Failed to search'));
      });

      const engine = Client.autocompleteSearchEngine({
        onResult(val) {},
        onError(err) {},
      });

      Number.range(10).forEach((word) => {
        engine.search({
          body: {
            query: {
              match_all: {},
            },
          },
        });
      });

      /**
       * Instead of waiting for onComplete(), we set a timeout to
       * emulate the user's interaction with the website. In this case,
       * we assume he/she leaves the search page within a specified
       * time interval, possibly after a set of results has been
       * delivered.
       */
      setTimeout(() => {
        engine.stop();

        /**
         * If we do not restore the stubbed method, other tests will run
         * the stubbed search as well.
         */
        Client.rxSearchDocument.restore();
        done();
      }, 5000);
    }, requestTimeout);

  it(
    'Index and type supply functions should work correctly, even if no \
    index/type specified',
    (done) => {
      Client.rxSearchDocument({ index: 'test*' })
        .map(result => result.hits)
        .flatMap(items => rx.Observable.from(items))
        .map(item => item.id)
        .flatMap(id => Client.rxUpdateDocument({
          id,

          body: {
            doc: {
              text1: 'Test',
            },
          },
        }))
        .catch(rx.Observable.empty())
        .subscribe(
          (val) => {
            expect(val.result).toEqual('updated');
          },

          (err) => {
            done.fail(err);
          },

          () => {
            done();
          },
        );
    });

  it(
    'Scroll should loop and get all data while periodically emitting \
    the results',
    (done) => {
      let scrollItems = [];
      let allItems = [];
      const size = 100;

      Client.rxSearchDocument({ size: Client.MAX_SEARCH_PAGE_SIZE })
        .flatMap((result) => {
          allItems = result.hits;
          return Client.rxScrollDocument({ scroll: '1m', size });
        })
        .subscribe(
          (val) => {
            scrollItems = scrollItems.concat(val.hits);
            expect(val.hits.length <= size).toBe(true);
          },

          (err) => {
            done.fail(err);
          },

          () => {
            const sort = function (a1, a2) {
              return a1.text1.localeCompare(a2.text1);
            };

            const allData = allItems
              .map(item => item._source)
              .sort(sort);

            const scrollData = scrollItems
              .map(item => item._source)
              .sort(sort);

            // expect(allData.length).toBe(scrollData.length);
            // expect(allData).toEqual(scrollData);
            done();
          },
        );
    }, requestTimeout);

  it(
    'Reindex with scroll should copy all data from one index to another',
    (done) => {
      const newIndex = new TestIndex({
        language: ['en_us'],
        version: currentVersion + Number.randomBetween(1, 10000),
      });

      const newIndexes = [newIndex];

      Client
        .rxReindex({
          oldIndex: testIndexes,
          newIndex: newIndexes,
          createNewIndexes: true,
          removeOldIndexes: false,
          transferData: true,
        })
        /**
         * We need to delay because the bulk update will take a few
         * seconds to be visible to search operations.
         */
        .delay(delay)
        .toArray()
        .flatMap(() => rx.Observable
          .concat(
            Client.rxSearchDocument({
              index: testIndexes.map(index => index.getName()),
              size: 10000,
            }),

            Client.rxSearchDocument({
              index: newIndexes.map(index => index.getName()),
              size: 10000,
            }),
          ))
          .toArray()
          .doOnNext((resultArray) => {
            const sort = function (a1, a2) {
              return a1.text1.localeCompare(a2.text1);
            };

            const a = resultArray[0];
            const b = resultArray[1];
            const aItems = a.hits.map(item => item._source).sort(sort);
            const bItems = b.hits.map(item => item._source).sort(sort);

            expect(a.total).toBe(b.total);
            expect(aItems.length).toBe(bItems.length);
            expect(aItems).toEqual(bItems);
          })
          .flatMap(() => Client.rxGetAllIndexesAndAliases())
          .doOnNext((aliases) => {
            const compare = function (indexes, value) {
              expect(indexes
                .map(index => index.getName())

                .map(index =>
                  (aliases[index] || {}).aliases || [])

                .reduce((a, b) =>
                  a.concat(b), []).length).toBe(value);
            };

            compare(testIndexes, 0);
            compare(newIndexes, newIndexes.length * 2);
          })
        .subscribe(
          () => {},

          (err) => {
            done.fail(err);
          },

          () => {
            done();
          },
        );
    }, requestTimeout);

  it(
    'Delete-by-query should work correctly',
    (done) => {
      Client
        .rxDeleteByQuery({
          index: testIndex.name,

          body: {
            query: {
              match_all: {},
            },
          },
        })
        .subscribe(
          (val) => {
            expect(val.total).toBe(objectArray.length);
          },

          (err) => {
            done.fail(err);
          },

          () => {
            done();
          },
        );
    });
});

describe('Re-Mapping Tests', () => {
  const testIndex = new TestIndex({ language: ['en_us'], version: 1 });
  const testIndexes = [testIndex];
  const oldFieldFcn = TestModel1.Fields;

  const oldFields = oldFieldFcn();

  oldFields.push(Field.newBuilder()
    .withName('mock1')
    .withType(Field.Type.INTEGER.value)
    .build());

  TestModel1.Fields = () => oldFields;

  const newIndex = new TestIndex({ language: 'en_us', version: 2 });
  const newIndexes = [newIndex];

  beforeAll((done) => {
    Client.rxStartService({}).subscribe();
    done();
  }, requestTimeout);

  afterAll((done) => {
    TestModel1.Fields = oldFieldFcn;
    done();
  }, requestTimeout);

  beforeEach((done) => {
    Client.rxCreateIndexes({ index: testIndexes })
      .catchReturn(true)
      .subscribe(
        () => {},

        (err) => {
          done.fail(err);
        },

        () => {
          done();
        },
      );
  }, requestTimeout);

  afterEach((done) => {
    if (clearDataOnStop) {
      Client.rxDeleteIndexes({})
        .subscribe(
          () => {},

          (err) => {
            done.fail(err);
          },

          () => {
            done();
          },
        );
    } else {
      done();
    }
  }, requestTimeout);

  it(
    'When a re-mapping is carried out, it should be reflected in the \
    new index',
    (done) => {
      Client
        .rxReindex({
          oldIndex: testIndexes,
          newIndex: newIndexes,
          createNewIndexes: true,
          removeOldIndexes: false,
          transferData: false,
        })
        .flatMap(() => Client.rxGetMappings({
          index: [testIndex.getName(), newIndex.getName()],
        }))
        .doOnNext((mappings) => {
          const tIndex = testIndex.name;
          const nIndex = newIndex.name;

          const tMapping = mappings
            .filter(val => val.index === tIndex)[0];

          const nMapping = mappings
            .filter(val => val.index === nIndex)[0];

          expect(tMapping
            .types[0]
            .fields
            .filter(field => field.name === 'mock1')[0]).toBeFalsy();

          expect(nMapping
            .types[0]
            .fields
            .filter(field => field.name === 'mock1')[0]).toBeTruthy();
        })
        .subscribe(
          () => {},

          (err) => {
            done.fail(err);
          },

          () => {
            done();
          },
        );
    }, requestTimeout);
});

describe('Nested Object Tests', () => {
  const testIndex = new TestIndex({ language: ['en_us'], version: 1 });
  const testIndexes = [testIndex];
  const oldModel = TestModel1;
  const oldFieldFcn = TestModel1.Fields;

  const fields = oldFieldFcn();

  fields.push(Field.newBuilder()
    .withName('nested1')
    .withType(Field.Type.NESTED.value)
    .withFields([
      Field.newBuilder()
        .withName('text1')
        .withType(Field.Type.KEYWORD.value)
        .build(),

      Field.newBuilder()
        .withName('double1')
        .withType(Field.Type.DOUBLE.value)
        .build(),
    ])
    .build());

  TestModel1.Fields = () => fields;

  const objectCount = 5;
  const nestedCount = 5;

  const objectArray = Number.range(objectCount)
    .map(() => TestModel1.fromData({
      nested1: (function () {
        return Number.range(nestedCount)
            .map(() => ({
              text1: faker.word(),

              double1: faker.amount(),
            }));
      }()),
    }));

  beforeAll((done) => {
    Client.rxStartService({}).subscribe();
    done();
  }, requestTimeout);

  afterAll((done) => {
    TestModel1 = oldModel;
    done();
  }, requestTimeout);

  beforeEach((done) => {
    Client.rxCreateIndexes({ index: testIndexes })
      .flatMap(() => rx.Observable.from(testIndexes))
      .flatMap(index => rx.Observable.from(objectArray)
        .map(object => ({
          index: index.getName(),
          type: 'test-type',
          body: object.json(),
        }))
        .flatMap(args => Client.rxIndexDocument(args)))
      /**
       * Delay the subscription in order for ElasticSearch to register
       * the data to be available to searches and scrolls.
       */
      .delay(delay)
      .subscribe(
        () => {},

        (err) => {
          done.fail(err);
        },

        () => {
          done();
        },
      );
  }, requestTimeout);

  afterEach((done) => {
    if (clearDataOnStop) {
      Client.rxDeleteIndexes({})
        .subscribe(
          () => {},

          (err) => {
            done.fail(err);
          },

          () => {
            done();
          },
        );
    } else {
      done();
    }
  }, requestTimeout);

  it(
    'Sorting parent documents by nested children',
    (done) => {
      const sortAndOrderPairs = function () {
        const orders = Sort.Order.allValues();
        const modes = Sort.Mode.allValues();

        return orders
          .map(order => modes.map(mode => ({ order, mode })))
          .reduce((a, b) => a.concat(b), []);
      };

      rx.Observable
        .from(sortAndOrderPairs())
        .flatMap(pair => Client
          .rxSearchDocument({
            index: testIndex.name,
            type: 'test-type',

            body: {
              sort: [
                Sort.newBuilder()
                  .withFieldName('nested1.double1')
                  .withOrder(pair.order.value)
                  .withMode(pair.mode.value)
                  .withNestedPath('nested1')
                  .build(),
              ],

              size: Client.MAX_SEARCH_PAGE_SIZE,
            },
          })
          .map(result => result.hits)
          .map(items => items.map(item => item._source))
          .map(items => items.map(item =>
            item.nested1.map(data => data.double1)))
          .doOnNext((val) => {
            const orderFcn = pair.order.method;
            const modeFcn = pair.mode.method;
            const processedResult = val.map(modeFcn).sort(orderFcn);

            const original = objectArray
              .map(obj => obj.nested1)
              .map(obj => obj.map(item => item.double1));

            const processedOriginal = original
              .map(modeFcn)
              .sort(orderFcn);

            expect(processedResult).toEqual(processedOriginal);
          }),
        )
        .subscribe(
          () => {},

          (err) => {
            done.fail(err);
          },

          () => {
            done();
          },
        );
    }, requestTimeout);
});
