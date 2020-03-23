import React from 'react'
import { Color } from 'ink'

export class ErrorBoundary extends React.Component<{}, { error: any }> {
    constructor(props) {
      super(props)
      this.state = { error: null }
    }
  
    static getDerivedStateFromError(error) {
      // Update state so the next render will show the fallback UI.
      return { error }
    }
  
    componentDidCatch(_error, _errorInfo) {
      // You can also log the error to an error reporting service
      // logErrorToMyService(error, errorInfo);
    }
  
    render() {
      if (this.state.error != null) {
        // You can render any custom fallback UI
        return <Color red>{this.state.error.message}</Color>
      }
  
      return this.props.children
    }
  }