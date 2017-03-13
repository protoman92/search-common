const { utils } = require('../../../../node-common/handlers/util');

function Tokenizer() {}

Tokenizer.Default = function () {
  const defaults = {};
  const types = Tokenizer.Type;

  for (const key in types) {
    const type = types[key];

    defaults[key] = Tokenizer.newBuilder()
      .withDefaultValues(type.value)
      .build();
  }

  return defaults;
};

Tokenizer.Type = {
	// Full text tokenizers.
  STANDARD: {
    value: 'standard',
  },

  ICU: {
    value: 'icu_tokenizer',
  },

  LOWERCASE: {
    value: 'lowercase',
  },

  UAX_URL_EMAIL: {
    value: 'uax_url_email',
  },

  WHITE_SPACE: {
    value: 'whitespace',
  },

  // Parial text tokenizers.
  EDGE_N_GRAM: {
    value: 'edge_ngram',

    /**
     * Mininum length of characters in a gram. Defaults to 1.
     * @type {String} The 'min-gram' settings key.
     */
    MIN_GRAM: {
      value: 'min_gram',
    },

    /**
     * Maximum length of characters in a gram. Defaults to 2. However, the default
     * value is almost universally useless.
     * @type {String} The 'max-gram' settings key.
     */
    MAX_GRAM: {
      value: 'max_gram',
    },

    /**
     * Characters classes that will be included in a token. ElasticSearch will
     * split on characters that don't belong to the classes specified.
     * @type {String}
     */
    TOKEN_CHARS: {
      value: 'token_chars',
    },
  },

  N_GRAM: {
    value: 'ngram',
  },

  // Structured text tokenizers.
  KEYWORD: {
    value: 'keyword',
  },
};

/**
 * The Tokenizer's name.
 * @type {String} The Tokenizer's name.
 */
Tokenizer.prototype.name = '';

/**
 * The Tokenizer's type.
 * @type {String} The Tokenizer's type.
 */
Tokenizer.prototype.type = '';

/**
 * Additional settings for this Tokenizer.
 * @type {Object} Additional settings.
 */
Tokenizer.prototype.additionalSettings = {};

Tokenizer.prototype.setName = function (name) {
  if (String.isInstance(name)) {
    this.name = name;
  }

  return this;
};

Tokenizer.prototype.setType = function (type) {
  if (String.isInstance(type)) {
    this.type = type;
  }

  return this;
};

Tokenizer.prototype.setAdditionalSettings = function (settings) {
  if (settings && utils.isNotEmpty(settings)) {
    this.additionalSettings = settings;
  }

  return this;
};

Tokenizer.prototype.getName = function () {
  return this.name || '';
};

Tokenizer.prototype.getType = function () {
  return this.type || '';
};

Tokenizer.prototype.getAdditionalSettings = function () {
  return this.additionalSettings || {};
};

Tokenizer.prototype.hasAllRequiredInformation = function () {
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

/**
 * If this Tokenizer is a default one, we do not need to register it under
 * 'analysis'.
 * @return {Boolean} Whether this Tokenizer requires separate registry.
 */
Tokenizer.prototype.requiresSeparateRegistry = function () {
  return this.getName() != this.getType();
};

Tokenizer.prototype.json = function () {
  let
    json = {},
    inner = {
      type: this.getType(),
    };

  const additionalSettings = this.getAdditionalSettings();

  if (utils.isNotEmpty(additionalSettings)) {
    Object.assign(inner, additionalSettings);
  }

  json[this.getName()] = inner;
  return json;
};

Tokenizer.Builder = function () {
  const tokenizer = new Tokenizer();

  return {
    withDefaultValues(defValue) {
      return this
        .withName(defValue)
        .withType(defValue);
    },

    withName(name) {
      tokenizer.setName(name);
      return this;
    },

    withType(type) {
      tokenizer.setType(type);
      return this;
    },

    withAdditionalSettings(settings) {
      tokenizer.setAdditionalSettings(settings);
      return this;
    },

    withAdditionalSettingsFunction(fcn) {
      if (Function.isInstance(fcn)) {
        return this.withAdditionalSettings(fcn());
      }

      return this;
    },

    build() {
      return tokenizer;
    },
  };
};

Tokenizer.newBuilder = function () {
  return Tokenizer.Builder();
};

module.exports = Tokenizer;
