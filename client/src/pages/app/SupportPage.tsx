import { motion } from 'framer-motion'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, Clock, LifeBuoy, Loader2, Send } from 'lucide-react'

import { AppShell } from '@/components/app/AppShell'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useMySupportTickets, useCreateSupportTicket } from '@/hooks/queries'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 90, damping: 18 } },
}

function relDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function SupportPage() {
  const { data, isLoading } = useMySupportTickets()
  const mutation = useCreateSupportTicket()

  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError]     = useState<string | null>(null)

  const tickets = data?.tickets ?? []

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (subject.trim().length < 3) { setError('Please enter a subject (at least 3 characters).'); return }
    if (message.trim().length < 5) { setError('Please describe your issue (at least 5 characters).'); return }
    mutation.mutate(
      { subject: subject.trim(), message: message.trim() },
      {
        onSuccess: () => { setSubject(''); setMessage('') },
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not send your query. Please try again.'),
      },
    )
  }

  return (
    <AppShell backTo="/app">
      <motion.div className="flex flex-col gap-5" variants={container} initial="hidden" animate="visible">

        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-asm-blue-tint text-asm-blue">
            <LifeBuoy className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-[18px] font-extrabold tracking-tight text-asm-navy">Support</h1>
            <p className="text-[12px] text-asm-body">Raise a query and our team will get back to you.</p>
          </div>
        </motion.div>

        {/* Raise a query */}
        <motion.section variants={fadeUp} className="rounded-2xl border border-asm-line bg-white p-5 shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]">
          {mutation.isSuccess && !error ? (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-asm-greenInk/20 bg-asm-green-tint p-3.5" role="status">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-asm-greenInk" aria-hidden />
              <p className="text-[12px] leading-relaxed text-asm-greenInk">
                Your query has been sent. We've emailed you a confirmation.
              </p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="support-subject">Subject</Label>
              <Input
                id="support-subject"
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setError(null); mutation.reset() }}
                placeholder="e.g. Deposit not credited"
                maxLength={120}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="support-message">Message</Label>
              <textarea
                id="support-message"
                value={message}
                onChange={(e) => { setMessage(e.target.value); setError(null); mutation.reset() }}
                placeholder="Describe your issue in detail…"
                rows={4}
                maxLength={2000}
                className="min-h-[110px] w-full rounded-lg border border-asm-line bg-white px-3 py-2.5 text-[14px] text-asm-navy outline-none placeholder:text-asm-muted focus-visible:ring-2 focus-visible:ring-asm-blue"
              />
            </div>
            {error && <p role="alert" className="text-[12px] font-medium text-asm-red">{error}</p>}
            <Button type="submit" disabled={mutation.isPending} className="gap-2">
              {mutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
              {mutation.isPending ? 'Sending…' : 'Send query'}
            </Button>
          </form>
        </motion.section>

        {/* My queries */}
        <motion.section variants={fadeUp} aria-labelledby="my-queries">
          <h2 id="my-queries" className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-asm-muted">
            My Queries
          </h2>
          <div className="rounded-2xl border border-asm-line bg-white shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-asm-muted">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                <span className="text-[13px]">Loading…</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                <LifeBuoy className="size-8 text-asm-muted/40" aria-hidden />
                <p className="text-[13px] font-semibold text-asm-navy">No queries yet</p>
                <p className="text-[12px] text-asm-body">Raise a query above and we'll help you out.</p>
              </div>
            ) : (
              <ul className="divide-y divide-asm-line">
                {tickets.map((t) => (
                  <li key={t.id} className="flex flex-col gap-1.5 px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-[13px] font-semibold text-asm-navy">{t.subject}</span>
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          t.status === 'resolved' ? 'bg-asm-green-tint text-asm-greenInk' : 'bg-amber-50 text-amber-700',
                        )}
                      >
                        {t.status === 'resolved' ? <CheckCircle2 className="size-3" aria-hidden /> : <Clock className="size-3" aria-hidden />}
                        {t.status}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[12px] text-asm-body">{t.message}</p>
                    <div className="flex items-center gap-2 text-[11px] text-asm-muted">
                      <span className="font-mono">{t.publicRef}</span>
                      <span aria-hidden>·</span>
                      <span>{relDate(t.createdAt)}</span>
                    </div>
                    {t.status === 'resolved' && t.adminNote && (
                      <p className="mt-1 rounded-lg bg-asm-green-tint/50 px-3 py-2 text-[12px] text-asm-greenInk">
                        <span className="font-semibold">Response:</span> {t.adminNote}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.section>

      </motion.div>
    </AppShell>
  )
}
