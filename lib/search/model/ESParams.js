const { typeChecker, utils } = require('../../../../node-common/lib/util');

function Params() {}

Params.isInstance = function (...args) {
  return typeChecker.isInstance(args, value =>
    value && Function.isInstance(
      value.getIndex,
      value.getType,
      value.getId,
      value.json,
    ));
};

function BaseParams() {
  const instance = this;

  /**
   * The index parameter.
   */
  instance.index = '';

  /**
   * The type parameter.
   */
  instance.type = '';

  /**
   * The id parameter.
   */
  instance.id = '';

  /**
   * The parent's id. Optional.
   */
  instance.parent = '';

  instance.setIndex = function (index) {
    if (index && String.isInstance(index)) {
      instance.index = index;
    }

    return instance;
  };

  instance.setType = function (type) {
    if (type && String.isInstance(type)) {
      instance.type = type;
    }

    return instance;
  };

  instance.setId = function (id) {
    /**
     * id can be a {@link Number} integer as well.
     */
    if (id && typeChecker.isInstanceOfClasses(id, Number, String)) {
      instance.id = id;
    }

    return instance;
  };

  instance.setParent = function (parent) {
    /**
     * The parent's id can be a {@link Number} integer as well.
     */
    if (parent && typeChecker.isInstanceOfClasses(parent, Number, String)) {
      instance.parent = parent;
    }

    return instance;
  };

  instance.getIndex = function () {
    return instance.index || '';
  };

  instance.getType = function () {
    return instance.type || '';
  };

  instance.getId = function () {
    return instance.id || '';
  };

  instance.getParent = function () {
    return instance.parent || '';
  };

  /**
   * We allow index and type to be empty - in which case these parameters
   * will be supplied by substituting all indexes/types one by one. This
   * allows flexibility for data updates.
   */
  instance.hasAllBaseInformation = function () {
    switch (true) {
      case instance.getId().isEmpty():
      case instance.getId() === 0:
        Error.debugException();
        return false;

      default:
        break;
    }

    return true;
  };

  instance.destinationJson = function () {
    const json = {};
    json[Params.INDEX_KEY] = instance.getIndex();
    json[Params.TYPE_KEY] = instance.getType();
    json[Params.ID_KEY] = instance.getId();

    const parent = instance.getParent();

    if (parent) {
      json[Params.PARENT_KEY] = parent;
    }

    return json;
  };

  instance.json = function () {
    return {};
  };

  instance.toString = function () {
    return instance.json();
  };
}

/**
 * A Base {@link Builder} object that can be extended to other {@link Bulk}
 * Request types.
 * @param {object} instance A Request object of type
 * Update/Index/Create/Delete.
 */
BaseParams.Builder = function (instance) {
  return {
    withIndex(index) {
      instance.setIndex(index);
      return this;
    },

    withType(type) {
      instance.setType(type);
      return this;
    },

    withId(id) {
      instance.setId(id);
      return this;
    },

    withParent(parent) {
      instance.setParent(parent);
      return this;
    },

    withParamsData(data) {
      if (data) {
        return this
          .withIndex(data[Params.INDEX_KEY])
          .withType(data[Params.TYPE_KEY])
          .withId(data[Params.ID_KEY])
          .withParent(data[Params.PARENT_KEY]);
      }

      return this;
    },

    build() {
      return instance;
    },
  };
};

BaseParams.newBuilder = function (instance) {
  return BaseParams.Builder(instance);
};

Params.INDEX_KEY = 'index';
Params.TYPE_KEY = 'type';
Params.ID_KEY = 'id';
Params.PARENT_KEY = 'parent';

// /////////////////////
// Normal Operations ///
// /////////////////////

/**
 * These params are used for normal {@link ElasticSearch} functions, such as
 * search/update/index.
 */
function MethodParams() {
  const params = new BaseParams();

  /**
   * requestTimeout parameter for {@link ElasticSearch}.
   */
  params.requestTimeout = 0;

  params.setRequestTimeout = function (timeout) {
    params.timeout = parseInt(timeout, 0) || 0;
  };

  params.getRequestTimeout = function () {
    return params.timeout || 0;
  };

  return params;
}

MethodParams.Builder = function (instance) {
  const builder = BaseParams.newBuilder(instance);

  builder.withRequestTimeout = function (timeout) {
    instance.setRequestTimeout(timeout);
    return builder;
  };

  return builder;
};

MethodParams.newBuilder = function (instance) {
  return MethodParams.Builder(instance);
};

function Update() {
  const params = new MethodParams();

  /**
   * Update via script.
   */
  params.script = {};

  /**
   * Update via doc.
   */
  params.doc = {};

  /**
   * Specify how many retries should be attempted on conflict. Defaults to 0.
   */
  params.retryOnConflict = 0;

  /**
   * The upsert value/object. If script update is used, this should be
   * an object, otherwise, a {@link Boolean} value.
   */
  params.upsert = {};

  params.setScriptUpdate = function (script) {
    if (script && Object.isInstance(script)) {
      params.script = script;
    }

    return params;
  };

  params.setDocUpdate = function (doc) {
    if (doc && Object.isInstance(doc)) {
      params.doc = doc;
    }

    return params;
  };

  params.setRetryOnConflict = function (retries) {
    params.retryOnConflict = parseInt(retries, 10);
    return params;
  };

  params.setUpsert = function (upsert) {
    if (Object.isInstance(upsert) || Boolean.isInstance(upsert)) {
      params.upsert = upsert;
    }

    return params;
  };

  params.getScriptUpdate = function () {
    return params.script || {};
  };

  params.getDocUpdate = function () {
    return params.doc || {};
  };

  params.getUpsert = function () {
    return params.upsert || {};
  };

  params.hasAllRequiredInformation = function () {
    switch (true) {
      case utils.isEmpty(params.getScriptUpdate()):
      case utils.isEmpty(params.getDocUpdate()):
      case !params.hasAllBaseInformation():
        Error.debugException(params);
        return false;

      default:
        break;
    }

    return true;
  };

  params.json = function () {
    const json = params.destinationJson();
    const body = {};

    const script = params.getScriptUpdate();
    const doc = params.getDocUpdate();
    const upsert = params.getUpsert();

    if (utils.isNotEmpty(script)) {
      const newScript = utils.clone(script);
      newScript.lang = 'painless';

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
}

Update.Builder = function () {
  const instance = new Update();
  const builder = MethodParams.newBuilder(instance);

  builder.withRetryOnConflict = function (retries) {
    instance.setRetryOnConflict(retries);
    return builder;
  };

  builder.withScriptUpdate = function (script) {
    instance.setScriptUpdate(script);
    return builder;
  };

  builder.withDocUpdate = function (doc) {
    instance.setDocUpdate(doc);
    return builder;
  };

  builder.withUpsert = function (upsert) {
    instance.setUpsert(upsert);
    return builder;
  };

  return builder;
};

Update.newBuilder = function () {
  return Update.Builder();
};

// ///////////////////
// Bulk Operations //
// ///////////////////

/**
 * These params are used for buik {@link ElasticSearch} operations, such as
 * bulk updating/indexing/deleting.
 */
function BaseBulk() {
  const params = new BaseParams();
  const hasAllBaseInformation = params.hasAllBaseInformation;

  params.hasAllBaseInformation = function () {
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

  params.destinationJson = function () {
    const json = {
      _index: params.getIndex(),
      _type: params.getType(),
      _id: params.getId(),
    };

    const parent = params.getParent();

    if (parent) {
      json.parent = parent;
    }

    return json;
  };

  return params;
}

function BulkUpdate() {
  const params = new BaseBulk();
  params.retryOnConflict = 0;
  params.update = {};

  params.setRetryOnConflict = function (retries) {
    params.retryOnConflict = parseInt(retries, 10);
    return params;
  };

  params.setUpdate = function (update) {
    if (Object.isInstance(update)) {
      params.update = update;
    }

    return params;
  };

  params.getRetryOnConflict = function () {
    return params.retryOnConflict || 0;
  };

  params.getUpdate = function () {
    return params.update || {};
  };

  params.hasAllRequiredInformation = function () {
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
   * Since the bulk api requires an {@link Array} of json objects, we pass the
   * current Request as a json {@link Array} instead of a single object.
   * @return {Array} An Array of json object.
   */
  params.jsonArray = function () {
    const json = params.destinationJson();
    json._retry_on_conflict = params.getRetryOnConflict();
    return [{ update: json }, params.getUpdate()];
  };

  return params;
}

BulkUpdate.Builder = function () {
  const instance = new BulkUpdate();
  const builder = BaseParams.newBuilder(instance);

  builder.withRetryOnConflict = function (retries) {
    instance.setRetryOnConflict(retries);
    return builder;
  };

  builder.withUpdate = function (update) {
    instance.setUpdate(update);
    return builder;
  };

  return builder;
};

BulkUpdate.newBuilder = function () {
  return BulkUpdate.Builder();
};

function BulkIndex() {
  const params = new BaseBulk();

  params.update = {};

  params.setUpdate = function (update) {
    if (Object.isInstance(update)) {
      params.update = update;
    }

    return params;
  };

  params.getUpdate = function () {
    return params.update || {};
  };

  params.hasAllRequiredInformation = function () {
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

  params.jsonArray = function () {
    return [{ index: params.destinationJson() }, params.getUpdate()];
  };

  return params;
}

BulkIndex.Builder = function () {
  const instance = new BulkIndex();
  const builder = BaseParams.newBuilder(instance);

  builder.withUpdate = function (update) {
    instance.setUpdate(update);
    return builder;
  };

  return builder;
};

BulkIndex.newBuilder = function () {
  return BulkIndex.Builder();
};

function BulkDelete() {
  const params = new BaseBulk();

  params.hasAllRequiredInformation = function () {
    switch (true) {
      case !params.hasAllBaseInformation():
        Error.debugException();
        return false;

      default:
        break;
    }

    return true;
  };

  params.jsonArray = function () {
    return [{ index: params.destinationJson() }];
  };

  return params;
}

BulkDelete.Builder = function () {
  const instance = new BulkDelete();
  const builder = BaseParams.newBuilder(instance);
  return builder;
};

BulkDelete.newBuilder = function () {
  return BulkDelete.Builder();
};

Params.Update = Update;
Params.BulkIndex = BulkIndex;
Params.BulkUpdate = BulkUpdate;
Params.BulkDelete = BulkDelete;

module.exports = Params;
