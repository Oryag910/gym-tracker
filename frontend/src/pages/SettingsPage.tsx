import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import type { WeightUnit, DistanceUnit, MeasureUnit, TempUnit } from '../utils/units'
import { card } from '../styles/tokens'
import PageTransition from '../components/PageTransition'

function PillPair<T extends string>({
  label, options, value, onChange, disabled,
}: {
  label: string
  options: { value: T; label: string; sub?: string }[]
  value: T
  onChange: (v: T) => void
  disabled: boolean
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
      <span className="text-sm text-slate-300 font-medium">{label}</span>
      <div className="flex gap-1.5">
        {options.map(o => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            disabled={disabled || value === o.value}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              value === o.value
                ? 'bg-blue-500/15 border border-blue-500/50 text-blue-300'
                : 'bg-slate-700/40 border border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
            }`}
          >
            {o.label}
            {o.sub && <span className="text-[10px] ml-0.5 opacity-60">{o.sub}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { units, setUnitPref } = useAuth()
  const [saving, setSaving] = useState(false)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  const save = async (prefs: Parameters<typeof setUnitPref>[0], key: string) => {
    setSaving(true)
    setSavedKey(null)
    await setUnitPref(prefs)
    setSaving(false)
    setSavedKey(key)
    setTimeout(() => setSavedKey(null), 1500)
  }

  return (
    <PageTransition>
      <div className="space-y-6 max-w-xl mx-auto">
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">Settings</h1>

        <div className={card}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-200">Unit Preferences</h2>
              <p className="text-slate-500 text-xs mt-0.5">Each dimension can be set independently.</p>
            </div>
            {savedKey && (
              <span className="text-emerald-400 text-xs font-medium">Saved!</span>
            )}
          </div>

          <PillPair<WeightUnit>
            label="Gym weights"
            options={[
              { value: 'lbs', label: 'lbs' },
              { value: 'kg',  label: 'kg' },
            ]}
            value={units.weight}
            onChange={v => save({ pref_weight: v }, 'weight')}
            disabled={saving}
          />

          <PillPair<WeightUnit>
            label="Body weight"
            options={[
              { value: 'lbs', label: 'lbs' },
              { value: 'kg',  label: 'kg' },
            ]}
            value={units.bodyWeight}
            onChange={v => save({ pref_body_weight: v }, 'body_weight')}
            disabled={saving}
          />

          <PillPair<DistanceUnit>
            label="Distance"
            options={[
              { value: 'km', label: 'km' },
              { value: 'mi', label: 'mi' },
            ]}
            value={units.distance}
            onChange={v => save({ pref_distance: v }, 'distance')}
            disabled={saving}
          />

          <PillPair<MeasureUnit>
            label="Body measurements"
            options={[
              { value: 'cm', label: 'cm' },
              { value: 'in', label: 'in' },
            ]}
            value={units.measure}
            onChange={v => save({ pref_measure: v }, 'measure')}
            disabled={saving}
          />

          <PillPair<TempUnit>
            label="Temperature"
            options={[
              { value: 'c', label: '°C' },
              { value: 'f', label: '°F' },
            ]}
            value={units.temp}
            onChange={v => save({ pref_temp: v }, 'temp')}
            disabled={saving}
          />
        </div>

        <div className={card}>
          <h2 className="font-semibold text-slate-200 mb-1">Note on existing data</h2>
          <p className="text-slate-400 text-sm">
            All data is stored in canonical units (lbs, km, cm, °C). Changing preferences updates
            how values are displayed — existing logged data stays intact.
          </p>
        </div>
      </div>
    </PageTransition>
  )
}
