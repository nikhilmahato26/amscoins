import { CircleUserRound, House, LayoutDashboard, LifeBuoy, Package, Trophy, TrendingUp, Users, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface AppNavLink {
  to: string
  /** Full label — used by the drawer and the desktop side rail. */
  label: string
  /** Compact label for the width-constrained bottom tab bar. Falls back to `label`. */
  short?: string
  Icon: LucideIcon
  end: boolean
}

/**
 * Single source of truth for the authenticated app's primary navigation.
 * Consumed by the desktop side rail (SideNav) and the mobile hamburger drawer
 * (AppShell) so the two can never drift apart.
 */
export const APP_NAV_LINKS: readonly AppNavLink[] = [
  { to: '/app', label: 'Home', Icon: House, end: true },
  { to: '/app/dashboard', label: 'Dashboard', Icon: LayoutDashboard, end: false },
  { to: '/plans', label: 'Packages', Icon: Package, end: false },
  { to: '/app/investments', label: 'Investments', short: 'Invest', Icon: TrendingUp, end: false },
  { to: '/app/withdraw', label: 'Withdraw', Icon: Wallet, end: false },
  { to: '/app/leaderboard', label: 'Leaderboard', short: 'Leaders', Icon: Trophy, end: false },
  { to: '/app/referral', label: 'Referral', Icon: Users, end: false },
  { to: '/app/community', label: 'Community', Icon: Users, end: false },
  { to: '/app/support', label: 'Support', Icon: LifeBuoy, end: false },
  { to: '/app/account', label: 'Account', Icon: CircleUserRound, end: false },
]
