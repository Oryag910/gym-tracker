import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { createWorkout } from '../api/workouts'
import { lookupExercise } from '../api/exercises'
import type { ExerciseLookup } from '../api/exercises'
import MuscleMap from '../components/MuscleMap/MuscleMap'
import { card, input, btnPrimary, btnGhost } from '../styles/tokens'
import PageTransition from '../components/PageTransition'

function LogTechniquePanel({ description, category }: { description: string; category: string | null }) {
  const [expanded, setExpanded] = useState(false)
  const safe = description
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')

  return (
    <div className="mt-3 border-t border-slate-700 pt-3">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-300">Technique</span>
          {category && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {category}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="mt-2 text-xs text-slate-400 leading-relaxed [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-0.5"
              dangerouslySetInnerHTML={{ __html: safe }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface SetForm { weight: string; reps: string }
interface ExerciseForm {
  name: string
  sets: SetForm[]
  lookup: ExerciseLookup | null
  lookupLoading: boolean
  showMuscles: boolean
}

const today = () => new Date().toISOString().split('T')[0]
const emptyExercise = (): ExerciseForm => ({
  name: '', sets: [{ weight: '', reps: '' }],
  lookup: null, lookupLoading: false, showMuscles: false,
})

let debounceTimer: ReturnType<typeof setTimeout>

export default function LogWorkoutPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [date, setDate] = useState(today())
  const [exercises, setExercises] = useState<ExerciseForm[]>([emptyExercise()])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const updateExercise = (i: number, patch: Partial<ExerciseForm>) =>
    setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, ...patch } : ex))

  const handleExerciseNameChange = (i: number, val: string) => {
    updateExercise(i, { name: val, lookup: null })
    clearTimeout(debounceTimer)
    if (val.trim().length < 2) return
    debounceTimer = setTimeout(async () => {
      updateExercise(i, { lookupLoading: true })
      try {
        const data = await lookupExercise(val.trim())
        updateExercise(i, { lookup: data, lookupLoading: false, showMuscles: true })
      } catch {
        updateExercise(i, { lookupLoading: false })
      }
    }, 500)
  }

  const addExercise = () => setExercises(prev => [...prev, emptyExercise()])
  const removeExercise = (i: number) => setExercises(prev => prev.filter((_, idx) => idx !== i))

  const addSet = (i: number) =>
    setExercises(prev => prev.map((ex, idx) =>
      idx === i ? { ...ex, sets: [...ex.sets, { weight: '', reps: '' }] } : ex))

  const removeSet = (ei: number, si: number) =>
    setExercises(prev => prev.map((ex, idx) =>
      idx === ei ? { ...ex, sets: ex.sets.filter((_, s) => s !== si) } : ex))

  const updateSet = (ei: number, si: number, field: 'weight' | 'reps', val: string) =>
    setExercises(prev => prev.map((ex, idx) =>
      idx === ei ? { ...ex, sets: ex.sets.map((s, sidx) => sidx === si ? { ...s, [field]: val } : s) } : ex))

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        name, date,
        exercises: exercises.map(ex => ({
          name: ex.name,
          sets: ex.sets.map(s => ({
            weight: s.weight ? parseFloat(s.weight) : null,
            reps: s.reps ? parseInt(s.reps) : null,
          })),
        })),
      }
      const res = await createWorkout(payload)
      setSaved(true)
      setTimeout(() => navigate(`/workouts/${res.data.id}`), 600)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save workout')
      setSaving(false)
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">Log Workout</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name + Date */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Name</label>
              <input className={input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Push Day" required />
            </div>
            <div className="w-40">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Date</label>
              <input className={input} type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
          </div>

          {/* Exercises */}
          <AnimatePresence>
            {exercises.map((ex, ei) => (
              <motion.div
                key={ei}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className={card}
              >
                {/* Exercise header */}
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 relative">
                    <input
                      className={input}
                      value={ex.name}
                      onChange={e => handleExerciseNameChange(ei, e.target.value)}
                      placeholder={`Exercise ${ei + 1}`}
                      required
                    />
                    {ex.lookupLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  {exercises.length > 1 && (
                    <button type="button" onClick={() => removeExercise(ei)} className="text-slate-500 hover:text-red-400 transition-colors px-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Muscle map */}
                <AnimatePresence>
                  {ex.lookup && ex.showMuscles && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-slate-500 font-medium">
                          {ex.lookup.canonical_name ?? ex.name}
                        </div>
                        <button type="button" onClick={() => updateExercise(ei, { showMuscles: false })} className={btnGhost}>
                          Hide
                        </button>
                      </div>
                      {ex.lookup.image_url && (
                        <img
                          src={ex.lookup.image_url}
                          alt={ex.lookup.canonical_name ?? ex.name}
                          className="h-28 object-cover rounded-lg mb-3 bg-slate-700"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      )}
                      <MuscleMap
                        primary={ex.lookup.muscles_primary}
                        secondary={ex.lookup.muscles_secondary}
                        primaryIds={ex.lookup.muscles_primary_ids}
                        secondaryIds={ex.lookup.muscles_secondary_ids}
                      />
                      {ex.lookup.description && (
                        <LogTechniquePanel description={ex.lookup.description} category={ex.lookup.category} />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Sets */}
                <div className="space-y-2">
                  <div className="grid grid-cols-[32px_1fr_1fr_28px] gap-2 text-xs text-slate-500 px-1">
                    <span>Set</span><span>Weight (lbs)</span><span>Reps</span><span />
                  </div>
                  <AnimatePresence>
                    {ex.sets.map((s, si) => (
                      <motion.div
                        key={si}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-[32px_1fr_1fr_28px] gap-2 items-center"
                      >
                        <span className="text-slate-500 text-sm text-center">{si + 1}</span>
                        <input
                          className={input}
                          type="number" step="0.5" min="0"
                          value={s.weight}
                          onChange={e => updateSet(ei, si, 'weight', e.target.value)}
                          placeholder="BW"
                        />
                        <input
                          className={input}
                          type="number" min="0"
                          value={s.reps}
                          onChange={e => updateSet(ei, si, 'reps', e.target.value)}
                          placeholder="reps"
                        />
                        {ex.sets.length > 1 ? (
                          <button type="button" onClick={() => removeSet(ei, si)} className="text-slate-600 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                        ) : <span />}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <button
                    type="button"
                    onClick={() => addSet(ei)}
                    className="text-slate-500 hover:text-blue-400 text-sm transition-colors mt-1"
                  >
                    + Add Set
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add exercise */}
          <button
            type="button"
            onClick={addExercise}
            className="w-full border border-dashed border-slate-600 hover:border-blue-400/60 text-slate-500 hover:text-blue-400 rounded-xl py-3 text-sm transition-colors"
          >
            + Add Exercise
          </button>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <motion.button
            type="submit"
            disabled={saving}
            animate={saved ? { backgroundColor: '#34d399', scale: 1.02 } : {}}
            whileTap={{ scale: 0.97 }}
            className={`${btnPrimary} w-full py-3 text-base`}
          >
            {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Workout'}
          </motion.button>
        </form>
      </div>
    </PageTransition>
  )
}
