import { Navigate, useSearchParams } from 'react-router'

import { LandingPage } from './LandingPage'

/**
 * The app hands out referral links shaped `/?ref=CODE` (see the backend's
 * referral overview). Rendering the marketing home for those would silently
 * drop the code, so when `ref` is present we send the visitor straight to the
 * register screen — forwarding the whole query string so RegisterPage can
 * pre-fill the referral code (and honour any `?plan=` alongside it). Any other
 * visit to `/` is an ordinary home-page visit and renders LandingPage.
 */
export function LandingRoute() {
  const [params] = useSearchParams()

  if (params.get('ref')) {
    return <Navigate to={`/register?${params.toString()}`} replace />
  }

  return <LandingPage />
}
