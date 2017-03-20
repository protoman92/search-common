// @flow

const AnalyzerSet = require('./ESAnalyzerSet.js');
const Field = require('./ESField.js');
const { utils } = require('../../../../node-common/lib/util');

/* Default field sets for text fields */
function FieldSet() {}

FieldSet.Constant = {
  AUTOCOMPLETE_FIELD_NAME: 'autocomplete',
  KEYWORD_FIELD_NAME: 'keyword',
  LANGUAGE_FIELD_PREFIX: 'lang',
};

FieldSet.prototype.fields = function () {
  const instance = this;

  return utils.getKeys(instance)
    .map(key => instance[key])
    .filter(field => field)
    .filter(field => field.hasAllRequiredInformation());
};
/**
 * Get a list of language fields for a single field name. This list is based
 * on an {@link Array} of language codes, each of which is appended to the
 * end of the field name.
 * @param  {object} args This parameter must contain the language and name
 * keys. The language key represents an Array of language codes, or a single
 * {@link String}
 * @return {Array} An Array of field names.
 */
FieldSet.fieldNameFromLanguage = function (args) {
  if (args && args.language && args.name && String.isInstance(args.name)) {
    const name = args.name;
    let supported;

    if (Array.isInstance(args.language)) {
      supported = args.language;
    } else {
      supported = [args.language];
    }

    return supported.map(lang => [
      name,
      FieldSet.Constant.LANGUAGE_FIELD_PREFIX,
      lang.toLowerCase(),
    ].join('_'));
  }

  Error.debugException(args);
  return [];
};

FieldSet.autocomplete = function (args) {
  const fieldSet = new FieldSet();
  const fdConst = FieldSet.Constant;
  const azConst = AnalyzerSet.Constant;

  fieldSet.autocomplete = Field.newBuilder()
    .withName(fdConst.AUTOCOMPLETE_FIELD_NAME)
    .withType(Field.Type.TEXT.value)
    .withIndexAnalyzer(azConst.INDEX.autocompleteAnalyzer({}))
    .withSearchAnalyzer(azConst.SEARCH.autocompleteAnalyzer({}))
    .withIndexMode(Field.IndexMode.ANALYZED.value)
    .isMultifield(true)
    .build();

  return fieldSet;
};

FieldSet.keyword = function (args) {
  const fieldSet = new FieldSet();
  const fdConst = FieldSet.Constant;

  fieldSet.keyword = Field.newBuilder()
    .withName(fdConst.KEYWORD_FIELD_NAME)
    .withType(Field.Type.KEYWORD.value)
    .isMultifield(true)
    .build();

  return fieldSet;
};

FieldSet.fromLanguage = function (args) {
  const fieldSet = new FieldSet();

  if (args && args.language) {
    const azConst = AnalyzerSet.Constant;
    const indexMode = Field.IndexMode.ANALYZED.value;
    const language = args.language;
    const prefix = FieldSet.Constant.LANGUAGE_FIELD_PREFIX;

    const fromLanguage = function (lang) {
      const lArgs = { language: lang.toLowerCase() };

      return Field.newBuilder()
        .withName([prefix, lang].join('_'))
        .withType(Field.Type.TEXT.value)
        .withIndexAnalyzer(azConst.INDEX.standardAnalyzer(lArgs))
        .withSearchAnalyzer(azConst.SEARCH.standardAnalyzer(lArgs))
        .withIndexMode(indexMode)
        .isMultifield(true)
        .build();
    };

    if (String.isInstance(language) && language) {
      fieldSet[language] = fromLanguage(language);
    } else if (Array.isInstance(language)) {
      for (let i = 0, length = language.length; i < length; i++) {
        const lang = language[i];

        if (String.isInstance(lang) && lang) {
          fieldSet[lang] = fromLanguage(lang);
        }
      }
    }
  }

  return fieldSet;
};

module.exports = FieldSet;
