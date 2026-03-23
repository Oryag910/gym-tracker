import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getWorkout, deleteWorkout, updateSet } from '../api/workouts'
import type { WorkoutDetail, ExerciseResponse, SetResponse } from '../api/workouts'
import { lookupExercise } from '../api/exercises'
import type { ExerciseLookup } from '../api/exercises'
import MuscleMap from '../components/MuscleMap/MuscleMap'
import { card, skeleton, btnPrimary, btnDanger } from '../styles/tokens'
import PageTransition from '../components/PageTransition'

function SetRow({ set, workoutId, exerciseId, onUpdated }: {
  set: SetResponse; workoutId: number; exerciseId: number; onUpdated: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [weight, setWeight] = useState(set.weight?.toString() ?? '')
  const [reps, setReps] = useState(set.reps?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await updateSet(workoutId, exerciseId, set.id, {
      weight: weight ? parseFloat(weight) : undefined,
      reps: reps ? parseInt(reps) : undefined,
    })
    setSaving(false)
    setEditing(false)
    onUpdated()
  }

  return (
    <motion.div
      layout
      className={`grid items-center gap-3 py-2.5 border-b border-slate-700/50 last:border-0 ${
        editing ? 'grid-cols-[32px_1fr_1fr_auto_auto]' : 'grid-cols-[32px_1fr_1fr_auto]'
      }`}
    >
      <span className="text-slate-500 text-sm text-center">{set.set_number}</span>

      {editing ? (
        <>
          <input
            value={weight}
            onChange={e => setWeight(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:border-blue-400 focus:outline-none w-full"
            placeholder="lbs"
            autoFocus
          />
          <input
            value={reps}
            onChange={e => setReps(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:border-blue-400 focus:outline-none w-full"
            placeholder="reps"
          />
          <button onClick={save} disabled={saving} className={btnPrimary + ' py-1.5 px-3 text-sm'}>
            {saving ? '...' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-slate-300 text-sm px-2">
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className="text-slate-200 text-sm">{set.weight != null ? `${set.weight} lbs` : 'BW'}</span>
          <span className="text-slate-200 text-sm">{set.reps ?? '—'} reps</span>
          <button
            onClick={() => setEditing(true)}
            className="text-slate-600 hover:text-blue-400 transition-colors text-xs"
          >
            Edit
          </button>
        </>
      )}
    </motion.div>
  )
}

function TechniquePanel({ description, category }: { description: string; category: string | null }) {
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

function ExerciseCard({ exercise, workoutId, onUpdated }: {
  exercise: ExerciseResponse; workoutId: number; onUpdated: () => void
}) {
  const [lookup, setLookup] = useState<ExerciseLookup | null>(null)
  const [showMuscles, setShowMuscles] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)

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
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {lookup?.image_url && (
            <img
              src={lookup.image_url}
              alt={exercise.name}
              className="w-14 h-14 object-cover rounded-lg bg-slate-700 shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <div>
            <h3 className="font-semibold text-slate-100 capitalize">{exercise.name}</h3>
            <div className="text-slate-500 text-xs mt-0.5">{exercise.sets.length} sets</div>
          </div>
        </div>
        <button
          onClick={handleMuscleToggle}
          disabled={lookupLoading}
          className="text-xs text-slate-500 hover:text-blue-400 transition-colors border border-slate-700 hover:border-blue-400/40 rounded-lg px-2.5 py-1 shrink-0"
        >
          {lookupLoading ? '...' : showMuscles ? 'Hide muscles' : 'Muscles'}
        </button>
      </div>

      {/* Muscle map + technique */}
      <AnimatePresence>
        {showMuscles && lookup && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <MuscleMap
              primary={lookup.muscles_primary}
              secondary={lookup.muscles_secondary}
              primaryIds={lookup.muscles_primary_ids}
              secondaryIds={lookup.muscles_secondary_ids}
            />
            {lookup.description && (
              <TechniquePanel description={lookup.description} category={lookup.category} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Column headers */}
      <div className="grid grid-cols-[32px_1fr_1fr_auto] gap-3 text-xs text-slate-500 mb-1 px-0">
        <span className="text-center">Set</span>
        <span>Weight</span>
        <span>Reps</span>
        <span />
      </div>

      {exercise.sets.map(s => (
        <SetRow key={s.id} set={s} workoutId={workoutId} exerciseId={exercise.id} onUpdated={onUpdated} />
      ))}
    </div>
  )
}

export default function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = () => getWorkout(Number(id)).then(r => setWorkout(r.data))
  useEffect(() => { load() }, [id])

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
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-100 tracking-tight">{workout.name}</h1>
              <div className="text-slate-500 text-sm mt-1">{workout.date}</div>
            </div>
            <button onClick={() => setShowDeleteModal(true)} className={btnDanger}>
              Delete
            </button>
          </div>
        </div>

        {/* Exercises */}
        {workout.exercises.map(ex => (
          <ExerciseCard key={ex.id} exercise={ex} workoutId={workout.id} onUpdated={load} />
        ))}

        {/* Delete modal */}
        <AnimatePresence>
          {showDeleteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 px-4"
              onClick={() => setShowDeleteModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm"
              >
                <h2 className="text-lg font-bold text-slate-100 mb-2">Delete Workout?</h2>
                <p className="text-slate-400 text-sm mb-6">
                  This will permanently delete <strong className="text-slate-200">{workout.name}</strong> and all its exercises and sets.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 bg-red-500 text-white font-bold rounded-xl py-2.5 hover:bg-red-400 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 bg-slate-700 text-slate-200 font-medium rounded-xl py-2.5 hover:bg-slate-600 transition-all"
                  >
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
