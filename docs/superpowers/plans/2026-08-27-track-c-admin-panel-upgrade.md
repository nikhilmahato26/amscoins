# Track C — Admin Panel Content & Hierarchy Upgrade

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the admin panel from generic shadcn defaults into a serious operations tool — clear data hierarchy, at-a-glance pending actions, recent activity, and consistent component usage across all admin pages.

**Architecture:** The admin shell (sidebar, header, `theme-light-home` class) is already correct. All changes are to page content within `client/src/pages/admin/` and `client/src/components/admin/`. Three new sub-components are created: `PendingActionsStrip`, `ActivityTimeline`, and `StatusBadge`.

**Tech Stack:** React 19, Tailwind 3, `asm-*` palette, Lucide icons, existing `useAdminStats` / `useAdminInvestments` / `useAdminWithdrawals` hooks

## Global Constraints

- All admin pages use `theme-light-home` via `AdminLayout` — no need to re-apply it on individual pages
- Card surfaces: `bg-white border border-asm-line rounded-xl`
- Page padding: `p-4 sm:p-6 lg:p-8` (follow existing AdminDashboard pattern)
- Status badge colours must be consistent across ALL admin tables (defined once in `StatusBadge`)
- `import type` for type-only imports; no unused vars (TypeScript strict)
- Run `npm run build` inside `client/` to confirm no type errors after each task

---

### Task 1: StatusBadge — shared component for all admin tables

**Files:**
- Create: `client/src/components/admin/StatusBadge.tsx`
- Modify: `client/src/pages/admin/AdminInvestments.tsx` — use StatusBadge
- Modify: `client/src/pages/admin/AdminWithdrawals.tsx` — use StatusBadge
- Modify: `client/src/pages/admin/AdminDeposits.tsx` — use StatusBadge (if statuses are displayed)

**Why first:** Later tasks depend on consistent status display — define it once here.

**Interfaces:**
- Produces: `StatusBadge({ status })` — consumed by every admin table task below

- [ ] **Step 1: Create `StatusBadge.tsx`**

  ```tsx
  // client/src/components/admin/StatusBadge.tsx
  import { cn } from '@/lib/utils'

  type Status =
    | 'pending'
    | 'approved'
    | 'active'
    | 'rejected'
    | 'matured'
    | 'completed'
    | 'cancelled'
    | 'paid'

  const CONFIG: Record<Status, { label: string; className: string }> = {
    pending:   { label: 'Pending',   className: 'bg-amber-50  text-amber-700  border-amber-200'  },
    approved:  { label: 'Approved',  className: 'bg-green-50  text-green-700  border-green-200'  },
    active:    { label: 'Active',    className: 'bg-green-50  text-green-700  border-green-200'  },
    rejected:  { label: 'Rejected',  className: 'bg-red-50    text-asm-red    border-red-200'    },
    matured:   { label: 'Matured',   className: 'bg-asm-blue-tint text-asm-blue border-asm-blue/20' },
    completed: { label: 'Completed', className: 'bg-asm-blue-tint text-asm-blue border-asm-blue/20' },
    cancelled: { label: 'Cancelled', className: 'bg-asm-tint  text-asm-muted  border-asm-line'  },
    paid:      { label: 'Paid',      className: 'bg-green-50  text-green-700  border-green-200'  },
  }

  export function StatusBadge({ status }: { status: string }) {
    const key = status.toLowerCase() as Status
    const cfg = CONFIG[key] ?? { label: status, className: 'bg-asm-tint text-asm-muted border-asm-line' }
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize',
          cfg.className
        )}
      >
        {cfg.label}
      </span>
    )
  }
  ```

- [ ] **Step 2: Use StatusBadge in AdminInvestments**

  Open `client/src/pages/admin/AdminInvestments.tsx`. Find where investment status is rendered (inline string or existing badge). Import and replace with:
  ```tsx
  import { StatusBadge } from '@/components/admin/StatusBadge'
  // ...
  <StatusBadge status={investment.status} />
  ```

- [ ] **Step 3: Use StatusBadge in AdminWithdrawals**

  Same as Step 2 for `client/src/pages/admin/AdminWithdrawals.tsx`.

- [ ] **Step 4: Use StatusBadge in AdminDeposits**

  Same as Step 2 for `client/src/pages/admin/AdminDeposits.tsx` — only if deposit status is shown in that table.

- [ ] **Step 5: Build and verify**

  ```bash
  cd client && npm run build
  ```
  Expected: no type errors. Status strings from the API must be lowercase or match the CONFIG keys — check actual API response field values if needed.

- [ ] **Step 6: Commit**

  ```bash
  git add client/src/components/admin/StatusBadge.tsx \
          client/src/pages/admin/AdminInvestments.tsx \
          client/src/pages/admin/AdminWithdrawals.tsx \
          client/src/pages/admin/AdminDeposits.tsx
  git commit -m "feat(admin): StatusBadge component — consistent colour-coded status across all tables"
  ```

---

### Task 2: AdminDashboard — upgraded StatCard + number hierarchy

**Files:**
- Modify: `client/src/pages/admin/AdminDashboard.tsx`

**What's changing:** The existing `StatCard` component has a size-9 icon and basic value display. We upgrade to a 32px bold value, a delta badge, and a larger icon container.

**Interfaces:**
- Consumes: `useAdminStats()` — same hook, same data
- Produces: upgraded `StatCard` with `delta?: string` prop

- [ ] **Step 1: Read the current StatCard**

  Open `client/src/pages/admin/AdminDashboard.tsx`. Find the `StatCard` component and its `StatCardProps` interface.

- [ ] **Step 2: Upgrade StatCardProps**

  Add an optional `delta` prop:
  ```tsx
  interface StatCardProps {
    label: string
    value: string | number
    icon: React.ElementType
    iconClass: string
    iconBgClass: string
    delta?: string          // e.g. "+12 this week"
    deltaPositive?: boolean // true = green, false = red, undefined = neutral
  }
  ```

- [ ] **Step 3: Upgrade StatCard JSX**

  Replace the `StatCard` function body:
  ```tsx
  function StatCard({ label, value, icon: Icon, iconClass, iconBgClass, delta, deltaPositive }: StatCardProps) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-asm-line bg-white p-5 shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
        <div className="flex items-start justify-between gap-2">
          <span className={cn('flex size-10 items-center justify-center rounded-xl', iconBgClass)}>
            <Icon className={cn('size-5', iconClass)} strokeWidth={1.75} aria-hidden />
          </span>
          {delta !== undefined && (
            <span className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
              deltaPositive === true  && 'bg-green-50 text-green-700',
              deltaPositive === false && 'bg-red-50 text-asm-red',
              deltaPositive === undefined && 'bg-asm-tint text-asm-muted',
            )}>
              {delta}
            </span>
          )}
        </div>
        <div>
          <div className="font-jakarta text-[30px] font-extrabold leading-none tracking-tight text-asm-navy xl:text-[34px]">
            {value}
          </div>
          <div className="mt-1 text-[12px] font-semibold text-asm-muted">{label}</div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 4: Build and verify**

  ```bash
  cd client && npm run build
  ```
  Expected: no type errors.

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/pages/admin/AdminDashboard.tsx
  git commit -m "feat(admin/dashboard): upgrade StatCard — 30px value, delta badge, larger icon"
  ```

---

### Task 3: PendingActionsStrip — at-a-glance operational overview

**Files:**
- Create: `client/src/components/admin/PendingActionsStrip.tsx`
- Modify: `client/src/pages/admin/AdminDashboard.tsx` — insert strip below stat cards

**What's changing:** A new strip showing the count of pending investments, pending withdrawals, and open support tickets — each as a deep-link chip. This is the single highest-value addition for admin efficiency.

**Interfaces:**
- Consumes: `useAdminStats()` data — `data.pendingDeposits`, `data.pendingWithdrawals` (check actual field names from the hook)
- Produces: `PendingActionsStrip` component

- [ ] **Step 1: Check exact field names**

  Open `client/src/hooks/queries.ts` (or wherever `useAdminStats` is defined). Find the return type to confirm the exact field names for pending investment and withdrawal counts.

- [ ] **Step 2: Create PendingActionsStrip.tsx**

  ```tsx
  // client/src/components/admin/PendingActionsStrip.tsx
  import { Link } from 'react-router'
  import { ArrowRight, TrendingUp, ArrowUpFromLine, LifeBuoy } from 'lucide-react'
  import { cn } from '@/lib/utils'

  interface PendingItem {
    count: number
    label: string
    sublabel: string
    to: string
    icon: React.ElementType
    tone: 'amber' | 'violet' | 'blue'
  }

  const TONE_CLASSES = {
    amber:  'border-l-amber-400  bg-amber-50  text-amber-700',
    violet: 'border-l-violet-400 bg-violet-50 text-violet-700',
    blue:   'border-l-asm-blue   bg-asm-blue-tint text-asm-blue',
  } as const

  function PendingChip({ count, label, sublabel, to, icon: Icon, tone }: PendingItem) {
    if (count === 0) return null
    return (
      <Link
        to={to}
        className={cn(
          'flex flex-1 items-center gap-3 rounded-xl border border-asm-line border-l-4 p-4',
          'transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue',
          TONE_CLASSES[tone]
        )}
      >
        <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-[22px] font-extrabold leading-none">{count}</div>
          <div className="mt-0.5 text-[12px] font-semibold">{label}</div>
          <div className="text-[11px] opacity-70">{sublabel}</div>
        </div>
        <ArrowRight className="size-4 shrink-0 opacity-60" strokeWidth={2} aria-hidden />
      </Link>
    )
  }

  export function PendingActionsStrip({
    pendingInvestments,
    pendingWithdrawals,
    openTickets = 0,
  }: {
    pendingInvestments: number
    pendingWithdrawals: number
    openTickets?: number
  }) {
    const hasAny = pendingInvestments > 0 || pendingWithdrawals > 0 || openTickets > 0
    if (!hasAny) return null

    return (
      <section aria-label="Pending actions" className="flex flex-col gap-3 sm:flex-row">
        <PendingChip
          count={pendingInvestments}
          label="Pending Investments"
          sublabel="Awaiting approval"
          to="/admin/investments?status=pending"
          icon={TrendingUp}
          tone="amber"
        />
        <PendingChip
          count={pendingWithdrawals}
          label="Pending Withdrawals"
          sublabel="Awaiting payout"
          to="/admin/withdrawals?status=pending"
          icon={ArrowUpFromLine}
          tone="violet"
        />
        {openTickets > 0 && (
          <PendingChip
            count={openTickets}
            label="Open Tickets"
            sublabel="Support requests"
            to="/admin/support"
            icon={LifeBuoy}
            tone="blue"
          />
        )}
      </section>
    )
  }
  ```

- [ ] **Step 3: Insert PendingActionsStrip into AdminDashboard**

  In `AdminDashboard.tsx`:
  ```tsx
  import { PendingActionsStrip } from '@/components/admin/PendingActionsStrip'
  ```

  After the stat cards section, add:
  ```tsx
  {data && (
    <PendingActionsStrip
      pendingInvestments={data.pendingDeposits}   // adjust field name if different
      pendingWithdrawals={data.pendingWithdrawals}
    />
  )}
  ```
  *(Field names: use what `useAdminStats` actually returns — confirmed in Step 1.)*

- [ ] **Step 4: Build and verify**

  ```bash
  cd client && npm run build
  ```
  Expected: no type errors.

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/components/admin/PendingActionsStrip.tsx \
          client/src/pages/admin/AdminDashboard.tsx
  git commit -m "feat(admin/dashboard): PendingActionsStrip — at-a-glance pending counts with deep-links"
  ```

---

### Task 4: ActivityTimeline — recent platform actions on dashboard

**Files:**
- Create: `client/src/components/admin/ActivityTimeline.tsx`
- Modify: `client/src/pages/admin/AdminDashboard.tsx` — insert timeline

**What's changing:** The dashboard currently has no sense of "what just happened." A compact timeline of the last 10 actions (investment approvals, withdrawals, new users) makes it feel live and operational.

**Interfaces:**
- Consumes: A new admin API endpoint `GET /api/admin/activity` or derived from existing list endpoints — check `client/src/services/api/admin.ts` and `client/src/hooks/queries.ts` for any existing recent-activity hook. If none exists, render the component with a stub hook that returns `[]` until the backend adds the endpoint.
- Produces: `ActivityTimeline` component + `useAdminActivity` stub hook

- [ ] **Step 1: Check for an existing activity hook**

  ```bash
  grep -n 'activity\|recent\|timeline' client/src/hooks/queries.ts client/src/services/api/admin.ts
  ```

  If a hook exists: use it in Step 3.
  If not: create a stub in `client/src/hooks/queries.ts`:
  ```tsx
  export type ActivityEvent = {
    id: string
    type: 'investment_approved' | 'investment_rejected' | 'withdrawal_approved' | 'withdrawal_rejected' | 'user_registered'
    userName: string
    amount?: number
    timestamp: string
  }

  export function useAdminActivity() {
    // Stub — replace with real API call when backend endpoint is ready
    return { data: [] as ActivityEvent[], isLoading: false }
  }
  ```

- [ ] **Step 2: Create ActivityTimeline.tsx**

  ```tsx
  // client/src/components/admin/ActivityTimeline.tsx
  import { TrendingUp, ArrowUpFromLine, UserPlus, CheckCircle, XCircle } from 'lucide-react'
  import { cn } from '@/lib/utils'
  import { inr } from '@/lib/format'
  import type { ActivityEvent } from '@/hooks/queries'

  const EVENT_CONFIG = {
    investment_approved:  { icon: CheckCircle,      iconClass: 'text-green-600',  bgClass: 'bg-green-50',        label: 'Investment approved'  },
    investment_rejected:  { icon: XCircle,          iconClass: 'text-asm-red',    bgClass: 'bg-red-50',          label: 'Investment rejected'  },
    withdrawal_approved:  { icon: ArrowUpFromLine,  iconClass: 'text-asm-blue',   bgClass: 'bg-asm-blue-tint',   label: 'Withdrawal approved'  },
    withdrawal_rejected:  { icon: XCircle,          iconClass: 'text-asm-red',    bgClass: 'bg-red-50',          label: 'Withdrawal rejected'  },
    user_registered:      { icon: UserPlus,         iconClass: 'text-violet-600', bgClass: 'bg-violet-50',       label: 'New user registered'  },
  } as const

  function timeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60_000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
    if (events.length === 0) return null

    return (
      <section aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="mb-3 text-[13px] font-bold uppercase tracking-[0.08em] text-asm-muted">
          Recent Activity
        </h2>
        <div className="rounded-xl border border-asm-line bg-white divide-y divide-asm-line">
          {events.slice(0, 10).map((ev) => {
            const cfg = EVENT_CONFIG[ev.type]
            const Icon = cfg.icon
            return (
              <div key={ev.id} className="flex items-center gap-3 px-4 py-3">
                <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', cfg.bgClass)}>
                  <Icon className={cn('size-4', cfg.iconClass)} strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[13px] font-semibold text-asm-navy">{ev.userName}</span>
                  <span className="mx-1.5 text-asm-muted">·</span>
                  <span className="text-[13px] text-asm-body">{cfg.label}</span>
                  {ev.amount !== undefined && (
                    <span className="ml-1.5 text-[13px] font-semibold text-asm-navy">{inr(ev.amount)}</span>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-asm-muted">{timeAgo(ev.timestamp)}</span>
              </div>
            )
          })}
        </div>
      </section>
    )
  }
  ```

- [ ] **Step 3: Insert ActivityTimeline into AdminDashboard**

  In `AdminDashboard.tsx`:
  ```tsx
  import { ActivityTimeline } from '@/components/admin/ActivityTimeline'
  import { useAdminActivity } from '@/hooks/queries'
  ```

  After the `PendingActionsStrip`, add:
  ```tsx
  const activityQuery = useAdminActivity()
  // ...
  <ActivityTimeline events={activityQuery.data ?? []} />
  ```

- [ ] **Step 4: Build and verify**

  ```bash
  cd client && npm run build
  ```
  Expected: no type errors. The timeline renders empty (stub returns `[]`) — that's correct until the backend endpoint exists.

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/components/admin/ActivityTimeline.tsx \
          client/src/hooks/queries.ts \
          client/src/pages/admin/AdminDashboard.tsx
  git commit -m "feat(admin/dashboard): ActivityTimeline component with stub hook — ready for backend endpoint"
  ```

---

### Task 5: AdminInvestments + AdminWithdrawals — table visual hierarchy

**Files:**
- Modify: `client/src/pages/admin/AdminInvestments.tsx`
- Modify: `client/src/pages/admin/AdminWithdrawals.tsx`

**What's changing:** Tables need sticky headers, bold amount column, row hover, and UPI ID copyable chip on withdrawals. Both already use StatusBadge from Task 1.

- [ ] **Step 1: Add sticky table header**

  In `AdminInvestments.tsx` and `AdminWithdrawals.tsx`, find the `<thead>` or header row. Add:
  ```tsx
  <thead className="sticky top-0 z-10 bg-white border-b border-asm-line">
  ```
  Add `text-[11px] font-bold uppercase tracking-[0.07em] text-asm-muted px-4 py-3 text-left` to each `<th>`.

- [ ] **Step 2: Bold amount column**

  Find the amount cell (`<td>`) in both tables. Ensure it uses:
  ```tsx
  <td className="px-4 py-3 font-mono text-[14px] font-bold tabular-nums text-asm-navy">
    {inr(row.amount)}
  </td>
  ```

- [ ] **Step 3: Row hover**

  On each `<tr>` in tbody, add:
  ```tsx
  className="transition-colors hover:bg-asm-tint/60"
  ```

- [ ] **Step 4: UPI copyable chip on AdminWithdrawals**

  In `AdminWithdrawals.tsx`, find where the UPI ID is displayed. Replace with a copyable chip:
  ```tsx
  function UpiChip({ upiId }: { upiId: string }) {
    const [copied, setCopied] = useState(false)
    function copy() {
      void navigator.clipboard.writeText(upiId).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
    }
    return (
      <button
        type="button"
        onClick={copy}
        title="Copy UPI ID"
        className="inline-flex items-center gap-1.5 rounded-md border border-asm-line bg-asm-tint px-2.5 py-1 font-mono text-[12px] text-asm-navy transition-colors hover:border-asm-blue hover:bg-asm-blue-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue"
      >
        {copied ? '✓ Copied' : upiId}
      </button>
    )
  }
  ```
  Import `useState` if not already present. Use `<UpiChip upiId={withdrawal.upiId} />` in the table cell (adjust field name to match actual API response).

- [ ] **Step 5: Build and verify**

  ```bash
  cd client && npm run build
  ```
  Expected: no type errors.

- [ ] **Step 6: Commit**

  ```bash
  git add client/src/pages/admin/AdminInvestments.tsx \
          client/src/pages/admin/AdminWithdrawals.tsx
  git commit -m "feat(admin): sticky table headers, bold amounts, row hover, UPI copyable chip"
  ```

---

### Task 6: AdminUsers — avatar initials + tier badges

**Files:**
- Modify: `client/src/pages/admin/AdminUsers.tsx`
- Modify: `client/src/pages/admin/AdminUserDetail.tsx`

**What's changing:** User rows get an avatar initial circle. Tier badges use the same Silver/Gold/Diamond colour system as the user-facing app.

- [ ] **Step 1: Add avatar initial circle to AdminUsers**

  In the user row, before the name cell, add:
  ```tsx
  function UserAvatar({ name }: { name: string }) {
    const initials = name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('')
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-asm-blue-tint text-[13px] font-bold text-asm-blue">
        {initials}
      </span>
    )
  }
  ```

  In the table row:
  ```tsx
  <td className="px-4 py-3">
    <div className="flex items-center gap-3">
      <UserAvatar name={user.name} />
      <div>
        <div className="text-[13px] font-semibold text-asm-navy">{user.name}</div>
        <div className="text-[12px] text-asm-muted">{user.phone}</div>
      </div>
    </div>
  </td>
  ```

- [ ] **Step 2: Add tier badge**

  Define tier badge config and add to user rows:
  ```tsx
  const TIER_BADGE = {
    silver:  'bg-[#CED5E1]/40 text-[#5A6472] border-[#B1B5BB]/40',
    gold:    'bg-amber-50 text-amber-700 border-amber-200',
    diamond: 'bg-asm-blue-tint text-asm-blue border-asm-blue/20',
  } as const

  function TierBadgeAdmin({ tier }: { tier: string }) {
    const cls = TIER_BADGE[tier.toLowerCase() as keyof typeof TIER_BADGE]
      ?? 'bg-asm-tint text-asm-muted border-asm-line'
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${cls}`}>
        {tier}
      </span>
    )
  }
  ```
  Add `<TierBadgeAdmin tier={user.tier ?? 'silver'} />` to the user row — adjust field name to match API.

- [ ] **Step 3: Section cards in AdminUserDetail**

  Open `client/src/pages/admin/AdminUserDetail.tsx`. Find any flat content sections. Wrap each section in a white card:
  ```tsx
  <div className="rounded-xl border border-asm-line bg-white p-5">
    <h2 className="mb-4 text-[15px] font-bold text-asm-navy">{sectionTitle}</h2>
    {/* section content */}
  </div>
  ```

- [ ] **Step 4: Build and verify**

  ```bash
  cd client && npm run build
  ```
  Expected: no type errors.

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/pages/admin/AdminUsers.tsx \
          client/src/pages/admin/AdminUserDetail.tsx
  git commit -m "feat(admin/users): avatar initials, tier badges, section card layout in UserDetail"
  ```

---

### Task 7: AdminSettings — grouped layout with section headers

**Files:**
- Modify: `client/src/pages/admin/AdminSettings.tsx`

**What's changing:** Settings are currently a flat form. We group them into labelled sections with descriptions per setting.

- [ ] **Step 1: Read AdminSettings.tsx**

  Open `client/src/pages/admin/AdminSettings.tsx`. Identify all settings currently rendered and group them into logical sections:
  - **Plan Controls**: Silver/Gold/Diamond toggles
  - **Deposit Gate**: on/off + config values
  - **Withdrawal Cooldown**: duration input
  - **Platform Config**: anything else

- [ ] **Step 2: Create a SettingsSection wrapper**

  Add this helper inside `AdminSettings.tsx`:
  ```tsx
  function SettingsSection({
    title,
    description,
    children,
    destructive = false,
  }: {
    title: string
    description?: string
    children: React.ReactNode
    destructive?: boolean
  }) {
    return (
      <section className="rounded-xl border border-asm-line bg-white">
        <div className={cn(
          'border-b border-asm-line px-5 py-4',
          destructive && 'border-l-4 border-l-asm-red'
        )}>
          <h2 className={cn('text-[15px] font-bold', destructive ? 'text-asm-red' : 'text-asm-navy')}>
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-[13px] text-asm-muted">{description}</p>
          )}
        </div>
        <div className="divide-y divide-asm-line">{children}</div>
      </section>
    )
  }

  function SettingRow({
    label,
    description,
    control,
  }: {
    label: string
    description?: string
    control: React.ReactNode
  }) {
    return (
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <div className="text-[14px] font-semibold text-asm-navy">{label}</div>
          {description && <div className="mt-0.5 text-[12px] text-asm-muted">{description}</div>}
        </div>
        <div className="shrink-0">{control}</div>
      </div>
    )
  }
  ```

- [ ] **Step 3: Restructure the settings JSX**

  Wrap existing settings into `SettingsSection` + `SettingRow` groups. Example:
  ```tsx
  <div className="flex flex-col gap-6">
    <SettingsSection
      title="Plan Controls"
      description="Enable or disable investment plans. Disabled plans cannot be selected by users."
      destructive
    >
      <SettingRow
        label="Silver Plan"
        description="25% return, 36-hour cycle, ₹1,000–₹50,000"
        control={<SilverToggleControl />}  // your existing toggle component/JSX
      />
      {/* Gold and Diamond rows similarly */}
    </SettingsSection>

    <SettingsSection
      title="Deposit Gate"
      description="When enabled, new deposits require admin approval before funds are credited."
    >
      {/* existing deposit gate controls */}
    </SettingsSection>

    <SettingsSection
      title="Withdrawal Cooldown"
      description="Minimum hours a user must wait between withdrawals."
    >
      {/* existing cooldown input */}
    </SettingsSection>
  </div>
  ```

- [ ] **Step 4: Build and verify**

  ```bash
  cd client && npm run build
  ```
  Expected: no type errors.

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/pages/admin/AdminSettings.tsx
  git commit -m "feat(admin/settings): grouped sections — Plan Controls, Deposit Gate, Withdrawal Cooldown"
  ```

---

### Task 8: AdminPageHeader — audit and standardise across all admin pages

**Files:**
- Modify: `client/src/components/admin/AdminPageHeader.tsx` — review and harden
- Modify: any admin page missing a consistent h1 + subtitle + action header

**What's changing:** All admin pages should open with a consistent pattern: `h1` (22–26px bold, asm-navy) + subtitle (13px, asm-muted) + optional primary action button (top-right). `AdminPageHeader` exists but may not be used everywhere.

- [ ] **Step 1: Read AdminPageHeader.tsx**

  Open `client/src/components/admin/AdminPageHeader.tsx`. Confirm its interface. If it accepts `title`, `subtitle`, and optional `action` slot, it's ready. If not, update its props:
  ```tsx
  interface AdminPageHeaderProps {
    title: string
    subtitle?: string
    action?: React.ReactNode
  }

  export function AdminPageHeader({ title, subtitle, action }: AdminPageHeaderProps) {
    return (
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] xl:text-[26px] font-bold tracking-tight text-asm-navy">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[13px] xl:text-[14px] text-asm-muted">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0 pt-1">{action}</div>}
      </div>
    )
  }
  ```

- [ ] **Step 2: Audit which admin pages use it**

  ```bash
  grep -rn 'AdminPageHeader\|<h1' client/src/pages/admin/ --include='*.tsx'
  ```
  For each page that renders an `<h1>` directly without `AdminPageHeader`, replace it:
  ```tsx
  import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
  // ...
  <AdminPageHeader title="Page Title" subtitle="Brief description." />
  ```

- [ ] **Step 3: Build and verify**

  ```bash
  cd client && npm run build
  ```
  Expected: no type errors. All admin pages have a consistent header component.

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/components/admin/AdminPageHeader.tsx \
          client/src/pages/admin/
  git commit -m "feat(admin): standardise AdminPageHeader — h1 + subtitle + action slot across all pages"
  ```
