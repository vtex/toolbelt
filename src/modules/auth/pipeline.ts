import { SessionManager } from '../../api/session/SessionManager'
import { handleErrorCreatingWorkspace, workspaceCreator } from '../../api/modules/workspace/create'
import log from '../../api/logger'

const vtexApiKeyLabel = 'VTEX_API_KEY';
const vtexApiTokenLabel = 'VTEX_API_TOKEN';

export interface LoginOptions {
    account?: string
    workspace?: string
}

export default async (opts: LoginOptions, vtexApiKey?: string, vtexApiToken?: string) => {
    if (!vtexApiKey || !vtexApiToken || !opts.account) {
        const credentials = getCredentialsInEnvirovmentVariables();
        if (credentials) {
            vtexApiKey = credentials.vtexApiKey;
            vtexApiToken = credentials.vtexApiToken;
            const sessionManager = SessionManager.getSingleton()
            await sessionManager.loginUsingPipeline(
                opts.account, 
                { 
                    vtexApiKey,
                    targetWorkspace: opts.workspace,
                    workspaceCreation: {
                        promptCreation: true,
                        creator: workspaceCreator,
                        onError: handleErrorCreatingWorkspace,
                      },
                    vtexApiToken
                })
            log.info('You are now logged in');
        } else {
            log.error('VTEX_API_KEY and VTEX_API_TOKEN must be provided');
        }
    }
}


interface credentialsType {
    vtexApiKey: string,
    vtexApiToken: string,
}

function getCredentialsInEnvirovmentVariables(): credentialsType | null {
    try {
        const vtexApiKey = process.env[vtexApiKeyLabel];
        const vtexApiToken = process.env[vtexApiTokenLabel];

        if (vtexApiKey && vtexApiToken) {
            return { vtexApiKey, vtexApiToken };
        } else {
            return null;
        }
    } catch (error) {

    }
}