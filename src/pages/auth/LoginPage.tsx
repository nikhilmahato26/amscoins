import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthLayout } from './AuthLayout'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { authService } from '@/services/authService'
import { useAuth } from '@/auth/AuthContext'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setUser } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await authService.login(email, password)
      setUser(user)
      if (user.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/app')
      }
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-medium text-paper">Welcome <span className="text-brass">Back!</span></h2>
        <p className="text-sm text-mist mt-2">Log in to your ASM Coins account and continue your investment journey.</p>
      </div>

      <Button variant="outline" className="w-full bg-transparent border-ink-3 hover:bg-ink-3 text-paper mb-6">
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
          <path d="M1 1h22v22H1z" fill="none" />
        </svg>
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-ink-3" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-ink px-2 text-mist">OR</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Email" error={error && !email ? error : undefined}>
          <Input 
            type="email" 
            placeholder="Enter your email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-ink-2 border-ink-3 text-paper focus-visible:ring-brass"
            required
          />
        </Field>
        
        <Field label="Password" error={error && email ? error : undefined}>
          <Input 
            type="password" 
            placeholder="Enter your password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-ink-2 border-ink-3 text-paper focus-visible:ring-brass"
            required
          />
        </Field>

        <div className="flex justify-end">
          <Link to="#" className="text-xs text-brass hover:underline">Forgot Password?</Link>
        </div>

        <Button type="submit" className="w-full bg-gradient-to-r from-rust to-brass hover:opacity-90 text-white border-0" disabled={loading}>
          {loading ? 'Authenticating...' : 'Log In'}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-mist">
        Don't have an account? <Link to="/register" className="text-brass hover:underline">Sign Up</Link>
      </div>

      {/* Feature blurbs */}
      <div className="mt-12 space-y-4 text-left">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-brass/10 flex items-center justify-center text-brass shrink-0 border border-brass/20">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-paper">Secure & Protected</h4>
            <p className="text-xs text-mist mt-1">Your account is protected with advanced security.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-brass/10 flex items-center justify-center text-brass shrink-0 border border-brass/20">
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-paper">Quick Access</h4>
            <p className="text-xs text-mist mt-1">Seamless login to manage your investments.</p>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}
