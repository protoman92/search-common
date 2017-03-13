const { languages } = require('../../../../node-common/public/localization');
const { utils } = require('../../../../node-common/handlers/util');

/* Analyzer sets comprise language-specific analyzers */
function AnalyzerSet() {}

const EDGE_N_GRAM_MIN_GRAM = 1;
const EDGE_N_GRAM_MAX_GRAM = 20;

AnalyzerSet.Constant = {
  GENERAL_LANGUAGE_NAME: 'general',

  STANDARD_ANALYZER_NAME: 'standard',
  AUTOCOMPLETE_ANALYZER_NAME: 'autocomplete',

  analyzerFromLanguage(args) {
    if (args) {
      const language = args.language;
      const type = args.type;
      const mode = args.mode;
      return [language, mode, type.toLowerCase()].join('_');
    }

    Error.debugException();
    return '';
  },

  INDEX: {
    analyzer(args) {
      const newArgs = args;
      newArgs.mode = 'index';
      return AnalyzerSet.Constant.analyzerFromLanguage(newArgs);
    },

    autocompleteAnalyzer(args) {
      return this.analyzer({
        language: AnalyzerSet.Constant.GENERAL_LANGUAGE_NAME,
        type: AnalyzerSet.Constant.AUTOCOMPLETE_ANALYZER_NAME,
      });
    },

    standardAnalyzer(args) {
      const newArgs = args;
      newArgs.type = AnalyzerSet.Constant.STANDARD_ANALYZER_NAME;
      return this.analyzer(newArgs);
    },
  },

  SEARCH: {
    analyzer(args) {
      const newArgs = args;
      newArgs.mode = 'search';
      return AnalyzerSet.Constant.analyzerFromLanguage(newArgs);
    },

    autocompleteAnalyzer(args) {
      return this.analyzer({
        language: AnalyzerSet.Constant.GENERAL_LANGUAGE_NAME,
        type: AnalyzerSet.Constant.AUTOCOMPLETE_ANALYZER_NAME,
      });
    },

    standardAnalyzer(args) {
      const newArgs = args;
      newArgs.type = AnalyzerSet.Constant.STANDARD_ANALYZER_NAME;
      return this.analyzer(newArgs);
    },
  },
};

AnalyzerSet.prototype.analyzers = function () {
  const instance = this;

  return utils.getKeys(instance)
    .map(key => instance[key])
    .filter(analyzer => analyzer)
    .filter(analyzer => analyzer.hasAllRequiredInformation());
};

AnalyzerSet.autocomplete = function () {
  const {
    Analyzer,
    Tokenizer,
    TokenFilter,
  } = require('..')();

  const analyzerSet = new AnalyzerSet();
  const constants = AnalyzerSet.Constant;
  const azDefaults = Analyzer.Default();
  const azTypes = Analyzer.Type;
  const tkDefaults = Tokenizer.Default();
  const tkfDefaults = TokenFilter.Default();

  analyzerSet.autocompleteSearch = Analyzer.newBuilder()
    .withName(constants.SEARCH.autocompleteAnalyzer({}))

    /**
     * icu analyzer seems to work well for most languages, even
     * non-supported Asian texts (e.g. Vietnamese)
     */
    .withAnalyzer(azDefaults.ICU)
    .build();

  analyzerSet.autocompleteIndex = Analyzer.newBuilder()
    .withName(constants.INDEX.autocompleteAnalyzer({}))
    .withType(azTypes.CUSTOM.value)
    .withTokenizer(tkDefaults.ICU)
    .withTokenFilters([
      /**
       * We need to use icu_folding to convert tokens into a similar
       * format as found in the autocomplete search analyzer.
       */
      tkfDefaults.ICU_FOLDING,

      TokenFilter.newBuilder()
        .withName(constants.INDEX.autocompleteAnalyzer({}))
        .withType(TokenFilter.Type.EDGE_N_GRAM.value)
        .withAdditionalSettings(function () {
          const settings = {};
          const ngSettings = TokenFilter.Type.EDGE_N_GRAM;
          settings[ngSettings.MIN_GRAM.value] = EDGE_N_GRAM_MIN_GRAM;
          settings[ngSettings.MAX_GRAM.value] = EDGE_N_GRAM_MAX_GRAM;
          return settings;
        }())
        .build(),
    ])
    .build();

  return analyzerSet;
};
/**
 * The default {@link Analyzer} implementation for many different languages.
 * This set primarily uses ICU tokenizer and folding filter to handle both
 * Latin-based and Asian languages.
 * @param  {object} args This parameter must contain the language key that
 * identifies a language code to append to the analyzer names.
 */
AnalyzerSet.defaultLanguageSet = function (args) {
  const { Analyzer } = require('..')();
  const analyzerSet = new AnalyzerSet();
  const constants = AnalyzerSet.Constant;
  const azDefaults = Analyzer.Default();

  analyzerSet.standardIndex = Analyzer.newBuilder()
    .withName(constants.INDEX.standardAnalyzer(args))
    .withAnalyzer(azDefaults.ICU)
    .build();

  analyzerSet.standardSearch = Analyzer.newBuilder()
    .withName(constants.SEARCH.standardAnalyzer(args))
    .withAnalyzer(azDefaults.ICU)
    .build();

  return analyzerSet;
};

/* English */
AnalyzerSet.en_us = function () {
  return AnalyzerSet.defaultLanguageSet({ language: languages.EN_US.value });
};

AnalyzerSet.vi_vn = function () {
  return AnalyzerSet.defaultLanguageSet({ language: languages.VI_VN.value });
};

AnalyzerSet.fromLanguage = function (args) {
  const az = AnalyzerSet;
  const defSet = 'en_us';

  if (args && args.language) {
    const language = args.language;

    const fromLanguage = function (language) {
      const key = language.toLowerCase();
      const fcn = az[key] || az[defSet];

      if (Function.isInstance(fcn)) {
        return fcn();
      }

      return az[defSet]();
    };

    if (String.isInstance(language) && language) {
      return fromLanguage(language);
    } else if (Array.isInstance(language)) {
      const analyzerSet = new AnalyzerSet();

      for (let i = 0, length = language.length; i < length; i++) {
        const lang = language[i];

        if (String.isInstance(lang) && lang) {
          const set = fromLanguage(lang);
          const keys = utils.getKeys(set);

          for (let j = 0, kLength = keys.length; j < kLength; j++) {
            const key = keys[j];
            analyzerSet[`${lang}-${key}`] = set[key];
          }
        }
      }

      return analyzerSet;
    }
  }

  Error.debugException();
  return az[defSet]();
};

module.exports = AnalyzerSet;
