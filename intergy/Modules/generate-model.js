let fs = require('fs');

let config = require('../Configuration/config.json');

let table; //Buffer variable

generateModelClass = () => {

    let modelClass = `public class ${table + config.version} : BaseDBRecord<Record${table + config.version}>
    {
    }`
    return modelClass;

}

generateRecordClassItems = () => {
    let recordClassItems = ``

    let tableFields = config.Concept.TableFields[table];
    if (tableFields) {
        tableFields.forEach(field => {
            recordClassItems += `
        [JsonProperty("${field.toLowerCase()}")]
        public string ${field} { get; set; }
`
        })
    }

    let mandatoryFields = config.Concept.TableFields.MandatoryFields;
    if (mandatoryFields) {
        mandatoryFields.forEach(field => {
            recordClassItems += `
        [JsonProperty("${field.toLowerCase()}")]
        public string ${field} { get; set; }
`
        })
    }

    return recordClassItems;

}

generateRecordClass = (recordClassItems) => {

    let recordClass = `public class Record${table + config.version}
    {
${recordClassItems}
    }`

    return recordClass;

}

generateModelContent = (modelClass, recordClass) => {

    let modelFileContent = `using ${config.NameSpace.FrameworkModels};
using ${config.library.NewtonsoftJson};

namespace ${config.NameSpace.Models}
{
    ${modelClass}
    ${recordClass}
}`

    return modelFileContent;

}

let generateModel = () => {

    console.log("Generating Models\n");

    config.Concept.TableRelations.forEach(tableName => {
        table = tableName
        try {
            let filePath = config.BaseLocation + config.FileLocation.Model + table + config.version + config.FileFormats.cs;

            if (fs.existsSync(filePath)) {
                console.log(`Model Exists | Path: ${filePath}\n`);
                return;
            }

            console.log(`Generating Model | Path: ${filePath}`);

            let modelFileContent = generateModelContent(
                generateModelClass(),
                generateRecordClass(generateRecordClassItems())
            )

            fs.writeFileSync(filePath, modelFileContent);
            console.log('Model Generated Successfully\n')

        } catch (error) {
            console.log(`ERROR : GENERATING MODELS : ${error}\n`)
        }
    })

}

module.exports = generateModel;