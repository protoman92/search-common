const
	baseDir = "../../..",
	sharedDir = baseDir + "/nodecommon",
	sharedHandlerDir = sharedDir + "/handlers",
	sharedSearchDir = sharedHandlerDir + "/search",
	Aggregation = require(sharedSearchDir + "/aggregation.js"),
	SearchItem = require(sharedSearchDir + "/searchItem.js");

function SearchResult() {
	/**
	 * The time it took to get the results.
	 * @type {Number} Time taken.
	 */
	this.timeTaken = 0;

	/**
	 * An Array of SearchItem.
	 * @type {Array} An Array of SearchItem.
	 */
	this.items = [];

	/**
	 * An Array of Aggregation.
	 * @type {Array} An Array of Aggregation.
	 */
	this.aggregations = [];

	/**
	 * The number of SearchItem.
	 * @type {Number} The number of SearchItem.
	 */
	this.itemCount = 0;

	/**
	 * The maximum score across all SearchItem objects.
	 * @type {Number} The maximum score across all SearchItem objects.
	 */
	this.maxScore = 0;

	/**
	 * The scroll id, if the scroll API is used.
	 * @type {String} The scroll id.
	 */
	this.scrollId = "";
};

SearchResult.prototype.setTimeTaken = function(timeTaken) {
	this.timeTaken = parseInt(timeTaken);
	return this;
};

SearchResult.prototype.setItemCount = function(itemCount) {
	this.itemCount = parseInt(itemCount);
	return this;
};

SearchResult.prototype.setAggregations = function(aggs) {
	if (aggs && Object.isInstance(aggs)) {
		this.aggregations = Aggregation.fromAggregations(aggs);
	}

	return this;
};

SearchResult.prototype.setItems = function(items) {
	if (Array.isInstance(items) && items.length) {
		this.items = items
			.map(item => SearchItem.newBuilder()
				.withSearchItem(item)
				.build())
			.filter(item => item.hasAllRequiredInformation());
	}

	return this;
}

SearchResult.prototype.setMaxScore = function(score) {
	this.maxScore = parseFloat(score);
	return this;
};

SearchResult.prototype.setScrollId = function(id) {
	if (id && String.isInstance(id)) {
		this.scrollId = id;
	}

	return this;
};

SearchResult.prototype.getTimeTaken = function() {
	return this.timeTaken || 0;
};

SearchResult.prototype.getItemCount = function() {
	return this.itemCount || 0;
};

SearchResult.prototype.getAggregations = function() {
	return this.aggregations || [];
};

SearchResult.prototype.getItems = function() {
	return this.items || [];
};

SearchResult.prototype.getMaxScore = function() {
	return this.maxScore || 0;
};

SearchResult.prototype.getScrollId = function() {
	return this.scrollId || "";
};

SearchResult.prototype.json = function() {
	var json = {};
	json[SearchResult.TIME_TAKEN_KEY] = this.getTimeTaken();
	json[SearchResult.MAX_SCORE_KEY] = this.getMaxScore();
	json[SearchResult.ITEM_COUNT_KEY] = this.getItemCount();
	json[SearchResult.ITEMS_KEY] = this.getItems().map(item => item.json())

	json[SearchResult.AGGREGATION_KEY] = 
		this.getAggregations().map(aggs => aggs.json());

	json[SearchResult.SCROLL_ID_KEY] = this.getScrollId();
	return json;
};

SearchResult.EMPTY = new SearchResult();

SearchResult.Builder = function() {
	var searchResult = new SearchResult();

	return {
		withSearchResult : function(data) {
			if (data && data.hits) {
				const hits = data.hits;

				return this
					.withTimeTaken(data.took)
					.withMaxScore(hits.max_score)
					.withItemCount(hits.total)
					.withAggregations(data.aggregations)
					.withItems(hits.hits)
					.withScrollId(data._scroll_id);
			} else {
				return this;
			}
		},

		withMaxScore : function(score) {
			searchResult.setMaxScore(score);
			return this;
		},

		withAggregations : function(aggs) {
			searchResult.setAggregations(aggs);
			return this;
		},

		withItems : function(items) {
			searchResult.setItems(items);
			return this;
		},

		withItemCount : function(itemCount) {
			searchResult.setItemCount(itemCount);
			return this;
		},

		withTimeTaken : function(timeTaken) {
			searchResult.setTimeTaken(timeTaken);
			return this;
		},

		withScrollId : function(id) {
			searchResult.setScrollId(id);
			return this;
		},

		build() {
			return searchResult;
		}
	};
};

SearchResult.newBuilder = function() {
	return SearchResult.Builder();
};

SearchResult.AGGREGATION_KEY = "aggregations";
SearchResult.ITEM_COUNT_KEY = "itemCount";
SearchResult.ITEMS_KEY = "items";
SearchResult.MAX_SCORE_KEY = "maxScore";
SearchResult.SCROLL_ID_KEY = "scrollId";
SearchResult.TIME_TAKEN_KEY = "timeTaken";

module.exports = SearchResult;