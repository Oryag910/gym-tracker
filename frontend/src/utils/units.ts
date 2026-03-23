export type UnitSystem = 'imperial' | 'metric'

// Weight: canonical = lbs
export const toDisplayWeight = (lbs: number, s: UnitSystem) => s === 'metric' ? +(lbs * 0.453592).toFixed(2) : lbs
export const fromInputWeight = (val: number, s: UnitSystem) => s === 'metric' ? +(val / 0.453592).toFixed(2) : val
export const weightUnit = (s: UnitSystem) => s === 'metric' ? 'kg' : 'lbs'

// Distance: canonical = km
export const toDisplayDistance = (km: number, s: UnitSystem) => s === 'imperial' ? +(km * 0.621371).toFixed(2) : +km.toFixed(2)
export const fromInputDistance = (val: number, s: UnitSystem) => s === 'imperial' ? +(val / 0.621371).toFixed(2) : val
export const distanceUnit = (s: UnitSystem) => s === 'imperial' ? 'mi' : 'km'

// Body measurements (circumferences): canonical = cm
export const toDisplayMeasure = (cm: number, s: UnitSystem) => s === 'imperial' ? +(cm / 2.54).toFixed(1) : +cm.toFixed(1)
export const fromInputMeasure = (val: number, s: UnitSystem) => s === 'imperial' ? +(val * 2.54).toFixed(1) : val
export const measureUnit = (s: UnitSystem) => s === 'imperial' ? 'in' : 'cm'

// Temperature: canonical = °C
export const toDisplayTemp = (c: number, s: UnitSystem) => s === 'imperial' ? +(c * 9 / 5 + 32).toFixed(1) : +c.toFixed(1)
export const fromInputTemp = (val: number, s: UnitSystem) => s === 'imperial' ? +((val - 32) * 5 / 9).toFixed(1) : val
export const tempUnit = (s: UnitSystem) => s === 'imperial' ? '°F' : '°C'

// Pace: canonical = min/km (stored as float, e.g. 5.5 = 5:30/km)
// Display as "M:SS /unit"
export const paceToDisplay = (minPerKm: number, s: UnitSystem): string => {
  const converted = s === 'imperial' ? minPerKm / 0.621371 : minPerKm
  const m = Math.floor(converted)
  const sec = Math.round((converted - m) * 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
export const paceUnit = (s: UnitSystem) => s === 'imperial' ? '/mi' : '/km'

// Parse "M:SS" string to min/km float (in canonical units)
export const parsePace = (str: string, s: UnitSystem): number | null => {
  const match = str.match(/^(\d+):([0-5]\d)$/)
  if (!match) return null
  const mins = parseInt(match[1]) + parseInt(match[2]) / 60
  return s === 'imperial' ? +(mins * 0.621371).toFixed(4) : +mins.toFixed(4)
}
