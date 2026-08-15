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
}
