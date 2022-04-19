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
    relationDetails.Relations.forEach(relation => {
        let fromFile = `${config.Concept.ConceptName.toLocaleLowerCase()}-${relation.From.toLocaleLowerCase()}${config.FileFormats.json}`
        let toFile = `${config.Concept.ConceptName.toLocaleLowerCase()}-${relation.To.toLocaleLowerCase()}${config.FileFormats.json}`

        let fromData = require(`${mockDataBaseLocation}/${fromFile}`)['record'][relation.FromField.toLocaleLowerCase()]
        let toData = require(`${mockDataBaseLocation}/${toFile}`)['record'][relation.ToField.toLocaleLowerCase()]

        if(fromData !== toData) mockDataErrors['RelationErrors'].push(relation)

    })
})

console.log(mockDataErrors)