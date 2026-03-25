import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  listExercises,
  createExercise,
  updateExercise,
  deleteExercise,
  searchExerciseDB,
  importFromWger,
  type GlobalExercise,
  type GlobalExercisePayload,
  type ExerciseDBResult,
} from '../api/globalExercises'
import { useAuth } from '../context/AuthContext'
import MuscleMap from '../components/MuscleMap/MuscleMap'
import { card, input, btnPrimary, btnDanger, btnGhost } from '../styles/tokens'
import PageTransition from '../components/PageTransition'

const MUSCLES = [
  { id: 4, name: 'Chest' },
  { id: 2, name: 'Ant. Deltoid' },
  { id: 1, name: 'Biceps' },
  { id: 13, name: 'Brachialis' },
  { id: 6, name: 'Abs' },
  { id: 14, name: 'Obliques' },
  { id: 10, name: 'Quads' },
  { id: 3, name: 'Serratus' },
  { id: 9, name: 'Traps' },
  { id: 12, name: 'Lats' },
  { id: 5, name: 'Triceps' },
  { id: 11, name: 'Hamstrings' },
  { id: 8, name: 'Glutes' },
  { id: 7, name: 'Calves' },
  { id: 15, name: 'Soleus' },
]

const CATEGORIES = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Other']

type MuscleState = 'none' | 'primary' | 'secondary'

interface FormState {
  name: string
  category: string
  image_url: string
  description: string
  muscles: Record<number, MuscleState>
}

const emptyForm = (): FormState => ({
  name: '', category: '', image_url: '', description: '', muscles: {},
})

function exerciseToForm(ex: GlobalExercise): FormState {
  const muscles: Record<number, MuscleState> = {}
  for (const id of ex.muscles_primary_ids) muscles[id] = 'primary'
  for (const id of ex.muscles_secondary_ids) muscles[id] = 'secondary'
  return {
    name: ex.name,
    category: ex.category ?? '',
    image_url: ex.image_url ?? '',
    description: ex.description ?? '',
    muscles,
  }
}

function formToPayload(form: FormState): GlobalExercisePayload {
  const primary: number[] = []
  const secondary: number[] = []
  for (const [id, state] of Object.entries(form.muscles)) {
    if (state === 'primary') primary.push(Number(id))
    else if (state === 'secondary') secondary.push(Number(id))
  }
  return {
    name: form.name.trim(),
    category: form.category || undefined,
    image_url: form.image_url.trim() || undefined,
    muscles_primary_ids: primary,
    muscles_secondary_ids: secondary,
    description: form.description.trim() || undefined,
  }
}

function MuscleSelector({ muscles, onChange }: {
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
        Muscles <span className="normal-case text-slate-600 font-normal">(tap: none → primary → secondary)</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MUSCLES.map(m => {
          const state = muscles[m.id] ?? 'none'
          return (
            <button key={m.id} type="button" onClick={() => cycle(m.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                state === 'primary' ? 'bg-red-500/20 border-red-500/50 text-red-300'
                : state === 'secondary' ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
            >
              {m.name}
            </button>
          )
        })}
      </div>
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400" /><span className="text-[10px] text-slate-500">Primary</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-400" /><span className="text-[10px] text-slate-500">Secondary</span></div>
      </div>
    </div>
  )
}

function AdminForm({ initial, onSave, onCancel, saving }: {
  initial: FormState
  onSave: (form: FormState) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [suggestions, setSuggestions] = useState<ExerciseDBResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const primaryIds = Object.entries(form.muscles).filter(([, s]) => s === 'primary').map(([id]) => Number(id))
  const secondaryIds = Object.entries(form.muscles).filter(([, s]) => s === 'secondary').map(([id]) => Number(id))

  const handleNameChange = (value: string) => {
    setForm(f => ({ ...f, name: value }))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 3) { setSuggestions([]); setShowSuggestions(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchExerciseDB(value.trim())
        setSuggestions(res.data)
        setShowSuggestions(res.data.length > 0)
      } catch { setSuggestions([]); setShowSuggestions(false) }
    }, 600)
  }

  const pickSuggestion = (s: ExerciseDBResult) => {
    setForm(f => ({ ...f, name: s.name, image_url: s.gif_url }))
    setSuggestions([])
    setShowSuggestions(false)
  }

  return (
    <div className={`${card} space-y-5`}>
      <div className="relative">
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Exercise Name</label>
        <input className={input} value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Barbell Bench Press" autoFocus onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} onFocus={() => suggestions.length > 0 && setShowSuggestions(true)} />
        {showSuggestions && (
          <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            {suggestions.map((s, i) => (
              <button key={i} type="button" onMouseDown={() => pickSuggestion(s)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/60 transition-colors text-left border-b border-slate-700/50 last:border-0"
              >
                <img src={s.gif_url} alt={s.name} className="w-10 h-10 object-cover rounded-lg bg-slate-700 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-slate-200">{s.name}</div>
                  <div className="text-[11px] text-slate-500">{s.body_part} · {s.target}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Category</label>
        <select className={input} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          <option value="">— Select category —</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Image URL <span className="normal-case font-normal text-slate-600">(optional)</span></label>
        <input className={input} value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
      </div>
      <MuscleSelector muscles={form.muscles} onChange={(id, next) => setForm(f => ({ ...f, muscles: { ...f.muscles, [id]: next } }))} />
      {(primaryIds.length > 0 || secondaryIds.length > 0) && (
        <MuscleMap primary={[]} secondary={[]} primaryIds={primaryIds} secondaryIds={secondaryIds} />
      )}
      <div>
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Technique Notes</label>
        <textarea
          className={`${input} min-h-[140px] resize-y`}
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Describe setup, form cues, common mistakes..."
        />
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={() => onSave(form)} disabled={saving || !form.name.trim()} className={`${btnPrimary} flex-1 py-2.5`}>
          {saving ? 'Saving...' : 'Save Exercise'}
        </button>
        <button type="button" onClick={onCancel} className={`${btnGhost} px-4`}>Cancel</button>
      </div>
    </div>
  )
}

function ExerciseCard({ exercise, isAdmin, onEdit, onDelete }: {
  exercise: GlobalExercise
  isAdmin: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const hasMuscles = exercise.muscles_primary_ids.length > 0 || exercise.muscles_secondary_ids.length > 0

  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {exercise.image_url && (
            <img
              src={exercise.image_url}
              alt={exercise.name}
              className="w-14 h-14 object-cover rounded-lg bg-slate-700 shrink-0"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
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
              <div className="text-xs text-slate-500 mt-0.5">
                Primary: {exercise.muscles_primary.join(', ')}
                {exercise.muscles_secondary.length > 0 && <> · Secondary: {exercise.muscles_secondary.join(', ')}</>}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(hasMuscles || exercise.description) && (
            <button onClick={() => setExpanded(v => !v)} className="text-xs text-slate-500 hover:text-blue-400 transition-colors border border-slate-700 hover:border-blue-400/40 rounded-lg px-2.5 py-1">
              {expanded ? 'Hide' : 'Details'}
            </button>
          )}
          {isAdmin && (
            <>
              <button onClick={onEdit} className="text-xs text-slate-500 hover:text-blue-400 transition-colors px-2 py-1">Edit</button>
              <button onClick={() => setConfirmDelete(true)} className="text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1">Delete</button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-3 border-t border-slate-700/50 pt-3 space-y-3">
            {hasMuscles && (
              <MuscleMap primary={exercise.muscles_primary} secondary={exercise.muscles_secondary} primaryIds={exercise.muscles_primary_ids} secondaryIds={exercise.muscles_secondary_ids} />
            )}
            {exercise.description && (
              <p className="text-xs text-slate-400 whitespace-pre-wrap">{exercise.description}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 px-4"
            onClick={() => setConfirmDelete(false)}
          >
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm"
            >
              <h2 className="text-lg font-bold text-slate-100 mb-2">Delete Exercise?</h2>
              <p className="text-slate-400 text-sm mb-6">
                This will permanently remove <strong className="text-slate-200">{exercise.name}</strong> from the library for all users.
              </p>
              <div className="flex gap-3">
                <button onClick={onDelete} className={`${btnDanger} flex-1`}>Delete</button>
                <button onClick={() => setConfirmDelete(false)} className="flex-1 bg-slate-700 text-slate-200 font-medium rounded-xl py-2.5 hover:bg-slate-600 transition-all">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ExerciseLibraryPage() {
  const { isAdmin } = useAuth()
  const [exercises, setExercises] = useState<GlobalExercise[]>([])
  const [filtered, setFiltered] = useState<GlobalExercise[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editTarget, setEditTarget] = useState<GlobalExercise | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [wgerImporting, setWgerImporting] = useState(false)
  const [wgerResult, setWgerResult] = useState<{ imported: number; skipped: number } | null>(null)

  const load = async () => {
    try {
      const res = await listExercises()
      setExercises(res.data)
      setFiltered(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const q = search.toLowerCase().trim()
    setFiltered(q ? exercises.filter(ex => ex.name.toLowerCase().includes(q) || ex.category?.toLowerCase().includes(q)) : exercises)
  }, [search, exercises])

  const handleSave = async (form: FormState) => {
    setSaving(true)
    setError('')
    try {
      const payload = formToPayload(form)
      if (mode === 'create') await createExercise(payload)
      else if (editTarget) await updateExercise(editTarget.id, payload)
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
      await deleteExercise(id)
      setExercises(prev => prev.filter(ex => ex.id !== id))
    } catch { /* ignore */ }
  }

  const startEdit = (ex: GlobalExercise) => { setEditTarget(ex); setMode('edit'); setError('') }
  const cancel = () => { setMode('list'); setEditTarget(null); setError('') }

  const handleWgerImport = async (offset = 0) => {
    setWgerImporting(true)
    setWgerResult(null)
    try {
      const res = await importFromWger(50, offset)
      setWgerResult(res.data)
      await load()
    } catch {
      setError('Import from wger failed')
    } finally {
      setWgerImporting(false)
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Exercise Library</h1>
          {isAdmin && mode === 'list' && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => handleWgerImport(0)} disabled={wgerImporting}
                className="text-xs px-3 py-2 rounded-lg border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors disabled:opacity-50">
                {wgerImporting ? 'Importing...' : 'Import from wger'}
              </button>
              <button onClick={() => { setMode('create'); setError('') }} className={`${btnPrimary} px-4 py-2 text-sm`}>
                + Add Exercise
              </button>
            </div>
          )}
        </div>
        {wgerResult && (
          <p className="text-emerald-400 text-sm">
            Imported {wgerResult.imported} exercises, skipped {wgerResult.skipped} duplicates.
          </p>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {(mode === 'create' || mode === 'edit') && isAdmin && (
          <AdminForm
            initial={mode === 'edit' && editTarget ? exerciseToForm(editTarget) : emptyForm()}
            onSave={handleSave}
            onCancel={cancel}
            saving={saving}
          />
        )}

        {mode === 'list' && (
          <>
            {exercises.length > 0 && (
              <input
                className={input}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search exercises..."
              />
            )}

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-800/50 rounded-2xl animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <div className="text-4xl mb-3">📚</div>
                {exercises.length === 0 ? (
                  <>
                    <p className="font-medium text-slate-400 mb-1">No exercises yet</p>
                    {isAdmin && <p className="text-sm">Click "Add Exercise" to build the library.</p>}
                  </>
                ) : (
                  <p className="text-sm">No exercises match "{search}"</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map(ex => (
                  <ExerciseCard
                    key={ex.id}
                    exercise={ex}
                    isAdmin={isAdmin}
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
