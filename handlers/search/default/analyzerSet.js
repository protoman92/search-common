const
	baseDir = "../../../..",
	sharedDir = baseDir + "/nodecommon",
	sharedHandlerDir = sharedDir + "/handlers",
	sharedSearchDir = sharedHandlerDir + "/search",
	languages = require(sharedDir + "/public/localization/languages.js"),
	utils = require(sharedHandlerDir + "/util/common.js"),
	Analyzer = require(sharedSearchDir + "/analyzer.js"),
	Tokenizer = require(sharedSearchDir + "/tokenizer.js"),
	TokenFilter = require(sharedSearchDir + "/tokenFilter.js");

/* Analyzer sets comprise language-specific analyzers */
function AnalyzerSet() {};

const
	EDGE_N_GRAM_MIN_GRAM = 1,
	EDGE_N_GRAM_MAX_GRAM = 20;

AnalyzerSet.Constant = {
	GENERAL_LANGUAGE_NAME : "general",

	STANDARD_ANALYZER_NAME : "standard",
	AUTOCOMPLETE_ANALYZER_NAME : "autocomplete",

	analyzerFromLanguage : function(args) {
		if (args) {
			const 
				language = args.language, 
				type = args.type,
				mode = args.mode;

			return [language, mode, type.toLowerCase()].join("-");
		}

		Error.debugException();
		return "";
	},

	INDEX : {
		analyzer : function(args) {
			var newArgs = args;
			newArgs.mode = "index";
			return AnalyzerSet.Constant.analyzerFromLanguage(newArgs);
		},

		autocompleteAnalyzer : function(args) {
			return this.analyzer({
				language : AnalyzerSet.Constant.GENERAL_LANGUAGE_NAME,
				type : AnalyzerSet.Constant.AUTOCOMPLETE_ANALYZER_NAME
			});
		},

		standardAnalyzer : function(args) {
			var newArgs = args;
			newArgs.type = AnalyzerSet.Constant.STANDARD_ANALYZER_NAME;
			return this.analyzer(newArgs);
		}
	},

	SEARCH : {
		analyzer : function(args) {
			var newArgs = args;
			newArgs.mode = "search";
			return AnalyzerSet.Constant.analyzerFromLanguage(newArgs);
		},

		autocompleteAnalyzer : function(args) {
			return this.analyzer({
				language : AnalyzerSet.Constant.GENERAL_LANGUAGE_NAME,
				type : AnalyzerSet.Constant.AUTOCOMPLETE_ANALYZER_NAME
			});
		},

		standardAnalyzer : function(args) {
			var newArgs = args;
			newArgs.type = AnalyzerSet.Constant.STANDARD_ANALYZER_NAME;
			return this.analyzer(newArgs);
		}
	}
};

AnalyzerSet.prototype.analyzers = function() {
	const instance = this;

	return utils.getKeys(instance)
		.map(key => instance[key])
		.filter(analyzer => analyzer)
		.filter(analyzer => analyzer.hasAllRequiredInformation());
};

AnalyzerSet.autocomplete = function() {
	var analyzerSet = new AnalyzerSet();

	const 
		constants = AnalyzerSet.Constant, 
		azDefaults = Analyzer.Default(),
		azTypes = Analyzer.Type,
		tkDefaults = Tokenizer.Default();

	analyzerSet.autocompleteSearch = Analyzer.newBuilder()
		.withName(constants.SEARCH.autocompleteAnalyzer({}))
		.withAnalyzer(azDefaults.ICU)
		.build();

	analyzerSet.autocompleteIndex = Analyzer.newBuilder()
		.withName(constants.INDEX.autocompleteAnalyzer({}))
		.withType(azTypes.CUSTOM.value)
		.withTokenizer(tkDefaults.ICU)
		.withTokenFilters([
			TokenFilter.Default().LOWERCASE,
			
			TokenFilter.newBuilder()
				.withName(constants.INDEX.autocompleteAnalyzer({}))
				.withType(TokenFilter.Type.EDGE_N_GRAM.value)
				.withAdditionalSettings(function() {
					var settings = {};
					const ngSettings = TokenFilter.Type.EDGE_N_GRAM;
					settings[ngSettings.MIN_GRAM.value] = EDGE_N_GRAM_MIN_GRAM;
					settings[ngSettings.MAX_GRAM.value] = EDGE_N_GRAM_MAX_GRAM;
					return settings;
				}())
				.build()
		])
		.build();

	return analyzerSet;
};

/* English */
AnalyzerSet.en_us = function() {
	var analyzerSet = new AnalyzerSet();

	const 
		constants = AnalyzerSet.Constant, 
		language = languages.EN_US.value,
		azDefaults = Analyzer.Default(),
		langArgs = {language : language};

	analyzerSet.standardIndex = Analyzer.newBuilder()
		.withName(constants.INDEX.standardAnalyzer(langArgs))
		.withAnalyzer(azDefaults.ICU)
		.build();

	analyzerSet.standardSearch = Analyzer.newBuilder()
		.withName(constants.SEARCH.standardAnalyzer(langArgs))
		.withAnalyzer(azDefaults.ICU)
		.build();

	return analyzerSet;
};

AnalyzerSet.vi_vn = function() {
	return AnalyzerSet.en_us();
};

AnalyzerSet.fromLanguage = function(args) {
	if (args && args.language) {
		const 
			az = AnalyzerSet,
			defSet = "en_us",
			language = args.language,

			fromLanguage = function(language) {
				const
					key = language.replace("_", "-").toLowerCase(),
					fcn = az[key] || az[defSet];

				if (Function.isInstance(fcn)) {
					return fcn();
				} else {
					return az[defSet]();
				}
			};

		if (String.isInstance(language) && language) {
			return fromLanguage(language);
		} else if (Array.isInstance(language)) {
			var analyzerSet = new AnalyzerSet();

			for (var i = 0, length = language.length; i < length; i++) {
				const lang = language[i];

				if (String.isInstance(lang) && lang) {
					const 
						set = fromLanguage(lang),  
						keys = utils.getKeys(set);

					for (j = 0, kLength = keys.length; j < kLength; j++) {
						const key = keys[j];
						analyzerSet[lang + "-" + key] = set[key];
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