const
	baseDir = "../../..",
	sharedDir = baseDir + "/node-common",
	sharedHandlerDir = sharedDir + "/handlers",
	typeChecker = require(sharedHandlerDir + "/util/type.js"),
	utils = require(sharedHandlerDir + "/util/common.js");

function Params() {};

Params.isInstance = function() {
	return typeChecker.isInstance(arguments, function(value) {
		return value && Function.isInstance(
			value.getIndex, 
			value.getType, 
			value.getId,
			value.json
		);
	});
};

function BaseParams() {
	const instance = this;

	/**
	 * The index parameter.
	 * @type {String} The index parameter.
	 */
	instance.index = "";

	/**
	 * The type parameter.
	 * @type {String} The type parameter.
	 */
	instance.type = "";

	/**
	 * The id parameter.
	 * @type {String} The id parameter.
	 */
	instance.id = "";

	/**
	 * The parent's id. Optional.
	 * @type {String} The parent's id;
	 */
	instance.parent = "";

	instance.setIndex = function(index) {
		if (index && String.isInstance(index)) {
			instance.index = index;
		}

		return instance;
	};

	instance.setType = function(type) {
		if (type && String.isInstance(type)) {
			instance.type = type;
		}

		return instance;
	};

	instance.setId = function(id) {
		if (id && String.isInstance(id)) {
			instance.id = id;
		}

		return instance;
	};

	instance.setParent = function(parent) {
		if (parent && String.isInstance(parent)) {
			instance.parent = parent;
		}

		return instance;
	};

	instance.getIndex = function() {
		return instance.index || "";
	};

	instance.getType = function() {
		return instance.type || "";
	};

	instance.getId = function() {
		return instance.id || "";
	};

	instance.getParent = function() {
		return instance.parent || "";
	};

	/**
	 * We allow index and type to be empty - in which case these parameters will be
	 * supplied by substituting all indexes/types one by one. This allows flexibility
	 * for data updates.
	 */
	instance.hasAllBaseInformation = function() {
		switch (true) {
			case instance.getId().isEmpty():
				Error.debugException();
				return false;

			default:
				break;
		}

		return true;
	};

	instance.destinationJson = function() {
		var json = {};
		json[Params.INDEX_KEY] = instance.getIndex();
		json[Params.TYPE_KEY] = instance.getType();
		json[Params.ID_KEY] = instance.getId();

		const parent = this.getParent();

		if (parent) {
			json[Params.PARENT_KEY] = parent;
		}

		return json;
	};

	instance.json = function() {
		return {};
	};

	instance.toString = function() {
		return instance.json();
	};
};

/**
 * A Base Builder object that can be extended to other Bulk Request types.
 * @param {object} instance A Request object of type Update/Index/Create/Delete.
 */
BaseParams.Builder = function(instance) {
	return {
		withIndex : function(index) {
			instance.setIndex(index);
			return this;
		},

		withType : function(type) {
			instance.setType(type);
			return this;
		},

		withId : function(id) {
			instance.setId(id);
			return this;
		},

		withParent : function(parent) {
			instance.setParent(parent);
			return this;
		},

		withParamsData : function(data) {
			if (data) {
				return this
					.withIndex(data[Params.INDEX_KEY])
					.withType(data[Params.TYPE_KEY])
					.withId(data[Params.ID_KEY])
					.withParent(data[Params.PARENT_KEY]);
			} else {
				return this;
			}
		},

		build : function() {
			return instance;
		}
	};
};

BaseParams.newBuilder = function(instance) {
	return BaseParams.Builder(instance);
};

Params.INDEX_KEY = "index";
Params.TYPE_KEY = "type";
Params.ID_KEY = "id";
Params.PARENT_KEY = "parent";

///////////////////////
// Normal Operations //
///////////////////////

function Update() {
	var params = new BaseParams();

	/**
	 * Update via script.
	 * @type {Object} Script update object.
	 */
	params.script = {};

	/**
	 * Update via doc.
	 * @type {Object} Doc update object.
	 */
	params.doc = {};

	/**
	 * Specify how many retries should be attempted on conflict. Defaults to 0.
	 * @type {Number} Retry count for conflicts.
	 */
	params.retryOnConflict = 0;

	/**
	 * The upsert value/object. If script update is used, this should be an object, 
	 * otherwise, a Boolean value.
	 * @type {Object} Object/Boolean.
	 */
	params.upsert = {};

	params.setScriptUpdate = function(script) {
		if (script && Object.isInstance(script)) {
			params.script = script;
		}

		return params;
	};

	params.setDocUpdate = function(doc) {
		if (doc && Object.isInstance(doc)) {
			params.doc = doc;
		}

		return params;
	};

	params.setRetryOnConflict = function(retries) {
		params.retryOnConflict = parseInt(retries);
		return params;
	};

	params.setUpsert = function(upsert) {
		if (Object.isInstance(upsert) || Boolean.isInstance(upsert)) {
			params.upsert = upsert;
		}

		return params;
	};

	params.getScriptUpdate = function() {
		return params.script || {};
	};

	params.getDocUpdate = function() {
		return params.doc || {};
	};

	params.getUpsert = function() {
		return params.upsert || {};
	};

	params.hasAllRequiredInformation = function() {
		switch (true) {
			case
				utils.isEmpty(params.getScriptUpdate()) || 
				utils.isEmpty(params.getDocUpdate()):

			case !params.hasAllBaseInformation():
				Error.debugException();
				return false;

			default:
				break;
		}

		return true;
	};

	params.json = function() {
		var json = params.destinationJson(), body = {};

		const 
			script = params.getScriptUpdate(),
			doc = params.getDocUpdate(),
			upsert = params.getUpsert();

		if (utils.isNotEmpty(script)) {
			var newScript = utils.clone(script);
			newScript.lang = "painless";

			if (utils.isNotEmpty(upsert)) {
				body.upsert = upsert;
			}

			body.script = newScript;
		} else if (utils.isNotEmpty(doc)) {
			if (Boolean.isInstance(upsert)) {
				body.doc_as_upsert = upsert;
			}

			body.doc = doc;
		}

		json.body = body;
		return json;
	};

	return params;
};

Update.Builder = function() {
	var 
		instance = new Update(),
		builder = BaseParams.newBuilder(instance);

	builder.withRetryOnConflict = function(retries) {
		instance.setRetryOnConflict(retries);
		return this;
	};

	builder.withScriptUpdate = function(script) {
		instance.setScriptUpdate(script);
		return this;
	};

	builder.withDocUpdate = function(doc) {
		instance.setDocUpdate(doc);
		return this;
	};

	builder.withUpsert = function(upsert) {
		instance.setUpsert(upsert);
		return this;
	};

	return builder;
};

Update.newBuilder = function() {
	return Update.Builder();
};

/////////////////////
// Bulk Operations //
/////////////////////

function BaseBulk() {
	var params = new BaseParams();
	const hasAllBaseInformation = params.hasAllBaseInformation;

	params.hasAllBaseInformation = function() {
		switch (true) {
			case params.getIndex().isEmpty():
			case params.getType().isEmpty():
			case !hasAllBaseInformation():
				Error.debugException();
				return false;

			default:
				break;
		}

		return true;
	};

	params.destinationJson = function() {
		var json = {
			_index : params.getIndex(),
			_type : params.getType(),
			_id : params.getId()
		};

		const parent = params.getParent();

		if (parent) {
			json.parent = parent;
		}

		return json;
	};

	return params;
};

function BulkUpdate() {
	var params = new BaseBulk();
	params.retryOnConflict = 0;
	params.update = {};

	params.setRetryOnConflict = function(retries) {
		params.retryOnConflict = parseInt(retries);
		return params;
	};

	params.setUpdate = function(update) {
		if (Object.isInstance(update)) {
			params.update = update;
		}

		return params;
	};

	params.getRetryOnConflict = function() {
		return params.retryOnConflict || 0;
	};

	params.getUpdate = function() {
		return params.update || {};
	};

	params.hasAllRequiredInformation = function() {
		switch (true) {
			case !params.hasAllBaseInformation():
			case utils.isEmpty(params.getUpdate()):
				Error.debugException();
				return false;

			default:
				break;
		}

		return true;
	};

	/**
	 * Since the bulk api requires an Array of json objects, we pass the current
	 * Request as a json Array instead of a single object.
	 * @return {Array} An Array of json object.
 	 */
	params.jsonArray = function() {
		var json = params.destinationJson();
		json["_retry_on_conflict"] = params.getRetryOnConflict();
		return [{update : json}, params.getUpdate()];
	};

	return params;
};

BulkUpdate.Builder = function() {
	var 
		instance = new BulkUpdate(),
		builder = BaseParams.newBuilder(instance);

	builder.withRetryOnConflict = function(retries) {
		instance.setRetryOnConflict(retries);
		return this;
	};

	builder.withUpdate = function(update) {
		instance.setUpdate(update);
		return this;
	};

	return builder;
};

BulkUpdate.newBuilder = function() {
	return BulkUpdate.Builder();
};

function BulkIndex() {
	var params = new BaseBulk();
	
	params.update = {};

	params.setUpdate = function(update) {
		if (Object.isInstance(update)) {
			params.update = update;
		}

		return params;
	};

	params.getUpdate = function() {
		return params.update || {};
	};

	params.hasAllRequiredInformation = function() {
		switch (true) {
			case !params.hasAllBaseInformation():
			case utils.isEmpty(params.getUpdate()):
				Error.debugException();
				return false;

			default:
				break;
		}

		return true;
	};

	params.jsonArray = function() {
		return [{index : params.destinationJson()}, params.getUpdate()];
	};

	return params;
};

BulkIndex.Builder = function() {
	var
		instance = new BulkIndex(),
		builder = BaseParams.newBuilder(instance);

	builder.withUpdate = function(update) {
		instance.setUpdate(update);
		return this;
	};

	return builder;
};

BulkIndex.newBuilder = function() {
	return BulkIndex.Builder();
};

Params.Update = Update;
Params.BulkIndex = BulkIndex;
Params.BulkUpdate = BulkUpdate;

module.exports = Params;