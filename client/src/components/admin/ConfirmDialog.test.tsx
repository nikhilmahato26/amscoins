import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('passes the typed note to onConfirm when withNote is set', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        title="Reject?"
        body="Body"
        confirmLabel="Reject"
        withNote
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    )
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'bad reference' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))
    expect(onConfirm).toHaveBeenCalledWith('bad reference')
  })

  it('calls onConfirm with undefined when withNote is not set', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog title="Approve?" body="Body" confirmLabel="Approve" onConfirm={onConfirm} onCancel={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(onConfirm).toHaveBeenCalledWith(undefined)
  })

  it('disables both buttons and shows the pending label while pending', () => {
    render(
      <ConfirmDialog
        title="Approve?"
        body="Body"
        confirmLabel="Approve"
        pendingLabel="Approving…"
        isPending
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'Approving…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})
