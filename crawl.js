const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs')

const startTime = new Date();
const getTime = () => Math.round((new Date() - startTime) / 1000) + "s"
const startUrl = new URL("https://starwars.fandom.com/wiki/Main_Page")
const ignoreUrl = new RegExp("https:\/\/starwars.fandom.com\/[a-z]{2}\/", 'ig')
fs.writeFileSync('words.json', '[]')

const toCrawl = new Map()
const errorUrls = new Map()
let content = new Map()
let count = 0

const crawl = async (u) => {
  // count === 1000 || 
  if (u.indexOf(startUrl.hostname) === -1 || toCrawl.get(u)?.crawled){ //} || u.match(ignoreUrl)) {
    toCrawl.set(u, { crawled: true })
    return;
  }
  count++;
  // console.log("crawling", u)
  const url = new URL(u)
  try {
    const response = await fetch(url.toString());
    const body = await response.text();
  
    const $ = cheerio.load(body);
    if ($('html').first()[0].attribs.lang !== "en") return;

    $('a').each((i, a) => {
      const href = a.attribs.href
      let newUrl = ''
      if (href) {
        if (href.substring(0, 2) === "//") {
          newUrl = url.protocol + href
        } else if (href.substring(0, 1) === "/") {
          newUrl = url.protocol + "//" + url.hostname + href
        } else if (href.substring(0, 4) === "http") {
          newUrl = href
        } else if (href.substring(0, 1) === "#") {
          // do nothing
        } else {
          console.warn('unknwon url', href)
        }

        if (newUrl) {
          if (!toCrawl.has(newUrl.trim())) {
            toCrawl.set(newUrl.trim(), { crawled: false })
          } else {
            // console.log('url already added', url)
          }
        }
      }
    })

    const cleanData = (d) => d.replace(/[\t\n]*/ig, '')
    
    $("div, span, p, h1, h2, h3, h4 ,h5, a").each((i, span) => {
      if (span.data) content.set(cleanData(span.data))
      span.children.forEach(c => c.data && content.set(cleanData(c.data)))
    })
    // console.log(u, content.size)
    toCrawl.set(u, { crawled: true })
  } catch (e) {
    console.log(u, e.toString())
    errorUrls.set(u, e.toString())
  }
}

const parseContent = () => {
  const allWords = new Map()
  const wordsFile = fs.readFileSync('words.json')
  const possible = new Map(JSON.parse(wordsFile))

  content.forEach((value, key) => {
    const words = key.split(" ")
    words.forEach(w => allWords.set(w))
  })

  allWords.forEach((value, key) => {
    const word = key.replace(/[:.,;"=…\{\(\}\)}\[\] %\\!\?@$\/]/ig,'').toLowerCase()
    if (word.length === 5 && word.indexOf('\'') === -1 && !word.match(/[0-9]{5}/)) { // && word.length <= 6) {
      possible.set(word)
    }
  })
  content = new Map()

  fs.writeFileSync('words.json', JSON.stringify(Array.from(possible)))
  console.log('saved',Array.from(possible, ([key, value]) => key).length,'words')
}

const crawlWrap = async () => {
  await Promise
    .all(Array
      .from(toCrawl)
      .filter(([key, value]) => !value.crawled)
      .filter((c, i) => i < 500)
      .map(([key, value]) => key && crawl(key))
    )

  if (Array.from(toCrawl).filter(([key, value]) => !value.crawled).length > 0){ //} && count !== 1000) {
    parseContent()
    console.log(getTime(),
      toCrawl.size, "total",
      Array.from(toCrawl).filter(([key, value]) => value.crawled).length + " done, " + Array.from(toCrawl).filter(([key, value]) => !value.crawled).length + " to go;")
    return crawlWrap();
  }
  return Promise.resolve()
}

const doIt = async () => {
  await crawl(startUrl.href)
  await crawlWrap()
  // parseContent()
  console.log(toCrawl.size, "toCrawl")
  console.log(allWords.size, "allWords")
  console.log(possible.size, "possible")
  console.log(count, "completed in", getTime())
}

doIt()