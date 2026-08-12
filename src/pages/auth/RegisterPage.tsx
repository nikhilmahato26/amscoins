import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthLayout } from './AuthLayout'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { authService } from '@/services/authService'
import { useAuth } from '@/auth/AuthContext'
import { Checkbox } from '@/components/ui/checkbox'

export function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
      const user = await authService.register(email, password)
      setUser(user)
      navigate('/app')
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-medium text-paper">Create Your <span className="text-brass">Account</span></h2>
        <p className="text-sm text-mist mt-2">Join ASM Coins and start your journey towards smart investments.</p>
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rust/10 border border-rust rounded text-rust text-sm text-center">
            {error}
          </div>
        )}
        
        <Field label="Email">
          <Input 
            type="email" 
            placeholder="Enter your email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-ink-2 border-ink-3 text-paper focus-visible:ring-brass"
            required
          />
        </Field>
        
        <Field label="Password">
          <Input 
            type="password" 
            placeholder="Create a strong password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-ink-2 border-ink-3 text-paper focus-visible:ring-brass"
            required
          />
        </Field>
        
        <Field label="Confirm Password">
          <Input 
            type="password" 
            placeholder="Confirm your password" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="bg-ink-2 border-ink-3 text-paper focus-visible:ring-brass"
            required
          />
        </Field>
        
        <Field label="Referral Code (Optional)">
          <div className="relative">
             <Input 
              type="text" 
              placeholder="USER010" 
              className="bg-ink-2 border-ink-3 text-paper focus-visible:ring-brass pr-10"
             />
             <div className="absolute right-3 top-1/2 -translate-y-1/2 text-patina">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
             </div>
          </div>
          <p className="text-xs text-patina mt-1 flex items-center gap-1">
             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> 10% trading fees discount applied
          </p>
        </Field>
        
        <div className="pt-2">
           <Button type="submit" className="w-full bg-gradient-to-r from-rust to-brass hover:opacity-90 text-white border-0" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Button>
        </div>
      </form>

      <div className="mt-6 text-center text-sm text-mist mb-6">
        Already have an account? <Link to="/login" className="text-brass hover:underline">Log In</Link>
      </div>

      <div className="space-y-3 mt-8">
         <div className="flex items-start space-x-2">
           <Checkbox id="terms" className="border-ink-3 data-[state=checked]:bg-brass data-[state=checked]:border-brass mt-1" defaultChecked />
           <label htmlFor="terms" className="text-xs text-mist leading-relaxed">
              I agree to ASM Coins <Link to="#" className="text-brass">Terms of Service</Link> and <Link to="#" className="text-brass">Privacy Policy</Link>
           </label>
         </div>
         <div className="flex items-start space-x-2">
           <Checkbox id="residency" className="border-ink-3 data-[state=checked]:bg-brass data-[state=checked]:border-brass mt-1" defaultChecked />
           <label htmlFor="residency" className="text-xs text-mist leading-relaxed">
              I confirm that I am a resident of India and I am at least 18 years old.
           </label>
         </div>
      </div>

    </AuthLayout>
  )
}
