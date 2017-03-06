const
	baseDir = "../../..",
	sharedDir = baseDir + "/nodecommon"
	sharedHandlerDir = sharedDir + "/handlers",
	utils = require(sharedHandlerDir + "/util/common.js");

const languages = {
	fromValue : function(args) {
		const 
			instance = this, 
			defValue = instance.EN_US,
			language = args.language;

		if (String.isInstance(language)) {
			const 
				keys = utils.getKeys(instance),
				filtered = keys
					.map(key => instance[key])
					.filter(lang => lang && lang.value == language);

			return filtered[0] || defValue;
		} else {
			Error.debugException();
			return defValue;
		}
	},

	EN_US : {
		value : "en-us"
	},

	VI_VN : {
		value : "vi-vn"
	}
};

module.exports = languages;