import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { getMe, updatePreferences } from '../api/auth'
import {
  resolveWeight, resolveDistance, resolveMeasure, resolveTemp,
} from '../utils/units'
import type { UnitSystem, WeightUnit, DistanceUnit, MeasureUnit, TempUnit } from '../utils/units'

export type { UnitSystem }

export interface UserUnits {
  weight: WeightUnit
  distance: DistanceUnit
  measure: MeasureUnit
  temp: TempUnit
}

interface AuthContextType {
  token: string | null
  isAdmin: boolean
  unitSystem: UnitSystem       // legacy — use `units` for new code
  units: UserUnits             // resolved per-dimension preferences
  setUnitSystem: (s: UnitSystem) => Promise<void>
  setUnitPref: (prefs: Partial<{
    pref_weight: WeightUnit
    pref_distance: DistanceUnit
    pref_measure: MeasureUnit
    pref_temp: TempUnit
  }>) => Promise<void>
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
  const [prefWeight, setPrefWeight] = useState<WeightUnit | null>(
    () => (localStorage.getItem('pref_weight') as WeightUnit) || null
  )
  const [prefDistance, setPrefDistance] = useState<DistanceUnit | null>(
    () => (localStorage.getItem('pref_distance') as DistanceUnit) || null
  )
  const [prefMeasure, setPrefMeasure] = useState<MeasureUnit | null>(
    () => (localStorage.getItem('pref_measure') as MeasureUnit) || null
  )
  const [prefTemp, setPrefTemp] = useState<TempUnit | null>(
    () => (localStorage.getItem('pref_temp') as TempUnit) || null
  )

  // Derived: resolve per-dimension prefs against the legacy unit_system fallback
  const units: UserUnits = {
    weight:   resolveWeight(prefWeight, unitSystem),
    distance: resolveDistance(prefDistance, unitSystem),
    measure:  resolveMeasure(prefMeasure, unitSystem),
    temp:     resolveTemp(prefTemp, unitSystem),
  }

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
      // Sync per-dimension prefs
      if (res.data.pref_weight) { setPrefWeight(res.data.pref_weight as WeightUnit); localStorage.setItem('pref_weight', res.data.pref_weight) }
      if (res.data.pref_distance) { setPrefDistance(res.data.pref_distance as DistanceUnit); localStorage.setItem('pref_distance', res.data.pref_distance) }
      if (res.data.pref_measure) { setPrefMeasure(res.data.pref_measure as MeasureUnit); localStorage.setItem('pref_measure', res.data.pref_measure) }
      if (res.data.pref_temp) { setPrefTemp(res.data.pref_temp as TempUnit); localStorage.setItem('pref_temp', res.data.pref_temp) }
    } catch {
      setIsAdmin(false)
      localStorage.removeItem('isAdmin')
    }
  }

  const setUnitSystem = async (s: UnitSystem) => {
    await updatePreferences({ unit_system: s })
    setUnitSystemState(s)
    localStorage.setItem('unitSystem', s)
  }

  const setUnitPref = async (prefs: Partial<{
    pref_weight: WeightUnit
    pref_distance: DistanceUnit
    pref_measure: MeasureUnit
    pref_temp: TempUnit
  }>) => {
    await updatePreferences(prefs)
    if (prefs.pref_weight)   { setPrefWeight(prefs.pref_weight);     localStorage.setItem('pref_weight', prefs.pref_weight) }
    if (prefs.pref_distance) { setPrefDistance(prefs.pref_distance); localStorage.setItem('pref_distance', prefs.pref_distance) }
    if (prefs.pref_measure)  { setPrefMeasure(prefs.pref_measure);   localStorage.setItem('pref_measure', prefs.pref_measure) }
    if (prefs.pref_temp)     { setPrefTemp(prefs.pref_temp);         localStorage.setItem('pref_temp', prefs.pref_temp) }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('isAdmin')
    localStorage.removeItem('unitSystem')
    localStorage.removeItem('pref_weight')
    localStorage.removeItem('pref_distance')
    localStorage.removeItem('pref_measure')
    localStorage.removeItem('pref_temp')
    setToken(null)
    setIsAdmin(false)
    setUnitSystemState('imperial')
    setPrefWeight(null)
    setPrefDistance(null)
    setPrefMeasure(null)
    setPrefTemp(null)
  }

  return (
    <AuthContext.Provider value={{
      token, isAdmin, unitSystem, units,
      setUnitSystem, setUnitPref,
      login: loginFn, logout,
      isAuthenticated: !!token,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
