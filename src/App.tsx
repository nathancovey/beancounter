import { ThemeProvider } from "./components/theme-provider"
import { AuthProvider } from "./integrations/supabase/auth-context"
import { HomePage } from './pages/home'
import { LoginPage } from "./pages/login"
import { AuthCallback } from "./integrations/supabase/callback"
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleAnalyticsCallback } from './integrations/google-analytics/ga-callback'
import { useAuth } from "./integrations/supabase/auth-context"
import { ConnectionsPage } from '@/pages/connections'
import { StripeCallback } from './integrations/stripe/stripe-callback'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/ga-callback" element={<GoogleAnalyticsCallback />} />
            <Route path="/connections" element={
              <ProtectedRoute>
                <ConnectionsPage />
              </ProtectedRoute>
            } />
            <Route path="/" element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            } />
            <Route 
              path="/stripe/callback" 
              element={
                <ProtectedRoute>
                  <StripeCallback />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
