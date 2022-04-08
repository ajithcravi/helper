let fs = require('fs');

let config = require('../Configuration/config.json');

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
        public ${config.Concept.ConceptName}ResourceTableTests()
        {
            var mockVersionSerialization =
                new Mock<Dictionary<EHRType, Dictionary<string, SerializationFactoryBase>>>();
            mockVersionSerialization.Object.Add(EHRType.${config.EhrSystem}, new Dictionary<string, SerializationFactoryBase>()
            {
                {
                     "12.40.00_10", new V12_40_00_10SerializationFactory()
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

    config.Concept.MandatoryTableRecords.forEach(tableName => {
        let mock = `\n            string serialized${tableName} = FileHelper.ReadMockJsonFile("${config.Concept.ConceptName.toLowerCase()}-${tableName.toLowerCase()}.json");
            _storageAccess.Setup(x => x.GetRecords < DBRecordBase > (It.IsAny < EHRType > (), "${tableName.toLowerCase()}",
            It.IsAny < IEnumerable < KeyPair >> ()).Result).Returns(new List < string > () { serialized${tableName} });
`
        mockTablesStatement += mock;

    })

    return mockTablesStatement;
}

let generateTestStatements = () => {
    let testStatements = ``;

    config.Concept.MandatoryTableRecords.forEach(tableName => {
        sucessStatement = `\n        [Fact]
        public async void ${config.Concept.ConceptName.toLowerCase()}ResourceTables_CallsGetAllRecordsNeededForResource_ShouldReturnComplete_With${tableName}Change()
        {
            var ${config.Concept.ConceptName.toLowerCase()}ResourceTables =
                new ${config.Concept.ConceptName}ResourceTables(_mockVersionSerializationFactory.Object, _storageAccess.Object, _logger.Object);
${generateMockTables()}

            var mockChanged${config.Concept.ConceptName}Record = new Mock<${tableName}01>().SetupAllProperties();
            var resultForChanged${config.Concept.ConceptName}Record =
                await ${config.Concept.ConceptName.toLowerCase()}ResourceTables.GetAllRecordsNeededForResource(mockChanged${config.Concept.ConceptName}Record.Object);
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
            mockChanged${config.Concept.ConceptName}Record.Object.Id = "wrongId";
            var resultForChanged${config.Concept.ConceptName}Record =
                await ${config.Concept.ConceptName.toLowerCase()}ResourceTables.GetAllRecordsNeededForResource(mockChanged${config.Concept.ConceptName}Record.Object);
        }
`
    testStatements += failureStatement

    return testStatements;
}

let generateResourceTableTestClass = () => {
    let resourceTableTestClass = `namespace ${config.NameSpace.TableRelationsTest}
{
    [ExcludeFromCodeCoverage]
    public class ${config.Concept.ConceptName}ResourceTableTests
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
        let filePath = config.BaseLocation + config.FileLocation.TableRelationsTest + config.Concept.ConceptName + "ResourceTablesTests" + config.FileFormats.cs;

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

module.exports = generateTableRelationTest;