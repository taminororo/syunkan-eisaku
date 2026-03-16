import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { SharedResultPage } from './pages/SharedResultPage'

const shareMatch = window.location.pathname.match(/^\/share\/([^/]+)$/)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {shareMatch ? <SharedResultPage id={shareMatch[1]} /> : <App />}
  </StrictMode>,
)
