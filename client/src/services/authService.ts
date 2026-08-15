import { apiFetch, setToken } from '@/lib/api'
import type { User } from '@/types'

interface AuthResult {
  user: User
  token: string
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResult> {
    const r = await apiFetch<AuthResult>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    })
    setToken(r.token)
    return r
  },

  async register(input: { name: string; email: string; password: string; referralCode?: string }): Promise<AuthResult> {
    const r = await apiFetch<AuthResult>('/auth/register', {
      method: 'POST',
      body: input,
      auth: false,
    })
    setToken(r.token)
    return r
  },

  me: () => apiFetch<{ user: User }>('/auth/me'),

  async logout(): Promise<void> {
    setToken(null)
  },

  googleLoginUrl(): string {
    const base = import.meta.env.VITE_API_URL ?? '/api'
    return `${base}/auth/google`
  },

  async completeOAuth(token: string): Promise<User> {
    setToken(token)
    try {
      const { user } = await apiFetch<{ user: User }>('/auth/me')
      return user
    } catch (err) {
      setToken(null)
      throw err
    }
  },

  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),

  verifyOtp: (email: string, otp: string) =>
    apiFetch<{ resetToken: string }>('/auth/verify-otp', { method: 'POST', body: { email, otp }, auth: false }),

  resetPassword: (resetToken: string, password: string) =>
    apiFetch<{ message: string }>('/auth/reset-password', {
      method: 'POST', body: { resetToken, password }, auth: false,
    }),
}
