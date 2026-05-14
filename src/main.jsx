import React from 'react'
import ReactDOM from 'react-dom/client'
import { DialRoot } from 'dialkit'
import './styles/tokens.css'
import './styles/app.css'

function App() {
  return <div>Cover Generator</div>
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DialRoot>
      <App />
    </DialRoot>
  </React.StrictMode>
)
