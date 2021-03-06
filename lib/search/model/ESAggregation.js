// @flow

const { utils } = require('../../../../node-common/lib/util');

function Aggregation() {}

/**
 * The {@link Aggregation}'s name.
 */
Aggregation.prototype.name = '';

/**
 * The number of documents processed by this {@link Aggregation}.
 */
Aggregation.prototype.docCount = 0;

Aggregation.prototype.setName = function (name) {
  if (name && String.isInstance(name)) {
    this.name = name;
  }

  return this;
};

Aggregation.prototype.setDocCount = function (count) {
  this.docCount = parseInt(count, 10);
  return this;
};

Aggregation.prototype.getName = function () {
  return this.name || '';
};

Aggregation.prototype.getDocCount = function () {
  return this.docCount || 0;
};

Aggregation.prototype.hasAllRequiredInformation = function () {
  switch (true) {
    case this.getName().isEmpty():
      Error.debugException();
      return false;

    default:
      break;
  }

  return true;
};

Aggregation.prototype.json = function () {
  const json = {};
  json[Aggregation.NAME_KEY] = this.getName();
  json[Aggregation.DOC_COUNT_KEY] = this.getDocCount();
  return json;
};

Aggregation.Builder = function () {
  const aggregation = new Aggregation();

  return {
    withName(name) {
      aggregation.setName(name);
      return this;
    },

    withDocCount(count) {
      aggregation.setDocCount(count);
      return this;
    },

    withAggregationData(data) {
      if (data) {
        return this.withDocCount(data.doc_count);
      }

      return this;
    },

    build() {
      return aggregation;
    },
  };
};

Aggregation.newBuilder = function () {
  return Aggregation.Builder();
};

Aggregation.fromAggregations = function (args) {
  const keys = utils.getKeys(args);
  const aggregations = [];

  for (let i = 0, length = keys.length; i < length; i++) {
    const key = keys[i];

    const aggregation = Aggregation.newBuilder()
      .withName(key)
      .withAggregationData(args[key])
      .build();

    if (aggregation.hasAllRequiredInformation()) {
      aggregations.push(aggregation);
    }
  }

  return aggregations;
};

Aggregation.NAME_KEY = 'name';
Aggregation.DOC_COUNT_KEY = 'docCount';

module.exports = Aggregation;
