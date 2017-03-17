const { utils } = require('../../../../node-common/lib/util');

const {
  Type,
} = require('..')();

function Mapping() {}

/**
 * The index to which this mapping is mapped.
 * @type {String} The Mapping's index name.
 */
Mapping.prototype.index = '';

/**
 * The types to be registered to this mapping.
 * @type {Array} An Array of types.
 */
Mapping.prototype.types = [];

Mapping.prototype.setIndex = function (index) {
  if (index && String.isInstance(index)) {
    this.index = index;
  }

  return this;
};

Mapping.prototype.setTypes = function (types) {
  if (Array.isInstance(types) && types.length) {
    this.types = types;
  }

  return this;
};

Mapping.prototype.getIndex = function () {
  return this.index || '';
};

Mapping.prototype.getTypes = function () {
  return this.types || [];
};

Mapping.prototype.hasAllRequiredInformation = function () {
  switch (true) {
    case this.getTypes().filter(type => !type.hasAllRequiredInformation()):
      Error.debugException();
      return false;

    default:
      break;
  }

  return true;
};

Mapping.prototype.json = function () {
  return this.getTypes()
    .filter(type => type.hasAllRequiredInformation())
    .map(type => type.json())
    .reduce((a, b) => Object.assign(a, b), {});
};

Mapping.Builder = function () {
  const mapping = new Mapping();

  return {
    withIndex(index) {
      mapping.setIndex(index);
      return this;
    },

    withTypes(types) {
      mapping.setTypes(types);
      return this;
    },

    withMappingData(data) {
      const types = [];

      if (data) {
        const keys = utils.getKeys(data);

        for (let i = 0, length = keys.length; i < length; i++) {
          const key = keys[i];
          const val = data[key];

          const type = Type.newBuilder()
            .withName(key)
            .withTypeData(val)
            .build();

          if (type.hasAllRequiredInformation()) {
            types.push(type);
          }
        }
      }

      return this.withTypes(types);
    },

    build() {
      return mapping;
    },
  };
};

Mapping.newBuilder = function () {
  return Mapping.Builder();
};

module.exports = Mapping;
