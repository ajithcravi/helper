let fs = require('fs');

let config = require('../Configuration/config.json');

let generateImports = () => {

    let importStatements = `using ${config.NameSpace.FrameworkBaseClasses};
using ${config.NameSpace.FrameworkModels};
using ${config.library.FhirModels};
using ${config.NameSpace.Models};
using ${config.NameSpace.FrameworkHelpers};
using ${config.NameSpace.FrameworkInterfaces};
using ${config.NameSpace.TransformerCoreInterfaces};
using ILogger = ${config.NameSpace.Logger};

`;

    return importStatements;

}

let generateTransformerClassGenericDefinitions = () => {
    let genericDefinitions = `private readonly ILogger _logger;
        private readonly IGenerateRelationKeyHelper _generateRelationKey;
        public ${config.EhrSystem + config.Concept.ConceptName}Transformer(ILogger logger, IGenerateRelationKeyHelper generateRelationKey)
        {
            _logger = logger;
            _generateRelationKey = generateRelationKey;
        }`
    return genericDefinitions;

}

let generateGetRecordStatements = () => {

    let statements = ``;

    config.Concept.TableDetails.Tables.forEach(table => {

        let statement = `\n            ${table.TableName + config.version}? ${config.EhrSystemCamelCase + table.TableName}Record = inputData.OfType<${table.TableName + config.version}>().FirstOrDefault();`
        statements += statement
    })

    return statements;
}

let generateMandatoryRecordsNullCheck = () => {

    let checks = [];

    config.Concept.MandatoryTableRecords.forEach(tableName => checks.push(`${config.EhrSystemCamelCase + tableName}Record == null`))

    let mandatoryRecordsCheck = `
            if (${checks.join(" || ")})
                throw new ArgumentNullException(nameof(inputData), $"Records not available for generating ${config.Concept.ConceptName} resource");`

    return mandatoryRecordsCheck;

}

let generateSubjectReference = () => {

    let valuesToBeEncoded = [];

    config.Concept.Transformation.SubjectReferenceDetails.forEach(table => {
        valuesToBeEncoded.push(`${config.EhrSystemCamelCase + table.TableName}Record.Record.${table.Field}`)
    })

    let content = `        var shaKey = _generateRelationKey.ConstructRelationKey(${config.EhrSystemCamelCase + config.Concept.MandatoryTableRecords[0]}Record.Metadata.TenantId,
                "${config.Concept.SubjectReferenceType}",
                new List<string> { ${valuesToBeEncoded.join()} });
            edh${config.Concept.ConceptName}.Subject = new ResourceReference()
            {
                Reference = "${config.Concept.SubjectReferenceURL}",
                Identifier = new Identifier()
                {
                    Value = shaKey
                }
            };`

    return content;

}

let generateTranformPart = () => {

    let variableName = `edh${config.Concept.ConceptName}`

    let content = `\n            var ${variableName} = new ${config.Concept.Transformation.LibraryModelName}();
            ${variableName}.Id = "${config.Concept.ConceptId}";
    ${generateSubjectReference()}

            edh${config.Concept.ConceptName}.Identifier.Add(ResourceHelpers.CreateIdentifier("http://greenwayhealth.com/us/core/${config.Concept.ConceptName.toLowerCase()}", ${config.EhrSystemCamelCase + config.Concept.MandatoryTableRecords[0]}Record.Id));
            edh${config.Concept.ConceptName}.Meta = new Hl7.Fhir.Model.Meta()
            {
                LastUpdatedElement = Instant.Now(),
                Profile = new string[] { "${config.Concept.ConceptURL}" },
                Source = ${config.EhrSystemCamelCase + config.Concept.MandatoryTableRecords[0]}Record.Metadata.TenantId
            };


            //Code goes here


            return ${variableName};
`

    return content;
}

let generateDomainResourceOverride = () => {

    let content = `public override DomainResource Process(IEnumerable<DBRecordBase> inputData)
        {
            _logger.LogInformation("Started creating Model for Primesuite ${config.Concept.ConceptName} resource");
            if (inputData?.Any() == false)
                throw new ArgumentNullException(nameof(inputData), $"Records not available for generating ${config.Concept.ConceptName} resource");
${generateGetRecordStatements()}
${generateMandatoryRecordsNullCheck()}
${generateTranformPart()}
        }`

    return content;
}

let generateTransformerClass = () => {

    let transformerClass = `namespace ${config.NameSpace.Transformers}
{
    public class ${config.EhrSystem + config.Concept.ConceptName}Transformer : TransformerBase
    {
        ${generateTransformerClassGenericDefinitions()}
        ${generateDomainResourceOverride()}
    }
}`

    return transformerClass;

}

let generateTransform = () => {

    try {

        let filePath = config.BaseLocation + config.FileLocation.Transformers + config.EhrSystem + config.Concept.ConceptName + "Transformer" + config.FileFormats.cs;

        if (fs.existsSync(filePath)) {
            console.log(`Transformer Exists | Path: ${filePath}\n`);
        } else {
            console.log(`Generating Transformer | Path: ${filePath}`);

            let tableRelationsContent = generateImports() + generateTransformerClass();

            fs.writeFileSync(filePath, tableRelationsContent);
            console.log('Transformer Generated Successfully\n')
        }

    } catch (error) {
        console.log(`ERROR : GENERATING TRANSFORMER: ${error}\n`)
    }

}

// module.exports = generateTransform;
generateTransform()