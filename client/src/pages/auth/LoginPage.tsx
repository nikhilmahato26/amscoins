import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { AuthLayout } from './AuthLayout'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authService } from '@/services/authService'
import { useAuth } from '@/auth/AuthContext'

export function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate  = useNavigate()
  const { setUser } = useAuth()
  const [searchParams] = useSearchParams()
  const oauthError = searchParams.get('error')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { user } = await authService.login(email, password)
      setUser(user)
      navigate(user.role === 'admin' ? '/admin' : '/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      {/* Heading */}
      <div className="mb-7">
        <h2 className="text-[26px] font-extrabold leading-tight tracking-tight text-asm-navy">
          Welcome back
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-asm-body">
          Sign in to continue your investment journey.
        </p>
      </div>

      {/* Google SSO */}
      <button
        type="button"
        onClick={() => { window.location.href = authService.googleLoginUrl() }}
        className={[
          'flex w-full items-center justify-center gap-3 rounded-xl',
          'border border-asm-line bg-white px-4 py-3',
          'text-[13px] font-semibold text-asm-navy',
          'transition-colors hover:bg-asm-tint active:scale-[0.99]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2',
        ].join(' ')}
      >
        <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          <path d="M1 1h22v22H1z" fill="none" />
        </svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-asm-line" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-[11px] uppercase tracking-widest text-asm-muted">or</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-asm-line bg-white text-asm-navy placeholder:text-asm-muted/60 focus-visible:ring-asm-blue focus-visible:border-asm-greenInk"
            required
            autoComplete="email"
          />
        </Field>

        <Field label="Password">
          <Input
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-asm-line bg-white text-asm-navy placeholder:text-asm-muted/60 focus-visible:ring-asm-blue"
            required
            autoComplete="current-password"
          />
        </Field>

        {(error || oauthError) && (
          <p role="alert" className="text-[12px] font-medium text-asm-red">
            {error || 'Google sign-in failed. Please try again or use your password.'}
          </p>
        )}

        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-[12px] text-asm-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue rounded">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={[
            'flex min-h-11 w-full items-center justify-center rounded-xl',
            'bg-asm-blue px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-white',
            'shadow-[0_8px_20px_-8px_rgb(11_79_216_/_0.55)]',
            'transition-colors hover:bg-asm-blue-dark active:scale-[0.99]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2',
            'disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none',
          ].join(' ')}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-asm-body">
        No account yet?{' '}
        <Link to="/register" className="font-semibold text-asm-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue rounded">
          Create one
        </Link>
      </p>

      {/* Trust blurbs */}
      <ul className="mt-10 space-y-3 text-left">
        <li className="flex gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-asm-blue-tint">
            <svg className="size-4 text-asm-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </span>
          <div>
            <p className="text-[13px] font-semibold text-asm-navy">Secure &amp; protected</p>
            <p className="text-[12px] text-asm-body mt-0.5">Your account is shielded with advanced encryption.</p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-asm-blue-tint">
            <svg className="size-4 text-asm-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </span>
          <div>
            <p className="text-[13px] font-semibold text-asm-navy">Quick access</p>
            <p className="text-[12px] text-asm-body mt-0.5">Pick up exactly where you left off.</p>
          </div>
        </li>
      </ul>
    </AuthLayout>
  )
}
