import log from '../../logger'
import axios from 'axios'

const urls = {
  graphql: 'https://github.com/vtex-apps/product-review-graphql-example/archive/master.zip',
}

// const clone = async (url: string) => {

// }

export default async (builder: string) => {
  try {
    const url = urls[builder]

    const res = await axios.get(url)

    console.log(res)

  } catch (err) {
    log.error('The following error occured while bootstrapping the code')
  }
}
