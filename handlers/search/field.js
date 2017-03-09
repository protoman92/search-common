const
	baseDir = "../../..",
	sharedDir = baseDir + "/node-common",
	sharedHandlerDir = sharedDir + "/handlers",
	sharedUtilDir = sharedHandlerDir + "/util",
	sharedSearchDir = __dirname,
	search = require(sharedSearchDir + "/search.js"),
	typeChecker = require(sharedUtilDir + "/type.js"),
	utils = require(sharedUtilDir + "/common.js"),
	Analyzer = require(sharedSearchDir + "/analyzer.js");

function Field() {
	/**
	 * The field's name.
	 * @type {String} The field's name.
	 */
	this.name = "";

	/**
	 * Enable multifields if this object is not empty. This should be an Array 
	 * of type Field.
	 * @type {Object} The additional fields to be added.
	 */
	this.fields = [];

	/**
	 * Whether or not this field is part of another field. If this is set to 
	 * true, we need to disable certain settings, such as 'include_in_all'.
	 * @type {Boolean} Whether this is a multifield or not.
	 */
	this.multifield = false;

	/**
	 * Enable or disable 'include_in_all'.
	 * @type {Boolean} Enable or disable 'include_in_all'.
	 */
	this.includeInAll = true;

	/**
	 * The field's index mode. Either 'analyzed' or 'not_analyzed'.
	 * @type {String} The field's index mode.
	 */
	this.indexMode = Field.IndexMode.NOT_ANALYZED.value;

	/**
	 * The index analyzer to use. This analyzer will tokenize and filter 
	 * incoming texts at index time. Only works with text fields.
	 * @type {String} The index analyzer to use.
	 */
	this.indexAnalyzer = Analyzer.Type.SIMPLE.value;

	/**
	 * The search analyzer to use. This field defaults to the index analyzer 
	 * if not specified.
	 * @type {String} The search analyzer to use.
	 */
	this.searchAnalyzer = Analyzer.Type.SIMPLE.value;

	/**
	 * Whether or not to preserve separators. If this is set to false, a search 
	 * for 'foof' may return 'Foo Fighters'.
	 * @type {Boolean} Enable or disable separator preservation.
	 */
	this.preserveSeparator = true;

	/**
	 * Whether or not to preserve position increments. If this is set to false 
	 * and a stopword analyzer is used, a query for 'b' may match a field with 
	 * 'The Beatles'
	 * @type {Boolean}
	 */
	this.preservePositionIncrements = true;

	/**
	 * The field's type.
	 * @type {String} The field's type.
	 */
	this.type = Field.Type.TEXT.value;
};

Field.IndexMode = {
	ANALYZED : {
		/**
		 * In ES 2.x, the correct value is 'analyzed'. However, it changed
		 * to 'true' (Boolean) in 5.x.
		 */
		value : function() {
			return search.isVersion5x() ? true : "analyzed";
		}()
	},

	NOT_ANALYZED : {
		/**
		 * In ES 2.x, the correct value is 'not_analyzed'. However, it changed
		 * to 'false' (Boolean) in 5.x.
		 */
		value : function() {
			return search.isVersion5x() ? false : "not_analyzed";
		}()
	},

	/**
	 * Depreciated in 5.x.
	 */
	NONE : {
		value : "no"
	}
};

/**
 * For KEYWORD and TEXT fields, we need a raw field because their values are
 * the same for ES 2.x.
 */
Field.Type = {
	allValues : function() {
		const types = this, keys = utils.getKeys(types);
		return keys.map(key => types[key]).filter(type => type.value);
	},

	fromValue : function(value) {
		return this.allValues().filter(function(type) {
			return type.raw == value || type.value == value
		})[0];
	},

	BOOLEAN : {
		value : "boolean"
	},

	COMPLETION : {
		value : "completion",
		isCompletionField : true
	},

	DATE : {
		value : "date"
	},

	DOUBLE : {
		value : "double"
	},

	INTEGER : {
		value : "integer"
	},

	LONG : {
		value : "long"
	},

	OBJECT : {
		value : "object",
		isObjectField : true
	},

	NESTED : {
		value : "nested",
		isNestedField : true
	},

	KEYWORD : {
		value : "keyword",

		/**
		 * Keyword field does not exist in version 2.x.
		 */
		raw : function() {
			return search.isVersion5x() ? "keyword" : "string"
		}()
	},

	TEXT : {
		value : "text",

		/**
		 * Text field does not exist in version 2.x.
		 */
		raw : function() {
			return search.isVersion5x() ? "text" : "string"
		}(),

		isAnalyzableField : true
	}
};

Field.prototype.setName = function(name) {
	if (String.isInstance(name) && name) {
		this.name = name;
	}

	return this;
};

Field.prototype.setFields = function(fields) {
	if (Array.isInstance(fields) && fields.length) {
		this.fields = fields;
	}

	return this;
};

Field.prototype.addField = function(fields) {
	if (Field.isInstance(field) && field.hasAllRequiredInformation()) {
		this.getFields().push(field);
	}

	return this;
};

Field.prototype.addFields = function(fields) {
	if (Array.isInstance(fields) && fields.length) {
		this.fields = this.getFields().concat(fields);
	}

	return this;
};

Field.prototype.setType = function(type) {
	if (String.isInstance(type) && type) {
		this.type = type;
	}

	return this;
};

Field.prototype.setIncludeInAll = function(enabled) {
	this.includeInAll = Boolean.cast(enabled);
	return this;
};

Field.prototype.setIndexAnalyzer = function(analyzer) {
	if (String.isInstance(analyzer)) {
		this.indexAnalyzer = analyzer;
	} else if (Object.isInstance(analyzer)) {
		return this.setIndexAnalyzer(analyzer[Analyzer.NAME_KEY]);
	}

	return this;
};

Field.prototype.setSearchAnalyzer = function(analyzer) {
	if (String.isInstance(analyzer)) {
		this.searchAnalyzer = analyzer;
	} else if (Object.isInstance(analyzer)) {
		return this.setSearchAnalyzer(analyzer[Analyzer.NAME_KEY]);
	}

	return this;
};

Field.prototype.setPreserveSeparator = function(enabled) {
	this.preserveSeparator = Boolean.cast(enabled);
	return this;
};

Field.prototype.setPreservePositionIncrements = function(enabled) {
	this.preservePositionIncrements = Boolean.cast(enabled);
	return this;
};

Field.prototype.setIndexMode = function(mode) {
	if (mode !== undefined && mode !== null) {
		this.indexMode = mode;
	}

	return this;
};

Field.prototype.setIsMultifield = function(isMultifield) {
	this.multifield = Boolean.cast(isMultifield);
	return this;
};

Field.prototype.getName = function() {
	return this.name || "";
};

Field.prototype.getFields = function() {
	return this.fields || [];
};

Field.prototype.getIndexAnalyzer = function() {
	return this.indexAnalyzer || "";
};

Field.prototype.getSearchAnalyzer = function() {
	return this.searchAnalyzer || "";
};

Field.prototype.getType = function() {
	return this.type || "";
}

Field.prototype.getIndexMode = function() {
	return this.indexMode || Field.IndexMode.NOT_ANALYZED.value;
};

Field.prototype.isMultifield = function() {
	return this.multifield || false;
}

Field.prototype.shouldIncludeInAll = function() {
	return this.includeInAll || true;
};

Field.prototype.shouldPreserveSeparator = function() {
	return this.preserveSeparator || true;
};

Field.prototype.shouldPreservePositionIncrements = function() {
	return this.preservePositionIncrements || true;
};

Field.prototype.hasAllRequiredInformation = function() {
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

Field.prototype.json = function() {
	var json = {}, inner = {};

	const type = Field.Type.fromValue(this.getType());

	if (!this.isMultifield()) {
		inner.include_in_all = this.shouldIncludeInAll();
	}

	if (type) {
		const
			fields = this.getFields(),
			indexAnalyzer = this.getIndexAnalyzer(),
			searchAnalyzer = this.getSearchAnalyzer();

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
			inner["preserve_separators"] = this.shouldPreserveSeparator();

			inner["preserve_position_increments"] = 
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

Field.Builder = function() {
	var instance = new Field();

	return {
		withName : function(name) {
			instance.setName(name);
			return this;
		},

		withFields : function(fields) {
			instance.setFields(fields);
			return this;
		},

		withIndexMode : function(mode) {
			instance.setIndexMode(mode);
			return this;
		},

		withIndexAnalyzer : function(analyzer) {
			instance.setIndexAnalyzer(analyzer);
			return this;
		},

		withSearchAnalyzer : function(analyzer) {
			instance.setSearchAnalyzer(analyzer);
			return this;
		},

		withType : function(type) {
			instance.setType(type);
			return this;
		},

		addField : function(field) {
			instance.addField(field);
			return this;
		},

		addFields : function(fields) {
			instance.addFields(fields);
			return this;
		},

		isMultifield : function(isMultifield) {
			instance.setIsMultifield(isMultifield);
			return this;
		},

		shouldIncludeInAll : function(enabled) {
			instance.setIncludeInAll(enabled);
			return this;
		},

		shouldPreserveSeparator : function(enabled) {
			instance.setPreserveSeparator(enabled);
			return this;
		},

		shouldPreservePositionIncrements : function(enabled) {
			instance.setPreservePositionIncrements(enabled);
			return this;
		},

		withFieldData : function(data) {
			if (data) {
				return this
					.withType(data.type)
					.withIndexAnalyzer(data.analyzer)
					.withSearchAnalyzer(data.search_analyzer)
					.shouldIncludeInAll(data.include_in_all);
			} else {
				return this;
			}
		},

		build : function() {
			return instance;
		}
	};
};

Field.newBuilder = function() {
	return Field.Builder();
};

Field.isInstance = function() {
	return typeChecker.isInstance(arguments, function(value) {
		return value instanceof Field
	});
};

module.exports = Field;