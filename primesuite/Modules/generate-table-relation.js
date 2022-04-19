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
    let genericDefinitions = `private Dictionary<string, List<RelationshipDescriptionBase>> _tableToRelationship = new();
        private readonly VersionedDeserializerFactory _versionedDeserializerFactory;
        private readonly IStorageAccess _storageAccess;
        private readonly List<string> _mandatoryTableRecords;
        private readonly ILogger _logger;

        private void AddRelationship(string name, List<RelationshipDescriptionBase> relationships)
        {
            _tableToRelationship.Add(name, relationships);
        }`
    return genericDefinitions;

}

let generateKeyPairs = (table) => {
    let content = ``;
    let keys = [];

    table.Relations.forEach((detail, index) => {
        let key = "";
        let value = `${table.FromTable.toLowerCase()}.Record.${detail.FromField}`;;

        if(detail.Value) {
            key = `record.${detail.Field.toLowerCase()}`;
            value = `"${detail.Value}"`;
        }else {
            key = `record.${detail.ToField.toLowerCase()}`;
        }
        
        content += `KeyPair key${index} = new("${key}", ${value});\n`;
        if(index < table.Relations.length-1) content+= '            '
        keys.push(`key${index}`);
    })

    content += `\n            return new List<KeyPair> { ${keys.join(", ")} };`;

    return content;
}

let generateRelationships = () => {

    let relationships = ``;

    config.Concept.TableRelationDetails.forEach(table => {

            let relation = `
    public class ${config.Concept.ConceptName}${table.FromTable}To${table.ToTable}Relationship : RelationshipDescription<${table.FromTable + config.version}, ${table.ToTable + config.version}>
    {
        public ${config.Concept.ConceptName}${table.FromTable}To${table.ToTable}Relationship() : base("${table.FromTable.toLowerCase()}", "${table.ToTable.toLowerCase()}")
        {
        }

        protected override IEnumerable<KeyPair> GetKeysOverride(DBRecordBase record)
        {
            var ${table.FromTable.toLowerCase()} = (${table.FromTable + config.version})record;

            ${generateKeyPairs(table)}

        }
    }`;

            relationships += `${relation}`;
    })

    return relationships;

}

let generateRelationshipCalls = () => {

    let relationshipCalls = ``;

    let relation = {};
    config.Concept.TableRelationDetails.forEach(table => {

        if (!relation[table.FromTable]) relation[table.FromTable] = [];
        table.Relations.forEach(detail => {
            if(!detail.Value) relation[table.FromTable].push(`new ${config.Concept.ConceptName}${table.FromTable}To${table.ToTable}Relationship()`)
        })
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

// module.exports = generateTableRelation;
generateTableRelation()