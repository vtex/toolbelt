import React from 'react'
import { Color } from 'ink'

export class ErrorBoundary extends React.Component<{}, { error: any }> {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  public render() {
    if (this.state.error != null) {
      // You can render any custom fallback UI
      return <Color red>{this.state.error.message}</Color>
    }

    return this.props.children
  }
}
