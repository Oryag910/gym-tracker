// Legacy type kept for backward compat — existing call sites still compile
export type UnitSystem = 'imperial' | 'metric'

// Specific unit types for granular preferences
export type WeightUnit   = 'lbs' | 'kg'
export type DistanceUnit = 'km'  | 'mi'
export type MeasureUnit  = 'cm'  | 'in'
export type TempUnit     = 'c'   | 'f'

// Resolve a nullable per-dimension pref to a concrete unit, falling back to legacy unit_system
export function resolveWeight(pref: WeightUnit | null | undefined, sys: UnitSystem): WeightUnit {
  if (pref === 'lbs' || pref === 'kg') return pref
  return sys === 'metric' ? 'kg' : 'lbs'
}
export function resolveDistance(pref: DistanceUnit | null | undefined, sys: UnitSystem): DistanceUnit {
  if (pref === 'km' || pref === 'mi') return pref
  return sys === 'imperial' ? 'mi' : 'km'
}
export function resolveMeasure(pref: MeasureUnit | null | undefined, sys: UnitSystem): MeasureUnit {
  if (pref === 'cm' || pref === 'in') return pref
  return sys === 'imperial' ? 'in' : 'cm'
}
export function resolveTemp(pref: TempUnit | null | undefined, sys: UnitSystem): TempUnit {
  if (pref === 'c' || pref === 'f') return pref
  return sys === 'imperial' ? 'f' : 'c'
}

// --- Weight (canonical: lbs) ---
// Accepts WeightUnit ('lbs'|'kg') or legacy UnitSystem ('imperial'|'metric')
export const toDisplayWeight = (lbs: number, w: WeightUnit | UnitSystem): number => {
  const unit: WeightUnit = w === 'metric' ? 'kg' : w === 'imperial' ? 'lbs' : w
  return unit === 'kg' ? +(lbs * 0.453592).toFixed(2) : lbs
}
export const fromInputWeight = (val: number, w: WeightUnit | UnitSystem): number => {
  const unit: WeightUnit = w === 'metric' ? 'kg' : w === 'imperial' ? 'lbs' : w
  return unit === 'kg' ? +(val / 0.453592).toFixed(2) : val
}
export const weightUnit = (w: WeightUnit | UnitSystem): string => {
  if (w === 'metric') return 'kg'
  if (w === 'imperial') return 'lbs'
  return w
}

// --- Distance (canonical: km) ---
export const toDisplayDistance = (km: number, d: DistanceUnit | UnitSystem): number => {
  const unit: DistanceUnit = d === 'imperial' ? 'mi' : d === 'metric' ? 'km' : d
  return unit === 'mi' ? +(km * 0.621371).toFixed(2) : +km.toFixed(2)
}
export const fromInputDistance = (val: number, d: DistanceUnit | UnitSystem): number => {
  const unit: DistanceUnit = d === 'imperial' ? 'mi' : d === 'metric' ? 'km' : d
  return unit === 'mi' ? +(val / 0.621371).toFixed(3) : val
}
export const distanceUnit = (d: DistanceUnit | UnitSystem): string => {
  if (d === 'imperial') return 'mi'
  if (d === 'metric') return 'km'
  return d
}

// --- Body measurements / circumferences (canonical: cm) ---
export const toDisplayMeasure = (cm: number, m: MeasureUnit | UnitSystem): number => {
  const unit: MeasureUnit = m === 'imperial' ? 'in' : m === 'metric' ? 'cm' : m
  return unit === 'in' ? +(cm / 2.54).toFixed(1) : +cm.toFixed(1)
}
export const fromInputMeasure = (val: number, m: MeasureUnit | UnitSystem): number => {
  const unit: MeasureUnit = m === 'imperial' ? 'in' : m === 'metric' ? 'cm' : m
  return unit === 'in' ? +(val * 2.54).toFixed(1) : val
}
export const measureUnit = (m: MeasureUnit | UnitSystem): string => {
  if (m === 'imperial') return 'in'
  if (m === 'metric') return 'cm'
  return m
}

// --- Temperature (canonical: °C) ---
export const toDisplayTemp = (c: number, t: TempUnit | UnitSystem): number => {
  const unit: TempUnit = t === 'imperial' ? 'f' : t === 'metric' ? 'c' : t
  return unit === 'f' ? +(c * 9 / 5 + 32).toFixed(1) : +c.toFixed(1)
}
export const fromInputTemp = (val: number, t: TempUnit | UnitSystem): number => {
  const unit: TempUnit = t === 'imperial' ? 'f' : t === 'metric' ? 'c' : t
  return unit === 'f' ? +((val - 32) * 5 / 9).toFixed(1) : val
}
export const tempUnit = (t: TempUnit | UnitSystem): string => {
  if (t === 'imperial') return '°F'
  if (t === 'metric') return '°C'
  return t === 'f' ? '°F' : '°C'
}

// --- Pace (canonical: min/km as float, e.g. 5.5 = 5:30/km) ---
export const paceToDisplay = (minPerKm: number, d: DistanceUnit | UnitSystem): string => {
  const unit: DistanceUnit = d === 'imperial' ? 'mi' : d === 'metric' ? 'km' : d
  const converted = unit === 'mi' ? minPerKm / 0.621371 : minPerKm
  const m = Math.floor(converted)
  const sec = Math.round((converted - m) * 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
export const paceUnit = (d: DistanceUnit | UnitSystem): string => {
  if (d === 'imperial') return '/mi'
  if (d === 'metric') return '/km'
  return d === 'mi' ? '/mi' : '/km'
}
export const parsePace = (str: string, d: DistanceUnit | UnitSystem): number | null => {
  const match = str.match(/^(\d+):([0-5]\d)$/)
  if (!match) return null
  const mins = parseInt(match[1]) + parseInt(match[2]) / 60
  const unit: DistanceUnit = d === 'imperial' ? 'mi' : d === 'metric' ? 'km' : d
  return unit === 'mi' ? +(mins * 0.621371).toFixed(4) : +mins.toFixed(4)
}
