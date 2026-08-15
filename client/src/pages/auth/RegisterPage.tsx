import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AuthLayout } from './AuthLayout'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { authService } from '@/services/authService'
import { useAuth } from '@/auth/AuthContext'
import { Checkbox } from '@/components/ui/checkbox'

export function RegisterPage() {
  const [searchParams] = useSearchParams()
  const planParam = searchParams.get('plan')
  const selectedPlan =
    planParam && ['silver', 'gold', 'diamond'].includes(planParam) ? planParam : null

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [referralCode, setReferralCode] = useState((searchParams.get('ref') ?? '').toUpperCase())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const { setUser } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const { user } = await authService.register({
        name,
        email,
        password,
        referralCode: referralCode.trim() || undefined,
      })
      setUser(user)
      navigate('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-asm-navy">Create Your <span className="text-asm-blue">Account</span></h2>
        <p className="mt-2 text-sm text-asm-body">Join ASM Coins and start your journey towards smart investments.</p>
        {/*
          The landing plan cards pass ?plan=<slug>. Echoing it back is the
          minimum: the user picked something, so the next screen should show it
          rather than silently dropping the choice. Carry it into the first
          investment once there is a backend to carry it to.
        */}
        {selectedPlan ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-asm-blue/30 bg-asm-blue-tint px-3 py-1 text-xs text-asm-blue">
            Selected plan: <span className="font-bold uppercase">{selectedPlan}</span>
          </p>
        ) : null}
      </div>

      <Button variant="outline" className="mb-6 h-11 w-full border-asm-line bg-white text-asm-navy hover:bg-asm-tint">
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
          <span className="w-full border-t border-asm-line" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-asm-muted">OR</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-asm-red/40 bg-asm-red/5 p-3 text-center text-sm text-asm-red">
            {error}
          </div>
        )}
        
        <Field label="Full Name">
          <Input
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 border-asm-line bg-white text-asm-navy placeholder:text-asm-muted focus-visible:border-asm-blue focus-visible:ring-asm-blue/30"
            required
          />
        </Field>

        <Field label="Email">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 border-asm-line bg-white text-asm-navy placeholder:text-asm-muted focus-visible:border-asm-blue focus-visible:ring-asm-blue/30"
            required
          />
        </Field>
        
        <Field label="Password">
          <Input 
            type="password" 
            placeholder="Create a strong password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 border-asm-line bg-white text-asm-navy placeholder:text-asm-muted focus-visible:border-asm-blue focus-visible:ring-asm-blue/30"
            required
          />
        </Field>
        
        <Field label="Confirm Password">
          <Input 
            type="password" 
            placeholder="Confirm your password" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-11 border-asm-line bg-white text-asm-navy placeholder:text-asm-muted focus-visible:border-asm-blue focus-visible:ring-asm-blue/30"
            required
          />
        </Field>
        
        <Field label="Referral Code (Optional)">
          <div className="relative">
             <Input
              type="text"
              placeholder="USER010"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              className="h-11 border-asm-line bg-white pr-10 text-asm-navy placeholder:text-asm-muted focus-visible:border-asm-blue focus-visible:ring-asm-blue/30"
             />
             <div className="absolute right-3 top-1/2 -translate-y-1/2 text-asm-greenInk">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
             </div>
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-asm-greenInk">
             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> 10% trading fees discount applied
          </p>
        </Field>
        
        <div className="pt-2">
           <Button type="submit" className="h-11 w-full border-0 bg-asm-blue text-white hover:bg-asm-blue-dark" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Button>
        </div>
      </form>

      <div className="mb-6 mt-6 text-center text-sm text-asm-body">
        Already have an account? <Link to="/login" className="font-semibold text-asm-blue hover:underline">Log In</Link>
      </div>

      <div className="space-y-3 mt-8">
         <div className="flex items-start space-x-2">
           <Checkbox id="terms" className="mt-1 border-asm-line data-[state=checked]:border-asm-blue data-[state=checked]:bg-asm-blue" defaultChecked />
           <label htmlFor="terms" className="text-xs leading-relaxed text-asm-body">
              I agree to ASM Coins <Link to="#" className="font-semibold text-asm-blue hover:underline">Terms of Service</Link> and <Link to="#" className="font-semibold text-asm-blue hover:underline">Privacy Policy</Link>
           </label>
         </div>
         <div className="flex items-start space-x-2">
           <Checkbox id="residency" className="mt-1 border-asm-line data-[state=checked]:border-asm-blue data-[state=checked]:bg-asm-blue" defaultChecked />
           <label htmlFor="residency" className="text-xs leading-relaxed text-asm-body">
              I confirm that I am a resident of India and I am at least 18 years old.
           </label>
         </div>
      </div>

    </AuthLayout>
  )
}
