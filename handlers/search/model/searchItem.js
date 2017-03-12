const baseDir = '../../../..';
const sharedDir = `${baseDir}/node-common`;
const sharedHandlerDir = `${sharedDir}/handlers`;
const utils = require(`${sharedHandlerDir}/util/common.js`);

function SearchItem() {
  /**
   * The index that this document belongs to.
   * @type {String} The item's index name.
   */
  this._index = '';

  /**
   * The type that this document belongs to.
   * @type {String} the item's type name.
   */
  this._type = '';

  /**
   * The item's id.
   * @type {String} The item's id.
   */
  this._id = '';

  /**
   * The item's relevance score.
   * @type {Number} The item's relevance score.
   */
  this._score = 0;

  /**
   * The item's _source data.
   * @type {Object} The item's _source data.
   */
  this._source = {};

  /**
   * The item's _parent id.
   * @type {String} The item's _parent type.
   */
  this._parent = '';

  /**
   * The item's inner_hits. Applicable with nested/parent-child queries.
   * @type {object} The item's inner_hits.
   */
  this.inner_hits = {};
}

SearchItem.prototype.setIndex = function (index) {
  if (String.isInstance(index) && index) {
    this._index = index;
  }

  return this;
};

SearchItem.prototype.setType = function (type) {
  if (String.isInstance(type) && type) {
    this._type = type;
  }

  return this;
};

SearchItem.prototype.setId = function (id) {
  if (String.isInstance(id) && id) {
    this._id = id;
  }

  return this;
};

SearchItem.prototype.setData = function (data) {
  if (data && utils.isNotEmpty(data)) {
    this._source = data;
  }

  return this;
};

SearchItem.prototype.setScore = function (score) {
  this._score = parseFloat(score);
  return this;
};

SearchItem.prototype.setParent = function (type) {
  if (type && String.isInstance(type)) {
    this._parent = type;
  }

  return this;
};

SearchItem.prototype.setInnerHits = function (innerHits) {
  if (innerHits) {
    this.inner_hits = innerHits;
  }

  return this;
};

SearchItem.prototype.getIndex = function () {
  return this._index || '';
};

SearchItem.prototype.getType = function () {
  return this._type || '';
};

SearchItem.prototype.getId = function () {
  return this._id || '';
};

SearchItem.prototype.getInnerHits = function () {
  return this.inner_hits || {};
};

SearchItem.prototype.getData = function () {
  return this._source || {};
};

SearchItem.prototype.getScore = function () {
  return this._score || 0;
};

SearchItem.prototype.getParent = function () {
  return this._parent || '';
};

SearchItem.prototype.hasAllRequiredInformation = function () {
  switch (true) {
    case this.getIndex().isEmpty():
    case this.getType().isEmpty():
    case this.getId().isEmpty():
      Error.debugException(this);
      return false;

    default:
      break;
  }

  return true;
};

SearchItem.prototype.json = function () {
  const json = {};
  json[SearchItem.INDEX_KEY] = this.getIndex();
  json[SearchItem.TYPE_KEY] = this.getType();
  json[SearchItem.ID_KEY] = this.getId();
  json[SearchItem.INNER_HITS_KEY] = this.getInnerHits();
  json[SearchItem.SCORE_KEY] = this.getScore();
  json[SearchItem.DATA_KEY] = this.getData();
  json[SearchItem.PARENT_KEY] = this.getParent();
  return json;
};

SearchItem.prototype.flattenedJson = function () {
  const data = utils.clone(this.getData());
  const json = utils.clone(this);
  json.delete(SearchItem.DATA_KEY);
  Object.assign(json, data);
  return json;
};

SearchItem.Builder = () => {
  const searchItem = new SearchItem();

  return {
    withSearchItem(item) {
      if (item) {
        return this
          .withIndex(item[SearchItem.INDEX_KEY])
          .withType(item[SearchItem.TYPE_KEY])
          .withId(item[SearchItem.ID_KEY])
          .withScore(item[SearchItem.SCORE_KEY])
          .withData(item[SearchItem.DATA_KEY])
          .withParent(item[SearchItem.PARENT_KEY])
          .withInnerHits(item[SearchItem.INNER_HITS_KEY]);
      }

      return this;
    },

    withIndex(index) {
      searchItem.setIndex(index);
      return this;
    },

    withType(type) {
      searchItem.setType(type);
      return this;
    },

    withId(id) {
      searchItem.setId(id);
      return this;
    },

    withData(data) {
      searchItem.setData(data);
      return this;
    },

    withScore(score) {
      searchItem.setScore(score);
      return this;
    },

    withParent(type) {
      searchItem.setParent(type);
      return this;
    },

    withInnerHits(innerHits) {
      searchItem.setInnerHits(innerHits);
      return this;
    },

    build() {
      return searchItem;
    },
  };
};

SearchItem.newBuilder = function () {
  return SearchItem.Builder();
};

SearchItem.DATA_KEY = '_source';
SearchItem.ID_KEY = '_id';
SearchItem.INDEX_KEY = '_index';
SearchItem.INNER_HITS_KEY = 'inner_hits';
SearchItem.SCORE_KEY = '_score';
SearchItem.TYPE_KEY = '_type';
SearchItem.PARENT_KEY = '_parent';

module.exports = SearchItem;
