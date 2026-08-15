import { NavLink, Outlet, useNavigate } from 'react-router'
import { LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, Users, LogOut } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { authService } from '@/services/authService'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/deposits', label: 'Deposits', icon: ArrowDownToLine, end: false },
  { to: '/admin/withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine, end: false },
  { to: '/admin/users', label: 'Users', icon: Users, end: false },
] as const

export function AdminLayout() {
  const { setUser } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    authService.logout()
    setUser(null)
    void navigate('/login')
  }

  return (
    <div className="theme-light-home flex min-h-screen bg-asm-tint font-sans text-asm-navy">
      {/* ── Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-asm-line bg-white">
        {/* Brand */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-asm-line px-5">
          <span
            className="flex size-7 items-center justify-center rounded-lg bg-asm-blue text-[11px] font-extrabold tracking-tight text-white"
            aria-hidden
          >
            A
          </span>
          <span className="text-[13px] font-bold tracking-tight text-asm-navy">
            ASM <span className="font-normal text-asm-muted">Admin</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3" aria-label="Admin navigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1',
                  isActive
                    ? 'bg-asm-blue-tint text-asm-blue'
                    : 'text-asm-body hover:bg-asm-tint hover:text-asm-navy',
                )
              }
            >
              <Icon
                className={cn('size-4 shrink-0')}
                strokeWidth={1.75}
                aria-hidden
              />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="shrink-0 border-t border-asm-line p-3">
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5',
              'text-[13px] font-medium text-asm-body transition-colors',
              'hover:bg-red-50 hover:text-asm-red',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1',
            )}
          >
            <LogOut className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Log out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="ml-60 flex min-h-screen flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
