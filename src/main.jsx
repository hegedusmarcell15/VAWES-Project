import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './glass.css'

const basename = window.location.hostname === 'hegedusmarcell15.github.io' ? '/VAWES-Project' : ''

createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={basename}>
    <App />
  </BrowserRouter>
)
