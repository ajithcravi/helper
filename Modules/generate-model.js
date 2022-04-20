let fs = require('fs');

let config = require('../Configuration/config.json');

let table; //Buffer variable
let tableFields;

generateModelClass = () => {

    let modelClass = `public class ${table + config.version} : BaseDBRecord<Record${table + config.version}>
    {
    }`
    return modelClass;

}

generateRecordClassItems = () => {

    let recordClassItems = ``

    if (tableFields) {
        tableFields.forEach(field => {
            recordClassItems += `
        [JsonProperty("${field.toLowerCase()}")]
        public string ${field} { get; set; }
`
        })
    }

    let mandatoryFields = config.Concept.TableDetails.CommonFields;
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

generateRecordClass = () => {

    let recordClass = `public class Record${table + config.version}
    {
${generateRecordClassItems()}
    }`

    return recordClass;

}

generateModelContent = () => {

    let modelFileContent = `using ${config.NameSpace.FrameworkModels};
using ${config.library.NewtonsoftJson};

namespace ${config.NameSpace.Models}
{
    ${generateModelClass()}
    ${generateRecordClass()}
}`

    return modelFileContent;

}

let generateModel = () => {

    console.log("Generating Models\n");

    config.Concept.TableDetails.Tables.forEach(tableDetail => {

        table = tableDetail.TableName
        tableFields = tableDetail.Fields

        try {
            let filePath = config.BaseLocation + config.FileLocation.Model + table + config.version + config.FileFormats.cs;

            if (fs.existsSync(filePath)) {
                console.log(`Model Exists | Path: ${filePath}\n`);
                return;
            }

            console.log(`Generating Model | Path: ${filePath}`);

            let modelFileContent = generateModelContent()

            fs.writeFileSync(filePath, modelFileContent);
            console.log('Model Generated Successfully\n')

        } catch (error) {
            console.log(`ERROR : GENERATING MODELS : ${error}\n`)
        }
    })

}

module.exports = generateModel;
generateModel();