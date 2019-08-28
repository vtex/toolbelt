import { Builder as BuilderBase } from '@vtex/api'

const SECOND = 1000
const builderHubTimeout = 2 * SECOND

const builderBaseRoute = `/_v/builder/0`
const routes = {
  tsConfig: `${builderBaseRoute}/tsconfig`,
  typings: `${builderBaseRoute}/typings`,
}

export default class Builder extends BuilderBase {
  public builderHubTsConfig = () => {
    return this.http.get(routes.tsConfig, { timeout: builderHubTimeout })
  }

  public typingsInfo = async () => {
    const res = await this.http.get(routes.typings, { timeout: builderHubTimeout })
    return res.typingsInfo
  }
}
