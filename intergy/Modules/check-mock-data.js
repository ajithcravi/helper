let config = require('../Configuration/config.json')

let mockDataBaseLocation = `../MockData/${config.Concept.ConceptName}`

let mockDataErrors = {}

config.Concept.TableDetails.Tables.forEach(table => {
    mockDataErrors[table.TableName] = []
    let fileName = `${config.Concept.ConceptName.toLocaleLowerCase()}-${table.TableName.toLocaleLowerCase()}${config.FileFormats.json}`

    let mockData = require(`${mockDataBaseLocation}/${fileName}`)['record']

    table.Fields.forEach(field => {
        if(!mockData[field.toLocaleLowerCase()]) mockDataErrors[table.TableName].push(field)
    })
})

mockDataErrors['RelationErrors'] = []

config.Concept.TableRelationDetails.forEach(relationDetails => {

    let fromFile = `${config.Concept.ConceptName.toLocaleLowerCase()}-${relationDetails.FromTable.toLocaleLowerCase()}${config.FileFormats.json}`
    let toFile = `${config.Concept.ConceptName.toLocaleLowerCase()}-${relationDetails.ToTable.toLocaleLowerCase()}${config.FileFormats.json}`
    relationDetails.Relations.forEach(relation => {

        let fromData;
        let toData;

        if(relation.Value && relation.Field) {
            fromData = require(`${mockDataBaseLocation}/${fromFile}`)['record'][relation.Field.toLocaleLowerCase()]
            toData = relation.Value
        }else {
            fromData = require(`${mockDataBaseLocation}/${fromFile}`)['record'][relation.FromField.toLocaleLowerCase()]
            toData = require(`${mockDataBaseLocation}/${toFile}`)['record'][relation.ToField.toLocaleLowerCase()]
        }

        if(!fromData || !toData || fromData !== toData) {
            relation["FromTable"] = relationDetails["FromTable"]
            if(!relation.Value && !relation.Field) relation["ToTable"] = relationDetails["ToTable"]
            mockDataErrors['RelationErrors'].push(relation)
        }

    })
})

console.log(mockDataErrors)