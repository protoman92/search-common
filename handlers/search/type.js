const
	baseDir = "../../..",
	sharedDir = baseDir + "/nodecommon",
	sharedHandlerDir = sharedDir + "/handlers",
	sharedSearchDir = sharedHandlerDir + "/search",
	utils = require(sharedHandlerDir + "/util/common.js");

function Type() {
	/**
	 * The name of the type.
	 * @type {String} The type's name.
	 */
	this.name = "";

	/**
	 * An array of Field items.
	 * @type {Array} An array of Field items.
	 */
	this.fields = [];

	/**
	 * Enable or disable the _all field. This field indexes values from all 
	 * other fields into one big string.
	 * @type {Boolean} Whether to enable or disable _all.
	 */
	this.allEnabled = false;

	/**
	 * Enable or disable default 'include_in_all' for child fields.
	 * @type {Boolean} Enable or disable 'include_in_all' for child fields.
	 */
	this.includeInAll = false;

	/**
	 * Enable or disable dynamic mapping for this type. If set to strict, 
	 * unknown fields, when indexed, will throw an Exception. We can set 
	 * this mode to 'strict' at the type level, and set to true for certain 
	 * fields.
	 * @type {object} true, false or 'strict'.
	 */
	this.dynamicMode = Type.DynamicMode.NONE.value;

	/**
	 * Enable or disable _source. _source contains the entire document.
	 * @type {Boolean} Whether to enable or disable _source.
	 */
	this.sourceEnabled = true;

	/**
	 * Specify a parent type to enable parent-child relationship.
	 * @type {String} The parent type.
	 */
	this.parent = "";
};

Type.DynamicMode = {
	FULL : {
		value : true
	},

	NONE : {
		value : false
	},

	STRICT : {
		value : "strict"
	}
};

Type.prototype.setName = function(name) {
	if (String.isInstance(name) && name) {
		this.name = name;
	}

	return this;
};

Type.prototype.setAllEnabled = function(enabled) {
	this.allEnabled = Boolean.cast(enabled);
	return this;
};

Type.prototype.setIncludeInAll = function(enabled) {
	this.includeInAll = Boolean.cast(enabled);
	return this;
};

Type.prototype.setSourceEnabled = function(enabled) {
	this.sourceEnabled = Boolean.cast(enabled);
	return this;
};

Type.prototype.setDynamicMode = function(mode) {
	this.dynamicMode = Boolean.cast(mode);
	return this;
};

Type.prototype.setFields = function(fields) {
	if (Array.isInstance(fields) && fields.length) {
		this.fields = fields;
	}

	return this;
};

Type.prototype.setParent = function(parent) {
	if (parent && String.isInstance(parent)) {
		this.parent = parent;
	}

	return this;
};

Type.prototype.getName = function() {
	return this.name || "";
};

Type.prototype.getDynamicMode = function() {
	return this.dynamicMode || false;
};

Type.prototype.getFields = function() {
	return this.fields || [];
};

Type.prototype.getParent = function() {
	return this.parent || "";
};

Type.prototype.shouldEnableAll = function() {
	return this.allEnabled || false;
};

Type.prototype.shouldEnableSource = function() {
	return this.sourceEnabled || true;
};

Type.prototype.shouldIncludeInAll = function() {
	return this.includeInAll || false;
};

Type.prototype.hasAllRequiredInformation = function() {
	switch (true) {
		case this.getName().isEmpty():
		case this.getFields().length == 0:
		case this.getFields().filter(function(field) {
			return !field.hasAllRequiredInformation()
		}).length:
			Error.debugException();
			return false;

		default:
			break;
	}

	return true;
};

Type.prototype.json = function() {
	var 
		json = {},

		inner = {
			dynamic : this.getDynamicMode(),

			properties : this.getFields()
				.filter(field => field.hasAllRequiredInformation())
				.map(field => field.json())
				.reduce((a, b) => Object.assign(a, b), {}),

			"include_in_all" : this.shouldIncludeInAll(),

			"_all" : {
				enabled : this.shouldEnableAll()
			},

			"_source" : {
				enabled : this.shouldEnableSource()
			}
		};

	const parent = this.getParent();

	if (parent) {
		inner._parent = {type : parent};
	}

	json[this.getName()] = inner;
	return json;
};

Type.Builder = function() {
	var type = new Type();

	return {
		withName : function(name) {
			type.setName(name);
			return this;
		},

		withFields : function(fields) {
			type.setFields(fields);
			return this;
		},

		withDynamicMode : function(mode) {
			type.setDynamicMode(mode);
			return this;
		},

		withParent : function(parent) {
			type.setParent(parent);
			return this;
		},

		shouldEnableAll : function(enabled) {
			type.setAllEnabled(enabled);
			return this;
		},

		shouldEnableSource : function(enabled) {
			type.setSourceEnabled(enabled);
			return this;
		},

		shouldIncludeInAll : function(enabled) {
			type.setIncludeInAll(enabled);
			return this;
		},

		withTypeData : function(data) {
			var fields = [];

			if (data && data.properties) {
				const
					Field = require(sharedSearchDir + "/field.js"),
					properties = data.properties,
					keys = utils.getKeys(properties);

				for (var i = 0, length = keys.length; i < length; i++) {
					const 
						key = keys[i],
						val = properties[key],

						field = Field.newBuilder()
							.withName(key)
							.withFieldData(val)
							.build();

					if (field.hasAllRequiredInformation()) {
						fields.push(field);
					}
				}
			}

			return this
				.withFields(fields)
				.withDynamicMode(data.dynamic)
				.shouldEnableAll((data._all || {}).enabled)
				.shouldIncludeInAll(data.include_in_all);
		},

		build : function() {
			return type;
		}
	};
};

Type.newBuilder = function() {
	return Type.Builder();
};

module.exports = Type;