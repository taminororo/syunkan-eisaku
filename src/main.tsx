import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import { SharedResultPage } from './pages/SharedResultPage'
import { DashboardPage } from './pages/DashboardPage'

const shareMatch = window.location.pathname.match(/^\/share\/([^/]+)$/)
const isDashboard = window.location.pathname === '/dashboard'

function Root() {
  if (shareMatch) return <SharedResultPage id={shareMatch[1]} />
  if (isDashboard) return <DashboardPage />
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>,
)
