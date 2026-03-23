import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { getMe, updatePreferences } from '../api/auth'

export type UnitSystem = 'imperial' | 'metric'

interface AuthContextType {
  token: string | null
  isAdmin: boolean
  unitSystem: UnitSystem
  setUnitSystem: (s: UnitSystem) => Promise<void>
  login: (token: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [isAdmin, setIsAdmin] = useState<boolean>(() => localStorage.getItem('isAdmin') === 'true')
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(
    () => (localStorage.getItem('unitSystem') as UnitSystem) || 'imperial'
  )

  const loginFn = async (t: string) => {
    localStorage.setItem('token', t)
    setToken(t)
    try {
      const res = await getMe()
      setIsAdmin(res.data.is_admin)
      localStorage.setItem('isAdmin', String(res.data.is_admin))
      const us = (res.data.unit_system as UnitSystem) || 'imperial'
      setUnitSystemState(us)
      localStorage.setItem('unitSystem', us)
    } catch {
      setIsAdmin(false)
      localStorage.removeItem('isAdmin')
    }
  }

  const setUnitSystem = async (s: UnitSystem) => {
    await updatePreferences(s)
    setUnitSystemState(s)
    localStorage.setItem('unitSystem', s)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('isAdmin')
    localStorage.removeItem('unitSystem')
    setToken(null)
    setIsAdmin(false)
    setUnitSystemState('imperial')
  }

  return (
    <AuthContext.Provider value={{ token, isAdmin, unitSystem, setUnitSystem, login: loginFn, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
