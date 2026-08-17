import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'

import { LandingRoute } from './pages/landing/LandingRoute'
import { RequireAuth } from './auth/RequireAuth'

/*
 * Everything except the landing page is code-split. Almost all traffic is
 * mobile, often on a metered connection, and most of it never leaves `/` — so
 * the first load should not carry the authenticated app, the plan gallery and
 * the admin shell along with it.
 */
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() =>
  import('./pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage }))
)
const ForgotPasswordPage = lazy(() =>
  import('./pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
)
const AuthCallbackPage = lazy(() =>
  import('./pages/auth/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage }))
)
const PlansPage = lazy(() => import('./pages/plans/PlansPage').then((m) => ({ default: m.PlansPage })))
const GalleryPage = lazy(() =>
  import('./pages/gallery/GalleryPage').then((m) => ({ default: m.GalleryPage }))
)
const HomePage = lazy(() => import('./pages/app/HomePage').then((m) => ({ default: m.HomePage })))
const PaymentMethodPage = lazy(() =>
  import('./pages/app/PaymentMethodPage').then((m) => ({ default: m.PaymentMethodPage }))
)
const WithdrawPage = lazy(() =>
  import('./pages/app/WithdrawPage').then((m) => ({ default: m.WithdrawPage }))
)
const ReferralPage = lazy(() =>
  import('./pages/app/ReferralPage').then((m) => ({ default: m.ReferralPage }))
)
const PackageDetailPage = lazy(() =>
  import('./pages/app/PackageDetailPage').then((m) => ({ default: m.PackageDetailPage }))
)
const PlanBenefitsPage = lazy(() =>
  import('./pages/app/PlanBenefitsPage').then((m) => ({ default: m.PlanBenefitsPage }))
)
const DashboardPage = lazy(() =>
  import('./pages/app/DashboardPage').then((m) => ({ default: m.DashboardPage }))
)
const InvestSummaryPage = lazy(() =>
  import('./pages/app/InvestSummaryPage').then((m) => ({ default: m.InvestSummaryPage }))
)
const SilverTierPage = lazy(() =>
  import('./pages/app/SilverTierPage').then((m) => ({ default: m.SilverTierPage }))
)
const AccountPage = lazy(() =>
  import('./pages/app/AccountPage').then((m) => ({ default: m.AccountPage }))
)
const LeaderboardPage = lazy(() =>
  import('./pages/app/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage }))
)
const SupportPage = lazy(() =>
  import('./pages/app/SupportPage').then((m) => ({ default: m.SupportPage }))
)
const CommunityPage = lazy(() =>
  import('./pages/app/CommunityPage').then((m) => ({ default: m.CommunityPage }))
)
const AppPlaceholder = lazy(() =>
  import('./pages/placeholder/AppPlaceholder').then((m) => ({ default: m.AppPlaceholder }))
)
// NotFound lives in AdminPlaceholder.tsx; NotFound.tsx is only a re-export.
const NotFound = lazy(() =>
  import('./pages/placeholder/AdminPlaceholder').then((m) => ({ default: m.NotFound }))
)

// ── Admin shell (code-split; admins are rare and never on the landing path) ──
const AdminLayout = lazy(() =>
  import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout }))
)
const AdminDashboard = lazy(() =>
  import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
)
const AdminDeposits = lazy(() =>
  import('./pages/admin/AdminDeposits').then((m) => ({ default: m.AdminDeposits }))
)
const AdminWithdrawals = lazy(() =>
  import('./pages/admin/AdminWithdrawals').then((m) => ({ default: m.AdminWithdrawals }))
)
const AdminUsers = lazy(() =>
  import('./pages/admin/AdminUsers').then((m) => ({ default: m.AdminUsers }))
)
const AdminSupport = lazy(() =>
  import('./pages/admin/AdminSupport').then((m) => ({ default: m.AdminSupport }))
)
const AdminUserDetail = lazy(() =>
  import('./pages/admin/AdminUserDetail').then((m) => ({ default: m.AdminUserDetail }))
)
const AdminSettings = lazy(() =>
  import('./pages/admin/AdminSettings').then((m) => ({ default: m.AdminSettings }))
)

/** Shown while a route chunk downloads. Announced, so it is not a silent gap. */
function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center bg-asm-tint"
    >
      <span className="sr-only">Loading</span>
      <span
        aria-hidden
        className="size-8 animate-spin rounded-full border-2 border-asm-blue/20 border-t-asm-blue"
      />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route
          path="/plans"
          element={
            <RequireAuth role="user">
              <PlansPage />
            </RequireAuth>
          }
        />
        <Route path="/gallery" element={<GalleryPage />} />

        <Route
          path="/app/payment"
          element={
            <RequireAuth role="user">
              <PaymentMethodPage />
            </RequireAuth>
          }
        />

        <Route
          path="/app/withdraw"
          element={
            <RequireAuth role="user">
              <WithdrawPage />
            </RequireAuth>
          }
        />

        <Route
          path="/app/referral"
          element={
            <RequireAuth role="user">
              <ReferralPage />
            </RequireAuth>
          }
        />

        <Route
          path="/app"
          element={
            <RequireAuth role="user">
              <HomePage />
            </RequireAuth>
          }
        />

        <Route
          path="/app/invest"
          element={
            <RequireAuth role="user">
              <PackageDetailPage />
            </RequireAuth>
          }
        />

        <Route
          path="/app/benefits"
          element={
            <RequireAuth role="user">
              <PlanBenefitsPage />
            </RequireAuth>
          }
        />

        <Route
          path="/app/dashboard"
          element={
            <RequireAuth role="user">
              <DashboardPage />
            </RequireAuth>
          }
        />

        <Route
          path="/app/summary"
          element={
            <RequireAuth role="user">
              <InvestSummaryPage />
            </RequireAuth>
          }
        />

        <Route
          path="/app/silver-tier"
          element={
            <RequireAuth role="user">
              <SilverTierPage />
            </RequireAuth>
          }
        />

        <Route
          path="/app/account"
          element={
            <RequireAuth role="user">
              <AccountPage />
            </RequireAuth>
          }
        />

        <Route
          path="/app/leaderboard"
          element={
            <RequireAuth role="user">
              <LeaderboardPage />
            </RequireAuth>
          }
        />

        <Route
          path="/app/support"
          element={
            <RequireAuth role="user">
              <SupportPage />
            </RequireAuth>
          }
        />

        <Route
          path="/app/community"
          element={
            <RequireAuth role="user">
              <CommunityPage />
            </RequireAuth>
          }
        />

        <Route
          path="/app/*"
          element={
            <RequireAuth role="user">
              <AppPlaceholder />
            </RequireAuth>
          }
        />

        {/* ── Admin routes — gated by RequireAuth role="admin", rendered inside AdminLayout ── */}
        <Route
          path="/admin"
          element={
            <RequireAuth role="admin">
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="deposits" element={<AdminDeposits />} />
          <Route path="withdrawals" element={<AdminWithdrawals />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:id" element={<AdminUserDetail />} />
          <Route path="support" element={<AdminSupport />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
