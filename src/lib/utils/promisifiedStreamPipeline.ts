import { promisify } from 'util'
import { pipeline } from 'stream'

export const promisifiedStreamPipeline = promisify(pipeline)
