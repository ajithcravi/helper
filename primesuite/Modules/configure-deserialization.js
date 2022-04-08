let fs = require('fs');

let config = require('../Configuration/config.json');

let table; //Buffer variable

let fileName = config.EhrSystem === 'Intergy' ? `V${config.SchemaVersion}SerializationFactory${config.FileFormats.cs}` : `V${config.SchemaVersion + config.EhrSystem}SerializationFactory${config.FileFormats.cs}`;
let filePath = config.BaseLocation + config.FileLocation.Deserialization + fileName;
fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });

let generateDeserializer = () => {

    let deserializerContent = ``;

    config.Concept.TableDetails.Tables.forEach(tableDetail => {

        table = tableDetail.TableName
        let conceptString = `"${table.toLowerCase()}"`
        let deserializer = `AddSerializer(${conceptString}, new ${table}Serialization${config.version}());`

        if (fileContent.search(conceptString) < 0) {
            console.log(`Adding deserializer for ${table}`)
            deserializerContent += `     ${deserializer}
       `;
            return
        }

        console.log(`Configuration Esists | Table: ${table}`)
    })

    return deserializerContent;
}

let configureDeserializer = () => {
    console.log("Configuring Deserializer")
    let insertPosition = fileContent.search('}');
    let editedcontent = fileContent.slice(0, insertPosition - 1) + generateDeserializer() + fileContent.slice(insertPosition - 1)
    fs.writeFileSync(filePath, editedcontent)
    console.log("Deserialiser Successfully Configured")
}

module.exports = configureDeserializer;