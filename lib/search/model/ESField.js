const Analyzer = require('./ESAnalyzer.js');
const version = require('../version.js');
const { typeChecker, utils } = require('../../../../node-common/lib/util');

function Field() {}

Field.IndexMode = {
  ANALYZED: {
    /**
     * In ES 2.x, the correct value is 'analyzed'. However, it changed
     * to 'true' ({@link Boolean}) in 5.x.
     */
    value: (function () {
      return version.isVersion5x() ? true : 'analyzed';
    }()),
  },

  NOT_ANALYZED: {
    /**
     * In ES 2.x, the correct value is 'not_analyzed'. However, it changed
     * to 'false' ({@link Boolean}) in 5.x.
     */
    value: (function () {
      return version.isVersion5x() ? false : 'not_analyzed';
    }()),
  },

  /**
   * Depreciated in 5.x.
   */
  NONE: {
    value: 'no',
  },
};

/**
 * For KEYWORD and TEXT fields, we need a raw field because their values are
 * the same for ES 2.x.
 */
Field.Type = {
  allValues() {
    const types = this;
    const keys = utils.getKeys(types);
    return keys.map(key => types[key]).filter(type => type.value);
  },

  fromValue(value) {
    return this.allValues()
      .filter(type => type.raw === value || type.value === value)[0];
  },

  BOOLEAN: {
    value: 'boolean',
  },

  COMPLETION: {
    value: 'completion',
    isCompletionField: true,
  },

  DATE: {
    value: 'date',
  },

  DOUBLE: {
    value: 'double',
  },

  INTEGER: {
    value: 'integer',
  },

  LONG: {
    value: 'long',
  },

  OBJECT: {
    value: 'object',
    isObjectField: true,
  },

  NESTED: {
    value: 'nested',
    isNestedField: true,
  },

  KEYWORD: {
    value: 'keyword',

    /**
     * Keyword field does not exist in version 2.x.
     */
    raw: (function () {
      return version.isVersion5x() ? 'keyword' : 'string';
    }()),
  },

  TEXT: {
    value: 'text',

    /**
     * Text field does not exist in version 2.x.
     */
    raw: (function () {
      return version.isVersion5x() ? 'text' : 'string';
    }()),

    isAnalyzableField: true,
  },
};

/**
 * The {@link Field}'s name.
 */
Field.prototype.name = '';

/**
 * Enable multifields if this object is not empty. This should be an
 * {@link Array} of type {@link Field}.
 */
Field.prototype.fields = [];

/**
 * Whether or not this field is part of another field. If this is set to
 * true, we need to disable certain settings, such as {@link #include_in_all}.
 * @type {Boolean} Whether this is a multifield or not.
 */
Field.prototype.multifield = false;

/**
 * Enable or disable {@link #include_in_all}.
 */
Field.prototype.includeInAll = true;

/**
 * The {@link Field}'s index mode. Either 'analyzed' or 'not_analyzed'.
 */
Field.prototype.indexMode = Field.IndexMode.NOT_ANALYZED.value;

/**
 * The index analyzer to use. This analyzer will tokenize and filter
 * incoming texts at index time. Only works with text fields.
 */
Field.prototype.indexAnalyzer = '';

/**
 * The search analyzer to use. This field defaults to the index analyzer
 * if not specified.
 */
Field.prototype.searchAnalyzer = '';

/**
 * Whether or not to preserve separators. If this is set to false, a search
 * for 'foof' may return 'Foo Fighters'.
 */
Field.prototype.preserveSeparator = true;

/**
 * Whether or not to preserve position increments. If this is set to false
 * and a stopword analyzer is used, a query for 'b' may match a field with
 * 'The Beatles'
 */
Field.prototype.preservePositionIncrements = true;

/**
 * The {@link Field}'s type.
 */
Field.prototype.type = Field.Type.TEXT.value;

Field.prototype.setName = function (name) {
  if (String.isInstance(name) && name) {
    this.name = name;
  }

  return this;
};

Field.prototype.setFields = function (fields) {
  if (Array.isInstance(fields) && fields.length) {
    this.fields = fields;
  }

  return this;
};

Field.prototype.addField = function (field) {
  if (Field.isInstance(field) && field.hasAllRequiredInformation()) {
    this.getFields().push(field);
  }

  return this;
};

Field.prototype.addFields = function (fields) {
  if (Array.isInstance(fields) && fields.length) {
    this.fields = this.getFields().concat(fields);
  }

  return this;
};

Field.prototype.setType = function (type) {
  if (String.isInstance(type) && type) {
    this.type = type;
  }

  return this;
};

Field.prototype.setIncludeInAll = function (enabled) {
  this.includeInAll = Boolean.cast(enabled);
  return this;
};

Field.prototype.setIndexAnalyzer = function (analyzer) {
  if (String.isInstance(analyzer)) {
    this.indexAnalyzer = analyzer;
  } else if (Object.isInstance(analyzer)) {
    return this.setIndexAnalyzer(analyzer[Analyzer.NAME_KEY]);
  }

  return this;
};

Field.prototype.setSearchAnalyzer = function (analyzer) {
  if (String.isInstance(analyzer)) {
    this.searchAnalyzer = analyzer;
  } else if (Object.isInstance(analyzer)) {
    return this.setSearchAnalyzer(analyzer[Analyzer.NAME_KEY]);
  }

  return this;
};

Field.prototype.setPreserveSeparator = function (enabled) {
  this.preserveSeparator = Boolean.cast(enabled);
  return this;
};

Field.prototype.setPreservePositionIncrements = function (enabled) {
  this.preservePositionIncrements = Boolean.cast(enabled);
  return this;
};

Field.prototype.setIndexMode = function (mode) {
  if (mode !== undefined && mode !== null) {
    this.indexMode = mode;
  }

  return this;
};

Field.prototype.setIsMultifield = function (isMultifield) {
  this.multifield = Boolean.cast(isMultifield);
  return this;
};

Field.prototype.getName = function () {
  return this.name || '';
};

Field.prototype.getFields = function () {
  return this.fields || [];
};

Field.prototype.getIndexAnalyzer = function () {
  return this.indexAnalyzer || '';
};

Field.prototype.getSearchAnalyzer = function () {
  return this.searchAnalyzer || '';
};

Field.prototype.getType = function () {
  return this.type || '';
};

Field.prototype.getIndexMode = function () {
  return this.indexMode || Field.IndexMode.NOT_ANALYZED.value;
};

Field.prototype.isMultifield = function () {
  return this.multifield || false;
};

Field.prototype.shouldIncludeInAll = function () {
  return this.includeInAll || true;
};

Field.prototype.shouldPreserveSeparator = function () {
  return this.preserveSeparator || true;
};

Field.prototype.shouldPreservePositionIncrements = function () {
  return this.preservePositionIncrements || true;
};

Field.prototype.hasAllRequiredInformation = function () {
  switch (true) {
    case this.getName().isEmpty():
    case this.getType().isEmpty():
      Error.debugException(this);
      return false;

    default:
      break;
  }

  return true;
};

Field.prototype.json = function () {
  const json = {};
  const inner = {};

  const type = Field.Type.fromValue(this.getType());

  if (!this.isMultifield()) {
    inner.include_in_all = this.shouldIncludeInAll();
  }

  if (type) {
    const fields = this.getFields();
    const indexAnalyzer = this.getIndexAnalyzer();
    const searchAnalyzer = this.getSearchAnalyzer();

    /**
     * type.raw applies to KEYWORD and TEXT fields. Other field types do
     * not have this field, so we default to type.value.
     */
    inner.type = type.raw || type.value;

    if (type.isAnalyzableField) {
      inner.index = this.getIndexMode();

      if (indexAnalyzer) {
        inner.analyzer = indexAnalyzer;
      }

      if (searchAnalyzer) {
        inner.search_analyzer = searchAnalyzer;
      }
    } else if (type.isCompletionField) {
      inner.preserve_separators = this.shouldPreserveSeparator();

      inner.preserve_position_increments =
        this.shouldPreservePositionIncrements();
    }

    if (fields.length) {
      const multifields = fields
        .filter(field => Field.isInstance(field))
        .filter(field => field.hasAllRequiredInformation())
        .map(field => field.json())
        .reduce((a, b) => Object.assign(a, b), {});

      /**
       * A field of type nested does not have multifields.
       */
      if (type.isNestedField || type.isObjectField) {
        inner.properties = multifields;
      } else {
        inner.fields = multifields;
      }
    }
  }

  json[this.getName()] = inner;
  return json;
};

Field.Builder = function () {
  const instance = new Field();

  return {
    withName(name) {
      instance.setName(name);
      return this;
    },

    withFields(fields) {
      instance.setFields(fields);
      return this;
    },

    withIndexMode(mode) {
      instance.setIndexMode(mode);
      return this;
    },

    withIndexAnalyzer(analyzer) {
      instance.setIndexAnalyzer(analyzer);
      return this;
    },

    withSearchAnalyzer(analyzer) {
      instance.setSearchAnalyzer(analyzer);
      return this;
    },

    withType(type) {
      instance.setType(type);
      return this;
    },

    addField(field) {
      instance.addField(field);
      return this;
    },

    addFields(fields) {
      instance.addFields(fields);
      return this;
    },

    isMultifield(isMultifield) {
      instance.setIsMultifield(isMultifield);
      return this;
    },

    shouldIncludeInAll(enabled) {
      instance.setIncludeInAll(enabled);
      return this;
    },

    shouldPreserveSeparator(enabled) {
      instance.setPreserveSeparator(enabled);
      return this;
    },

    shouldPreservePositionIncrements(enabled) {
      instance.setPreservePositionIncrements(enabled);
      return this;
    },

    withFieldData(data) {
      if (data) {
        return this
          .withType(data.type)
          .withIndexAnalyzer(data.analyzer)
          .withSearchAnalyzer(data.search_analyzer)
          .shouldIncludeInAll(data.include_in_all);
      }

      return this;
    },

    build() {
      return instance;
    },
  };
};

Field.newBuilder = function () {
  return Field.Builder();
};

Field.isInstance = function (...args) {
  return typeChecker.isInstance(args, value => value instanceof Field);
};

module.exports = Field;
