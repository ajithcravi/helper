let fs = require('fs');

let config = require('../Configuration/config.json');

let serializationFactory = config.EhrSystem === 'Intergy' ? `V${config.SchemaVersion}SerializationFactory()` : `V${config.SchemaVersion + config.EhrSystem}SerializationFactory()`;

let fromTableBuffer = "";
let toTableBuffer = "";

let generateImports = () => {

    let importStatements = `using ${config.NameSpace.Deserializer};
using ${config.NameSpace.Models};
using ${config.NameSpace.TableRelations};
using ${config.NameSpace.FrameworkBaseClasses};
using ${config.NameSpace.FrameworkLogic};
using ${config.NameSpace.FrameworkModels};
using ${config.library.Xunit};
using ${config.library.Moq};
using ${config.library.CodeAnalysis};
using ${config.library.Generic};
using ${config.NameSpace.FrameworkInterfaces};
using ${config.NameSpace.TestLogger};
using ${config.NameSpace.TestHelper};

`;

    return importStatements;

}

let generateResourceTableTestClassGenericDefinitions = () => {
    let genericDefinitions = `private readonly Mock<VersionedDeserializerFactory> _mockVersionSerializationFactory;
        private readonly Mock<IStorageAccess> _storageAccess;
        private readonly Mock<ILogger> _logger;
        public ${config.EhrSystem === 'Intergy' ? "" : config.EhrSystem}${config.Concept.ConceptName}ResourceTableTests()
        {
            var mockVersionSerialization =
                new Mock<Dictionary<EHRType, Dictionary<string, SerializationFactoryBase>>>();
            mockVersionSerialization.Object.Add(EHRType.${config.EhrSystem}, new Dictionary<string, SerializationFactoryBase>()
            {
                {
                     "${config.SchemaVersion.split("_").join(".")}", new ${serializationFactory}
                }
            });
            _mockVersionSerializationFactory = new Mock<VersionedDeserializerFactory>(mockVersionSerialization.Object);
            _storageAccess = new Mock<IStorageAccess>();
            _logger = new Mock<ILogger>();
        }`
    return genericDefinitions;

}

let generateMockTables = () => {
    let mockTablesStatement = ``;

    config.Concept.TableDetails.Tables.forEach(table => {
        let mock = `\n            string serialized${table.TableName} = FileHelper.ReadMockJsonFile("${config.Concept.ConceptName.toLowerCase()}-${table.TableName.toLowerCase()}.json");
            _storageAccess.Setup(x => x.GetRecords < DBRecordBase > (It.IsAny < EHRType > (), "${table.TableName.toLowerCase()}",
            It.IsAny < IEnumerable < KeyPair >> ()).Result).Returns(new List < string > () { serialized${table.TableName} });
`
        mockTablesStatement += mock;

    })

    return mockTablesStatement;
}

let generateChangedValuesDefinitions = (relations) => {
    let definitions = ``;
    relations.forEach(relation => {
        if(relation.ToField) {
            let value = require(`../MockData/${config.Concept.ConceptName}/${config.Concept.ConceptName.toLowerCase()}-${toTableBuffer.toLowerCase()}`).record[relation.ToField.toLowerCase()]
            if (!value) throw Error(`Change record value cannot be null/undefined. Please check table: ${toTableBuffer.toLowerCase()} field: ${relation.ToField}`)
            let definition = `mockChanged${config.Concept.ConceptName}Record.Object.Record.${relation.FromField} = "${value}";`
    
            definitions += `\n            ${definition}`
        }
    })

    return definitions;
}

let generateTestStatements = () => {
    let testStatements = ``;

    config.Concept.TableRelationDetails.forEach(table => {
        fromTableBuffer = table.FromTable;
        toTableBuffer = table.ToTable;

        sucessStatement = `\n        [Fact]
        public async void ${config.Concept.ConceptName.toLowerCase()}ResourceTables_CallsGetAllRecordsNeededForResource_ShouldReturnComplete_With${table.FromTable}Change()
        {
            var ${config.Concept.ConceptName.toLowerCase()}ResourceTables =
                new ${config.Concept.ConceptName}ResourceTables(_mockVersionSerializationFactory.Object, _storageAccess.Object, _logger.Object);
${generateMockTables()}
            var mockChanged${config.Concept.ConceptName}Record = new Mock<${table.FromTable}01>().SetupAllProperties();
            mockChanged${config.Concept.ConceptName}Record.Object.Id = "12345";
            mockChanged${config.Concept.ConceptName}Record.Object.Metadata.Tablename = "${table.FromTable.toLowerCase()}";
${generateChangedValuesDefinitions(table.Relations)}

            var resultForChanged${config.Concept.ConceptName}Record =
                await ${config.Concept.ConceptName.toLowerCase()}ResourceTables.GetAllRecordsNeededForResource(mockChanged${config.Concept.ConceptName}Record.Object);
            Assert.Equal(GetAllRecordsStatus.RecordSetComplete, resultForChanged${config.Concept.ConceptName}Record.Status);
        }
`

        testStatements += sucessStatement
    })

    let failureStatement = `\n        [Fact]
        public async void ${config.Concept.ConceptName.toLowerCase()}ResourceTables_CallsGetAllRecordsNeededForResource_ShouldReturnIncomplete()
        {
            var ${config.Concept.ConceptName.toLowerCase()}ResourceTables =
                new ${config.Concept.ConceptName}ResourceTables(_mockVersionSerializationFactory.Object, _storageAccess.Object, _logger.Object);
${generateMockTables()}
            var mockChanged${config.Concept.ConceptName}Record = new Mock<${config.Concept.MandatoryTableRecords[0]}01>().SetupAllProperties();
            mockChanged${config.Concept.ConceptName}Record.Object.Id = "12345";
            mockChanged${config.Concept.ConceptName}Record.Object.Metadata.Tablename = "wrongtable";
            var resultForChanged${config.Concept.ConceptName}Record =
                await ${config.Concept.ConceptName.toLowerCase()}ResourceTables.GetAllRecordsNeededForResource(mockChanged${config.Concept.ConceptName}Record.Object);
            Assert.Equal(GetAllRecordsStatus.RecordSetIncomplete, resultForChanged${config.Concept.ConceptName}Record.Status);
        }
`
    testStatements += failureStatement

    return testStatements;
}

let generateResourceTableTestClass = () => {
    let resourceTableTestClass = `namespace ${config.NameSpace.TableRelationsTest}
{
    [ExcludeFromCodeCoverage]
    public class ${config.EhrSystem === 'Intergy' ? "" : config.EhrSystem}${config.Concept.ConceptName}ResourceTableTests
    {
        ${generateResourceTableTestClassGenericDefinitions()}
${generateTestStatements()}
    }
}
`;

    return resourceTableTestClass;
}

let generateTableRelationTest = () => {
    try {

        let filePath = config.BaseLocation + config.FileLocation.TableRelationsTest + config.EhrSystem + config.Concept.ConceptName + "ResourceTablesTests" + config.FileFormats.cs;

        if (config.EhrSystem === 'Intergy')
            filePath = config.BaseLocation + config.FileLocation.TableRelationsTest + config.Concept.ConceptName + "ResourceTablesTests" + config.FileFormats.cs;

        if (fs.existsSync(filePath)) {
            console.log(`Table Relation Test Exists | Path: ${filePath}\n`);
        } else {
            console.log(`Generating Table Relation Test | Path: ${filePath}`);

            let tableRelationsContent = generateImports() + generateResourceTableTestClass();

            fs.writeFileSync(filePath, tableRelationsContent);
            console.log('Table Relation Test Generated Successfully\n')
        }

    } catch (error) {
        console.log(`ERROR : GENERATING TABLE RELATION TEST : ${error}\n`)
    }
}

// module.exports = generateTableRelationTest;
generateTableRelationTest()