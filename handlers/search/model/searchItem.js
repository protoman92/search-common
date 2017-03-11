const baseDir = '../../../..';
const sharedDir = `${baseDir}/node-common`;
const sharedHandlerDir = `${sharedDir}/handlers`;
const utils = require(`${sharedHandlerDir}/util/common.js`);

function SearchItem() {
  /**
   * The index that this document belongs to.
   * @type {String} The item's index name.
   */
  this.index = '';

  /**
   * The type that this document belongs to.
   * @type {String} the item's type name.
   */
  this.type = '';

  /**
   * The item's id.
   * @type {String} The item's id.
   */
  this.id = '';

  /**
   * The item's relevance score.
   * @type {Number} The item's relevance score.
   */
  this.score = 0;

  /**
   * The item's _source data.
   * @type {Object} The item's _source data.
   */
  this.data = {};

  /**
   * The item's _parent id.
   * @type {String} The item's _parent type.
   */
  this.parent = '';
}

SearchItem.prototype.setIndex = function (index) {
  if (String.isInstance(index) && index) {
    this.index = index;
  }

  return this;
};

SearchItem.prototype.setType = function (type) {
  if (String.isInstance(type) && type) {
    this.type = type;
  }

  return this;
};

SearchItem.prototype.setId = function (id) {
  if (String.isInstance(id) && id) {
    this.id = id;
  }

  return this;
};

SearchItem.prototype.setData = function (data) {
  if (data && utils.isNotEmpty(data)) {
    this.data = data;
  }

  return this;
};

SearchItem.prototype.setScore = function (score) {
  this.score = parseFloat(score);
  return this;
};

SearchItem.prototype.setParent = function (type) {
  if (type && String.isInstance(type)) {
    this.parent = type;
  }

  return this;
};

SearchItem.prototype.getIndex = function () {
  return this.index || '';
};

SearchItem.prototype.getType = function () {
  return this.type || '';
};

SearchItem.prototype.getId = function () {
  return this.id || '';
};

SearchItem.prototype.getData = function () {
  return this.data || {};
};

SearchItem.prototype.getScore = function () {
  return this.score || 0;
};

SearchItem.prototype.getParent = function () {
  return this.parent || '';
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
          .withIndex(item._index)
          .withType(item._type)
          .withId(item._id)
          .withScore(item._score)
          .withData(item._source)
          .withParent(item._parent);
      } else {
        return this;
      }
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

    build() {
      return searchItem;
    },
  };
};

SearchItem.newBuilder = function () {
  return SearchItem.Builder();
};

SearchItem.DATA_KEY = 'data';
SearchItem.ID_KEY = 'id';
SearchItem.INDEX_KEY = 'index';
SearchItem.SCORE_KEY = 'score';
SearchItem.TYPE_KEY = 'type';
SearchItem.PARENT_KEY = 'parent';

module.exports = SearchItem;
