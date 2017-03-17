const { typeChecker, utils } = require('../../../../node-common/lib/util');

function Sort() {}

Sort.Order = {
  allValues() {
    const instance = this;

    return utils.getKeys(instance)
      .map(key => instance[key])
      .filter(val => val && val.value);
  },

  allOrderValues() {
    return this.allValues().map(val => val.value);
  },

  ASCENDING: {
    value: 'asc',

    order: (a, b) => a - b,
  },

  DESCENDING: {
    value: 'desc',

    order: (a, b) => b - a,
  },
};

Sort.Mode = {
  allValues() {
    const instance = this;

    return utils.getKeys(instance)
      .map(key => instance[key])
      .filter(val => val && val.value);
  },

  allModeValues() {
    return this.allValues().map(val => val.value);
  },

  AVERAGE: {
    value: 'avg',

    method: array => Math.mean(array),
  },

  MAXIMUM: {
    value: 'max',

    method: array => Math.maximum(array),
  },

  /**
   * In certain ElasticSearch version, median is not supported, so we need
   * to be careful when using this in production.
   */
  // MEDIAN: {
  //   value: 'median',

  //   method: array => Math.median(array),
  // },

  MINIMUM: {
    value: 'min',

    method: array => Math.minimum(array),
  },

  SUM: {
    value: 'sum',

    method: array => Math.sum(array),
  },
};

/**
 * The field to be sorted on.
 * @type {String} The sorted field name.
 */
Sort.prototype.field = '';

/**
 * The sort order. Can be either ascending (asc) or descending (desc).
 * @type {String} The sort order.
 */
Sort.prototype.order = Sort.Order.ASCENDING.value;

/**
 * The sort mode. Can be average (avg), minimum (min), maximum (max),
 * summation (sum) or median (median).
 * @type {String} The sort mode.
 */
Sort.prototype.mode = Sort.Mode.AVERAGE.value;

/**
 * Use with nested objects to identify where to sort from.
 * @type {String} The sort's nested path.
 */
Sort.prototype.nestedPath = '';

Sort.prototype.setFieldName = function (field) {
  if (field && String.isInstance(field)) {
    this.field = field;
  }

  return this;
};

Sort.prototype.setOrder = function (order) {
  if (order && String.isInstance(order)) {
    this.order = order;
  }

  return this;
};

Sort.prototype.setMode = function (mode) {
  if (mode && String.isInstance(mode)) {
    this.mode = mode;
  }

  return this;
};

Sort.prototype.setNestedPath = function (path) {
  if (path && String.isInstance(path)) {
    this.nestedPath = path;
  }

  return this;
};

Sort.prototype.getFieldName = function () {
  return this.field || '';
};

Sort.prototype.getOrder = function () {
  return this.order || '';
};

Sort.prototype.getMode = function () {
  return this.mode || '';
};

Sort.prototype.getNestedPath = function () {
  return this.nestedPath || '';
};

Sort.prototype.hasAllRequiredInformation = function () {
  switch (true) {
    case this.getFieldName().isEmpty():
    case this.getOrder().isEmpty():
    case this.getMode().isEmpty():
      Error.debugException(this);
      return false;

    default:
      break;
  }

  return true;
};

Sort.prototype.json = function () {
  let
    json = {},

    inner = {
      order: this.getOrder(),
      mode: this.getMode(),
    };

  const nestedPath = this.getNestedPath();

  if (nestedPath) {
    inner.nested_path = nestedPath;
  }

  json[this.getFieldName()] = inner;
  return json;
};

Sort.isInstance = function (...args) {
  return typeChecker.isInstance(args, val => val instanceof Sort);
};

Sort.Builder = function () {
  const sort = new Sort();

  return {
    withFieldName(field) {
      sort.setFieldName(field);
      return this;
    },

    withOrder(order) {
      sort.setOrder(order);
      return this;
    },

    withMode(mode) {
      sort.setMode(mode);
      return this;
    },

    withNestedPath(path) {
      sort.setNestedPath(path);
      return this;
    },

    build() {
      return sort;
    },
  };
};

Sort.newBuilder = function () {
  return Sort.Builder();
};

module.exports = Sort;
