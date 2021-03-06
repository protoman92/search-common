// @flow

const { utils } = require('../../../../node-common/lib/util');

function TokenFilter() {}

TokenFilter.Default = function () {
  const defaults = {};
  const types = TokenFilter.Type;

  for (const key in types) {
    const type = types[key];

    defaults[key] = TokenFilter.newBuilder()
      .withDefaultValues(type.value)
      .build();
  }

  defaults.TRIGRAMS = TokenFilter.newBuilder()
    .withName('trigrams')
    .withType(TokenFilter.Type.N_GRAM)
    .withAdditionalSettings(function () {
      const settings = {};
      settings[TokenFilter.Type.N_GRAM.MIN_GRAM] = 3;
      settings[TokenFilter.Type.N_GRAM.MAX_GRAM] = 3;
      return settings;
    }());


  return defaults;
};

TokenFilter.Type = {
  /**
   * Converts alphabetic, numeric, and symbolic Unicode characters which are
   * not in the first 127 ASCII characters (the "Basic Latin" Unicode block)
   * into their ASCII equivalents.
   * @param {Object} ASCII_FOLDING token filter.
   */
  ASCII_FOLDING: {
    value: 'asciifolding',

    /**
     * If this is set to true, the token filter will emit the original token
     * as well as the folded one. Default is false.
     * @param {Object} PRESERVE_ORIGINAL setting.
     */
    PRESERVE_ORIGINAL: {
      value: 'preserve_original',
    },
  },

  EDGE_N_GRAM: {
    value: 'edgeNGram',

    /**
     * Defaults to 1.
     * @param {Object} MIN_GRAM setting.
     */
    MIN_GRAM: {
      value: 'min_gram',
    },

    /**
     * Defaults to 2.
     * @param {Object} MAX_GRAM setting.
     */
    MAX_GRAM: {
      value: 'max_gram',
    },
  },

  /**
   * Case folding of Unicode characters based on UTR#30. Prefer this to ASCII-FOLDING.
   * @param {Object} ICU_FOLDING token filter.
   */
  ICU_FOLDING: {
    value: 'icu_folding',
  },

  /**
   * Removes words that are too long or too short for the stream.
   * @param {Object} LENGTH token filter.
   */
  LENGTH: {
    value: 'length',

    MIN: {
      value: 'min',
    },

    /**
     * Defaults to Integer.MAX_VALUE.
     * @param {Object} MAX setting.
     */
    MAX: {
      value: 'max',
    },
  },

  /**
   * Normalizes token text to lower case.
   * @param {Object} LOWERCASE token filter.
   */
  LOWERCASE: {
    value: 'lowercase',
  },

  N_GRAM: {
    value: 'nGram',

    /**
     * Defaults to 1.
     * @param {Object} MIN_GRAM setting.
     */
    MIN_GRAM: {
      value: 'min_gram',
    },

    /**
     * Defaults to 2.
     * @param {Object} MAX_GRAM setting.
     */
    MAX_GRAM: {
      value: 'max_gram',
    },
  },

  /**
   * Placeholder token filter.
   * @param {Object} STANDARD token filter.
   */
  STANDARD: {
    value: 'standard',
  },

  /**
   * Removes stop words from token streams.
   * @param {Object} STOP token filter.
   */
  STOP: {
    value: 'stop',

    /**
     * Set to false in order to not ignore the last term of a search if it is a stop word.
     * This is very useful for the completion suggester as a query like green a can be
     * extended to green apple even though you remove stop words in general. Defaults to true.
     * @param {Object} REMOVE_TRAILING setting.
     */
    REMOVE_TRAILING: {
      value: 'remove_trailing',
    },

    /**
     * A list of stop words to use. Defaults to _english_ stop words.
     * @param {Object} STOPWORDS setting.
     */
    STOPWORDS: {
      value: 'stopwords',
    },

    /**
     * A path (either relative to config location, or absolute) to a stopwords
     * file configuration. Each stop word should be in its own "line"
     * (separated by a line break). The file must be UTF-8 encoded.
     * @param {Object} STOPWORDS_PATH setting.
     */
    STOPWORDS_PATH: {
      value: 'stopwords_path',
    },
  },
};

/**
 * The TokenFilter's name.
 * @param {String} The TokenFilter's name.
 */
TokenFilter.prototype.name = '';

/**
 * The TokenFilter's type.
 * @param {String} The TokenFilter's type.
 */
TokenFilter.prototype.type = '';

/**
 * Additional settings for this TokenFilter.
 * @param {Object} Additional settings for this TokenFilter.
 */
TokenFilter.prototype.additionalSettings = {};

TokenFilter.prototype.setName = function (name) {
  if (String.isInstance(name)) {
    this.name = name;
  }

  return this;
};

TokenFilter.prototype.setType = function (type) {
  if (String.isInstance(type)) {
    this.type = type;
  }

  return this;
};

TokenFilter.prototype.setAdditionalSettings = function (settings) {
  if (settings && utils.isNotEmpty(settings)) {
    this.additionalSettings = settings;
  }

  return this;
};

TokenFilter.prototype.getName = function () {
  return this.name || '';
};

TokenFilter.prototype.getType = function () {
  return this.type || '';
};

TokenFilter.prototype.getAdditionalSettings = function () {
  return this.additionalSettings || {};
};

TokenFilter.prototype.hasAllRequiredInformation = function () {
  switch (true) {
    case this.getName().isEmpty():
    case this.getType().isEmpty():
      Error.debugException();
      return false;

    default:
      break;
  }

  return true;
};

TokenFilter.prototype.json = function () {
  const json = {};
  const inner = { type: this.getType() };

  const additionalSettings = this.getAdditionalSettings();

  if (utils.isNotEmpty(additionalSettings)) {
    Object.assign(inner, additionalSettings);
  }

  json[this.getName()] = inner;
  return json;
};

TokenFilter.prototype.requiresSeparateRegistry = function () {
  return this.getName() != this.getType();
};

TokenFilter.Builder = function () {
  const tokenFilter = new TokenFilter();

  return {
    withDefaultValues(defValue) {
      return this
        .withName(defValue)
        .withType(defValue);
    },

    withName(name) {
      tokenFilter.setName(name);
      return this;
    },

    withType(type) {
      tokenFilter.setType(type);
      return this;
    },

    withAdditionalSettings(settings) {
      tokenFilter.setAdditionalSettings(settings);
      return this;
    },

    withAdditionalSettingsFunction(fcn) {
      if (Function.isInstance(fcn)) {
        return this.withAdditionalSettings(fcn());
      }

      return this;
    },

    build() {
      return tokenFilter;
    },
  };
};

TokenFilter.newBuilder = function () {
  return TokenFilter.Builder();
};

module.exports = TokenFilter;
