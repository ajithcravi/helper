let fs = require('fs');

let config = require('../Configuration/config.json');

let generateImports = () => {

    let importStatements = `using ${config.NameSpace.Models};
using ${config.library.Linq};
using ${config.NameSpace.FrameworkBaseClasses};
using ${config.NameSpace.FrameworkInterfaces};
using ${config.NameSpace.FrameworkLogic};
using ${config.NameSpace.FrameworkModels};
using ILogger = ${config.NameSpace.Logger};

`;

    return importStatements;

}

let generateResourceTableClassGenericDefinitions = () => {
    let genericDefinitions = `private Dictionary <string, List <RelationshipDescriptionBase>> _tableToRelationship = new();
        private readonly VersionedDeserializerFactory _versionedDeserializerFactory;
        private readonly IStorageAccess _storageAccess;
        private readonly List <string> _mandatoryTableRecords;
        private readonly ILogger _logger;

        private void AddRelationship(string name, List<RelationshipDescriptionBase> relationships)
        {
            _tableToRelationship.Add(name, relationships);
        }`
    return genericDefinitions;

}

let generateRelationships = () => {

    let relationships = ``;

    config.Concept.TableRelationDetails.forEach(table => {
        table.Relations.forEach(detail => {

            let relation = `
    public class ${detail.From}To${detail.To}Relationship : RelationshipDescription<${detail.From + config.version}, ${detail.To + config.version}>
    {
        public ${detail.From}To${detail.To}Relationship() : base("${detail.From.toLowerCase()}", "${detail.To.toLowerCase()}")
        {
        }

        protected override IEnumerable<KeyPair> GetKeysOverride(DBRecordBase record)
        {
            var ${detail.From.toLowerCase()} = (${detail.From + config.version})record;
            KeyPair key = new("record.${detail.ToField.toLowerCase()}", ${detail.From.toLowerCase()}.Record.${detail.FromField});

            return new List<KeyPair> { key };
        }
    }`;

            relationships += `${relation}`;

        })
    })

    return relationships;

}

let generateRelationshipCalls = () => {

    let relationshipCalls = ``;

    let relation = {};
    config.Concept.TableRelationDetails.forEach(table => {

        if (!relation[table.TableName]) relation[table.TableName] = [];
        table.Relations.forEach(detail => relation[detail.From].push(`new ${detail.From}To${detail.To}Relationship()`))

    })

    Object.keys(relation).forEach(key => {
        let call = `    AddRelationship("${key.toLowerCase()}", new List<RelationshipDescriptionBase>()
            {
                ${relation[key].join(",\n                ")}
            });`

        relationshipCalls += `
        ${call}`
    })

    return relationshipCalls;
}

let generateMandatoryTableRecords = () => {
    let mandatoryTableRecords = ``;

    config.Concept.MandatoryTableRecords.forEach(tableName => mandatoryTableRecords += `                "${tableName.toLowerCase()}",\n`);

    return mandatoryTableRecords;
}

let generateResourceTableInitializer = () => {
    let resourceTableInitializer = `public ${config.Concept.ConceptName}ResourceTables(VersionedDeserializerFactory versionedDeserializerFactory,
            IStorageAccess storageAccess, ILogger logger) : base("${config.Concept.ConceptName.toLowerCase()}", versionedDeserializerFactory, storageAccess)
        {
            _versionedDeserializerFactory = versionedDeserializerFactory;
            _storageAccess = storageAccess;
            _logger = logger;
${generateRelationshipCalls()}

            _mandatoryTableRecords = new List<string>()
            {
${generateMandatoryTableRecords()}
            };
        }`
    return resourceTableInitializer;

}

let generateGetAllRecordsOverride = () => {
    let overrideClass = `public override async Task<GetAllRecordsResult> GetAllRecordsNeededForResource(DBRecordBase changedRecord)
        {
            _logger.LogInformation("Fetching all records needed for ${config.EhrSystem} ${config.Concept.ConceptName} Resource");

            var retrievedRecords = new List<DBRecordBase> { changedRecord };
            for (int i = 0; i < retrievedRecords.Count; i++)
            {
                if (_tableToRelationship.ContainsKey(retrievedRecords[i].Metadata.Tablename))
                {
                    var foundRelationships = _tableToRelationship[retrievedRecords[i].Metadata.Tablename];
                    foreach (var foundRelationship in foundRelationships)
                    {
                        if (!retrievedRecords.Any(x => x.Metadata.Tablename == foundRelationship.TargetTable))
                        {
                            var relatedRecord = retrievedRecords.
                                Where(x => x.Metadata.Tablename == foundRelationship.SourceTable).
                                FirstOrDefault();
                            if (relatedRecord != null)
                            {
                                var key = foundRelationship.GetKeys(relatedRecord);
                                var rawRecords = _storageAccess
                                    .GetRecords<DBRecordBase>(EHRType.${config.EhrSystem}, foundRelationship.TargetTable, key).Result;
                                if (rawRecords != null)
                                    foreach (var rawRecord in rawRecords)
                                    {
                                        var record = _versionedDeserializerFactory.Deserialize(rawRecord);
                                        retrievedRecords.Add(record);
                                    }
                            }
                        }
                    }
                }
            }

            //TODO:: Modify this logic to check mandatory table records for the resource, by table name instead of count
            bool hasRequiredRecords = !_mandatoryTableRecords.Except(retrievedRecords.Select(x => x.Metadata.Tablename).Distinct().ToList()).Any();
            if (hasRequiredRecords)
            {
                _logger.LogInformation("Fetched all records needed for ${config.EhrSystem} ${config.Concept.ConceptName} Resource");
                return new GetAllRecordsResult(retrievedRecords, ResourceName, GetAllRecordsStatus.RecordSetComplete);
            }

            _logger.LogInformation("Mandatory records missing for ${config.EhrSystem} ${config.Concept.ConceptName} Resource");
            return new GetAllRecordsResult(retrievedRecords, ResourceName, GetAllRecordsStatus.RecordSetIncomplete);
        }`

    return overrideClass

}

let generateResourceTableClass = () => {

    let resourceTableClass = `namespace ${config.NameSpace.TableRelations}
{
    public class ${config.Concept.ConceptName}ResourceTables : TablesForResourceBase
    {
        ${generateResourceTableClassGenericDefinitions()}
        ${generateResourceTableInitializer()}
        ${generateGetAllRecordsOverride()}
    }
${generateRelationships()}
}
`;

    return resourceTableClass;

}

let generateTableRelation = () => {

    try {

        let filePath = config.BaseLocation + config.FileLocation.TableRelations + config.EhrSystem + config.Concept.ConceptName + "ResourceTables" + config.FileFormats.cs;

        if (config.EhrSystem === 'Intergy')
            filePath = config.BaseLocation + config.FileLocation.TableRelations + config.Concept.ConceptName + "ResourceTables" + config.FileFormats.cs;

        if (fs.existsSync(filePath)) {
            console.log(`Table Relation Exists | Path: ${filePath}\n`);
        } else {
            console.log(`Generating Table Relation | Path: ${filePath}`);

            let tableRelationsContent = generateImports() + generateResourceTableClass();

            fs.writeFileSync(filePath, tableRelationsContent);
            console.log('Table Relation Generated Successfully\n')
        }

    } catch (error) {
        console.log(`ERROR : GENERATING TABLE RELATION : ${error}\n`)
    }

}

module.exports = generateTableRelation;