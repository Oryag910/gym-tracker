import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { createTemplate, getTemplate, updateTemplate } from '../api/templates'
import { listExercises, type GlobalExercise } from '../api/globalExercises'
import type { ExerciseLookup } from '../api/exercises'
import MuscleMap from '../components/MuscleMap/MuscleMap'
import { card, input, btnPrimary, btnGhost, label } from '../styles/tokens'
import PageTransition from '../components/PageTransition'
import { useAuth } from '../context/AuthContext'
import { fromInputWeight, weightUnit, toDisplayWeight } from '../utils/units'

interface TemplateSetForm {
  target_weight: string
  target_reps: string
}

interface TemplateExerciseForm {
  name: string
  sets: TemplateSetForm[]
  set_rest_override: string
  exercise_rest_override: string
  lookup: ExerciseLookup | null
  filter: string
  showPicker: boolean
  showRestConfig: boolean
  is_unilateral: boolean
  attachment: string
}

const emptyExercise = (): TemplateExerciseForm => ({
  name: '', sets: [{ target_weight: '', target_reps: '' }],
  set_rest_override: '', exercise_rest_override: '',
  lookup: null, filter: '', showPicker: false, showRestConfig: false,
  is_unilateral: false, attachment: '',
})

function libraryToLookup(ex: GlobalExercise): ExerciseLookup {
  return {
    canonical_name: ex.name, image_url: ex.image_url,
    muscles_primary: ex.muscles_primary, muscles_secondary: ex.muscles_secondary,
    muscles_primary_ids: ex.muscles_primary_ids, muscles_secondary_ids: ex.muscles_secondary_ids,
    description: ex.description, category: ex.category,
  }
}

export default function TemplateFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { units } = useAuth()
  const wt = weightUnit(units.weight)
  const isEdit = !!id

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [defaultSetRest, setDefaultSetRest] = useState('90')
  const [defaultExerciseRest, setDefaultExerciseRest] = useState('120')
  const [exercises, setExercises] = useState<TemplateExerciseForm[]>([emptyExercise()])
  const [library, setLibrary] = useState<GlobalExercise[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const pickerRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    listExercises().then(r => setLibrary(r.data)).catch(() => {})
    if (isEdit) {
      getTemplate(Number(id)).then(r => {
        const t = r.data
        setName(t.name)
        setDescription(t.description ?? '')
        setDefaultSetRest(String(t.default_set_rest))
        setDefaultExerciseRest(String(t.default_exercise_rest))
        setExercises(t.exercises.map(ex => ({
          name: ex.name,
          sets: ex.sets.map(s => ({
            target_weight: s.target_weight != null ? String(toDisplayWeight(s.target_weight, units.weight)) : '',
            target_reps: s.target_reps != null ? String(s.target_reps) : '',
          })),
          set_rest_override: ex.set_rest_override != null ? String(ex.set_rest_override) : '',
          exercise_rest_override: ex.exercise_rest_override != null ? String(ex.exercise_rest_override) : '',
          lookup: null, filter: '', showPicker: false, showRestConfig: false,
          is_unilateral: ex.is_unilateral, attachment: ex.attachment ?? '',
        })))
        setLoading(false)
      })
    }
  }, [])

  const updateExercise = (i: number, patch: Partial<TemplateExerciseForm>) =>
    setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, ...patch } : ex))

  const selectLibraryExercise = (ei: number, libEx: GlobalExercise) => {
    updateExercise(ei, {
      name: libEx.name, filter: '', showPicker: false, lookup: libraryToLookup(libEx),
    })
  }

  const addExercise = () => setExercises(prev => [...prev, emptyExercise()])
  const removeExercise = (i: number) => setExercises(prev => prev.filter((_, idx) => idx !== i))

  const addSet = (i: number) =>
    setExercises(prev => prev.map((ex, idx) =>
      idx === i ? { ...ex, sets: [...ex.sets, { target_weight: '', target_reps: '' }] } : ex))

  const removeSet = (ei: number, si: number) =>
    setExercises(prev => prev.map((ex, idx) =>
      idx === ei ? { ...ex, sets: ex.sets.filter((_, s) => s !== si) } : ex))

  const updateSet = (ei: number, si: number, field: 'target_weight' | 'target_reps', val: string) =>
    setExercises(prev => prev.map((ex, idx) =>
      idx === ei ? { ...ex, sets: ex.sets.map((s, sidx) => sidx === si ? { ...s, [field]: val } : s) } : ex))

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        name, description: description || undefined,
        default_set_rest: parseInt(defaultSetRest) || 90,
        default_exercise_rest: parseInt(defaultExerciseRest) || 120,
        exercises: exercises.map((ex, idx) => ({
          name: ex.name,
          order_index: idx,
          is_unilateral: ex.is_unilateral,
          attachment: ex.attachment || null,
          set_rest_override: ex.set_rest_override ? parseInt(ex.set_rest_override) : null,
          exercise_rest_override: ex.exercise_rest_override ? parseInt(ex.exercise_rest_override) : null,
          sets: ex.sets.map((s, si) => ({
            set_number: si + 1,
            target_weight: s.target_weight ? fromInputWeight(parseFloat(s.target_weight), units.weight) : null,
            target_reps: s.target_reps ? parseInt(s.target_reps) : null,
          })),
        })),
      }
      if (isEdit) {
        await updateTemplate(Number(id), payload)
      } else {
        await createTemplate(payload)
      }
      navigate('/templates')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save template')
      setSaving(false)
    }
  }

  if (loading) return <div className="text-slate-500 text-sm p-6">Loading...</div>

  return (
    <PageTransition>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/templates')} className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            {isEdit ? 'Edit Template' : 'New Template'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Template details */}
          <div className={card}>
            <h2 className="font-semibold text-slate-200 mb-4">Template Details</h2>
            <div className="space-y-3">
              <div>
                <label className={label}>Name</label>
                <input className={input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Push Day" required />
              </div>
              <div>
                <label className={label}>Description <span className="text-slate-600 normal-case">(optional)</span></label>
                <input className={input} value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Chest, shoulders, triceps" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Set rest (seconds)</label>
                  <input className={input} type="number" min="0" value={defaultSetRest} onChange={e => setDefaultSetRest(e.target.value)} placeholder="90" />
                </div>
                <div>
                  <label className={label}>Exercise rest (seconds)</label>
                  <input className={input} type="number" min="0" value={defaultExerciseRest} onChange={e => setDefaultExerciseRest(e.target.value)} placeholder="120" />
                </div>
              </div>
            </div>
          </div>

          {/* Exercises */}
          <AnimatePresence>
            {exercises.map((ex, ei) => {
              const filtered = library.filter(l =>
                ex.filter.trim().length === 0 ? true : l.name.toLowerCase().includes(ex.filter.toLowerCase())
              )
              return (
                <motion.div
                  key={ei} layout
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                  className={card}
                >
                  {/* Exercise picker */}
                  <div className="flex gap-2 mb-4">
                    <div className="flex-1 relative" ref={el => { pickerRefs.current[ei] = el }}>
                      {ex.name ? (
                        <div className="flex items-center gap-2">
                          <div className={`${input} flex-1 text-slate-100 cursor-default`}>{ex.name}</div>
                          <button type="button" onClick={() => updateExercise(ei, { name: '', lookup: null, filter: '', showPicker: true })}
                            className="text-xs text-slate-500 hover:text-blue-400 transition-colors shrink-0">
                            Change
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            className={input}
                            value={ex.filter}
                            onChange={e => updateExercise(ei, { filter: e.target.value, showPicker: true, name: '' })}
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
                                <button key={libEx.id} type="button"
                                  onMouseDown={() => selectLibraryExercise(ei, libEx)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/60 transition-colors text-left border-b border-slate-700/50 last:border-0">
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

                  {/* Attachment + unilateral toggle */}
                  {ex.name && (
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        className={`${input} flex-1 text-sm`}
                        value={ex.attachment}
                        onChange={e => updateExercise(ei, { attachment: e.target.value })}
                        placeholder="Attachment (e.g. D-handle, cuff, rope...)"
                      />
                      <button
                        type="button"
                        onClick={() => updateExercise(ei, { is_unilateral: !ex.is_unilateral })}
                        className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                          ex.is_unilateral
                            ? 'bg-blue-500/20 border-blue-400/60 text-blue-300'
                            : 'border-slate-600 text-slate-500 hover:border-slate-500'
                        }`}
                      >
                        Unilateral
                      </button>
                    </div>
                  )}

                  {/* Muscle map */}
                  {ex.lookup && (ex.lookup.muscles_primary_ids.length > 0 || ex.lookup.muscles_secondary_ids.length > 0) && (
                    <div className="mb-4">
                      <MuscleMap
                        primary={ex.lookup.muscles_primary} secondary={ex.lookup.muscles_secondary}
                        primaryIds={ex.lookup.muscles_primary_ids} secondaryIds={ex.lookup.muscles_secondary_ids}
                      />
                    </div>
                  )}

                  {/* Sets */}
                  <div className="space-y-2 mb-3">
                    <div className="grid grid-cols-[32px_1fr_1fr_28px] gap-2 text-xs text-slate-500 px-1">
                      <span>Set</span><span>Target reps</span><span>Target weight ({wt})</span><span />
                    </div>
                    <AnimatePresence>
                      {ex.sets.map((s, si) => (
                        <motion.div key={si} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="grid grid-cols-[32px_1fr_1fr_28px] gap-2 items-center">
                          <span className="text-slate-500 text-sm text-center">{si + 1}</span>
                          <input className={input} type="number" min="0"
                            value={s.target_reps}
                            onChange={e => updateSet(ei, si, 'target_reps', e.target.value)}
                            placeholder="reps" />
                          <input className={input} type="number" step="0.5" min="0"
                            value={s.target_weight}
                            onChange={e => updateSet(ei, si, 'target_weight', e.target.value)}
                            placeholder="BW" />
                          {ex.sets.length > 1 ? (
                            <button type="button" onClick={() => removeSet(ei, si)} className="text-slate-600 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                          ) : <span />}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <button type="button" onClick={() => addSet(ei)} className="text-slate-500 hover:text-blue-400 text-sm transition-colors mt-1">
                      + Add Set
                    </button>
                  </div>

                  {/* Rest overrides */}
                  <div className="border-t border-slate-700/50 pt-3">
                    <button type="button" onClick={() => updateExercise(ei, { showRestConfig: !ex.showRestConfig })}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
                      <svg className={`w-3 h-3 transition-transform ${ex.showRestConfig ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      Configure rest times for this exercise
                    </button>
                    <AnimatePresence>
                      {ex.showRestConfig && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden">
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div>
                              <label className={label}>Set rest (sec) <span className="text-slate-600 normal-case">default: {defaultSetRest}s</span></label>
                              <input className={input} type="number" min="0" value={ex.set_rest_override}
                                onChange={e => updateExercise(ei, { set_rest_override: e.target.value })}
                                placeholder={defaultSetRest} />
                            </div>
                            <div>
                              <label className={label}>Exercise rest (sec) <span className="text-slate-600 normal-case">default: {defaultExerciseRest}s</span></label>
                              <input className={input} type="number" min="0" value={ex.exercise_rest_override}
                                onChange={e => updateExercise(ei, { exercise_rest_override: e.target.value })}
                                placeholder={defaultExerciseRest} />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          <button type="button" onClick={addExercise}
            className="w-full border border-dashed border-slate-600 hover:border-blue-400/60 text-slate-500 hover:text-blue-400 rounded-xl py-3 text-sm transition-colors">
            + Add Exercise
          </button>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <motion.button type="submit" disabled={saving || exercises.some(ex => !ex.name)}
              whileTap={{ scale: 0.98 }}
              className={`${btnPrimary} flex-1 py-3 text-base`}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Template'}
            </motion.button>
            <button type="button" onClick={() => navigate('/templates')} className={btnGhost}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </PageTransition>
  )
}
