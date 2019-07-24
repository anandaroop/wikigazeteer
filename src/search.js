import { SearchRequest } from './SearchRequest'

try {
  const term = process.argv.slice(2).join(' ')
  const request = new SearchRequest(term)
  request.perform().then(result => {
    if (result.type === 'GeolocatedArticle') {
      printTSV(result)
    } else {
      console.error(result)
    }
  })
} catch (error) {
  console.error('😭', error)
}

const printTSV = result =>
  console.log(
    [
      result.term,
      result.title,
      null,
      result.data.longitude,
      result.data.latitude,
      null,
      result.data.country,
      'wg',
      result.data.description
    ].join('\t')
  )
