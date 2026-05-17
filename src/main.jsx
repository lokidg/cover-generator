import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App.jsx'
import './styles/tokens.css'
import './styles/app.css'
import './styles/settings-panel.css'

function ErrorBoundary({ children }) {
  const [error, setError] = React.useState(null)
  if (error) {
    return (
      <div style={{ padding: 40, color: 'red', fontFamily: 'monospace' }}>
        <h2>App crashed:</h2>
        <pre>{error.message}</pre>
        <pre>{error.stack}</pre>
      </div>
    )
  }
  return (
    <ErrorBoundaryInner onError={setError}>
      {children}
    </ErrorBoundaryInner>
  )
}

class ErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error) {
    this.props.onError(error)
  }
  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
