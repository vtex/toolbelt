import { ClientsCreator } from './ClientsCreator'
import * as env from '../../env'

export const clientsCreator = new ClientsCreator(env.region())
