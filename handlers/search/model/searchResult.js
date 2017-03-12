const {
  SearchItem,
} = require('..')();

function SearchResult() {
  /**
   * The time it took to get the results.
   * @type {Number} Time taken.
   */
  this.took = 0;

  /**
   * An Array of SearchItem.
   * @type {Array} An Array of SearchItem.
   */
  this.hits = [];

  /**
   * An Aggregation object.
   * @type {Array} An Aggregation object.
   */
  this.aggregations = {};

  /**
   * The number of SearchItem.
   * @type {Number} The number of SearchItem.
   */
  this.total = 0;

  /**
   * The maximum score across all SearchItem objects.
   * @type {Number} The maximum score across all SearchItem objects.
   */
  this.max_score = 0;

  /**
   * The scroll id, if the scroll API is used.
   * @type {String} The scroll id.
   */
  this._scroll_id = '';
}

SearchResult.prototype.setTimeTaken = function (timeTaken) {
  this.took = parseInt(timeTaken, 10);
  return this;
};

SearchResult.prototype.setItemCount = function (itemCount) {
  this.total = parseInt(itemCount, 10);
  return this;
};

SearchResult.prototype.setAggregations = function (aggs) {
  if (aggs && Object.isInstance(aggs)) {
    this.aggregations = aggs;
  }

  return this;
};

SearchResult.prototype.setItems = function (items) {
  if (Array.isInstance(items) && items.length) {
    this.hits = items
      .map(item => SearchItem.newBuilder().withSearchItem(item).build())
      .filter(item => item.hasAllRequiredInformation());
  }

  return this;
};

SearchResult.prototype.setMaxScore = function (score) {
  this.max_score = parseFloat(score);
  return this;
};

SearchResult.prototype.setScrollId = function (id) {
  if (id && String.isInstance(id)) {
    this._scroll_id = id;
  }

  return this;
};

SearchResult.prototype.getTimeTaken = function () {
  return this.took || 0;
};

SearchResult.prototype.getItemCount = function () {
  return this.total || 0;
};

SearchResult.prototype.getAggregations = function () {
  return this.aggregations || {};
};

SearchResult.prototype.getItems = function () {
  return this.hits || [];
};

SearchResult.prototype.getMaxScore = function () {
  return this.max_score || 0;
};

SearchResult.prototype.getScrollId = function () {
  return this._scroll_id || '';
};

SearchResult.prototype.json = function () {
  const json = {};
  json[SearchResult.TIME_TAKEN_KEY] = this.getTimeTaken();
  json[SearchResult.MAX_SCORE_KEY] = this.getMaxScore();
  json[SearchResult.ITEM_COUNT_KEY] = this.getItemCount();
  json[SearchResult.ITEMS_KEY] = this.getItems().map(item => item.json());
  json[SearchResult.AGGREGATION_KEY] = this.getAggregations();
  json[SearchResult.SCROLL_ID_KEY] = this.getScrollId();
  return json;
};

SearchResult.EMPTY = new SearchResult();

SearchResult.Builder = function () {
  const searchResult = new SearchResult();

  return {
    withSearchResult(data) {
      if (data && data.hits) {
        const hits = data.hits;

        return this
          .withTimeTaken(data[SearchResult.TIME_TAKEN_KEY])
          .withMaxScore(hits[SearchResult.MAX_SCORE_KEY])
          .withItemCount(hits[SearchResult.ITEM_COUNT_KEY])
          .withAggregations(data[SearchResult.AGGREGATION_KEY])
          .withItems(hits[SearchResult.ITEMS_KEY])
          .withScrollId(data[SearchResult.SCROLL_ID_KEY]);
      }

      return this;
    },

    withMaxScore(score) {
      searchResult.setMaxScore(score);
      return this;
    },

    withAggregations(aggs) {
      searchResult.setAggregations(aggs);
      return this;
    },

    withItems(items) {
      searchResult.setItems(items);
      return this;
    },

    withItemCount(itemCount) {
      searchResult.setItemCount(itemCount);
      return this;
    },

    withTimeTaken(timeTaken) {
      searchResult.setTimeTaken(timeTaken);
      return this;
    },

    withScrollId(id) {
      searchResult.setScrollId(id);
      return this;
    },

    build() {
      return searchResult;
    },
  };
};

SearchResult.newBuilder = function () {
  return SearchResult.Builder();
};

SearchResult.AGGREGATION_KEY = 'aggregations';
SearchResult.ITEM_COUNT_KEY = 'total';
SearchResult.ITEMS_KEY = 'hits';
SearchResult.MAX_SCORE_KEY = 'max_score';
SearchResult.SCROLL_ID_KEY = '_scroll_id';
SearchResult.TIME_TAKEN_KEY = 'took';

module.exports = SearchResult;
