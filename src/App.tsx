
import { Routes, Route } from 'react-router'
import { LandingPage } from './pages/landing/LandingPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { AppPlaceholder } from './pages/placeholder/AppPlaceholder'
import { PaymentMethodPage } from './pages/app/PaymentMethodPage'
import { WithdrawPage } from './pages/app/WithdrawPage'
import { ReferralPage } from './pages/app/ReferralPage'
import { PackageDetailPage } from './pages/app/PackageDetailPage'
import { HomePage } from './pages/app/HomePage'
import { PlanBenefitsPage } from './pages/app/PlanBenefitsPage'
import { PlansPage } from './pages/plans/PlansPage'
import { DashboardPage } from './pages/app/DashboardPage'
import { InvestSummaryPage } from './pages/app/InvestSummaryPage'
import { SilverTierPage } from './pages/app/SilverTierPage'
import { GalleryPage } from './pages/gallery/GalleryPage'
import { AdminPlaceholder } from './pages/placeholder/AdminPlaceholder'
import { NotFound } from './pages/placeholder/NotFound'
import { RequireAuth } from './auth/RequireAuth'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/plans" element={<PlansPage />} />
      <Route path="/gallery" element={<GalleryPage />} />
      
      <Route path="/app/payment" element={
        <RequireAuth role="user">
          <PaymentMethodPage />
        </RequireAuth>
      } />

      <Route path="/app/withdraw" element={
        <RequireAuth role="user">
          <WithdrawPage />
        </RequireAuth>
      } />

      <Route path="/app/referral" element={
        <RequireAuth role="user">
          <ReferralPage />
        </RequireAuth>
      } />

      <Route path="/app" element={
        <RequireAuth role="user">
          <HomePage />
        </RequireAuth>
      } />

      <Route path="/app/invest" element={
        <RequireAuth role="user">
          <PackageDetailPage />
        </RequireAuth>
      } />

      <Route path="/app/benefits" element={
        <RequireAuth role="user">
          <PlanBenefitsPage />
        </RequireAuth>
      } />

      <Route path="/app/dashboard" element={
        <RequireAuth role="user">
          <DashboardPage />
        </RequireAuth>
      } />

      <Route path="/app/summary" element={
        <RequireAuth role="user">
          <InvestSummaryPage />
        </RequireAuth>
      } />

      <Route path="/app/silver-tier" element={
        <RequireAuth role="user">
          <SilverTierPage />
        </RequireAuth>
      } />

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
