import Configstore from 'configstore'
import pkg from '../package.json'

const conf = new Configstore(pkg.name)

export default conf
