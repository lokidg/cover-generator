import React from 'react'
import ReactDOM from 'react-dom/client'
import { DialRoot } from 'dialkit'
import { App } from './App.jsx'
import './styles/tokens.css'
import './styles/app.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DialRoot>
      <App />
    </DialRoot>
  </React.StrictMode>
)
