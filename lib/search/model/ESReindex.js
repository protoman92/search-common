// @flow

const Index = require('./ESIndex.js');

function Reindex() {}

/**
 * The old {@link Index} from which we are pulling data.
 */
Reindex.prototype.oldIndex = '';

/**
 * The new {@link Index} to which we are pushing data.
 */
Reindex.prototype.newIndex = '';

/**
 * The query that will be used for the initial scroll search.
 */
Reindex.prototype.scrollQuery = {
  query: {
    match_all: {},
  },
};

Reindex.prototype.setOldIndex = function (index) {
  if (index && String.isInstance(index)) {
    this.oldIndex = index;
  } else if (Index.isInstance(index)) {
    return this.setOldIndex(index.getName());
  }

  return this;
};

Reindex.prototype.setNewIndex = function (index) {
  if (index && String.isInstance(index)) {
    this.newIndex = index;
  } else if (Index.isInstance(index)) {
    return this.setNewIndex(index.getName());
  }

  return this;
};

Reindex.prototype.setScrollQuery = function (query) {
  if (query && Object.isInstance(query)) {
    this.scrollQuery = query;
  }

  return this;
};

Reindex.prototype.getOldIndex = function () {
  return this.oldIndex || '';
};

Reindex.prototype.getNewIndex = function () {
  return this.newIndex || '';
};

Reindex.prototype.getScrollQuery = function () {
  return this.scrollQuery || {};
};

Reindex.prototype.hasAllRequiredInformation = function () {
  switch (true) {
    case this.getOldIndex().isEmpty():
    case this.getNewIndex().isEmpty():
      Error.debugException();
      return false;

    default:
      break;
  }

  return true;
};

Reindex.Builder = function () {
  const reindex = new Reindex();

  return {
    withOldIndex(index) {
      reindex.setOldIndex(index);
      return this;
    },

    withNewIndex(index) {
      reindex.setNewIndex(index);
      return this;
    },

    withScrollQuery(query) {
      reindex.setScrollQuery(query);
      return this;
    },

    build() {
      return reindex;
    },
  };
};

Reindex.newBuilder = function () {
  return Reindex.Builder();
};

/**
 * Create an Array of Reindex objects, based on two Arrays of old indexes and
 * new indexes.
 * @param  {object} args This parameter must contain the oldIndexes and newIndexes
 * keys, which represent two Arrays of String or Index objects.
 * @return {Array} An Array of Reindex objects.
 */
Reindex.fromIndexArrays = function (args) {
  const reindexes = [];

  if
    (args &&
    (Array.isInstance(args.oldIndex, args.newIndex)) &&
    (args.oldIndex.length == args.newIndex.length))	{
    const oldIndexes = args.oldIndex;
    const newIndexes = args.newIndex;

    for (let i = 0, length = oldIndexes.length; i < length; i++) {
      const oldIndex = oldIndexes[i];

      if (oldIndex) {
        const reindex = Reindex.newBuilder()
          .withOldIndex(oldIndex)
          .withNewIndex(newIndexes[i])
          /**
           * We are not interested in the new index's scroll query
           * because the old index is the one from which data is being
           * pulled.
           */
          .withScrollQuery(oldIndex[Index.REINDEX_SCROLL_QUERY_KEY])
          .build();

        if (reindex.hasAllRequiredInformation()) {
          reindexes.push(reindex);
        }
      }
    }
  } else {
    Error.debugException();
  }

  return reindexes;
};

Reindex.NEW_INDEX_KEY = 'newIndex';
Reindex.OLD_INDEX_KEY = 'oldIndex';
Reindex.SCROLL_QUERY_KEY = 'scrollQuery';

module.exports = Reindex;
