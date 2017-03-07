const
	baseDir = "../../../..",
	sharedDir = baseDir + "/node-common",
	sharedHandlerDir = sharedDir + "/handlers",
	sharedSearchDir = "..",
	languages = require(sharedDir + "/public/localization/languages.js"),
	utils = require(sharedHandlerDir + "/util/common.js"),
	Analyzer = require(sharedSearchDir + "/analyzer.js"),
	AnalyzerSet = require(sharedSearchDir + "/default/analyzerSet.js"),
	Field = require(sharedSearchDir + "/field.js"),
	Tokenizer = require(sharedSearchDir + "/tokenizer.js"),
	TokenFilter = require(sharedSearchDir + "/tokenFilter.js");

/* Default field sets for text fields */
function FieldSet() {};

FieldSet.Constant = {
	AUTOCOMPLETE_FIELD_NAME : "autocomplete",
	KEYWORD_FIELD_NAME : "keyword"
};

FieldSet.prototype.fields = function() {
	const instance = this;

	return utils.getKeys(instance)
		.map(key => instance[key])
		.filter(field => field)
		.filter(field => field.hasAllRequiredInformation());
};

FieldSet.autocomplete = function(args) {
	var fieldSet = new FieldSet();

	const fdConst = FieldSet.Constant, azConst = AnalyzerSet.Constant;

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

FieldSet.keyword = function(args) {
	var fieldSet = new FieldSet();
	const fdConst = FieldSet.Constant;

	fieldSet.keyword = Field.newBuilder()
		.withName(fdConst.KEYWORD_FIELD_NAME)
		.withType(Field.Type.KEYWORD.value)
		.isMultifield(true)
		.build();

	return fieldSet;
};

FieldSet.fromLanguage = function(args) {
	var fieldSet = new FieldSet();

	if (args && args.language) { 
		const 
			fdConst = FieldSet.Constant,
			azConst = AnalyzerSet.Constant,
			indexMode = Field.IndexMode.ANALYZED.value,
			language = args.language,

			fromLanguage = function(language) {
				const lArgs = {language : language.toLowerCase()};

				return Field.newBuilder()
					.withName(language)
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
			for (var i = 0, length = language.length; i < length; i++) {
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