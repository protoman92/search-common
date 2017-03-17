const { utils } = require('../../../../node-common/lib/util');

function Analyzer() {}

/**
 * The name of the Analyzer.
 * @type {String} The name of the analyzer.
 */
Analyzer.prototype.name = '';

/**
 * The Analyzer's type.
 * @type {String} The analyzer type.
 */
Analyzer.prototype.type = '';

/**
 * The Analyzer's Tokenizer. Should be an object of type Tokenizer.
 * @type {Object} The Analyzer's Tokenizer.
 */
Analyzer.prototype.tokenizer = {};

/**
 * The Analyzer's Token Filters. Should be an Array of type TokenFilter.
 * @type {Array} The Analyzer's Token Filters.
 */
Analyzer.prototype.tokenFilters = [];

/**
 * The Analyzer Char Filters. Should be an Array of type CharFilter.
 * @type {Array} The Analyzer's Char Filters.
 */
Analyzer.prototype.charFilters = [];

Analyzer.Constant = {
  ICU_ANALYZER: {
    value: 'icu-analyzer',
  },
};

Analyzer.Type = {
  CUSTOM: {
    value: 'custom',
    isCustom: true,
  },

  SIMPLE: {
    value: 'simple',
  },

  STANDARD: {
    value: 'standard',
  },
};

Analyzer.Default = function () {
  const defaults = {};
  const types = Analyzer.Type;

  const {
    Tokenizer,
    TokenFilter,
  } = require('..')();

  for (const key in types) {
    const type = types[key];

    if (!type.isCustom) {
      defaults[key] = Analyzer.newBuilder()
        .withDefaultValues(type.value)
        .build();
    }
  }

  defaults.ICU = Analyzer.newBuilder()
    .withName(Analyzer.Constant.ICU_ANALYZER.value)
    .withTokenizer(Tokenizer.Default().ICU)
    .withTokenFilters([TokenFilter.Default().ICU_FOLDING])
    .build();

  return defaults;
};

Analyzer.prototype.setName = function (name) {
  if (String.isInstance(name)) {
    this.name = name;
  }

  return this;
};

Analyzer.prototype.setType = function (type) {
  if (String.isInstance(type)) {
    this.type = type;
  }

  return this;
};

Analyzer.prototype.setTokenizer = function (tokenizer) {
  if (tokenizer && utils.isNotEmpty(tokenizer)) {
    this.tokenizer = tokenizer;
  }

  return this;
};

Analyzer.prototype.setTokenFilters = function (filters) {
  if (filters && filters.length) {
    this.tokenFilters = filters;
  }

  return this;
};

Analyzer.prototype.setCharFilters = function (filters) {
  if (filters && filters.length) {
    this.charFilters = filters;
  }

  return this;
};

Analyzer.prototype.getName = function () {
  return this.name || '';
};

Analyzer.prototype.getType = function () {
  return this.type || '';
};

Analyzer.prototype.getTokenizer = function () {
  return this.tokenizer || {};
};

Analyzer.prototype.getTokenFilters = function () {
  return this.tokenFilters || [];
};

Analyzer.prototype.getCharFilters = function () {
  return this.charFilters || [];
};

Analyzer.prototype.hasAllRequiredInformation = function () {
  switch (true) {
    case this.getName().isEmpty():
      Error.debugException();
      return false;

    default:
      break;
  }

  return true;
};

/**
 * If this Analyzer is a default one, we do not need to register it under 'analysis'.
 * @return {Boolean} Whether this Analyzer requires separate registry.
 */
Analyzer.prototype.requiresSeparateRegistry = function () {
  return this.getName() !== this.getType();
};

Analyzer.prototype.json = function () {
  const tokenFilters = this.getTokenFilters();
  const charFilters = this.getCharFilters();
  const tokenizer = this.getTokenizer();
  const type = this.getType();
  const json = {};
  const inner = {};

  if (type) {
    inner.type = type;
  }

  if (utils.isNotEmpty(tokenizer)) {
    inner.tokenizer = this.getTokenizer().getName();
  }

  if (tokenFilters && tokenFilters.length) {
    inner.filter = tokenFilters.map(filter => filter.name);
  }

  if (charFilters && charFilters.length) {
    inner.char_filter = charFilters.map(filter => filter.name);
  }

  json[this.getName()] = inner;
  return json;
};

Analyzer.Builder = function () {
  const analyzer = new Analyzer();

  return {
    withDefaultValues(defValue) {
      return this
        .withName(defValue)
        .withType(defValue);
    },

    withAnalyzer(analyzer) {
      if (analyzer) {
        return this
          .withType(analyzer.type)
          .withTokenizer(analyzer.tokenizer)
          .withTokenFilters(analyzer.tokenFilters)
          .withCharFilters(analyzer.charFilters);
      }

      return this;
    },

    withName(name) {
      analyzer.setName(name);
      return this;
    },

    withType(type) {
      analyzer.setType(type);
      return this;
    },

    withTokenizer(tokenizer) {
      analyzer.setTokenizer(tokenizer);
      return this;
    },

    withTokenFilters(filters) {
      analyzer.setTokenFilters(filters);
      return this;
    },

    withCharFilters(filters) {
      analyzer.setCharFilters(filters);
      return this;
    },

    build() {
      return analyzer;
    },
  };
};

Analyzer.newBuilder = function () {
  return Analyzer.Builder();
};

Analyzer.NAME_KEY = 'name';

module.exports = Analyzer;
