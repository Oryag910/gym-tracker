import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getWorkout, deleteWorkout, updateWorkout, updateSet,
  addExercise, updateExercise, deleteExercise, addSet, deleteSet,
} from '../api/workouts'
import type { WorkoutDetail, ExerciseResponse, SetResponse } from '../api/workouts'
import { lookupExercise } from '../api/exercises'
import type { ExerciseLookup } from '../api/exercises'
import { listExercises } from '../api/globalExercises'
import type { GlobalExercise } from '../api/globalExercises'
import MuscleMap from '../components/MuscleMap/MuscleMap'
import ExercisePicker from '../components/ExercisePicker'
import { card, input, skeleton, btnPrimary, btnDanger } from '../styles/tokens'
import PageTransition from '../components/PageTransition'
import { useAuth } from '../context/AuthContext'
import { toDisplayWeight, fromInputWeight, weightUnit } from '../utils/units'

// ─── SetRow ──────────────────────────────────────────────────────────────────

function SetRow({ set, workoutId, exerciseId, onUpdated, onDeleted, unitSystem, isUnilateral, isTimed, isEditMode }: {
  set: SetResponse
  workoutId: number
  exerciseId: number
  onUpdated: () => void
  onDeleted: (setId: number) => void
  unitSystem: string
  isUnilateral: boolean
  isTimed: boolean
  isEditMode: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [weight, setWeight] = useState(
    set.weight != null ? toDisplayWeight(set.weight, unitSystem as any).toString() : ''
  )
  const [reps, setReps] = useState(set.reps?.toString() ?? '')
  const [rpe, setRpe] = useState(set.rpe?.toString() ?? '')
  const [weightRight, setWeightRight] = useState(
    set.weight_right != null ? toDisplayWeight(set.weight_right, unitSystem as any).toString() : ''
  )
  const [repsRight, setRepsRight] = useState(set.reps_right?.toString() ?? '')
  const [duration, setDuration] = useState(set.duration?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const wt = weightUnit(unitSystem as any)

  const save = async () => {
    setSaving(true)
    await updateSet(workoutId, exerciseId, set.id, {
      weight: weight ? fromInputWeight(parseFloat(weight), unitSystem as any) : undefined,
      reps: !isTimed && reps ? parseInt(reps) : undefined,
      rpe: rpe ? parseInt(rpe) : undefined,
      weight_right: isUnilateral && weightRight ? fromInputWeight(parseFloat(weightRight), unitSystem as any) : undefined,
      reps_right: isUnilateral && repsRight ? parseInt(repsRight) : undefined,
      duration: isTimed && duration ? parseInt(duration) : undefined,
    })
    setSaving(false)
    setEditing(false)
    onUpdated()
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteSet(workoutId, exerciseId, set.id)
      onDeleted(set.id)
    } finally {
      setDeleting(false)
    }
  }

  // In edit mode: show data + delete button (no inline editing)
  if (isEditMode) {
    return (
      <motion.div layout className="flex items-center gap-2 py-2 border-b border-slate-700/50 last:border-0">
        <span className="text-slate-500 text-sm w-8 text-center shrink-0">{set.set_number}</span>
        <div className="flex-1 text-sm text-slate-300">
          {isTimed ? (
            <>
              {set.duration != null ? `${set.duration}s` : '—'}
              {set.weight != null && <span> · {toDisplayWeight(set.weight, unitSystem as any)} {wt}</span>}
              {set.rpe != null && <span className="text-slate-500"> · RPE {set.rpe}</span>}
            </>
          ) : isUnilateral ? (
            <>
              <span className="text-blue-300 text-xs font-bold">L</span>{' '}
              {set.weight != null ? `${toDisplayWeight(set.weight, unitSystem as any)} ${wt}` : '—'} · {set.reps ?? '—'} reps
              {' / '}
              <span className="text-amber-300 text-xs font-bold">R</span>{' '}
              {set.weight_right != null ? `${toDisplayWeight(set.weight_right, unitSystem as any)} ${wt}` : '—'} · {set.reps_right ?? '—'} reps
            </>
          ) : (
            <>
              {set.reps ?? '—'} reps · {set.weight != null ? `${toDisplayWeight(set.weight, unitSystem as any)} ${wt}` : '—'}
              {set.rpe != null && <span className="text-slate-500"> · RPE {set.rpe}</span>}
            </>
          )}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-slate-600 hover:text-red-400 transition-colors text-lg leading-none px-1 shrink-0"
          title="Delete set"
        >
          {deleting ? '...' : '×'}
        </button>
      </motion.div>
    )
  }

  // Normal mode: unilateral inline edit
  if (isUnilateral) {
    return (
      <motion.div layout className="py-2.5 border-b border-slate-700/50 last:border-0">
        {editing ? (
          <>
            <div className="grid grid-cols-[32px_28px_1fr_1fr] gap-2 mb-2 items-center">
              <span className="text-slate-500 text-sm text-center">{set.set_number}</span>
              <span className="text-[11px] font-bold text-blue-400">L</span>
              <input value={reps} onChange={e => setReps(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:border-blue-400 focus:outline-none w-full"
                placeholder="reps" autoFocus />
              <input value={weight} onChange={e => setWeight(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:border-blue-400 focus:outline-none w-full"
                placeholder={wt} />
            </div>
            <div className="grid grid-cols-[32px_28px_1fr_1fr_52px_auto_auto] gap-2 items-center">
              <span />
              <span className="text-[11px] font-bold text-amber-400">R</span>
              <input value={repsRight} onChange={e => setRepsRight(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:border-blue-400 focus:outline-none w-full"
                placeholder="reps" />
              <input value={weightRight} onChange={e => setWeightRight(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:border-blue-400 focus:outline-none w-full"
                placeholder={wt} />
              <input value={rpe} onChange={e => setRpe(e.target.value)}
                type="number" min="1" max="10"
                className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:border-blue-400 focus:outline-none w-full"
                placeholder="RPE" />
              <button onClick={save} disabled={saving} className={btnPrimary + ' py-1.5 px-3 text-sm'}>
                {saving ? '...' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-slate-300 text-sm px-2">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-sm w-8 text-center shrink-0">{set.set_number}</span>
            <div className="flex-1 min-w-0 text-sm text-slate-200">
              <span className="text-blue-300 text-xs font-bold">L</span>{' '}
              {set.weight != null ? `${toDisplayWeight(set.weight, unitSystem as any)} ${wt}` : '—'} · {set.reps ?? '—'} reps
              {' / '}
              <span className="text-amber-300 text-xs font-bold">R</span>{' '}
              {set.weight_right != null ? `${toDisplayWeight(set.weight_right, unitSystem as any)} ${wt}` : '—'} · {set.reps_right ?? '—'} reps
              {set.rpe != null && <div className="text-slate-500 text-xs mt-0.5">RPE {set.rpe}</div>}
            </div>
            <button onClick={() => setEditing(true)} className="text-slate-600 hover:text-blue-400 transition-colors text-xs shrink-0">
              Edit
            </button>
          </div>
        )}
      </motion.div>
    )
  }

  // Normal mode: standard set (includes timed exercises)
  return (
    <motion.div
      layout
      className={`grid items-center gap-3 py-2.5 border-b border-slate-700/50 last:border-0 ${
        editing ? 'grid-cols-[32px_1fr_1fr_52px_auto_auto]' : 'grid-cols-[32px_1fr_1fr_52px_auto]'
      }`}
    >
      <span className="text-slate-500 text-sm text-center">{set.set_number}</span>
      {editing ? (
        <>
          {isTimed ? (
            <input value={duration} onChange={e => setDuration(e.target.value)}
              type="number" min="0"
              className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:border-blue-400 focus:outline-none w-full"
              placeholder="sec" autoFocus />
          ) : (
            <input value={reps} onChange={e => setReps(e.target.value)}
              className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:border-blue-400 focus:outline-none w-full"
              placeholder="reps" autoFocus />
          )}
          <input value={weight} onChange={e => setWeight(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:border-blue-400 focus:outline-none w-full"
            placeholder={wt} />
          <input value={rpe} onChange={e => setRpe(e.target.value)}
            type="number" min="1" max="10"
            className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:border-blue-400 focus:outline-none w-full"
            placeholder="RPE" />
          <button onClick={save} disabled={saving} className={btnPrimary + ' py-1.5 px-3 text-sm'}>
            {saving ? '...' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-slate-300 text-sm px-2">
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className="text-slate-200 text-sm">
            {isTimed ? (set.duration != null ? `${set.duration}s` : '—') : `${set.reps ?? '—'} reps`}
          </span>
          <span className="text-slate-200 text-sm">
            {set.weight != null ? `${toDisplayWeight(set.weight, unitSystem as any)} ${wt}` : '—'}
          </span>
          <span className="text-slate-500 text-xs">{set.rpe != null ? `RPE ${set.rpe}` : '—'}</span>
          <button onClick={() => setEditing(true)} className="text-slate-600 hover:text-blue-400 transition-colors text-xs">
            Edit
          </button>
        </>
      )}
    </motion.div>
  )
}

// ─── TechniquePanel ───────────────────────────────────────────────────────────

function TechniquePanel({ description, category }: { description: string; category: string | null }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="mt-3 border-t border-slate-700 pt-3">
      <button type="button" onClick={() => setExpanded(v => !v)} className="flex items-center justify-between w-full text-left">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-300">Technique</span>
          {category && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {category}
            </span>
          )}
        </div>
        <svg className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <p className="mt-2 text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">{description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── ExerciseCard ─────────────────────────────────────────────────────────────

function ExerciseCard({ exercise, workoutId, onUpdated, onSetAdded, onSetDeleted, onDeleted, unitSystem, isEditMode, library }: {
  exercise: ExerciseResponse
  workoutId: number
  onUpdated: () => void
  onSetAdded: (exerciseId: number, set: SetResponse) => void
  onSetDeleted: (exerciseId: number, setId: number) => void
  onDeleted: (exerciseId: number) => void
  unitSystem: string
  isEditMode: boolean
  library: GlobalExercise[]
}) {
  const [lookup, setLookup] = useState<ExerciseLookup | null>(null)
  const [showMuscles, setShowMuscles] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)

  // Edit-mode local state for exercise meta
  const [editName, setEditName] = useState(exercise.name)
  const [editAttachment, setEditAttachment] = useState(exercise.attachment ?? '')
  const [isUnilateral, setIsUnilateral] = useState(exercise.is_unilateral)
  const [isTimed, setIsTimed] = useState(exercise.is_timed)
  const [addingSet, setAddingSet] = useState(false)
  const [deletingEx, setDeletingEx] = useState(false)

  const saveMeta = async (overrides: { name?: string; attachment?: string | null; is_unilateral?: boolean; is_timed?: boolean } = {}) => {
    await updateExercise(workoutId, exercise.id, {
      name: overrides.name ?? editName,
      attachment: overrides.attachment !== undefined ? overrides.attachment : (editAttachment || null),
      is_unilateral: overrides.is_unilateral ?? isUnilateral,
      is_timed: overrides.is_timed ?? isTimed,
    })
    onUpdated()
  }

  const handleAddSet = async () => {
    setAddingSet(true)
    try {
      // Copy last set's values as default
      const last = exercise.sets[exercise.sets.length - 1]
      const res = await addSet(workoutId, exercise.id, {
        weight: last?.weight ?? null,
        reps: last?.reps ?? null,
        rpe: last?.rpe ?? null,
        weight_right: last?.weight_right ?? null,
        reps_right: last?.reps_right ?? null,
        duration: last?.duration ?? null,
      })
      onSetAdded(exercise.id, res.data)
    } finally {
      setAddingSet(false)
    }
  }

  const handleDeleteExercise = async () => {
    setDeletingEx(true)
    try {
      await deleteExercise(workoutId, exercise.id)
      onDeleted(exercise.id)
    } finally {
      setDeletingEx(false)
    }
  }

  const handleMuscleToggle = async () => {
    if (showMuscles) { setShowMuscles(false); return }
    if (lookup) { setShowMuscles(true); return }
    setLookupLoading(true)
    try {
      const data = await lookupExercise(exercise.name)
      setLookup(data)
      setShowMuscles(true)
    } finally {
      setLookupLoading(false)
    }
  }

  return (
    <div className={card}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {!isEditMode && lookup?.image_url && (
            <img src={lookup.image_url} alt={exercise.name}
              className="w-14 h-14 object-cover rounded-lg bg-slate-700 shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          )}
          <div className="flex-1 min-w-0">
            {isEditMode ? (
              <ExercisePicker
                value={editName}
                library={library}
                className="mb-1"
                onChange={(name) => {
                  setEditName(name)
                  // Save after a short delay so rapid typing doesn't spam the API.
                  // We use onBlur-like saving: the ExercisePicker calls onChange on every
                  // keystroke, but we only save when the user picks from the dropdown
                  // (which calls onChange with the full libExercise object).
                }}
              />
            ) : (
              <h3 className="font-semibold text-slate-100 capitalize">{exercise.name}</h3>
            )}
            {isEditMode ? (
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <button
                  type="button"
                  onClick={() => {
                    const next = !isUnilateral
                    setIsUnilateral(next)
                    saveMeta({ is_unilateral: next })
                  }}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    isUnilateral
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}
                >
                  {isUnilateral ? 'Unilateral ✓' : 'Unilateral'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isTimed
                    setIsTimed(next)
                    saveMeta({ is_timed: next })
                  }}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    isTimed
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}
                >
                  {isTimed ? 'Timed ✓' : 'Timed'}
                </button>
                <input
                  className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-100 focus:border-blue-400 focus:outline-none w-32"
                  value={editAttachment}
                  onChange={e => setEditAttachment(e.target.value)}
                  onBlur={() => saveMeta()}
                  placeholder="Attachment..."
                />
                <button
                  type="button"
                  onClick={() => saveMeta({ name: editName })}
                  className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-300 transition-colors"
                >
                  Save name
                </button>
              </div>
            ) : (
              <div className="text-slate-500 text-xs mt-0.5">
                {exercise.sets.length} sets
                {exercise.attachment && <span> · {exercise.attachment}</span>}
                {exercise.is_unilateral && <span> · Unilateral</span>}
              </div>
            )}
          </div>
        </div>

        {isEditMode ? (
          <button onClick={handleDeleteExercise} disabled={deletingEx}
            className="text-slate-600 hover:text-red-400 transition-colors text-sm shrink-0 px-1"
            title="Delete exercise">
            {deletingEx ? '...' : '🗑'}
          </button>
        ) : (
          <button onClick={handleMuscleToggle} disabled={lookupLoading}
            className="text-xs text-slate-500 hover:text-blue-400 transition-colors border border-slate-700 hover:border-blue-400/40 rounded-lg px-2.5 py-1 shrink-0">
            {lookupLoading ? '...' : showMuscles ? 'Hide muscles' : 'Muscles'}
          </button>
        )}
      </div>

      {/* Muscle map */}
      <AnimatePresence>
        {showMuscles && lookup && !isEditMode && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
            <MuscleMap primary={lookup.muscles_primary} secondary={lookup.muscles_secondary} primaryIds={lookup.muscles_primary_ids} secondaryIds={lookup.muscles_secondary_ids} />
            {lookup.description && <TechniquePanel description={lookup.description} category={lookup.category} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Column headers (non-edit mode only) */}
      {!isEditMode && (
        exercise.is_unilateral ? (
          <div className="text-xs text-slate-500 mb-1">Set · L and R reps / weight · RPE</div>
        ) : (
          <div className="grid grid-cols-[32px_1fr_1fr_52px_auto] gap-3 text-xs text-slate-500 mb-1">
            <span className="text-center">Set</span>
            <span>{exercise.is_timed ? 'Duration' : 'Reps'}</span>
            <span>Weight ({weightUnit(unitSystem as any)})</span>
            <span>RPE</span>
            <span />
          </div>
        )
      )}

      {/* Sets */}
      {exercise.sets.map(s => (
        <SetRow
          key={s.id}
          set={s}
          workoutId={workoutId}
          exerciseId={exercise.id}
          onUpdated={onUpdated}
          onDeleted={setId => onSetDeleted(exercise.id, setId)}
          unitSystem={unitSystem}
          isUnilateral={exercise.is_unilateral}
          isTimed={exercise.is_timed}
          isEditMode={isEditMode}
        />
      ))}

      {/* Add set button (edit mode) */}
      {isEditMode && (
        <button onClick={handleAddSet} disabled={addingSet}
          className="mt-2 w-full text-xs text-slate-500 hover:text-blue-400 border border-dashed border-slate-700 hover:border-blue-400/40 rounded-xl py-2 transition-colors disabled:opacity-50">
          {addingSet ? 'Adding...' : '＋ Add Set'}
        </button>
      )}
    </div>
  )
}

// ─── WorkoutDetailPage ────────────────────────────────────────────────────────

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { units } = useAuth()
  const unitSystem = units.weight
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Library for ExercisePicker (loaded once, shared across all ExerciseCards)
  const [library, setLibrary] = useState<GlobalExercise[]>([])

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDate, setEditDate] = useState('')
  const [savingMeta, setSavingMeta] = useState(false)

  // Add exercise state — uses ExercisePicker, so we store the chosen name
  const [newExName, setNewExName] = useState('')
  const [addingEx, setAddingEx] = useState(false)

  const load = () => getWorkout(Number(id)).then(r => setWorkout(r.data))
  useEffect(() => { load() }, [id])
  useEffect(() => { listExercises().then(r => setLibrary(r.data)) }, [])

  const startEditing = () => {
    if (!workout) return
    setEditName(workout.name)
    setEditDate(workout.date)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setNewExName('')
  }

  const saveAndExit = async () => {
    if (!workout) return
    setSavingMeta(true)
    if (editName !== workout.name || editDate !== workout.date) {
      await updateWorkout(workout.id, { name: editName, date: editDate })
    }
    setSavingMeta(false)
    setIsEditing(false)
    setNewExName('')
    load()
  }

  const handleAddExercise = async () => {
    if (!workout || !newExName.trim()) return
    setAddingEx(true)
    try {
      const res = await addExercise(workout.id, { name: newExName.trim() })
      setWorkout(prev => prev ? { ...prev, exercises: [...prev.exercises, res.data] } : prev)
      setNewExName('')
    } finally {
      setAddingEx(false)
    }
  }

  // Optimistic local state updaters (avoid full refetch on every small change)
  const handleSetAdded = (exerciseId: number, set: SetResponse) => {
    setWorkout(prev => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: prev.exercises.map(ex =>
          ex.id === exerciseId ? { ...ex, sets: [...ex.sets, set] } : ex
        ),
      }
    })
  }

  const handleSetDeleted = (exerciseId: number, setId: number) => {
    setWorkout(prev => {
      if (!prev) return prev
      return {
        ...prev,
        exercises: prev.exercises.map(ex =>
          ex.id === exerciseId ? { ...ex, sets: ex.sets.filter(s => s.id !== setId) } : ex
        ),
      }
    })
  }

  const handleExerciseDeleted = (exerciseId: number) => {
    setWorkout(prev => {
      if (!prev) return prev
      return { ...prev, exercises: prev.exercises.filter(ex => ex.id !== exerciseId) }
    })
  }

  const handleDelete = async () => {
    setDeleting(true)
    await deleteWorkout(Number(id))
    navigate('/workouts')
  }

  if (!workout) return (
    <div className="space-y-4">
      <div className={`${skeleton} h-8 w-48`} />
      <div className={`${skeleton} h-40`} />
      <div className={`${skeleton} h-40`} />
    </div>
  )

  return (
    <PageTransition>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div>
          <button onClick={() => navigate('/workouts')} className="text-slate-500 hover:text-slate-300 text-sm mb-3 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {isEditing ? (
            <div className="space-y-3">
              <input
                className={`${input} text-xl font-bold`}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Workout name"
              />
              <input
                className={input}
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={saveAndExit} disabled={savingMeta} className={`${btnPrimary} px-4 py-2 text-sm`}>
                  {savingMeta ? 'Saving...' : 'Done'}
                </button>
                <button onClick={cancelEditing} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-100 tracking-tight">{workout.name}</h1>
                <div className="text-slate-500 text-sm mt-1">{workout.date}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={startEditing} className="text-xs px-3 py-2 rounded-xl border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors">
                  Edit
                </button>
                <button onClick={() => setShowDeleteModal(true)} className={btnDanger}>
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Exercises */}
        {workout.exercises.map(ex => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            workoutId={workout.id}
            onUpdated={load}
            onSetAdded={handleSetAdded}
            onSetDeleted={handleSetDeleted}
            onDeleted={handleExerciseDeleted}
            unitSystem={unitSystem}
            isEditMode={isEditing}
            library={library}
          />
        ))}

        {/* Add exercise (edit mode) — uses library dropdown so users can't type arbitrary names */}
        {isEditing && (
          <div className={`${card} flex gap-2 items-center`}>
            <div className="flex-1 relative">
              <ExercisePicker
                value={newExName}
                library={library}
                onChange={(name) => setNewExName(name)}
              />
            </div>
            <button onClick={handleAddExercise} disabled={addingEx || !newExName.trim()} className={`${btnPrimary} px-4 shrink-0`}>
              {addingEx ? '...' : 'Add'}
            </button>
          </div>
        )}

        {/* Delete modal */}
        <AnimatePresence>
          {showDeleteModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 px-4"
              onClick={() => setShowDeleteModal(false)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
                <h2 className="text-lg font-bold text-slate-100 mb-2">Delete Workout?</h2>
                <p className="text-slate-400 text-sm mb-6">
                  This will permanently delete <strong className="text-slate-200">{workout.name}</strong> and all its exercises and sets.
                </p>
                <div className="flex gap-3">
                  <button onClick={handleDelete} disabled={deleting}
                    className="flex-1 bg-red-500 text-white font-bold rounded-xl py-2.5 hover:bg-red-400 active:scale-95 transition-all disabled:opacity-50">
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                  <button onClick={() => setShowDeleteModal(false)}
                    className="flex-1 bg-slate-700 text-slate-200 font-medium rounded-xl py-2.5 hover:bg-slate-600 transition-all">
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
