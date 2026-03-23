import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { createCardioSession } from '../api/cardio'
import type { CardioSegmentCreate } from '../api/cardio'
import { useAuth } from '../context/AuthContext'
import {
  fromInputDistance, distanceUnit,
  fromInputTemp, tempUnit,
  parsePace, paceUnit,
} from '../utils/units'
import { card, input, btnPrimary, label } from '../styles/tokens'
import PageTransition from '../components/PageTransition'

const today = () => new Date().toISOString().split('T')[0]

const ACTIVITY_TYPES = ['run', 'swim', 'bike', 'hike', 'other'] as const
type ActivityType = typeof ACTIVITY_TYPES[number]

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  run: 'Run', swim: 'Swim', bike: 'Bike', hike: 'Hike', other: 'Other',
}

const SEGMENT_TYPES = ['warmup', 'easy', 'moderate', 'hard', 'interval', 'recovery', 'cool_down'] as const
type SegmentType = typeof SEGMENT_TYPES[number]
const SEGMENT_LABELS: Record<SegmentType, string> = {
  warmup: 'Warm-up', easy: 'Easy', moderate: 'Moderate', hard: 'Hard',
  interval: 'Interval', recovery: 'Recovery', cool_down: 'Cool-down',
}

const SEGMENT_COLORS: Record<SegmentType, string> = {
  warmup: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  moderate: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  hard: 'text-red-400 bg-red-500/10 border-red-500/30',
  interval: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  recovery: 'text-slate-300 bg-slate-600/30 border-slate-500/30',
  cool_down: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
}

interface SegmentForm {
  segment_type: SegmentType
  label: string
  distance: string
  paceStr: string    // display as "M:SS"
  duration: string
  hr: string
  reps: string
  notes: string
}

const emptySegment = (): SegmentForm => ({
  segment_type: 'easy', label: '', distance: '', paceStr: '', duration: '', hr: '', reps: '1', notes: '',
})

export default function LogCardioPage() {
  const navigate = useNavigate()
  const { units } = useAuth()

  const [name, setName] = useState('')
  const [date, setDate] = useState(today())
  const [activityType, setActivityType] = useState<ActivityType>('run')
  const [totalDistance, setTotalDistance] = useState('')
  const [totalDuration, setTotalDuration] = useState('')
  const [avgHr, setAvgHr] = useState('')
  const [maxHr, setMaxHr] = useState('')
  const [calories, setCalories] = useState('')
  const [temperature, setTemperature] = useState('')
  const [notes, setNotes] = useState('')
  const [segments, setSegments] = useState<SegmentForm[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const du = distanceUnit(units.distance)
  const pu = paceUnit(units.distance)
  const tu = tempUnit(units.temp)

  const addSegment = () => setSegments(prev => [...prev, emptySegment()])
  const removeSegment = (i: number) => setSegments(prev => prev.filter((_, idx) => idx !== i))
  const updateSegment = (i: number, patch: Partial<SegmentForm>) =>
    setSegments(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const parsedSegments: CardioSegmentCreate[] = segments.map((s, i) => {
        const pace = s.paceStr ? parsePace(s.paceStr, units.distance) : undefined
        return {
          sort_order: i,
          segment_type: s.segment_type,
          label: s.label || undefined,
          distance: s.distance ? fromInputDistance(parseFloat(s.distance), units.distance) : undefined,
          pace: pace ?? undefined,
          duration: s.duration ? parseFloat(s.duration) : undefined,
          hr: s.hr ? parseInt(s.hr) : undefined,
          reps: s.reps ? parseInt(s.reps) : 1,
          notes: s.notes || undefined,
        }
      })

      const res = await createCardioSession({
        date, name, activity_type: activityType,
        total_distance: totalDistance ? fromInputDistance(parseFloat(totalDistance), units.distance) : undefined,
        total_duration: totalDuration ? parseFloat(totalDuration) : undefined,
        avg_hr: avgHr ? parseInt(avgHr) : undefined,
        max_hr: maxHr ? parseInt(maxHr) : undefined,
        calories: calories ? parseInt(calories) : undefined,
        temperature: temperature ? fromInputTemp(parseFloat(temperature), units.temp) : undefined,
        notes: notes || undefined,
        segments: parsedSegments,
      })
      navigate(`/cardio/${res.data.id}`)
    } catch {
      setError('Failed to save session')
      setSaving(false)
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">Log Cardio</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Activity type + name */}
          <div className={card + ' space-y-4'}>
            <div className="flex gap-1 flex-wrap">
              {ACTIVITY_TYPES.map(t => (
                <button key={t} type="button" onClick={() => setActivityType(t)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    activityType === t
                      ? 'bg-blue-500 border-blue-500 text-slate-950'
                      : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:text-slate-200'
                  }`}>
                  {ACTIVITY_LABELS[t]}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className={label}>Session name</label>
                <input className={input} value={name} onChange={e => setName(e.target.value)}
                  placeholder={`e.g. Morning ${ACTIVITY_LABELS[activityType]}`} required />
              </div>
              <div className="w-40">
                <label className={label}>Date</label>
                <input className={input} type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
            </div>
          </div>

          {/* Summary stats */}
          <div className={card}>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Session Summary (optional)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className={label}>Distance ({du})</label>
                <input className={input} type="number" step="0.01" min="0" value={totalDistance}
                  onChange={e => setTotalDistance(e.target.value)} placeholder="—" />
              </div>
              <div>
                <label className={label}>Duration (min)</label>
                <input className={input} type="number" step="0.1" min="0" value={totalDuration}
                  onChange={e => setTotalDuration(e.target.value)} placeholder="—" />
              </div>
              <div>
                <label className={label}>Avg HR (bpm)</label>
                <input className={input} type="number" min="0" value={avgHr}
                  onChange={e => setAvgHr(e.target.value)} placeholder="—" />
              </div>
              <div>
                <label className={label}>Max HR (bpm)</label>
                <input className={input} type="number" min="0" value={maxHr}
                  onChange={e => setMaxHr(e.target.value)} placeholder="—" />
              </div>
              <div>
                <label className={label}>Calories</label>
                <input className={input} type="number" min="0" value={calories}
                  onChange={e => setCalories(e.target.value)} placeholder="—" />
              </div>
              <div>
                <label className={label}>Temp ({tu})</label>
                <input className={input} type="number" step="0.5" value={temperature}
                  onChange={e => setTemperature(e.target.value)} placeholder="—" />
              </div>
            </div>
            <div className="mt-3">
              <label className={label}>Notes</label>
              <textarea className={input + ' resize-none'} rows={2} value={notes}
                onChange={e => setNotes(e.target.value)} placeholder="General notes..." />
            </div>
          </div>

          {/* Segments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-200">Segments</h2>
              <span className="text-xs text-slate-500">Optional — break down your workout</span>
            </div>

            <AnimatePresence>
              {segments.map((seg, i) => (
                <motion.div key={i} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                  className={card}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex flex-wrap gap-1">
                      {SEGMENT_TYPES.map(t => (
                        <button key={t} type="button" onClick={() => updateSegment(i, { segment_type: t })}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all ${
                            seg.segment_type === t ? SEGMENT_COLORS[t] : 'text-slate-500 border-slate-700 hover:text-slate-300'
                          }`}>
                          {SEGMENT_LABELS[t]}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => removeSegment(i)}
                      className="text-slate-600 hover:text-red-400 transition-colors ml-2 text-lg leading-none shrink-0">×</button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className={label}>Distance ({du})</label>
                      <input className={input} type="number" step="0.001" min="0" value={seg.distance}
                        onChange={e => updateSegment(i, { distance: e.target.value })} placeholder="—" />
                    </div>
                    <div>
                      <label className={label}>Pace ({pu})</label>
                      <input className={input} value={seg.paceStr}
                        onChange={e => updateSegment(i, { paceStr: e.target.value })}
                        placeholder="M:SS" />
                    </div>
                    <div>
                      <label className={label}>Duration (min)</label>
                      <input className={input} type="number" step="0.1" min="0" value={seg.duration}
                        onChange={e => updateSegment(i, { duration: e.target.value })} placeholder="—" />
                    </div>
                    <div>
                      <label className={label}>HR (bpm)</label>
                      <input className={input} type="number" min="0" value={seg.hr}
                        onChange={e => updateSegment(i, { hr: e.target.value })} placeholder="—" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className={label}>Reps <span className="text-slate-600 normal-case">(for intervals)</span></label>
                      <input className={input} type="number" min="1" value={seg.reps}
                        onChange={e => updateSegment(i, { reps: e.target.value })} />
                    </div>
                    <div>
                      <label className={label}>Label (optional)</label>
                      <input className={input} value={seg.label}
                        onChange={e => updateSegment(i, { label: e.target.value })} placeholder="e.g. Interval 1" />
                    </div>
                  </div>

                  {parseInt(seg.reps) > 1 && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-purple-400">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 font-medium">
                        ×{seg.reps} repeats
                      </span>
                      <span className="text-slate-500">
                        {seg.distance ? `${(parseFloat(seg.distance) * parseInt(seg.reps)).toFixed(3)} ${du} total` : ''}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            <button type="button" onClick={addSegment}
              className="w-full border border-dashed border-slate-600 hover:border-blue-400/60 text-slate-500 hover:text-blue-400 rounded-xl py-3 text-sm transition-colors">
              + Add Segment
            </button>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <motion.button type="submit" disabled={saving || !name} whileTap={{ scale: 0.98 }}
            className={`${btnPrimary} w-full py-3 text-base`}>
            {saving ? 'Saving...' : 'Save Session'}
          </motion.button>
        </form>
      </div>
    </PageTransition>
  )
}
