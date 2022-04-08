let fs = require('fs');

let config = require('../Configuration/config.json');

let table; //Buffer variable

generateSerializationClass = () => {

    let serializationClass = `public class ${table}Serialization${config.version} : Serialization<${table + config.version}>
    {
    }
`

    return serializationClass;
}

generateSerializationContent = (serializationClass) => {

    let serializationFileContent = `using ${config.NameSpace.Models};
using ${config.NameSpace.FrameworkBaseClasses};

namespace ${config.NameSpace.Serializations}
{
    ${serializationClass}
}`

    return serializationFileContent;

}

let generateSerialization = () => {

    console.log("Generating Serializations\n");

    config.Concept.TableRelations.forEach(tableName => {
        table = tableName
        try {
            let filePath = config.BaseLocation + config.FileLocation.Serialization + table + 'Serialization' + config.version + config.FileFormats.cs;

            if (fs.existsSync(filePath)) {
                console.log(`Serialization Exists | Path: ${filePath}\n`);
                return;
            }

            console.log(`Generating Serialization | Path: ${filePath}`);

            let modelFileContent = generateSerializationContent(generateSerializationClass())

            fs.writeFileSync(filePath, modelFileContent);
            console.log('Serialization Generated Successfully\n')

        } catch (error) {
            console.log(`ERROR : GENERATING SERIALIZATIONS : ${error}\n`)
        }
    })

}

module.exports = generateSerialization;