import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import type { UnitSystem } from '../context/AuthContext'
import { card } from '../styles/tokens'
import PageTransition from '../components/PageTransition'

export default function SettingsPage() {
  const { unitSystem, setUnitSystem } = useAuth()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleUnitChange = async (s: UnitSystem) => {
    if (s === unitSystem) return
    setSaving(true)
    setSaved(false)
    await setUnitSystem(s)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <PageTransition>
      <div className="space-y-6 max-w-xl mx-auto">
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">Settings</h1>

        <div className={card}>
          <h2 className="font-semibold text-slate-200 mb-1">Unit System</h2>
          <p className="text-slate-500 text-sm mb-4">
            Choose how weights, distances, and measurements are displayed.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {(['imperial', 'metric'] as UnitSystem[]).map(s => (
              <button key={s} onClick={() => handleUnitChange(s)} disabled={saving}
                className={`rounded-xl border p-4 text-left transition-all ${
                  unitSystem === s
                    ? 'bg-blue-500/10 border-blue-500/50 text-slate-100'
                    : 'bg-slate-700/30 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}>
                <div className="font-semibold capitalize mb-1">{s}</div>
                {s === 'imperial' ? (
                  <div className="text-xs text-slate-500">lbs · mi · in · °F</div>
                ) : (
                  <div className="text-xs text-slate-500">kg · km · cm · °C</div>
                )}
              </button>
            ))}
          </div>

          {saved && (
            <p className="text-emerald-400 text-sm mt-3 text-center">Saved!</p>
          )}
        </div>

        <div className={card}>
          <h2 className="font-semibold text-slate-200 mb-1">Note on existing data</h2>
          <p className="text-slate-400 text-sm">
            All data is stored in canonical units (lbs, km, cm). Switching unit systems updates how
            values are displayed — existing logged data stays intact.
          </p>
        </div>
      </div>
    </PageTransition>
  )
}
