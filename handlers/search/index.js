/**
 * To avoid problems with circular dependencies, we export this function
 * instead of directly initializing it.
 */
module.exports = () => {
  const Aggregation = require('./model/aggregation.js');
  const Analyzer = require('./model/analyzer.js');
  const AnalyzerSet = require('./model/analyzerSet.js');
  const CharFilter = require('./model/charFilter.js');
  const Client = require('./search.js');
  const Field = require('./model/field.js');
  const FieldSet = require('./model/fieldSet.js');
  const Index = require('./model/index.js');
  const Mapping = require('./model/mapping.js');
  const Params = require('./model/params.js');
  const Reindex = require('./model/reindex.js');
  const SearchItem = require('./model/searchItem.js');
  const SearchResult = require('./model/searchResult.js');
  const Sort = require('./model/sort.js');
  const TokenFilter = require('./model/tokenFilter.js');
  const Tokenizer = require('./model/tokenizer.js');
  const Type = require('./model/type.js');

  return {
    Aggregation,
    Analyzer,
    AnalyzerSet,
    CharFilter,
    Client,
    Field,
    FieldSet,
    Index,
    Mapping,
    Params,
    Reindex,
    SearchItem,
    SearchResult,
    Sort,
    TokenFilter,
    Tokenizer,
    Type,
  };
};
