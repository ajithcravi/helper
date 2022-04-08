let fs = require('fs');

let config = require('../Configuration/config.json');

let generateImports = () => {

    let importStatements = `using ${config.NameSpace.FrameworkBaseClasses};
using ${config.NameSpace.FrameworkModels};
using ${config.NameSpace.Models};
using ${config.library.FhirModels};
using ${config.NameSpace.FrameworkHelpers};
using ILogger = ${config.NameSpace.Logger};

`;

    return importStatements;

}

let generateTransformerClassGenericDefinitions = () => {

    let genericDefinitions = `private readonly ILogger _logger;
        public ${config.EhrSystem + config.Concept.ConceptName}Transformer(ILogger logger)
        {
            _logger = logger;
        }`

    return genericDefinitions;

}

let generateGetRecords = () => {
    let getReordsStatements = ``;
    let nullCheckList = [];

    config.Concept.MandatoryTableRecords.forEach(tableName => {
        getReordsStatements += `\n            ${tableName}01? ${config.EhrSystem.toLowerCase() + tableName}Record = inputData.OfType<${tableName}01>().FirstOrDefault();`
        nullCheckList.push(config.EhrSystem.toLowerCase() + tableName + "Record != null")
    })

    getReordsStatements += `\n\n            if(${nullCheckList.join(" && ")})
                throw new ArgumentNullException(nameof(inputData), $"Records not available for generating ${config.Concept.ConceptName} resource");`

    return getReordsStatements;
}

let generateProcessOverride = () => {

    let processOverride = `public override DomainResource Process(IEnumerable<DBRecordBase> inputData)
        {
            if (inputData?.Any() == false)
                throw new ArgumentNullException(nameof(inputData), $"Records not available for generating ${config.Concept.ConceptName} resource");
${generateGetRecords()}
        }`

    return processOverride;
}

let generateTransformerClass = () => {

    let resourceTableClass = `namespace ${config.NameSpace.Transformers}
{
    public class ${config.EhrSystem + config.Concept.ConceptName}Transformer : TransformerBase
    {
        ${generateTransformerClassGenericDefinitions()}
        ${generateProcessOverride()}
    }
}
`;

    return resourceTableClass;

}

let generateTransformer = () => {
    try {
        let filePath = config.BaseLocation + config.FileLocation.Transformers + config.EhrSystem + config.Concept.ConceptName + "Transformer" + config.FileFormats.cs;

        if (fs.existsSync(filePath)) {
            console.log(`Transformer Exists | Path: ${filePath}\n`);
        } else {
            console.log(`Generating Transformer | Path: ${filePath}`);

            let transformerContent = generateImports() + generateTransformerClass();

            fs.writeFileSync(filePath, transformerContent);
            console.log('Transformer Generated Successfully\n')
        }

    } catch (error) {
        console.log(`ERROR : GENERATING TRANSFORMER: ${error}\n`)
    }
}

module.exports = generateTransformer;