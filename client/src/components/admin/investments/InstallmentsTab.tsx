import { useState } from 'react'
import { useApproveInstallment, useApproveBreak, useRejectBreak } from '@/hooks/queries'
import type { AdminInvestment } from '@/services/api/admin'
import { StatusBanner } from '@/components/admin/StatusBanner'
import { AdminButton } from '@/components/admin/AdminButton'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { DataTable, EmptyState, type Column } from '@/components/admin/DataTable'
import { inr } from '@/lib/format'
import { fmt } from './helpers'

interface Props {
  data: AdminInvestment[] | undefined
  isLoading: boolean
  isError: boolean
}

type InstallmentRow = { inv: AdminInvestment; day: number; amount: number }

export function InstallmentsTab({ data, isLoading, isError }: Props) {
  const approveInstallment = useApproveInstallment()
  const approveBreak = useApproveBreak()
  const rejectBreak = useRejectBreak()

  const [approvingInstallment, setApprovingInstallment] = useState<InstallmentRow | null>(null)
  const [approvingBreakId, setApprovingBreakId] = useState<string | null>(null)
  const [rejectingBreakId, setRejectingBreakId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState('')

  // Investments with available (unpaid, matured) installments
  const pendingInstallments: InstallmentRow[] = []
  const breakRequests: AdminInvestment[] = []

  for (const inv of data ?? []) {
    if (inv.status === 'break_requested') {
      breakRequests.push(inv)
    } else if (inv.status === 'active' && inv.installments) {
      for (const inst of inv.installments) {
        if (inst.status === 'available') {
          pendingInstallments.push({ inv, day: inst.day, amount: inst.amount })
        }
      }
    }
  }

  const approvingBreakInv = breakRequests.find((inv) => inv._id === approvingBreakId) ?? null
  const rejectingBreakInv = breakRequests.find((inv) => inv._id === rejectingBreakId) ?? null

  function handleApproveInstallment() {
    if (!approvingInstallment) return
    approveInstallment.mutate([approvingInstallment.inv._id, approvingInstallment.day], {
      onSuccess: () => {
        setStatusMsg(`Day ${approvingInstallment.day} return approved for ${approvingInstallment.inv.user.name}.`)
        setApprovingInstallment(null)
      },
      onError: () => {
        setStatusMsg('Failed to approve installment.')
        setApprovingInstallment(null)
      },
    })
  }

  function handleApproveBreak() {
    if (!approvingBreakId) return
    approveBreak.mutate([approvingBreakId], {
      onSuccess: () => {
        setStatusMsg('Break approved. Principal + accrued profit credited to user wallet.')
        setApprovingBreakId(null)
      },
      onError: () => {
        setStatusMsg('Failed to approve break.')
        setApprovingBreakId(null)
      },
    })
  }

  function handleRejectBreak() {
    if (!rejectingBreakId) return
    rejectBreak.mutate([rejectingBreakId], {
      onSuccess: () => {
        setStatusMsg('Break request rejected. Investment continues normally.')
        setRejectingBreakId(null)
      },
      onError: () => {
        setStatusMsg('Failed to reject break.')
        setRejectingBreakId(null)
      },
    })
  }

  const installmentColumns: Column<InstallmentRow>[] = [
    {
      key: 'user',
      header: 'User',
      render: (r) => (
        <>
          <p className="font-medium text-asm-navy">{r.inv.user.name}</p>
          <p className="text-[11px] text-asm-muted">{r.inv.user.email}</p>
        </>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (r) => (
        <span className="inline-flex items-center rounded-md bg-asm-blue-tint px-2 py-0.5 text-[11px] font-semibold capitalize text-asm-blue">
          {r.inv.planKey}
        </span>
      ),
    },
    {
      key: 'ref',
      header: 'Reference',
      className: 'font-mono text-[11px] text-asm-body',
      render: (r) => r.inv.referenceCode,
    },
    {
      key: 'day',
      header: 'Day',
      render: (r) => (
        <span className="font-semibold text-asm-navy">
          Day {r.day} of {r.inv.installments?.length ?? 3}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Return Amount',
      align: 'right',
      className: 'font-mono tabular-nums font-semibold text-asm-greenInk',
      render: (r) => inr(r.amount),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <AdminButton
          size="sm"
          variant="success"
          onClick={() => setApprovingInstallment(r)}
          disabled={approveInstallment.isPending}
        >
          Approve Day {r.day}
        </AdminButton>
      ),
    },
  ]

  const breakColumns: Column<AdminInvestment>[] = [
    {
      key: 'user',
      header: 'User',
      render: (inv) => (
        <>
          <p className="font-medium text-asm-navy">{inv.user.name}</p>
          <p className="text-[11px] text-asm-muted">{inv.user.email}</p>
        </>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (inv) => (
        <span className="inline-flex items-center rounded-md bg-asm-blue-tint px-2 py-0.5 text-[11px] font-semibold capitalize text-asm-blue">
          {inv.planKey}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Invested',
      align: 'right',
      className: 'font-mono tabular-nums text-asm-navy',
      render: (inv) => inr(inv.amount),
    },
    {
      key: 'requestedAt',
      header: 'Requested',
      render: (inv) => (
        <span className="text-[12px] text-asm-body">
          {inv.breakRequestedAt ? fmt(inv.breakRequestedAt) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (inv) => (
        <div className="flex justify-end gap-2">
          <AdminButton
            size="sm"
            variant="success"
            onClick={() => setApprovingBreakId(inv._id)}
            disabled={approveBreak.isPending || rejectBreak.isPending}
          >
            Approve Break
          </AdminButton>
          <AdminButton
            size="sm"
            variant="outline"
            onClick={() => setRejectingBreakId(inv._id)}
            disabled={approveBreak.isPending || rejectBreak.isPending}
          >
            <span className="text-asm-red">Reject</span>
          </AdminButton>
        </div>
      ),
    },
  ]

  return (
    <>
      <StatusBanner message={statusMsg} />

      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-asm-navy">Pending Daily Returns</h2>
          <DataTable
            columns={installmentColumns}
            rows={pendingInstallments}
            getRowKey={(r) => `${r.inv._id}-d${r.day}`}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load investments. Please refresh."
            minWidth={700}
            empty={
              <EmptyState
                title="No installments awaiting approval"
                description="All daily returns are paid or not yet due."
              />
            }
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-asm-navy">Break Requests</h2>
          <DataTable
            columns={breakColumns}
            rows={breakRequests}
            getRowKey={(inv) => inv._id}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load break requests. Please refresh."
            minWidth={680}
            empty={
              <EmptyState
                title="No break requests pending"
                description="No users have requested an early exit."
              />
            }
          />
        </section>
      </div>

      {approvingInstallment && (
        <ConfirmDialog
          title={`Approve Day ${approvingInstallment.day} return?`}
          body={
            <>
              Credit <strong className="font-semibold text-asm-navy">{inr(approvingInstallment.amount)}</strong> (Day{' '}
              {approvingInstallment.day} return) to{' '}
              <strong className="font-semibold text-asm-navy">{approvingInstallment.inv.user.name}</strong>'s wallet. This
              cannot be undone.
            </>
          }
          confirmLabel={`Approve Day ${approvingInstallment.day}`}
          pendingLabel="Approving…"
          confirmVariant="success"
          isPending={approveInstallment.isPending}
          onConfirm={handleApproveInstallment}
          onCancel={() => setApprovingInstallment(null)}
        />
      )}

      {approvingBreakInv && (
        <ConfirmDialog
          title="Approve break request?"
          body={
            <>
              End <strong className="font-semibold text-asm-navy">{approvingBreakInv.user.name}</strong>'s investment early.
              Principal + accrued profit will be credited to their wallet. This cannot be undone.
            </>
          }
          confirmLabel="Approve Break"
          pendingLabel="Approving…"
          confirmVariant="success"
          isPending={approveBreak.isPending}
          onConfirm={handleApproveBreak}
          onCancel={() => setApprovingBreakId(null)}
        />
      )}

      {rejectingBreakInv && (
        <ConfirmDialog
          title="Reject break request?"
          body={
            <>
              Decline <strong className="font-semibold text-asm-navy">{rejectingBreakInv.user.name}</strong>'s early exit
              request. Their investment will continue as normal.
            </>
          }
          confirmLabel="Reject"
          pendingLabel="Rejecting…"
          confirmVariant="danger"
          isPending={rejectBreak.isPending}
          onConfirm={handleRejectBreak}
          onCancel={() => setRejectingBreakId(null)}
        />
      )}
    </>
  )
}
