
import { Routes, Route } from 'react-router'
import { LandingPage } from './pages/landing/LandingPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { AppPlaceholder } from './pages/placeholder/AppPlaceholder'
import { AdminPlaceholder } from './pages/placeholder/AdminPlaceholder'
import { NotFound } from './pages/placeholder/NotFound'
import { RequireAuth } from './auth/RequireAuth'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      <Route path="/app/*" element={
        <RequireAuth role="user">
          <AppPlaceholder />
        </RequireAuth>
      } />
      
      <Route path="/admin/*" element={
        <RequireAuth role="admin">
          <AdminPlaceholder />
        </RequireAuth>
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
