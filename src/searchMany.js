import readline from 'readline'
import { SearchSession } from './SearchSession'
;(async () => {
  const session = new SearchSession()
  await session.open()

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.on('line', async input => {
    const result = await session.search(input)
    if (result.type === 'GeolocatedArticle') {
      console.log(toTSV(result))
      require('child_process').exec(
        `echo "${toTSV(result)}" | pbcopy`,

        function(err, stdout, stderr) {
          console.log(stdout) // to confirm the application has been run
        }
      )
    } else {
      console.error(result)
    }
  })

  rl.on('close', input => {
    console.log('done!')
    session.close()
  })
})()

const toTSV = result =>
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
