// @flow

const Client = require('./ESClient');
const models = require('./model');

const values = { Client };
Object.assign(values, models);
module.exports = values;
