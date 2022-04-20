let fs = require('fs');
let config = require('../Configuration/config.json');

let sourceDirectory = `../MockData/${config.Concept.ConceptName}`
let targetDirectory = config.BaseLocation + config.FileLocation.UnitTestMockData + '/' + config.Concept.ConceptName

let fileNames = fs.readdirSync(sourceDirectory);



let copyMockData = () => {
    try {

        if (!fs.existsSync(targetDirectory)){
            fs.mkdirSync(targetDirectory);
        }

        console.log(`Copying Mock Data from ${sourceDirectory} to ${targetDirectory}`);
        fileNames.forEach(fileName => {
            if (fs.existsSync(targetDirectory + '/' + fileName)) {
                console.log(`${fileName} already available in directory ${targetDirectory}`);
                return
            }

            fs.copyFileSync(sourceDirectory + '/' + fileName, targetDirectory + '/' + fileName)
            console.log(`${fileName} successfully copied`)
        })

    } catch (error) {
        console.log(`ERROR : COPYING MOCK DATA from: ${sourceDirectory} to: ${targetDirectory} : ${error}\n`)
    }
}

// module.exports = copyMockData;
copyMockData()