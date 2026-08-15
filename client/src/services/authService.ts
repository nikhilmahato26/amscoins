import type { User } from '../types'
import { MOCK_USERS } from '../mocks/users'

// Fake latency helper
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const authService = {
  async login(email: string, password: string): Promise<User> {
    await delay(700) // Fake 700ms latency as specified
    const user = MOCK_USERS.find(
      (u) => u.email === email && u.password === password
    )
    if (!user) {
      throw new Error('Invalid email or password')
    }
    return user
  },

  async register(email: string, password: string): Promise<User> {
    await delay(700)
    // Basic mock registration, only meant for demo
    if (MOCK_USERS.find((u) => u.email === email)) {
      throw new Error('Email already registered')
    }
    
    const newUser: User = {
      id: `u_${Math.random().toString(36).substr(2, 9)}`,
      name: email.split('@')[0],
      email,
      password, // Again, mock only!
      role: 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
    }
    // We do not mutate MOCK_USERS permanently for a refresh, 
    // it's just a demo representation, but we return it successfully.
    return newUser
  },

  async logout(): Promise<void> {
    await delay(200)
  }
}
