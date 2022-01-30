const fs = require('fs')
const prompt = require('prompt-sync')({ sigint: true });

const starWarsFileName = "output/starwars.json"
const genericFileName = "output/generic.json"
const badWordsFileName = "output/bad.json"

const getFileInMap = (fileName) => {
  try {
    fs.readFileSync(fileName)
  } catch {
    fs.writeFileSync(fileName, '[]')
  }
  return new Map(JSON.parse(fs.readFileSync(fileName)))
}

const starWars = getFileInMap(starWarsFileName)
const generic = getFileInMap(genericFileName)
const bad = getFileInMap(badWordsFileName)

const wordsFile = fs.readFileSync('words.json')
const words = JSON.parse(wordsFile)

words.forEach((w, i) => {
  const [word] = w 
  if (!starWars.has(word) && !generic.has(word) && !bad.has(word)) {
    const answer = prompt(`${i}/${words.length}: Is "${word}" Star Wars specific? [Y]es [n]o [b]ad:`)
    switch (answer.toLowerCase()) {
      case "":
      case "y":
        starWars.set(word);
        break;
      case "n":
        generic.set(word);
        break;
      case "b":
      default:
        bad.set(word);
        break;
    }

    fs.writeFileSync(starWarsFileName, JSON.stringify(Array.from(starWars)))
    fs.writeFileSync(genericFileName, JSON.stringify(Array.from(generic)))
    fs.writeFileSync(badWordsFileName, JSON.stringify(Array.from(bad)))
  }
})