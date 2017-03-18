const { typeChecker, utils } = require('../../../../node-common/lib/util');

function Index() {}

/**
 * The {@link Index}'s name.
 * @type {String} The index's name.
 */
Index.prototype.name = '';

/**
 * The number of shards to allocate to this index. This can't be updated
 * unless we reindex with new settings.
 * @type {Number} The number of shards to allocate to this index.
 */
Index.prototype.numberOfShards = 5;

/**
 * The number of replicas to allocate to this index. This can be updated
 * dynamically.
 * @type {Number} The number of replicas to allocate to this index.
 */
Index.prototype.numberOfReplicas = 1;

/**
 * The index alias for this {@link Index}. This alias is an endpoint that
 * masks the actual {@link Index} endpoint, so that future index updates
 * will be easier.
 * @type {String} The index alias for this index.
 */
Index.prototype.indexAlias = '';

/**
 * The search alias for this index. Search aliases can point to multiple
 * indices. This alias allows searching to be decoupled from indexing.
 * @type {String} The search alias for this index.
 */
Index.prototype.searchAlias = '';

/**
 * The mapping for this index. Should be a {@link Mapping} object.
 * @type {Object} The mapping for this index.
 */
Index.prototype.mapping = {};

/**
 * Custom analyzers for this index. Should be an {@link Array} of
 * {@link Analyzer} objects.
 * @type {Array} An Array of Analyzer objects.
 */
Index.prototype.analyzers = [];

/**
 * The search query to execute when invoking the scroll api. We can use
 * this to limit the data being transferred during a reindex operation.
 * @type {object} The scroll search query.
 */
Index.prototype.reindexScrollQuery = {
  query: {
    match_all: {},
  },
};

Index.prototype.setName = function (name) {
  if (name && String.isInstance(name)) {
    this.name = name;
  }

  return this;
};

Index.prototype.setNumberOfShards = function (number) {
  if (Number.isInstance(number)) {
    this.numberOfShards = parseInt(number, 10);
  }

  return this;
};

Index.prototype.setNumberOfReplicas = function (number) {
  if (Number.isInstance(number)) {
    this.numberOfReplicas = parseInt(number, 10);
  }

  return this;
};

Index.prototype.setIndexAlias = function (alias) {
  if (alias && String.isInstance(alias)) {
    this.indexAlias = alias;
  }

  return this;
};

Index.prototype.setSearchAlias = function (alias) {
  if (alias && String.isInstance(alias)) {
    this.searchAlias = alias;
  }

  return this;
};

Index.prototype.setMapping = function (mapping) {
  if (utils.isNotEmpty(mapping)) {
    this.mapping = mapping;
  }

  return this;
};

Index.prototype.setReindexScrollQuery = function (query) {
  if (Object.isInstance(query)) {
    this.reindexScrollQuery = query;
  }

  return this;
};

Index.prototype.setAnalyzers = function (analyzers) {
  if (Array.isInstance(analyzers) && analyzers.length) {
    this.analyzers = analyzers;
  }

  return this;
};

Index.prototype.addAnalyzers = function (analyzers) {
  if (Array.isInstance(analyzers) && analyzers.length) {
    this.analyzers = this.getAnalyzers().concat(analyzers);
  }

  return this;
};

Index.prototype.getName = function () {
  return this.name || '';
};

Index.prototype.getNumberOfShards = function () {
  return this.numberOfShards || 5;
};

Index.prototype.getNumberOfReplicas = function () {
  return this.numberOfReplicas || 1;
};

Index.prototype.getIndexAlias = function () {
  return this.indexAlias || '';
};

Index.prototype.getSearchAlias = function () {
  return this.searchAlias || '';
};

Index.prototype.getMapping = function () {
  return this.mapping || {};
};

Index.prototype.getAnalyzers = function () {
  return this.analyzers || [];
};

Index.prototype.getReindexScrollQuery = function () {
  return this.reindexScrollQuery || {};
};

Index.prototype.hasAllRequiredInformation = function () {
  switch (true) {
    case this.getName().isEmpty():
    case utils.isEmpty(this.getMapping()):
    case !this.getMapping().hasAllRequiredInformation():
      Error.debugException();
      return false;

    default:
      break;
  }

  return true;
};

Index.prototype.json = function () {
  const json = { index: this.getName() };

  const body = {
    settings: {
      number_of_shards: this.getNumberOfShards(),
      number_of_replicas: this.getNumberOfReplicas(),
    },

    mappings: this.getMapping().json(),
  };

  const analyzers = this
    .getAnalyzers()
    .filter(analyzer => analyzer.requiresSeparateRegistry())
    .filter(analyzer => analyzer.hasAllRequiredInformation());

  const tokenizers = analyzers
    .map(analyzer => analyzer.getTokenizer())
    .filter(tokenizer => utils.isNotEmpty(tokenizer))
    .filter(tokenizer => tokenizer.requiresSeparateRegistry())
    .filter(tokenizer => tokenizer.hasAllRequiredInformation());

  const tokenFilters = analyzers
    .map(analyzer => analyzer.getTokenFilters())
    .reduce((a, b) => a.concat(b), [])
    .filter(tokenFilter => tokenFilter.requiresSeparateRegistry())
    .filter(tokenFilter => tokenFilter.hasAllRequiredInformation());

  const charFilters = analyzers
    .map(analyzer => analyzer.getCharFilters())
    .reduce((a, b) => a.concat(b), [])
    .filter(charFilter => charFilter.requiresSeparateRegistry())
    .filter(charFilter => charFilter.hasAllRequiredInformation());

  const indexAlias = this.getIndexAlias();
  const searchAlias = this.getSearchAlias();

  if (analyzers.length) {
    const analysis = {
      analyzer: analyzers
        .map(analyzer => analyzer.json())
        .reduce((a, b) => Object.assign(a, b), {}),
    };

    if (tokenizers.length) {
      analysis.tokenizer = tokenizers
        .map(tokenizer => tokenizer.json())
        .reduce((a, b) => Object.assign(a, b), {});
    }

    if (tokenFilters.length) {
      analysis.filter = tokenFilters
        .map(tokenFilter => tokenFilter.json())
        .reduce((a, b) => Object.assign(a, b), {});
    }

    if (charFilters.length) {
      analysis.char_filter = charFilters
        .map(charFilter => charFilter.json())
        .reduce((a, b) => Object.assign(a, b), {});
    }

    body.settings.analysis = analysis;
  }

  if (indexAlias && searchAlias) {
    const aliases = {};
    aliases[indexAlias] = {};
    aliases[searchAlias] = {};
    body.aliases = aliases;
  }

  json.body = body;
  return json;
};

Index.isInstance = function (...args) {
  return typeChecker.isInstance(args, value =>
    value && Function.isInstance(value.getIndexAlias));
};

Index.Builder = function () {
  const index = new Index();

  return {
    withName(name) {
      index.setName(name);
      return this;
    },

    withNumberOfShards(number) {
      index.setNumberOfShards(number);
      return this;
    },

    withNumberOfReplicas(number) {
      index.setNumberOfReplicas(number);
      return this;
    },

    withIndexAlias(alias) {
      index.setIndexAlias(alias);
      return this;
    },

    withSearchAlias(alias) {
      index.setSearchAlias(alias);
      return this;
    },

    withMapping(mapping) {
      index.setMapping(mapping);
      return this;
    },

    withReindexScrollQuery(query) {
      index.setReindexScrollQuery(query);
      return this;
    },

    withAnalyzers(analyzers) {
      index.setAnalyzers(analyzers);
      return this;
    },

    addAnalyzers(analyzers) {
      index.addAnalyzers(analyzers);
      return this;
    },

    build() {
      return index;
    },
  };
};

Index.newBuilder = function () {
  return Index.Builder();
};

Index.INDEX_ALIAS_KEY = 'indexAlias';
Index.NAME_KEY = 'name';
Index.REINDEX_SCROLL_QUERY_KEY = 'reindexScrollQuery';
Index.SEARCH_ALIAS_KEY = 'searchAlias';
module.exports = Index;
