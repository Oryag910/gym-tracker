import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getMeasurements, createMeasurement, deleteMeasurement } from '../api/measurements'
import type { MeasurementEntry } from '../api/measurements'
import { useAuth } from '../context/AuthContext'
import {
  toDisplayWeight, fromInputWeight, weightUnit,
  toDisplayMeasure, fromInputMeasure, measureUnit,
} from '../utils/units'
import { card, input, btnPrimary, btnDanger, label, skeleton } from '../styles/tokens'
import PageTransition from '../components/PageTransition'

const today = () => new Date().toISOString().split('T')[0]

export default function MeasurementsPage() {
  const { unitSystem } = useAuth()
  const [entries, setEntries] = useState<MeasurementEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  // Form state (in display units)
  const [date, setDate] = useState(today())
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [chest, setChest] = useState('')
  const [waist, setWaist] = useState('')
  const [hips, setHips] = useState('')
  const [arms, setArms] = useState('')
  const [thighs, setThighs] = useState('')
  const [neck, setNeck] = useState('')
  const [notes, setNotes] = useState('')

  const load = () =>
    getMeasurements().then(r => { setEntries(r.data); setLoading(false) })

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await createMeasurement({
        date,
        weight: weight ? fromInputWeight(parseFloat(weight), unitSystem) : null,
        body_fat: bodyFat ? parseFloat(bodyFat) : null,
        chest: chest ? fromInputMeasure(parseFloat(chest), unitSystem) : null,
        waist: waist ? fromInputMeasure(parseFloat(waist), unitSystem) : null,
        hips: hips ? fromInputMeasure(parseFloat(hips), unitSystem) : null,
        arms: arms ? fromInputMeasure(parseFloat(arms), unitSystem) : null,
        thighs: thighs ? fromInputMeasure(parseFloat(thighs), unitSystem) : null,
        neck: neck ? fromInputMeasure(parseFloat(neck), unitSystem) : null,
        notes: notes || null,
      })
      setWeight(''); setBodyFat(''); setChest(''); setWaist('')
      setHips(''); setArms(''); setThighs(''); setNeck(''); setNotes('')
      setShowForm(false)
      load()
    } catch {
      setError('Failed to save measurement')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    await deleteMeasurement(id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const wt = weightUnit(unitSystem)
  const mt = measureUnit(unitSystem)

  const fieldInput = (label_: string, value: string, setter: (v: string) => void, unit: string) => (
    <div>
      <label className={label}>{label_} <span className="text-slate-600 normal-case">({unit})</span></label>
      <input className={input} type="number" step="0.1" min="0" value={value}
        onChange={e => setter(e.target.value)} placeholder="—" />
    </div>
  )

  return (
    <PageTransition>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Measurements</h1>
          <button onClick={() => setShowForm(v => !v)} className={btnPrimary}>
            {showForm ? 'Cancel' : '+ Log Entry'}
          </button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={card}
            >
              <h2 className="font-semibold text-slate-200 mb-4">New Entry</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={label}>Date</label>
                  <input className={input} type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {fieldInput('Body Weight', weight, setWeight, wt)}
                  {fieldInput('Body Fat', bodyFat, setBodyFat, '%')}
                </div>

                <div className="border-t border-slate-700 pt-3">
                  <p className="text-xs text-slate-500 mb-3 uppercase tracking-wide font-medium">Circumferences</p>
                  <div className="grid grid-cols-2 gap-3">
                    {fieldInput('Chest', chest, setChest, mt)}
                    {fieldInput('Waist', waist, setWaist, mt)}
                    {fieldInput('Hips', hips, setHips, mt)}
                    {fieldInput('Arms', arms, setArms, mt)}
                    {fieldInput('Thighs', thighs, setThighs, mt)}
                    {fieldInput('Neck', neck, setNeck, mt)}
                  </div>
                </div>

                <div>
                  <label className={label}>Notes</label>
                  <textarea className={input + ' resize-none'} rows={2} value={notes}
                    onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button type="submit" disabled={saving} className={`${btnPrimary} w-full py-3`}>
                  {saving ? 'Saving...' : 'Save Entry'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className={`${skeleton} h-24`} />)}
          </div>
        ) : entries.length === 0 ? (
          <div className={`${card} text-center py-12`}>
            <p className="text-slate-500">No measurements logged yet.</p>
            <p className="text-slate-600 text-sm mt-1">Click "+ Log Entry" to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(e => (
              <motion.div key={e.id} layout className={card}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-slate-400 text-xs">{e.date}</div>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {e.weight != null && (
                        <span className="text-slate-100 font-semibold">
                          {toDisplayWeight(e.weight, unitSystem)} {wt}
                        </span>
                      )}
                      {e.body_fat != null && (
                        <span className="text-blue-400 font-medium">{e.body_fat}% BF</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(e.id)} className={btnDanger + ' text-xs py-1 px-2'}>
                    Delete
                  </button>
                </div>
                {(e.chest || e.waist || e.hips || e.arms || e.thighs || e.neck) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                    {e.chest != null && <span>Chest: {toDisplayMeasure(e.chest, unitSystem)}{mt}</span>}
                    {e.waist != null && <span>Waist: {toDisplayMeasure(e.waist, unitSystem)}{mt}</span>}
                    {e.hips != null && <span>Hips: {toDisplayMeasure(e.hips, unitSystem)}{mt}</span>}
                    {e.arms != null && <span>Arms: {toDisplayMeasure(e.arms, unitSystem)}{mt}</span>}
                    {e.thighs != null && <span>Thighs: {toDisplayMeasure(e.thighs, unitSystem)}{mt}</span>}
                    {e.neck != null && <span>Neck: {toDisplayMeasure(e.neck, unitSystem)}{mt}</span>}
                  </div>
                )}
                {e.notes && <p className="text-slate-500 text-xs mt-2">{e.notes}</p>}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
