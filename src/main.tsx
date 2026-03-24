import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'

const SharedResultPage = lazy(() => import('./pages/SharedResultPage').then(m => ({ default: m.SharedResultPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))

const shareMatch = window.location.pathname.match(/^\/share\/([^/]+)$/)
const isDashboard = window.location.pathname === '/dashboard'

function Fallback() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  )
}

function Root() {
  if (shareMatch) return <Suspense fallback={<Fallback />}><SharedResultPage id={shareMatch[1]} /></Suspense>
  if (isDashboard) return <Suspense fallback={<Fallback />}><DashboardPage /></Suspense>
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>,
)
