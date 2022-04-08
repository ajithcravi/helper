let generateModel = require('./Modules/generate-model');
let generateSerialization = require('./Modules/generate-serialization');
let configureDeserializer = require('./Modules/configure-deserialization');
let generateTableRelation = require('./Modules/generate-table-relation');
let copyMockData = require('./Modules/copy-mock-data');
let generateTableRelationTest = require('./Modules/generate-table-relation-test');
let generateTransform = require('./Modules/generate-transform');

generateModel();
generateSerialization();
configureDeserializer();
generateTableRelation();
copyMockData();
generateTableRelationTest();
generateTransform();