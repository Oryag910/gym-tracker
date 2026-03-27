import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { createWorkout } from '../api/workouts'
import { listTemplates } from '../api/templates'
import type { TemplateSummary } from '../api/templates'
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

interface SetForm { weight: string; reps: string; rpe: string; weight_right: string; reps_right: string; duration: string }
interface ExerciseForm {
  name: string
  sets: SetForm[]
  lookup: ExerciseLookup | null
  showMuscles: boolean
  filter: string
  showPicker: boolean
  is_unilateral: boolean
  is_timed: boolean
  attachment: string
}

const today = () => new Date().toISOString().split('T')[0]
const emptySet = (): SetForm => ({ weight: '', reps: '', rpe: '', weight_right: '', reps_right: '', duration: '' })
const emptyExercise = (): ExerciseForm => ({
  name: '', sets: [emptySet()],
  lookup: null, showMuscles: false, filter: '', showPicker: false,
  is_unilateral: false, is_timed: false, attachment: '',
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
  const [mode, setMode] = useState<'choose' | 'free'>('choose')
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [name, setName] = useState('')
  const [date, setDate] = useState(today())
  const [exercises, setExercises] = useState<ExerciseForm[]>([emptyExercise()])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [library, setLibrary] = useState<GlobalExercise[]>([])
  const pickerRefs = useRef<(HTMLDivElement | null)[]>([])

  // State for the draft restore banner
  const [showDraftBanner, setShowDraftBanner] = useState(false)

  useEffect(() => {
    listExercises().then(r => setLibrary(r.data)).catch(() => {})
    listTemplates().then(r => { setTemplates(r.data); setLoadingTemplates(false) }).catch(() => setLoadingTemplates(false))
    // On mount: check if there's a saved draft to restore
    if (localStorage.getItem('workout_draft')) setShowDraftBanner(true)
  }, [])

  // Keep a ref with the latest form values so the unmount cleanup can read them.
  // (Cleanup functions capture a stale closure, so we need a ref for current values.)
  const draftRef = useRef({ name, date, exercises, mode, saved })
  useEffect(() => { draftRef.current = { name, date, exercises, mode, saved } })

  // Auto-save draft to localStorage on every meaningful change.
  // localStorage writes are synchronous and fast — no debounce needed.
  // Previously we debounced this, but the cleanup function cancelled the
  // pending timeout before it fired when the user navigated away.
  useEffect(() => {
    if (mode !== 'free' || saved) return
    if (exercises.some(ex => ex.name) || name) {
      localStorage.setItem('workout_draft', JSON.stringify({ name, date, exercises }))
    }
  }, [exercises, name, date, mode, saved])

  // Save draft on unmount (catches navigation that happens before the above effect runs)
  useEffect(() => {
    return () => {
      const { name, date, exercises, mode, saved } = draftRef.current
      if (mode === 'free' && !saved && (exercises.some(ex => ex.name) || name)) {
        localStorage.setItem('workout_draft', JSON.stringify({ name, date, exercises }))
      }
    }
  }, []) // empty deps — only runs once, on unmount

  // Warn if user tries to close/refresh the tab while mid-workout
  useEffect(() => {
    const hasData = exercises.some(ex => ex.name) && !saved
    if (!hasData) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = '' // Required for Chrome to show the dialog
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [exercises, saved])

  const restoreDraft = () => {
    try {
      const raw = localStorage.getItem('workout_draft')
      if (!raw) return
      const draft = JSON.parse(raw)
      if (draft.name) setName(draft.name)
      if (draft.date) setDate(draft.date)
      if (draft.exercises) setExercises(draft.exercises)
      setMode('free')
    } catch {}
    localStorage.removeItem('workout_draft')
    setShowDraftBanner(false)
  }

  const discardDraft = () => {
    localStorage.removeItem('workout_draft')
    setShowDraftBanner(false)
  }

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
      idx === i ? { ...ex, sets: [...ex.sets, emptySet()] } : ex))

  const removeSet = (ei: number, si: number) =>
    setExercises(prev => prev.map((ex, idx) =>
      idx === ei ? { ...ex, sets: ex.sets.filter((_, s) => s !== si) } : ex))

  const updateSet = (ei: number, si: number, field: keyof SetForm, val: string) =>
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
          is_unilateral: ex.is_unilateral,
          is_timed: ex.is_timed,
          attachment: ex.attachment || null,
          sets: ex.sets.map(s => ({
            weight: s.weight ? fromInputWeight(parseFloat(s.weight), units.weight) : null,
            reps: !ex.is_timed && s.reps ? parseInt(s.reps) : null,
            rpe: s.rpe ? parseInt(s.rpe) : null,
            weight_right: ex.is_unilateral && s.weight_right
              ? fromInputWeight(parseFloat(s.weight_right), units.weight) : null,
            reps_right: ex.is_unilateral && s.reps_right ? parseInt(s.reps_right) : null,
            duration: ex.is_timed && s.duration ? parseInt(s.duration) : null,
          })),
        })),
      }
      const res = await createWorkout(payload)
      // Clear any saved draft now that the workout is successfully submitted
      localStorage.removeItem('workout_draft')
      setSaved(true)
      setTimeout(() => navigate(`/workouts/${res.data.id}`), 600)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save workout')
      setSaving(false)
    }
  }

  // ── Template picker screen ─────────────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <PageTransition>
        <div className="space-y-6 max-w-2xl mx-auto">
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Log Workout</h1>

          {/* Draft restore banner */}
          {showDraftBanner && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <span className="text-sm text-amber-200">You have an unsaved workout draft.</span>
              <div className="flex gap-2 shrink-0">
                <button onClick={restoreDraft} className="text-xs font-semibold text-amber-300 hover:text-amber-100 transition-colors">Restore</button>
                <button onClick={discardDraft} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Discard</button>
              </div>
            </div>
          )}

          {/* Template list */}
          {loadingTemplates ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className={`${card} h-16 animate-pulse bg-slate-800/50`} />
              ))}
            </div>
          ) : templates.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Start from a template</p>
              {templates.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate(`/workout/guided/${t.id}`)}
                  className={`${card} w-full text-left flex items-center justify-between group hover:border-blue-500/40 transition-colors`}
                >
                  <div>
                    <div className="font-semibold text-slate-100 group-hover:text-blue-300 transition-colors">{t.name}</div>
                    {t.description && <div className="text-xs text-slate-500 mt-0.5">{t.description}</div>}
                    <div className="text-xs text-slate-600 mt-1">{t.exercise_count} exercise{t.exercise_count !== 1 ? 's' : ''}</div>
                  </div>
                  <svg className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          ) : (
            <div className={`${card} text-center py-6`}>
              <p className="text-slate-500 text-sm">No templates yet.</p>
              <button type="button" onClick={() => navigate('/templates/new')} className="text-blue-400 hover:text-blue-300 text-sm mt-1 transition-colors">
                Create a template →
              </button>
            </div>
          )}

          {/* Free log option */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-950 px-3 text-slate-500">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMode('free')}
            className="w-full py-3.5 rounded-2xl border border-slate-600 text-slate-300 font-semibold hover:border-slate-500 hover:text-slate-100 transition-colors"
          >
            Log freely (no template)
          </button>
        </div>
      </PageTransition>
    )
  }

  // ── Free log form ───────────────────────────────────────────────────────────
  return (
    <PageTransition>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setMode('choose')} className="text-slate-500 hover:text-slate-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Log Workout</h1>
        </div>

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

                  {/* Attachment + unilateral + timed toggles — shown once an exercise is selected */}
                  {ex.name && (
                    <div className="flex items-center gap-2 flex-wrap mb-4">
                      <input
                        className={`${input} flex-1 min-w-0 text-sm`}
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
                      {/* Time toggle: switches between Reps mode and Duration mode */}
                      <button
                        type="button"
                        onClick={() => updateExercise(ei, { is_timed: !ex.is_timed })}
                        className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                          ex.is_timed
                            ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                            : 'border-slate-600 text-slate-500 hover:border-slate-500'
                        }`}
                      >
                        {ex.is_timed ? 'Timed ✓' : 'Timed'}
                      </button>
                    </div>
                  )}

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
                        <div className="flex flex-col sm:flex-row gap-4 items-start mb-3">
                          {ex.lookup.image_url && (
                            <img
                              src={ex.lookup.image_url}
                              alt={ex.lookup.canonical_name ?? ex.name}
                              className="w-full sm:flex-1 sm:min-w-0 rounded-xl object-cover bg-slate-700"
                              style={{ height: '200px' }}
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          )}
                          <div className="sm:shrink-0 mx-auto sm:mx-0">
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
                    {/* Column headers */}
                    {ex.is_unilateral ? (
                      <div className="grid grid-cols-[24px_28px_1fr_1fr] gap-2 text-xs text-slate-500 px-1">
                        <span>Set</span><span>Side</span><span>Reps</span><span>Weight ({wt})</span>
                      </div>
                    ) : ex.is_timed ? (
                      <div className="grid grid-cols-[24px_1fr_1fr_52px_24px] gap-2 text-xs text-slate-500 px-1">
                        <span>Set</span><span>Duration (sec)</span><span>Weight ({wt})</span><span>RPE</span><span />
                      </div>
                    ) : (
                      <div className="grid grid-cols-[24px_1fr_1fr_52px_24px] gap-2 text-xs text-slate-500 px-1">
                        <span>Set</span><span>Reps</span><span>Weight ({wt})</span><span>RPE</span><span />
                      </div>
                    )}
                    <AnimatePresence>
                      {ex.sets.map((s, si) => (
                        <motion.div
                          key={si}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          {ex.is_unilateral ? (
                            /* Unilateral: two sub-rows per set (L and R) */
                            <div className="border-b border-slate-700/50 last:border-0 py-2">
                              {/* L row */}
                              <div className="grid grid-cols-[24px_28px_1fr_1fr] gap-2 mb-1.5 items-center">
                                <span className="text-slate-500 text-sm text-center">{si + 1}</span>
                                <span className="text-[11px] font-bold text-blue-400">L</span>
                                <input
                                  className={input}
                                  type="number" min="0"
                                  value={s.reps}
                                  onChange={e => updateSet(ei, si, 'reps', e.target.value)}
                                  placeholder="Reps"
                                />
                                <input
                                  className={input}
                                  type="number" step="0.5" min="0"
                                  value={s.weight}
                                  onChange={e => updateSet(ei, si, 'weight', e.target.value)}
                                  placeholder="Weight"
                                />
                              </div>
                              {/* R row */}
                              <div className="grid grid-cols-[24px_28px_1fr_1fr_52px_24px] gap-2 items-center">
                                <span />
                                <span className="text-[11px] font-bold text-amber-400">R</span>
                                <input
                                  className={input}
                                  type="number" min="0"
                                  value={s.reps_right}
                                  onChange={e => updateSet(ei, si, 'reps_right', e.target.value)}
                                  placeholder="Reps"
                                />
                                <input
                                  className={input}
                                  type="number" step="0.5" min="0"
                                  value={s.weight_right}
                                  onChange={e => updateSet(ei, si, 'weight_right', e.target.value)}
                                  placeholder="Weight"
                                />
                                <input
                                  className={input}
                                  type="number" min="1" max="10"
                                  value={s.rpe}
                                  onChange={e => updateSet(ei, si, 'rpe', e.target.value)}
                                  placeholder="RPE"
                                />
                                {ex.sets.length > 1 ? (
                                  <button type="button" onClick={() => removeSet(ei, si)} className="text-slate-600 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                                ) : <span />}
                              </div>
                            </div>
                          ) : ex.is_timed ? (
                            /* Timed exercise: duration instead of reps */
                            <div className="grid grid-cols-[24px_1fr_1fr_52px_24px] gap-2 items-center">
                              <span className="text-slate-500 text-sm text-center">{si + 1}</span>
                              <input
                                className={input}
                                type="number" min="0"
                                value={s.duration}
                                onChange={e => updateSet(ei, si, 'duration', e.target.value)}
                                placeholder="sec"
                              />
                              <input
                                className={input}
                                type="number" step="0.5" min="0"
                                value={s.weight}
                                onChange={e => updateSet(ei, si, 'weight', e.target.value)}
                                placeholder="Weight"
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
                            </div>
                          ) : (
                            /* Standard bilateral row */
                            <div className="grid grid-cols-[24px_1fr_1fr_52px_24px] gap-2 items-center">
                              <span className="text-slate-500 text-sm text-center">{si + 1}</span>
                              <input
                                className={input}
                                type="number" min="0"
                                value={s.reps}
                                onChange={e => updateSet(ei, si, 'reps', e.target.value)}
                                placeholder="Reps"
                              />
                              <input
                                className={input}
                                type="number" step="0.5" min="0"
                                value={s.weight}
                                onChange={e => updateSet(ei, si, 'weight', e.target.value)}
                                placeholder="Weight"
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
                            </div>
                          )}
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
