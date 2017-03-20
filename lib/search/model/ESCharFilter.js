// @flow

const { utils } = require('../../../../node-common/lib/util');

function CharFilter() {
  /**
   * The {@link CharFilter}'s name.
   */
  this.name = '';

  /**
   * The {@link CharFilter}'s type.
   */
  this.type = '';

  /**
   * Additional settings for this {@link CharFilter}.
   * @type {Object} Additional settings for this CharFilter.
   */
  this.additionalSettings = {};
}

CharFilter.Default = function () {
  const defaults = {};
  const types = CharFilter.Type;

  for (const key in types) {
    const type = types[key];

    defaults[key] = CharFilter.newBuilder()
      .withDefaultValues(type.value)
      .build();
  }

  return defaults;
};

CharFilter.Type = {
  /**
   * Strips out and decodes HTML elements/entities.
   * @type {Object}
   */
  HTML_STRIP: {
    value: 'html_strip',
  },

  /**
   * Replace words with other words. The replacement pairs must be specified either in
   * an array of mapping or a mapping file.
   * @type {Object} MAPPING CharFilter type.
   */
  MAPPING: {
    value: 'mapping',

    /**
     * An array of mappings, with each element having the form key => value.
     * @type {Object} MAPPINGS setting.
     */
    MAPPINGS: {
      value: 'mappings',
    },

    /**
     * A path, either absolute or relative to the config directory, to a UTF-8 encoded
     * text mappings file containing a key => value mapping per line.
     * @type {Object} MAPPINGS_PATH setting.
     */
    MAPPINGS_PATH: {
      value: 'mappings_path',
    },
  },
};

CharFilter.prototype.setName = function (name) {
  if (String.isInstance(name)) {
    this.name = name;
  }

  return this;
};

CharFilter.prototype.setType = function (type) {
  if (String.isInstance(type)) {
    this.type = type;
  }

  return this;
};

CharFilter.prototype.setAdditionalSettings = function (settings) {
  if (settings && utils.isNotEmpty(settings)) {
    this.additionalSettings = settings;
  }

  return this;
};

CharFilter.prototype.getName = function () {
  return this.name || '';
};

CharFilter.prototype.getType = function () {
  return this.type || '';
};

CharFilter.prototype.getAdditionalSettings = function () {
  return this.additionalSettings || {};
};

CharFilter.prototype.hasAllRequiredInformation = function () {
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

CharFilter.prototype.json = function () {
  const json = {};
  const inner = { type: this.getType() };

  const additionalSettings = this.getAdditionalSettings();

  if (utils.isNotEmpty(additionalSettings)) {
    Object.assign(inner, additionalSettings);
  }

  json[this.getName()] = inner;
  return json;
};

CharFilter.prototype.requiresSeparateRegistry = function () {
  return this.getName() !== this.getType();
};

CharFilter.Builder = function () {
  const charFilter = new CharFilter();

  return {
    withDefaultValues(defValue) {
      return this
        .withName(defValue)
        .withType(defValue);
    },

    withName(name) {
      charFilter.setName(name);
      return this;
    },

    withType(type) {
      charFilter.setType(type);
      return this;
    },

    withAdditionalSettings(settings) {
      charFilter.setAdditionalSettings(settings);
      return this;
    },

    withAdditionalSettingsFunction(fcn) {
      if (Function.isInstance(fcn)) {
        return this.withAdditionalSettings(fcn());
      } else {
        return this;
      }
    },

    build() {
      return charFilter;
    },
  };
};

CharFilter.newBuilder = function () {
  return CharFilter.Builder();
};

module.exports = CharFilter;
