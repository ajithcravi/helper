const generateModel = require('./Modules/generate-model')
const generateSerialization = require('./Modules/generate-serialization')
const configureDeserializer = require('./Modules/configure-deserialization')
const generateTableRelation = require('./Modules/generate-table-relation')
const generateTableRelationTest = require('./Modules/generate-table-relation-test');
const generateTransformer = require('./Modules/generate-transformer');

generateModel();
generateSerialization();
configureDeserializer();
generateTableRelation();
generateTableRelationTest();
generateTransformer();