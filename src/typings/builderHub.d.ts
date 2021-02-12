declare module 'BuilderHub' {
  interface TypingsInfo {
    [builder in string]: {
      [builderVersion in string]: {
        injectedDependencies: {
          [dependency in string]: string
        }
      }
    }
  }

  interface TypingsInfoResponse {
    typingsInfo: TypingsInfo
  }
}
