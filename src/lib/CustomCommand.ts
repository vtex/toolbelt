import OclifCommand from '@oclif/command'
import { ParsingToken } from '@oclif/parser/lib/parse'

export abstract class CustomCommand extends OclifCommand {
  getAllArgs(rawParse: ParsingToken[]) {
    return rawParse.filter(token => token.type === 'arg').map(token => token.input)
  }
}
