let fs = require('fs');

let config = require('../Configuration/config.json');

config.Concept.TableDetails.Tables.forEach(table => {
    fs.writeFileSync(`../MockData/${config.Concept.ConceptName}/${config.Concept.ConceptName.toLocaleLowerCase()}-${table.TableName.toLocaleLowerCase()}${config.FileFormats.json}`, "")
    console.log(`Created ${config.Concept.ConceptName.toLocaleLowerCase()}-${table.TableName.toLocaleLowerCase()}${config.FileFormats.json}`)
})