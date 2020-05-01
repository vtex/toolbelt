import { AxiosError } from 'axios'
import { EventSourceError } from '../sse/EventSourceError'

export interface RequestErrorDetails {
  requestConfig: {
    url?: string
    method?: string
    params?: any
    headers?: Record<string, any>
    data?: any
    timeout?: string | number
  }
  response: {
    status?: number
    statusText?: string
    headers?: Record<string, any>
    data?: any
  }
}

function parseAxiosError(err: AxiosError): RequestErrorDetails {
  const { url, method, headers: requestHeaders, params, data: requestData, timeout: requestTimeout } = err.config
  const { status, statusText, headers: responseHeaders, data: responseData } = err.response || {}

  return {
    requestConfig: {
      url,
      method,
      params,
      headers: requestHeaders,
      data: requestData,
      timeout: requestTimeout,
    },
    response: err.response
      ? {
          status,
          statusText,
          headers: responseHeaders,
          data: responseData,
        }
      : undefined,
  }
}

export function parseError(err: any): Record<string, any> | null {
  if (err.isAxiosError || err.config) {
    return parseAxiosError(err)
  }

  if (err instanceof EventSourceError) {
    return err.getErrorDetailsObject()
  }

  return null
}
