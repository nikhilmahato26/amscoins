import { useState } from 'react'

import {
  LandingFooter,
  LandingHeader,
  LandingMenu,
} from '@/components/landing/LandingChrome'
import { OrganizationSchema } from '@/components/seo/OrganizationSchema'

/**
 * Shared chrome for all public (non-auth-gated) pages:
 * marketing header + navigation drawer + footer + sitewide Organization schema.
 */
export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-skin-tint text-skin-text">
      <OrganizationSchema />
      <LandingHeader
        menuOpen={menuOpen}
        onMenu={() => setMenuOpen((v) => !v)}
      />
      <LandingMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="flex-1">{children}</main>
      <LandingFooter />
    </div>
  )
}
