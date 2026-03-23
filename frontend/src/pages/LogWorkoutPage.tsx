import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { createWorkout } from '../api/workouts'
import { listExercises, type GlobalExercise } from '../api/globalExercises'
import type { ExerciseLookup } from '../api/exercises'
import MuscleMap from '../components/MuscleMap/MuscleMap'
import { card, input, btnPrimary, btnGhost } from '../styles/tokens'
import PageTransition from '../components/PageTransition'
import { useAuth } from '../context/AuthContext'
import { fromInputWeight, weightUnit } from '../utils/units'

function LogTechniquePanel({ description, category }: { description: string; category: string | null }) {
  const [expanded, setExpanded] = useState(false)

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
            <p className="mt-2 text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface SetForm { weight: string; reps: string; rpe: string }
interface ExerciseForm {
  name: string
  sets: SetForm[]
  lookup: ExerciseLookup | null
  showMuscles: boolean
  filter: string
  showPicker: boolean
}

const today = () => new Date().toISOString().split('T')[0]
const emptyExercise = (): ExerciseForm => ({
  name: '', sets: [{ weight: '', reps: '', rpe: '' }],
  lookup: null, showMuscles: false, filter: '', showPicker: false,
})

function libraryToLookup(ex: GlobalExercise): ExerciseLookup {
  return {
    canonical_name: ex.name,
    image_url: ex.image_url,
    muscles_primary: ex.muscles_primary,
    muscles_secondary: ex.muscles_secondary,
    muscles_primary_ids: ex.muscles_primary_ids,
    muscles_secondary_ids: ex.muscles_secondary_ids,
    description: ex.description,
    category: ex.category,
  }
}

export default function LogWorkoutPage() {
  const navigate = useNavigate()
  const { units } = useAuth()
  const wt = weightUnit(units.weight)
  const [name, setName] = useState('')
  const [date, setDate] = useState(today())
  const [exercises, setExercises] = useState<ExerciseForm[]>([emptyExercise()])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [library, setLibrary] = useState<GlobalExercise[]>([])
  const pickerRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    listExercises().then(r => setLibrary(r.data)).catch(() => {})
  }, [])

  const updateExercise = (i: number, patch: Partial<ExerciseForm>) =>
    setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, ...patch } : ex))

  const selectLibraryExercise = (ei: number, libEx: GlobalExercise) => {
    const lookup = libraryToLookup(libEx)
    updateExercise(ei, {
      name: libEx.name,
      filter: '',
      showPicker: false,
      lookup,
      showMuscles: libEx.muscles_primary_ids.length > 0 || libEx.muscles_secondary_ids.length > 0,
    })
  }

  const handleFilterChange = (i: number, val: string) => {
    updateExercise(i, { filter: val, showPicker: true, name: '', lookup: null, showMuscles: false })
  }

  const addExercise = () => setExercises(prev => [...prev, emptyExercise()])
  const removeExercise = (i: number) => setExercises(prev => prev.filter((_, idx) => idx !== i))

  const addSet = (i: number) =>
    setExercises(prev => prev.map((ex, idx) =>
      idx === i ? { ...ex, sets: [...ex.sets, { weight: '', reps: '', rpe: '' }] } : ex))

  const removeSet = (ei: number, si: number) =>
    setExercises(prev => prev.map((ex, idx) =>
      idx === ei ? { ...ex, sets: ex.sets.filter((_, s) => s !== si) } : ex))

  const updateSet = (ei: number, si: number, field: 'weight' | 'reps' | 'rpe', val: string) =>
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
            weight: s.weight ? fromInputWeight(parseFloat(s.weight), units.weight) : null,
            reps: s.reps ? parseInt(s.reps) : null,
            rpe: s.rpe ? parseInt(s.rpe) : null,
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
            {exercises.map((ex, ei) => {
              const filtered = library.filter(l =>
                ex.filter.trim().length === 0
                  ? true
                  : l.name.toLowerCase().includes(ex.filter.toLowerCase())
              )

              return (
                <motion.div
                  key={ei}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className={card}
                >
                  {/* Exercise picker */}
                  <div className="flex gap-2 mb-4">
                    <div className="flex-1 relative" ref={el => { pickerRefs.current[ei] = el }}>
                      {ex.name ? (
                        /* Selected state */
                        <div className="flex items-center gap-2">
                          <div className={`${input} flex-1 text-slate-100 cursor-default`}>
                            {ex.name}
                          </div>
                          <button
                            type="button"
                            onClick={() => updateExercise(ei, { name: '', lookup: null, showMuscles: false, filter: '', showPicker: true })}
                            className="text-xs text-slate-500 hover:text-blue-400 transition-colors shrink-0"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        /* Search state */
                        <>
                          <input
                            className={input}
                            value={ex.filter}
                            onChange={e => handleFilterChange(ei, e.target.value)}
                            onFocus={() => updateExercise(ei, { showPicker: true })}
                            onBlur={() => setTimeout(() => updateExercise(ei, { showPicker: false }), 150)}
                            placeholder="Search exercises..."
                            autoFocus={ei === exercises.length - 1 && exercises.length > 1}
                          />
                          {ex.showPicker && library.length > 0 && (
                            <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                              {filtered.length === 0 ? (
                                <div className="px-3 py-3 text-xs text-slate-500">No exercises match "{ex.filter}"</div>
                              ) : filtered.map(libEx => (
                                <button
                                  key={libEx.id}
                                  type="button"
                                  onMouseDown={() => selectLibraryExercise(ei, libEx)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/60 transition-colors text-left border-b border-slate-700/50 last:border-0"
                                >
                                  {libEx.image_url && (
                                    <img src={libEx.image_url} alt={libEx.name} className="w-8 h-8 object-cover rounded bg-slate-700 shrink-0" />
                                  )}
                                  <div>
                                    <div className="text-sm text-slate-200">{libEx.name}</div>
                                    {libEx.category && <div className="text-[11px] text-slate-500">{libEx.category}</div>}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
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

                  {/* Muscle map + technique */}
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
                        <div className="flex gap-4 items-start mb-3">
                          {ex.lookup.image_url && (
                            <img
                              src={ex.lookup.image_url}
                              alt={ex.lookup.canonical_name ?? ex.name}
                              className="flex-1 min-w-0 rounded-xl object-cover bg-slate-700"
                              style={{ height: '200px' }}
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          )}
                          <div className="shrink-0">
                            <MuscleMap
                              primary={ex.lookup.muscles_primary}
                              secondary={ex.lookup.muscles_secondary}
                              primaryIds={ex.lookup.muscles_primary_ids}
                              secondaryIds={ex.lookup.muscles_secondary_ids}
                            />
                          </div>
                        </div>
                        {ex.lookup.description && (
                          <LogTechniquePanel description={ex.lookup.description} category={ex.lookup.category} />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Sets */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-[24px_1fr_1fr_52px_24px] gap-2 text-xs text-slate-500 px-1">
                      <span>Set</span><span>Weight ({wt})</span><span>Reps</span><span>RPE</span><span />
                    </div>
                    <AnimatePresence>
                      {ex.sets.map((s, si) => (
                        <motion.div
                          key={si}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="grid grid-cols-[24px_1fr_1fr_52px_24px] gap-2 items-center"
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
                          <input
                            className={input}
                            type="number" min="1" max="10"
                            value={s.rpe}
                            onChange={e => updateSet(ei, si, 'rpe', e.target.value)}
                            placeholder="—"
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
              )
            })}
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
            disabled={saving || exercises.some(ex => !ex.name)}
            whileTap={{ scale: 0.98 }}
            className={`${btnPrimary} w-full py-3 text-base relative`}
          >
            {saved ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved!
              </span>
            ) : saving ? 'Saving...' : 'Save Workout'}
          </motion.button>
        </form>
      </div>
    </PageTransition>
  )
}
