import { useState } from 'react'
import { ArrowDown, ArrowUp, Minus, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminButton } from '@/components/admin/AdminButton'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { DataTable, EmptyState, type Column } from '@/components/admin/DataTable'
import { CoinIndexCard } from '@/components/coin/CoinIndexCard'
import {
  useCoinActions,
  useCoinCrash,
  useCoinPump,
  useCoinReset,
  useCoinVolatility,
} from '@/hooks/queries'
import { formatCoinPrice } from '@/lib/coinFormat'
import { cn } from '@/lib/utils'
import type { CoinAdminActionRow, CoinMoveSize } from '@/services/api/admin'

const SIZES: { value: CoinMoveSize; label: string; pct: string }[] = [
  { value: 'small', label: 'Small', pct: '3%' },
  { value: 'medium', label: 'Medium', pct: '8%' },
  { value: 'hard', label: 'Hard', pct: '18%' },
]

const RESET_PRICE_LABEL = '₹1,247.80'

const ACTION_LABEL: Record<CoinAdminActionRow['action'], string> = {
  pump: 'Pump',
  crash: 'Crash',
  volatility: 'Volatility',
  reset: 'Reset',
}

export function AdminCoin() {
  const [size, setSize] = useState<CoinMoveSize>('medium')
  const [durationMinutes, setDurationMinutes] = useState(10)
  const [volatility, setVolatility] = useState(35)
  const [confirmReset, setConfirmReset] = useState(false)

  const pump = useCoinPump()
  const crash = useCoinCrash()
  const setVol = useCoinVolatility()
  const reset = useCoinReset()
  const { data: actions, isLoading: actionsLoading, isError: actionsError } = useCoinActions()

  const busy = pump.isPending || crash.isPending || setVol.isPending || reset.isPending

  const columns: Column<CoinAdminActionRow>[] = [
    {
      key: 'when',
      header: 'When',
      className: 'whitespace-nowrap text-asm-muted',
      render: (row) => new Date(row.createdAt).toLocaleString('en-IN'),
    },
    {
      key: 'admin',
      header: 'Admin',
      className: 'whitespace-nowrap',
      render: (row) =>
        row.admin ? (
          <div>
            <div className="font-semibold text-asm-navy">{row.admin.name}</div>
            <div className="text-[11px] text-asm-muted">{row.admin.email}</div>
          </div>
        ) : (
          <span className="text-asm-muted">Deleted admin</span>
        ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => <ActionBadge action={row.action} />,
    },
    {
      key: 'params',
      header: 'Params',
      className: 'text-asm-muted',
      render: (row) => <ParamsCell action={row.action} params={row.params} />,
    },
    {
      key: 'before',
      header: 'Before',
      align: 'right',
      className: 'tabular-nums text-asm-muted',
      render: (row) => `₹${formatCoinPrice(row.priceBefore)}`,
    },
    {
      key: 'after',
      header: 'After',
      align: 'right',
      className: 'tabular-nums font-semibold text-asm-navy',
      render: (row) => `₹${formatCoinPrice(row.priceAfter)}`,
    },
    {
      key: 'delta',
      header: 'Change',
      align: 'right',
      render: (row) => <DeltaCell before={row.priceBefore} after={row.priceAfter} />,
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <AdminPageHeader
        title="ASM Coin index"
        subtitle="Steer the indicative index. Every action here is recorded in the audit log below."
      />

      {/* ── Live preview ── */}
      <CoinIndexCard variant="home" showCta={false} />

      {/* ── Pump / Crash ── */}
      <section className="rounded-2xl border border-asm-line bg-white p-5 shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-asm-muted">
          Move the index
        </h2>

        <fieldset className="mt-4">
          <legend className="text-[13px] font-semibold text-asm-navy">Size</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SIZES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSize(s.value)}
                aria-pressed={size === s.value}
                className={cn(
                  'rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors',
                  size === s.value
                    ? 'bg-asm-blue-tint text-asm-blue'
                    : 'bg-asm-tint text-asm-body hover:text-asm-navy',
                )}
              >
                {s.label} <span className={size === s.value ? 'opacity-70' : 'text-asm-muted'}>({s.pct})</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-4 block">
          <span className="text-[13px] font-semibold text-asm-navy">
            Play out over{' '}
            <span className="tabular-nums text-asm-blue">{durationMinutes} min</span>
          </span>
          <input
            type="range"
            min={1}
            max={720}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="mt-2 w-full accent-asm-blue"
          />
        </label>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <AdminButton
            variant="success"
            onClick={() => pump.mutate({ size, durationMinutes })}
            disabled={busy}
          >
            <TrendingUp className="size-4" aria-hidden />
            {pump.isPending ? 'Pumping…' : 'Pump'}
          </AdminButton>
          <AdminButton
            variant="danger"
            onClick={() => crash.mutate({ size, durationMinutes })}
            disabled={busy}
          >
            <TrendingDown className="size-4" aria-hidden />
            {crash.isPending ? 'Crashing…' : 'Crash'}
          </AdminButton>
        </div>
        {(pump.isError || crash.isError) && (
          <p role="alert" className="mt-3 text-[12px] text-asm-red">
            Could not apply the move. Please try again.
          </p>
        )}
      </section>

      {/* ── Idle volatility ── */}
      <section className="rounded-2xl border border-asm-line bg-white p-5 shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-asm-muted">
          Idle volatility
        </h2>
        <p className="mt-1.5 text-[13px] text-asm-muted">
          How much the line drifts on its own between actions. 0 holds it flat.
        </p>
        <label className="mt-4 block">
          <span className="text-[13px] font-semibold text-asm-navy tabular-nums">{volatility}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={volatility}
            onChange={(e) => setVolatility(Number(e.target.value))}
            className="mt-2 w-full accent-asm-blue"
          />
        </label>
        <AdminButton
          className="mt-4"
          variant="outline"
          onClick={() => setVol.mutate({ value: volatility })}
          disabled={busy}
        >
          {setVol.isPending ? 'Applying…' : 'Apply volatility'}
        </AdminButton>
        {setVol.isError && (
          <p role="alert" className="mt-3 text-[12px] text-asm-red">
            Could not update volatility. Please try again.
          </p>
        )}
      </section>

      {/* ── Reset ── */}
      <section className="rounded-2xl border border-asm-line bg-white p-5 shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
        <div className="border-l-4 border-l-asm-red pl-4">
          <h2 className="text-[15px] font-bold text-asm-red">Reset</h2>
          <p className="mt-0.5 text-[13px] text-asm-muted">
            Returns the index to {RESET_PRICE_LABEL} and cancels any move in progress. This
            cannot be undone.
          </p>
        </div>
        <AdminButton
          className="mt-4"
          variant="danger"
          onClick={() => setConfirmReset(true)}
          disabled={busy}
        >
          <RotateCcw className="size-4" aria-hidden />
          Reset to baseline
        </AdminButton>
      </section>

      {/* ── Audit log ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-asm-muted">
          Action log
        </h2>
        <DataTable
          columns={columns}
          rows={actions?.rows ?? []}
          getRowKey={(row) => row._id}
          isLoading={actionsLoading}
          isError={actionsError}
          minWidth={760}
          empty={<EmptyState title="No actions yet" description="Pump, crash, volatility, and reset moves will show up here." />}
        />
      </section>

      {confirmReset && (
        <ConfirmDialog
          title="Reset the index?"
          body={`The price returns to ${RESET_PRICE_LABEL} and any move in progress is cancelled. This cannot be undone.`}
          confirmLabel="Reset"
          confirmVariant="danger"
          isPending={reset.isPending}
          onConfirm={() => {
            reset.mutate(undefined)
            setConfirmReset(false)
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  )
}

function ActionBadge({ action }: { action: CoinAdminActionRow['action'] }) {
  const styles: Record<CoinAdminActionRow['action'], string> = {
    pump: 'bg-green-50 text-asm-green',
    crash: 'bg-red-50 text-asm-red',
    volatility: 'bg-asm-blue-tint text-asm-blue',
    reset: 'bg-asm-tint text-asm-navy',
  }
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold', styles[action])}>
      {ACTION_LABEL[action]}
    </span>
  )
}

function ParamsCell({ action, params }: { action: CoinAdminActionRow['action']; params: Record<string, unknown> }) {
  if (action === 'pump' || action === 'crash') {
    const size = typeof params.size === 'string' ? params.size : '—'
    const duration = typeof params.durationMinutes === 'number' ? params.durationMinutes : '—'
    return <span>{size} · {duration} min</span>
  }
  if (action === 'volatility') {
    const value = typeof params.value === 'number' ? params.value : '—'
    return <span>{value}</span>
  }
  return <span>—</span>
}

function DeltaCell({ before, after }: { before: number; after: number }) {
  const diff = after - before
  if (diff === 0) {
    return (
      <span className="inline-flex items-center justify-end gap-1 text-asm-muted">
        <Minus className="size-3.5" aria-hidden />
        No change
      </span>
    )
  }
  const positive = diff > 0
  const pct = before !== 0 ? (diff / before) * 100 : 0
  return (
    <span
      className={cn(
        'inline-flex items-center justify-end gap-1 font-semibold tabular-nums',
        positive ? 'text-asm-green' : 'text-asm-red',
      )}
    >
      {positive ? <ArrowUp className="size-3.5" aria-hidden /> : <ArrowDown className="size-3.5" aria-hidden />}
      {positive ? '+' : ''}
      {pct.toFixed(2)}%
    </span>
  )
}
