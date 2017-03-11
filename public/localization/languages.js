const baseDir = '../../..';
const sharedDir = `${baseDir}/node-common`;
const sharedHandlerDir = `${sharedDir}/handlers`;
const utils = require(`${sharedHandlerDir}/util/common.js`);

const languages = {
  fromValue(args) {
    const instance = this;
    const defValue = instance.EN_US;
    const language = args.language;

    if (String.isInstance(language)) {
      const keys = utils.getKeys(instance);

      const filtered = keys
        .map(key => instance[key])
        .filter(lang => lang && lang.value === language);

      return filtered[0] || defValue;
    }

    Error.debugException();
    return defValue;
  },

  EN_US: {
    value: 'en_us',
  },

  VI_VN: {
    value: 'vi_vn',
  },
};

module.exports = languages;
