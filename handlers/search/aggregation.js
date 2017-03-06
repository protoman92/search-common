const
	baseDir = "../../..",
	sharedDir = baseDir + "/node-common",
	sharedHandlerDir = sharedDir + "/handlers",
	sharedSearchDir = sharedHandlerDir + "/search",
	utils = require(sharedHandlerDir + "/util/common.js");

function Aggregation() {
	/**
	 * The aggregation's name.
	 * @type {String} The aggregation's name.
	 */
	this.name = "";

	/**
	 * The number of documents processed by this Aggregation.
	 * @type {Number} The number of documents processed.
	 */
	this.docCount = 0;
};

Aggregation.prototype.setName = function(name) {
	if (name && String.isInstance(name)) {
		this.name = name;
	}

	return this;
};

Aggregation.prototype.setDocCount = function(count) {
	this.docCount = parseInt(count);
	return this;
};

Aggregation.prototype.getName = function() {
	return this.name || "";
};

Aggregation.prototype.getDocCount = function() {
	return this.docCount || 0;
};

Aggregation.prototype.hasAllRequiredInformation = function() {
	switch (true) {
		case this.getName().isEmpty():
			Error.debugException();
			return false;

		default:
			break;
	}

	return true;
};

Aggregation.prototype.json = function() {
	var json = {};
	json[Aggregation.NAME_KEY] = this.getName();
	json[Aggregation.DOC_COUNT_KEY] = this.getDocCount();
	return json;
};

Aggregation.Builder = function() {
	var aggregation = new Aggregation();

	return {
		withName : function(name) {
			aggregation.setName(name);
			return this;
		},

		withDocCount : function(count) {
			aggregation.setDocCount(count);
			return this;
		},

		withAggregationData : function(data) {
			if (data) {
				return this
					.withDocCount(data.doc_count);
			} else {
				return this;
			}
		},

		build : function() {
			return aggregation;
		}
	};
};

Aggregation.newBuilder = function() {
	return Aggregation.Builder();
};

Aggregation.fromAggregations = function(args) {
	const keys = utils.getKeys(args);
	var aggregations = [];

	for (var i = 0, length = keys.length; i < length; i++) {
		const 
			key = keys[i],

			aggregation = Aggregation.newBuilder()
				.withName(key)
				.withAggregationData(args[key])
				.build();

		if (aggregation.hasAllRequiredInformation()) {
			aggregations.push(aggregation);
		}
	}

	return aggregations;
};

Aggregation.NAME_KEY = "name";
Aggregation.DOC_COUNT_KEY = "docCount";

module.exports = Aggregation;