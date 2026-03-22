import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { listWorkouts } from '../api/workouts'
import type { WorkoutSummary } from '../api/workouts'
import { compareWorkouts } from '../api/stats'
import type { CompareResponse, CompareExercise } from '../api/stats'
import { card, skeleton } from '../styles/tokens'
import PageTransition from '../components/PageTransition'

function formatSet(s: { weight: number | null; reps: number | null }) {
  return `${s.weight != null ? `${s.weight} lbs` : 'BW'} × ${s.reps ?? '—'}`
}

function volumeOf(sets: { weight: number | null; reps: number | null }[] | null) {
  if (!sets) return 0
  return sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0)
}

interface Props {
  embedded?: boolean
}

export default function ComparePage({ embedded }: Props) {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([])
  const [aId, setAId] = useState('')
  const [bId, setBId] = useState('')
  const [result, setResult] = useState<CompareResponse | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [comparing, setComparing] = useState(false)

  useEffect(() => {
    listWorkouts().then((r) => { setWorkouts(r.data); setLoading(false) })
  }, [])

  const handleCompare = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError('')
    setResult(null)
    if (!aId || !bId || aId === bId) { setError('Select two different workouts.'); return }
    setComparing(true)
    try {
      const r = await compareWorkouts(Number(aId), Number(bId))
      setResult(r.data)
    } catch {
      setError('Failed to load comparison.')
    } finally {
      setComparing(false)
    }
  }

  const selectCls = 'flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:border-blue-400 focus:outline-none transition-colors text-sm'

  const content = (
    <div className="space-y-6">
      {!embedded && <h1 className="text-2xl font-black text-slate-100 tracking-tight">Compare Workouts</h1>}

      <form onSubmit={handleCompare} className="flex flex-wrap gap-3 items-end">
        {loading ? (
          <>
            <div className={`${skeleton} h-12 flex-1`} />
            <div className={`${skeleton} h-12 flex-1`} />
          </>
        ) : (
          <>
            <select value={aId} onChange={(e) => setAId(e.target.value)} className={selectCls} required>
              <option value="">Workout A</option>
              {workouts.map(w => <option key={w.id} value={w.id}>{w.date} — {w.name}</option>)}
            </select>
            <select value={bId} onChange={(e) => setBId(e.target.value)} className={selectCls} required>
              <option value="">Workout B</option>
              {workouts.map(w => <option key={w.id} value={w.id}>{w.date} — {w.name}</option>)}
            </select>
            <button
              type="submit"
              disabled={comparing}
              className="bg-blue-500 text-slate-950 font-bold rounded-xl px-5 py-3 hover:bg-blue-400 active:scale-95 transition-all disabled:opacity-50 shrink-0"
            >
              {comparing ? 'Loading...' : 'Compare'}
            </button>
          </>
        )}
      </form>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${card} overflow-hidden p-0`}
        >
          {/* Header row */}
          <div className="grid grid-cols-3 bg-slate-900 px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <div>Exercise</div>
            <div className="text-blue-400">{result.workout_a.name} <span className="text-slate-600">({result.workout_a.date})</span></div>
            <div className="text-emerald-400">{result.workout_b.name} <span className="text-slate-600">({result.workout_b.date})</span></div>
          </div>

          {result.exercises.map((ex: CompareExercise, i) => {
            const volA = volumeOf(ex.workout_a)
            const volB = volumeOf(ex.workout_b)
            const aWins = ex.workout_a && volA > volB
            const bWins = ex.workout_b && volB > volA
            return (
              <div
                key={ex.exercise}
                className={`grid grid-cols-3 px-5 py-3.5 text-sm ${i % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/50'} border-t border-slate-700/50`}
              >
                <div className="font-semibold text-slate-100 capitalize">{ex.exercise}</div>
                <div className={`space-y-0.5 ${aWins ? 'text-blue-300' : 'text-slate-400'}`}>
                  {ex.workout_a
                    ? ex.workout_a.map((s, si) => <div key={si} className="text-xs">{formatSet(s)}</div>)
                    : <span className="text-slate-600">—</span>}
                </div>
                <div className={`space-y-0.5 ${bWins ? 'text-emerald-300' : 'text-slate-400'}`}>
                  {ex.workout_b
                    ? ex.workout_b.map((s, si) => <div key={si} className="text-xs">{formatSet(s)}</div>)
                    : <span className="text-slate-600">—</span>}
                </div>
              </div>
            )
          })}
        </motion.div>
      )}
    </div>
  )

  if (embedded) return content
  return <PageTransition>{content}</PageTransition>
}
