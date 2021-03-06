const { environment: env } = require('../../../node-common/lib/util');

const main = exports;

/**
 * We expect that our deployment will have two config vars called
 * ELASTICSEARCH_(DEBUG/RELEASE)_VERSION.
 * @return {String} The current version number.
 */
exports.currentVersion = function () {
  let version;

  if (env.isDebugging()) {
    version = process.env.ELASTICSEARCH_DEBUG_VERSION;
  } else {
    version = process.env.ELASTICSEARCH_RELEASE_VERSION;
  }

  return version || '5.0';
};

/**
 * Version 2.x and 5.x differs in several aspects, so we need to check the
 * current version whenever possible to determine which set of APIs to use.
 * @return {Boolean} Whether the current version matches 2.x.
 */
exports.isVersion2x = function () {
  return /^2.\w+/.exec(main.currentVersion());
};

/**
 * Version 2.x and 5.x differs in several aspects, so we need to check the
 * current version whenever possible to determine which set of APIs to use.
 * @return {Boolean} Whether the current version matches 5.x.
 */
exports.isVersion5x = function () {
  return /^5.\w+/.exec(main.currentVersion());
};
