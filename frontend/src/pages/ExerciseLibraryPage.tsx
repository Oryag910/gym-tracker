import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  listCustomExercises,
  createCustomExercise,
  updateCustomExercise,
  deleteCustomExercise,
  type CustomExercise,
  type CustomExercisePayload,
} from '../api/customExercises'
import MuscleMap from '../components/MuscleMap/MuscleMap'
import { card, input, btnPrimary, btnDanger, btnGhost } from '../styles/tokens'
import PageTransition from '../components/PageTransition'

// Muscle list matching wger IDs used by MuscleMap
const MUSCLES = [
  { id: 4, name: 'Chest' },
  { id: 2, name: 'Ant. Deltoid' },
  { id: 1, name: 'Biceps' },
  { id: 13, name: 'Abs' },
  { id: 9, name: 'Quads' },
  { id: 3, name: 'Serratus' },
  { id: 14, name: 'Traps' },
  { id: 12, name: 'Rear Deltoid' },
  { id: 10, name: 'Lats' },
  { id: 5, name: 'Triceps' },
  { id: 6, name: 'Hamstrings' },
  { id: 8, name: 'Glutes' },
  { id: 7, name: 'Calves' },
]

const CATEGORIES = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Other']

type MuscleState = 'none' | 'primary' | 'secondary'

interface FormState {
  name: string
  category: string
  description: string
  muscles: Record<number, MuscleState>
}

const emptyForm = (): FormState => ({
  name: '',
  category: '',
  description: '',
  muscles: {},
})

function formToPayload(form: FormState): CustomExercisePayload {
  const primary: number[] = []
  const secondary: number[] = []
  for (const [id, state] of Object.entries(form.muscles)) {
    if (state === 'primary') primary.push(Number(id))
    else if (state === 'secondary') secondary.push(Number(id))
  }
  return {
    name: form.name.trim(),
    category: form.category || undefined,
    muscles_primary_ids: primary,
    muscles_secondary_ids: secondary,
    description: form.description.trim() || undefined,
  }
}

function exerciseToForm(ex: CustomExercise): FormState {
  const muscles: Record<number, MuscleState> = {}
  for (const id of ex.muscles_primary_ids) muscles[id] = 'primary'
  for (const id of ex.muscles_secondary_ids) muscles[id] = 'secondary'
  return {
    name: ex.name,
    category: ex.category ?? '',
    description: ex.description ?? '',
    muscles,
  }
}

function MuscleSelector({
  muscles,
  onChange,
}: {
  muscles: Record<number, MuscleState>
  onChange: (id: number, next: MuscleState) => void
}) {
  const cycle = (id: number) => {
    const cur = muscles[id] ?? 'none'
    const next: MuscleState = cur === 'none' ? 'primary' : cur === 'primary' ? 'secondary' : 'none'
    onChange(id, next)
  }

  return (
    <div>
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
        Muscles{' '}
        <span className="normal-case text-slate-600 font-normal">
          (click: unselected → primary → secondary)
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MUSCLES.map(m => {
          const state = muscles[m.id] ?? 'none'
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => cycle(m.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                state === 'primary'
                  ? 'bg-red-500/20 border-red-500/50 text-red-300'
                  : state === 'secondary'
                  ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
            >
              {m.name}
            </button>
          )
        })}
      </div>
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="text-[10px] text-slate-500">Primary</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
          <span className="text-[10px] text-slate-500">Secondary</span>
        </div>
      </div>
    </div>
  )
}

function ExerciseForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: FormState
  onSave: (form: FormState) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<FormState>(initial)

  const primaryIds = Object.entries(form.muscles)
    .filter(([, s]) => s === 'primary')
    .map(([id]) => Number(id))
  const secondaryIds = Object.entries(form.muscles)
    .filter(([, s]) => s === 'secondary')
    .map(([id]) => Number(id))

  return (
    <div className={`${card} space-y-5`}>
      <div>
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
          Exercise Name
        </label>
        <input
          className={input}
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Bench Press"
          required
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
          Category
        </label>
        <select
          className={input}
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
        >
          <option value="">— Select category —</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <MuscleSelector
        muscles={form.muscles}
        onChange={(id, next) =>
          setForm(f => ({ ...f, muscles: { ...f.muscles, [id]: next } }))
        }
      />

      {(primaryIds.length > 0 || secondaryIds.length > 0) && (
        <MuscleMap
          primary={[]}
          secondary={[]}
          primaryIds={primaryIds}
          secondaryIds={secondaryIds}
        />
      )}

      <div>
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
          Technique Notes
        </label>
        <textarea
          className={`${input} min-h-[120px] resize-y`}
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Write your technique cues, setup tips, or coaching notes here..."
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim()}
          className={`${btnPrimary} flex-1 py-2.5`}
        >
          {saving ? 'Saving...' : 'Save Exercise'}
        </button>
        <button type="button" onClick={onCancel} className={`${btnGhost} px-4`}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function ExerciseCard({
  exercise,
  onEdit,
  onDelete,
}: {
  exercise: CustomExercise
  onEdit: () => void
  onDelete: () => void
}) {
  const [showMuscles, setShowMuscles] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-100">{exercise.name}</h3>
            {exercise.category && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {exercise.category}
              </span>
            )}
          </div>
          {exercise.muscles_primary.length > 0 && (
            <div className="text-xs text-slate-500 mt-1">
              Primary: {exercise.muscles_primary.join(', ')}
              {exercise.muscles_secondary.length > 0 && (
                <> · Secondary: {exercise.muscles_secondary.join(', ')}</>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowMuscles(v => !v)}
            className="text-xs text-slate-500 hover:text-blue-400 transition-colors border border-slate-700 hover:border-blue-400/40 rounded-lg px-2.5 py-1"
          >
            {showMuscles ? 'Hide' : 'Muscles'}
          </button>
          <button onClick={onEdit} className="text-xs text-slate-500 hover:text-blue-400 transition-colors px-2 py-1">
            Edit
          </button>
          <button onClick={() => setConfirmDelete(true)} className="text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1">
            Delete
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showMuscles && (exercise.muscles_primary_ids.length > 0 || exercise.muscles_secondary_ids.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-3"
          >
            <MuscleMap
              primary={exercise.muscles_primary}
              secondary={exercise.muscles_secondary}
              primaryIds={exercise.muscles_primary_ids}
              secondaryIds={exercise.muscles_secondary_ids}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {exercise.description && (
        <p className="mt-3 text-xs text-slate-400 whitespace-pre-wrap border-t border-slate-700/50 pt-3">
          {exercise.description}
        </p>
      )}

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 px-4"
            onClick={() => setConfirmDelete(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm"
            >
              <h2 className="text-lg font-bold text-slate-100 mb-2">Delete Exercise?</h2>
              <p className="text-slate-400 text-sm mb-6">
                This will permanently delete <strong className="text-slate-200">{exercise.name}</strong> from your library.
              </p>
              <div className="flex gap-3">
                <button onClick={onDelete} className={`${btnDanger} flex-1`}>Delete</button>
                <button onClick={() => setConfirmDelete(false)} className="flex-1 bg-slate-700 text-slate-200 font-medium rounded-xl py-2.5 hover:bg-slate-600 transition-all">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ExerciseLibraryPage() {
  const [exercises, setExercises] = useState<CustomExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editTarget, setEditTarget] = useState<CustomExercise | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const res = await listCustomExercises()
      setExercises(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (form: FormState) => {
    setSaving(true)
    setError('')
    try {
      const payload = formToPayload(form)
      if (mode === 'create') {
        await createCustomExercise(payload)
      } else if (editTarget) {
        await updateCustomExercise(editTarget.id, payload)
      }
      await load()
      setMode('list')
      setEditTarget(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save exercise')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteCustomExercise(id)
      setExercises(prev => prev.filter(ex => ex.id !== id))
    } catch {
      // silently ignore
    }
  }

  const startEdit = (ex: CustomExercise) => {
    setEditTarget(ex)
    setMode('edit')
    setError('')
  }

  const cancel = () => {
    setMode('list')
    setEditTarget(null)
    setError('')
  }

  return (
    <PageTransition>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Exercise Library</h1>
          {mode === 'list' && (
            <button
              onClick={() => { setMode('create'); setError('') }}
              className={`${btnPrimary} px-4 py-2 text-sm`}
            >
              + Add Exercise
            </button>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {(mode === 'create' || mode === 'edit') && (
          <ExerciseForm
            initial={mode === 'edit' && editTarget ? exerciseToForm(editTarget) : emptyForm()}
            onSave={handleSave}
            onCancel={cancel}
            saving={saving}
          />
        )}

        {mode === 'list' && (
          <>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-slate-800/50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : exercises.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <div className="text-4xl mb-3">📚</div>
                <p className="font-medium text-slate-400 mb-1">No exercises yet</p>
                <p className="text-sm">Build your personal library with custom muscle maps and technique notes.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {exercises.map(ex => (
                  <ExerciseCard
                    key={ex.id}
                    exercise={ex}
                    onEdit={() => startEdit(ex)}
                    onDelete={() => handleDelete(ex.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  )
}
