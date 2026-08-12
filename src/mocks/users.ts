import type { User } from '../types'

// Plaintext passwords are a mock-only shortcut for this demo!
export const MOCK_USERS: User[] = [
  {
    id: 'u_1001',
    name: 'Test Investor',
    email: 'investor@taksal.in',
    password: 'taksal123',
    role: 'user',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'a_2001',
    name: 'Desk Admin',
    email: 'admin@taksal.in',
    password: 'admin123',
    role: 'admin',
    status: 'active',
    createdAt: new Date().toISOString(),
  }
]
