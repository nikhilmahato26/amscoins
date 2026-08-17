import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Loader2, Settings, Upload } from 'lucide-react'

import { useSettings, useUpdateSettings } from '@/hooks/queries'
import { uploadSettingsImage, type PublicSettings, type SettingsImageKey, type SettingsUpdate } from '@/services/api/settings'
import { cn } from '@/lib/utils'

type FormValues = {
  inrThresholdRupees: number
  usdtTrc20Address: string
  usdtBep20Address: string
  binancePayId: string
  binancePayName: string
  binancePayLink: string
  whatsappNumber: string
  telegramUsername: string
  methods: {
    trustWallet: boolean
    binancePay: boolean
    whatsapp: boolean
    telegram: boolean
    inrQr: boolean
  }
}

export function AdminSettings() {
  const { data: settings, isLoading } = useSettings()
  const update = useUpdateSettings()
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset } = useForm<FormValues>()
  const [saved, setSaved] = useState(false)

  /** Called after a successful image upload — keeps the ['settings'] cache fresh. */
  function onImageUploaded(next: PublicSettings) {
    queryClient.setQueryData(['settings'], next)
  }

  useEffect(() => {
    if (!settings) return
    reset({
      inrThresholdRupees: settings.inrThresholdPaise / 100,
      usdtTrc20Address: settings.usdtTrc20Address,
      usdtBep20Address: settings.usdtBep20Address,
      binancePayId: settings.binancePayId,
      binancePayName: settings.binancePayName,
      binancePayLink: settings.binancePayLink,
      whatsappNumber: settings.whatsappNumber,
      telegramUsername: settings.telegramUsername,
      methods: settings.methods,
    })
  }, [settings, reset])

  async function onSubmit(v: FormValues) {
    const payload: SettingsUpdate = {
      inrThresholdPaise: Math.round(v.inrThresholdRupees * 100),
      usdtTrc20Address: v.usdtTrc20Address,
      usdtBep20Address: v.usdtBep20Address,
      binancePayId: v.binancePayId,
      binancePayName: v.binancePayName,
      binancePayLink: v.binancePayLink,
      whatsappNumber: v.whatsappNumber,
      telegramUsername: v.telegramUsername,
      methods: v.methods,
    }
    await update.mutateAsync(payload)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading || !settings) {
    return (
      <div className="flex items-center gap-2 p-6 text-[13px] text-asm-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading settings…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Page heading */}
      <div className="flex items-center gap-3">
        <Settings className="size-5 shrink-0 text-asm-muted" strokeWidth={1.75} aria-hidden />
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-asm-navy">Payment Settings</h1>
          <p className="-mt-0.5 text-[13px] text-asm-muted">
            Configure payment methods, QR images, and availability.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* ── INR (UPI) ── */}
        <Section title="INR (UPI)">
          <Field label="Direct-QR threshold (₹) — deposits at or below this amount can pay by INR QR">
            <input
              type="number"
              min={0}
              step={1}
              {...register('inrThresholdRupees', { valueAsNumber: true })}
              className={inputCls}
            />
          </Field>
          <ImageUploadField
            label="INR UPI QR"
            imageKey="inr-qr"
            currentUrl={settings.inrQrUrl}
            onUploaded={onImageUploaded}
          />
        </Section>

        {/* ── USDT ── */}
        <Section title="USDT (Crypto)">
          <Field label="TRC20 (Tron) address">
            <input {...register('usdtTrc20Address')} className={inputCls} />
          </Field>
          <ImageUploadField
            label="USDT TRC20 QR"
            imageKey="usdt-trc20-qr"
            currentUrl={settings.usdtTrc20QrUrl}
            onUploaded={onImageUploaded}
          />
          <Field label="BEP20 (BNB) address">
            <input {...register('usdtBep20Address')} className={inputCls} />
          </Field>
          <ImageUploadField
            label="USDT BEP20 QR"
            imageKey="usdt-bep20-qr"
            currentUrl={settings.usdtBep20QrUrl}
            onUploaded={onImageUploaded}
          />
        </Section>

        {/* ── Binance Pay ── */}
        <Section title="Binance Pay">
          <Field label="Pay ID">
            <input {...register('binancePayId')} className={inputCls} />
          </Field>
          <Field label="Account name">
            <input {...register('binancePayName')} className={inputCls} />
          </Field>
          <Field label="Deep link (optional)">
            <input {...register('binancePayLink')} className={inputCls} />
          </Field>
          <ImageUploadField
            label="Binance barcode / QR"
            imageKey="binance-qr"
            currentUrl={settings.binancePayQrUrl}
            onUploaded={onImageUploaded}
          />
        </Section>

        {/* ── Contacts ── */}
        <Section title="Contacts">
          <Field label="WhatsApp number (with country code)">
            <input {...register('whatsappNumber')} className={inputCls} />
          </Field>
          <Field label="Telegram username">
            <input {...register('telegramUsername')} className={inputCls} />
          </Field>
        </Section>

        {/* ── Availability ── */}
        <Section title="Payment methods available">
          {(
            [
              ['methods.trustWallet', 'Trust Wallet (USDT)'],
              ['methods.binancePay', 'Binance Pay'],
              ['methods.whatsapp', 'WhatsApp (INR)'],
              ['methods.telegram', 'Telegram (INR)'],
              ['methods.inrQr', 'INR direct QR'],
            ] as const
          ).map(([name, label]) => (
            <label key={name} className="flex cursor-pointer items-center gap-3 text-[13px] text-asm-navy">
              <input
                type="checkbox"
                {...register(name)}
                className="size-4 accent-asm-blue"
              />
              {label}
            </label>
          ))}
        </Section>

        {/* ── Submit ── */}
        <div className="flex flex-col gap-2.5">
          <button
            type="submit"
            disabled={update.isPending}
            className={cn(
              'flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-asm-blue',
              'text-[13px] font-bold text-white transition-colors',
              'hover:bg-asm-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            {update.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {saved ? 'Saved ✓' : 'Save settings'}
          </button>
          {update.isError && (
            <p role="alert" className="text-[12px] text-asm-red">
              Could not save. Please try again.
            </p>
          )}
        </div>
      </form>
    </div>
  )
}

/* ── Shared input style ─────────────────────────────────────────────────── */

const inputCls =
  'h-11 w-full rounded-xl border border-asm-line bg-white px-3 text-[13px] text-asm-navy ' +
  'placeholder:text-asm-muted focus:border-asm-blue focus:outline-none focus:ring-2 focus:ring-asm-blue focus:ring-offset-1'

/* ── Sub-components ─────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-asm-line bg-white p-5 shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
      <h2 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-asm-muted">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold text-asm-body">{label}</span>
      {children}
    </label>
  )
}

/** Uploads immediately on file pick; the URL is updated server-side and the preview refreshes. */
function ImageUploadField({
  label,
  imageKey,
  currentUrl,
  onUploaded,
}: {
  label: string
  imageKey: SettingsImageKey
  currentUrl: string
  /** Called with the full fresh PublicSettings after a successful upload. */
  onUploaded: (next: PublicSettings) => void
}) {
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(currentUrl)
  const [error, setError] = useState<string | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const next = await uploadSettingsImage(imageKey, file)
      const map: Record<SettingsImageKey, string> = {
        'inr-qr': next.inrQrUrl,
        'usdt-trc20-qr': next.usdtTrc20QrUrl,
        'usdt-bep20-qr': next.usdtBep20QrUrl,
        'binance-qr': next.binancePayQrUrl,
      }
      setPreview(map[imageKey])
      onUploaded(next)
    } catch {
      setError('Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Preview thumbnail */}
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-asm-line bg-asm-tint">
        {preview ? (
          <img src={preview} alt={`${label} preview`} className="size-full object-contain" />
        ) : (
          <span className="text-[10px] text-asm-muted">No image</span>
        )}
      </div>

      {/* File picker trigger */}
      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-asm-line bg-white px-4 py-2 text-[12px] font-semibold text-asm-navy transition-colors hover:bg-asm-tint focus-within:ring-2 focus-within:ring-asm-blue">
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Upload className="size-4" aria-hidden />
        )}
        {label}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onFile}
          disabled={busy}
        />
      </label>

      {error && <span className="text-[11px] text-asm-red">{error}</span>}
    </div>
  )
}
