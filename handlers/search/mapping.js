const
	baseDir = "../../..",
	sharedDir = baseDir + "/node-common",
	sharedHandlerDir = sharedDir + "/handlers",
	sharedSearchDir = __dirname,
	utils = require(sharedHandlerDir + "/util/common.js"),
	Type = require(sharedSearchDir + "/type.js");

function Mapping() {
	/**
	 * The index to which this mapping is mapped.
	 * @type {String} The Mapping's index name.
	 */
	this.index = "";

	/**
	 * The types to be registered to this mapping.
	 * @type {Array} An Array of types.
	 */
	this.types = [];
};

Mapping.prototype.setIndex = function(index) {
	if (index && String.isInstance(index)) {
		this.index = index;
	}

	return this;
};

Mapping.prototype.setTypes = function(types) {
	if (Array.isInstance(types) && types.length) {
		this.types = types;
	}

	return this;
};

Mapping.prototype.getIndex = function() {
	return this.index || "";
};

Mapping.prototype.getTypes = function(types) {
	return this.types || [];
};

Mapping.prototype.hasAllRequiredInformation = function() {
	switch (true) {
		case this.getTypes().filter(type => !type.hasAllRequiredInformation()):
			Error.debugException();
			return false;

		default:
			break;
	}

	return true;
};

Mapping.prototype.json = function() {
	return this.getTypes()
		.filter(type => type.hasAllRequiredInformation())
		.map(type => type.json())
		.reduce((a, b) => Object.assign(a, b), {});
};

Mapping.Builder = function() {
	var mapping = new Mapping();

	return {
		withIndex : function(index) {
			mapping.setIndex(index);
			return this;
		},

		withTypes : function(types) {
			mapping.setTypes(types);
			return this;
		},

		withMappingData : function(data) {
			var types = [];

			if (data) {
				const keys = utils.getKeys(data);

				for (var i = 0, length = keys.length; i < length; i++) {
					const
						key = keys[i], 
						val = data[key],

						type = Type.newBuilder()
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

		build : function() {
			return mapping;
		}
	};
};

Mapping.newBuilder = function() {
	return Mapping.Builder();
};

module.exports = Mapping;