/**
 * To avoid problems with circular dependencies, we export this function
 * instead of directly initializing it.
 */
module.exports = () => {
  const sharedSearchDir = __dirname;
  const sharedSearchModelDir = `${sharedSearchDir}/model`;
  const Aggregation = require(`${sharedSearchModelDir}/aggregation.js`);
  const Analyzer = require(`${sharedSearchModelDir}/analyzer.js`);
  const AnalyzerSet = require(`${sharedSearchModelDir}/analyzerSet.js`);
  const CharFilter = require(`${sharedSearchModelDir}/charFilter.js`);
  const Client = require(`${sharedSearchDir}/search.js`);
  const Field = require(`${sharedSearchModelDir}/field.js`);
  const FieldSet = require(`${sharedSearchModelDir}/fieldSet.js`);
  const Index = require(`${sharedSearchModelDir}/index.js`);
  const Mapping = require(`${sharedSearchModelDir}/mapping.js`);
  const Params = require(`${sharedSearchModelDir}/params.js`);
  const Reindex = require(`${sharedSearchModelDir}/reindex.js`);
  const SearchItem = require(`${sharedSearchModelDir}/searchItem.js`);
  const SearchResult = require(`${sharedSearchModelDir}/searchResult.js`);
  const Sort = require(`${sharedSearchModelDir}/sort.js`);
  const TokenFilter = require(`${sharedSearchModelDir}/tokenFilter.js`);
  const Tokenizer = require(`${sharedSearchModelDir}/tokenizer.js`);
  const Type = require(`${sharedSearchModelDir}/type.js`);

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
