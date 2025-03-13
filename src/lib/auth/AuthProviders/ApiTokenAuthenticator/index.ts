import axios from 'axios'

export class ApiTokenAuthenticator {
    public async login(apiKey: string, apiToken: string, account: string) {
        const url = `https://api.vtexcommercestable.com.br/api/vtexid/apptoken/login?an=${account}`

        const body = {
            appKey: apiKey,
            appToken: apiToken
        }

        try{
            const response  = await axios.post(url, body, {
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            if(response.status === 200){
                const { data } = response

                if(data?.token){
                    const token = data.token
                    return token
                }else{
                    throw new Error('Invalid credentials')
                }

            }else{
                throw new Error('Invalid credentials')
            }


        }catch(error){
            throw new Error(error)
        }
    }
}