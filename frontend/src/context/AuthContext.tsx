import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { getMe } from '../api/auth'

interface AuthContextType {
  token: string | null
  isAdmin: boolean
  login: (token: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [isAdmin, setIsAdmin] = useState<boolean>(() => localStorage.getItem('isAdmin') === 'true')

  const loginFn = async (t: string) => {
    localStorage.setItem('token', t)
    setToken(t)
    try {
      const res = await getMe()
      setIsAdmin(res.data.is_admin)
      localStorage.setItem('isAdmin', String(res.data.is_admin))
    } catch {
      setIsAdmin(false)
      localStorage.removeItem('isAdmin')
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('isAdmin')
    setToken(null)
    setIsAdmin(false)
  }

  return (
    <AuthContext.Provider value={{ token, isAdmin, login: loginFn, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
