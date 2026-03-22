import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { setClientToken } from '../api/client'

interface AuthContextType {
  token: string | null
  isAuthenticated: boolean
  initialized: boolean
  login: (token: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem('token').then((t) => {
      setToken(t)
      setClientToken(t)
      setInitialized(true)
    })
  }, [])

  const login = async (t: string) => {
    await AsyncStorage.setItem('token', t)
    setClientToken(t)
    setToken(t)
  }

  const logout = async () => {
    await AsyncStorage.removeItem('token')
    setClientToken(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, initialized, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
