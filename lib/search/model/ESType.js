const Field = require('./ESField.js');
const { utils, typeChecker } = require('../../../../node-common/lib/util');

function Type() {}

Type.DynamicMode = {
  FULL: {
    value: true,
  },

  NONE: {
    value: false,
  },

  STRICT: {
    value: 'strict',
  },
};

/**
 * The name of the type.
 * @param {String} The type's name.
 */
Type.prototype.name = '';

/**
 * An array of Field items.
 * @param {Array} An array of Field items.
 */
Type.prototype.fields = [];

/**
 * Enable or disable the _all field. This field indexes values from all
 * other fields into one big string.
 * @param {Boolean} Whether to enable or disable _all.
 */
Type.prototype.allEnabled = false;

/**
 * Enable or disable default 'include_in_all' for child fields.
 * @param {Boolean} Enable or disable 'include_in_all' for child fields.
 */
Type.prototype.includeInAll = false;

/**
 * Enable or disable dynamic mapping for this type. If set to strict,
 * unknown fields, when indexed, will throw an Exception. We can set
 * this mode to 'strict' at the type level, and set to true for certain
 * fields.
 * @param {object} true, false or 'strict'.
 */
Type.prototype.dynamicMode = Type.DynamicMode.NONE.value;

/**
 * Enable or disable _source. _source contains the entire document.
 * @param {Boolean} Whether to enable or disable _source.
 */
Type.prototype.sourceEnabled = true;

/**
 * Specify a parent type to enable parent-child relationship.
 * @param {String} The parent type.
 */
Type.prototype.parent = '';

Type.prototype.setName = function (name) {
  if (String.isInstance(name) && name) {
    this.name = name;
  }

  return this;
};

Type.prototype.setAllEnabled = function (enabled) {
  this.allEnabled = Boolean.cast(enabled);
  return this;
};

Type.prototype.setIncludeInAll = function (enabled) {
  this.includeInAll = Boolean.cast(enabled);
  return this;
};

Type.prototype.setSourceEnabled = function (enabled) {
  this.sourceEnabled = Boolean.cast(enabled);
  return this;
};

Type.prototype.setDynamicMode = function (mode) {
  if (typeChecker.isInstanceOfClasses(mode, String, Boolean)) {
    this.dynamicMode = mode;
  }

  return this;
};

Type.prototype.setFields = function (fields) {
  if (Array.isInstance(fields) && fields.length) {
    this.fields = fields;
  }

  return this;
};

Type.prototype.setParent = function (parent) {
  if (parent && String.isInstance(parent)) {
    this.parent = parent;
  }

  return this;
};

Type.prototype.getName = function () {
  return this.name || '';
};

Type.prototype.getDynamicMode = function () {
  return this.dynamicMode || false;
};

Type.prototype.getFields = function () {
  return this.fields || [];
};

Type.prototype.getParent = function () {
  return this.parent || '';
};

Type.prototype.shouldEnableAll = function () {
  return this.allEnabled || false;
};

Type.prototype.shouldEnableSource = function () {
  return this.sourceEnabled || true;
};

Type.prototype.shouldIncludeInAll = function () {
  return this.includeInAll || false;
};

Type.prototype.hasAllRequiredInformation = function () {
  switch (true) {
    case this.getName().isEmpty():
    case this.getFields().length === 0:
    case this.getFields().filter(field =>
      !field.hasAllRequiredInformation()).length:
      Error.debugException();
      return false;

    default:
      break;
  }

  return true;
};

Type.prototype.json = function () {
  const json = {};

  const inner = {
    dynamic: this.getDynamicMode(),

    properties: this.getFields()
      .filter(field => field.hasAllRequiredInformation())
      .map(field => field.json())
      .reduce((a, b) => Object.assign(a, b), {}),

    include_in_all: this.shouldIncludeInAll(),

    _all: {
      enabled: this.shouldEnableAll(),
    },

    _source: {
      enabled: this.shouldEnableSource(),
    },
  };

  const parent = this.getParent();

  if (parent) {
    inner._parent = { type: parent };
  }

  json[this.getName()] = inner;
  return json;
};

Type.Builder = function () {
  const type = new Type();

  return {
    withName(name) {
      type.setName(name);
      return this;
    },

    withFields(fields) {
      type.setFields(fields);
      return this;
    },

    withDynamicMode(mode) {
      type.setDynamicMode(mode);
      return this;
    },

    withParent(parent) {
      type.setParent(parent);
      return this;
    },

    shouldEnableAll(enabled) {
      type.setAllEnabled(enabled);
      return this;
    },

    shouldEnableSource(enabled) {
      type.setSourceEnabled(enabled);
      return this;
    },

    shouldIncludeInAll(enabled) {
      type.setIncludeInAll(enabled);
      return this;
    },

    withTypeData(data) {
      const fields = [];

      if (data && data.properties) {
        const properties = data.properties;
        const keys = utils.getKeys(properties);

        for (let i = 0, length = keys.length; i < length; i++) {
          const key = keys[i];
          const val = properties[key];

          const field = Field.newBuilder()
            .withName(key)
            .withFieldData(val)
            .build();

          if (field.hasAllRequiredInformation()) {
            fields.push(field);
          }
        }
      }

      return this
        .withFields(fields)
        .withDynamicMode(data.dynamic)
        .shouldEnableAll((data._all || {}).enabled)
        .shouldIncludeInAll(data.include_in_all);
    },

    build() {
      return type;
    },
  };
};

Type.newBuilder = function () {
  return Type.Builder();
};

module.exports = Type;
