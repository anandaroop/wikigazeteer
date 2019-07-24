const regeneratorRuntime = require('regenerator-runtime')
const puppeteer = require('puppeteer')

export class SearchSession {
  async search(term) {
    this.term = term
    this.url = encodeURI(
      `https://en.wikipedia.org/w/index.php?search=${this.term}`
    )
    await this.page.goto(this.url)
    this.content = await this.page.content()
    const result = await this.result()
    return result
}

  async open() {
    this.browser = await puppeteer.launch()
    // const browser = await puppeteer.launch({ headless: false, slowMo: 100 })
    this.page = await this.browser.newPage()
  }

  close() {
    this.browser.close()
  }

  async result() {
    if (this.isSearchResultListing()) {
      const hits = await this.getSearchHits()
      return {
        type: 'SearchResultListing',
        term: this.term,
        url: this.page.url(),
        data: hits
      }
    }

    if (await this.isDisambiguationPage()) {
      const titles = await this.getAmbiguousTitles()
      return {
        type: 'DisambiguationPage',
        term: this.term,
        url: this.page.url(),
        data: titles
      }
    }

    if (await this.isGeolocatedArticlePage()) {
      const coordinates = await this.getCoordinates()
      const country = await this.getCountry()
      const lede = await this.getLede()
      const latLng = await this.getLatLng()
      return {
        type: 'GeolocatedArticle',
        term: this.term,
        title: this.getTitle(),
        url: this.page.url(),
        data: {
          coordinates,
          latitude: latLng[0],
          longitude: latLng[1],
          country,
          description: lede
        }
      }
    }

    if (await this.isArticlePage()) {
      return {
        type: 'Article',
        term: this.term,
        url: this.page.url(),
        data: null
      }
    }
  }

  isSearchResultListing() {
    return this.page.url().indexOf('?search') >= 0
  }

  async isDisambiguationPage() {
    const disambigboxes = await this.page.$$('#disambigbox')
    return disambigboxes.length > 0
  }

  async isArticlePage() {
    const isDisambiguation = await this.isDisambiguationPage()
    return this.page.url().indexOf('/wiki/') >= 0 && !isDisambiguation
  }

  async isGeolocatedArticlePage() {
    const isArticle = await this.isArticlePage()
    const coordinateDivs = await this.page.$$('#coordinates')
    return isArticle && coordinateDivs.length > 0
  }

  async getCoordinates() {
    const text = await this.page.evaluate(
      () => document.querySelector('#coordinates .geo-dec').innerText
    )
    return text
  }

  async getLatLng() {
    const latLng = await this.page.evaluate(
      () => document.querySelector('#coordinates .geo').innerText
    )
    return latLng.split(/; /).map(parseFloat)
  }

  async getCountry() {
    try {
      const text = await this.page.evaluate(
        () =>
          document.querySelector('.geography.infobox .flagicon + a').innerText
      )
      return text
    } catch (error) {
      return null
    }
  }

  async getLede() {
    const text = await this.page.evaluate(
      () =>
        document.querySelector('#mw-content-text > div > p:not(.mw-empty-elt)')
          .innerText
    )
    const cleaned = text.replace(/\[(citation needed|\d+)\]/g, '')
    return cleaned
  }

  getTitle() {
    return decodeURI(
      this.page
        .url()
        .split(/\//)
        .slice(-1)[0]
    )
  }

  async getSearchHits() {
    const hits = await this.page.evaluate(() =>
      Array.from(document.querySelectorAll('.mw-search-result-heading a')).map(
        el => el.href
      )
    )
    return hits
  }

  async getAmbiguousTitles() {
    const hits = await this.page.evaluate(() =>
      Array.from(document.querySelectorAll('#mw-content-text ul > li > a')).map(
        el => el.href
      )
    )
    return hits
  }
}
