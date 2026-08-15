import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthLayout } from './AuthLayout'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authService } from '@/services/authService'

type Step = 'email' | 'otp' | 'password'

export function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const r = await authService.forgotPassword(email)
      setNotice(r.message)
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code.')
    } finally { setLoading(false) }
  }

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { resetToken } = await authService.verifyOtp(email, otp)
      setResetToken(resetToken)
      setStep('password')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired code.')
    } finally { setLoading(false) }
  }

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await authService.resetPassword(resetToken, password)
      navigate('/login?reset=1')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your password.')
    } finally { setLoading(false) }
  }

  const btn = [
    'flex min-h-11 w-full items-center justify-center rounded-xl',
    'bg-asm-blue px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-white',
    'transition-colors hover:bg-asm-blue-dark active:scale-[0.99]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2',
    'disabled:opacity-55 disabled:cursor-not-allowed',
  ].join(' ')
  const inputCls =
    'border-asm-line bg-white text-asm-navy placeholder:text-asm-muted/60 focus-visible:ring-asm-blue'

  return (
    <AuthLayout>
      <div className="mb-7">
        <h2 className="text-[26px] font-extrabold leading-tight tracking-tight text-asm-navy">
          Reset your password
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-asm-body">
          {step === 'email' && 'Enter your email and we will send you a one-time code.'}
          {step === 'otp' && `Enter the 6-digit code we sent to ${email}.`}
          {step === 'password' && 'Choose a new password for your account.'}
        </p>
      </div>

      {notice && step === 'otp' && (
        <p className="mb-4 text-[12px] font-medium text-asm-greenInk">{notice}</p>
      )}

      {step === 'email' && (
        <form onSubmit={submitEmail} className="space-y-4">
          <Field label="Email">
            <Input type="email" placeholder="you@example.com" value={email} required
              autoComplete="email" className={inputCls}
              onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {error && <p role="alert" className="text-[12px] font-medium text-asm-red">{error}</p>}
          <button type="submit" disabled={loading} className={btn}>
            {loading ? 'Sending…' : 'Send code'}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={submitOtp} className="space-y-4">
          <Field label="6-digit code">
            <Input inputMode="numeric" maxLength={6} placeholder="123456" value={otp} required
              className={inputCls}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          </Field>
          {error && <p role="alert" className="text-[12px] font-medium text-asm-red">{error}</p>}
          <button type="submit" disabled={loading || otp.length !== 6} className={btn}>
            {loading ? 'Verifying…' : 'Verify code'}
          </button>
          <button type="button" className="w-full text-[12px] text-asm-blue hover:underline"
            onClick={() => { setStep('email'); setError(''); setOtp('') }}>
            Use a different email
          </button>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={submitPassword} className="space-y-4">
          <Field label="New password">
            <Input type="password" placeholder="At least 6 characters" value={password} required
              autoComplete="new-password" className={inputCls}
              onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirm password">
            <Input type="password" placeholder="Re-enter password" value={confirm} required
              autoComplete="new-password" className={inputCls}
              onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          {error && <p role="alert" className="text-[12px] font-medium text-asm-red">{error}</p>}
          <button type="submit" disabled={loading} className={btn}>
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-[13px] text-asm-body">
        Remembered it?{' '}
        <Link to="/login" className="font-semibold text-asm-blue hover:underline">Back to sign in</Link>
      </p>
    </AuthLayout>
  )
}
