import HelpBase from '@oclif/plugin-help'

export default class CustomHelp extends HelpBase {

    showHelp(_args) {
        console.log('This will be displayed in multi-command CLIs')
    }

    showCommandHelp(_command) {
        console.log('This will be displayed in single-command CLIs')
    }
}