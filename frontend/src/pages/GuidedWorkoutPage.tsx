import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getTemplate } from '../api/templates'
import type { TemplateDetail, TemplateExerciseResponse } from '../api/templates'
import { createWorkout } from '../api/workouts'
import { listExercises, type GlobalExercise } from '../api/globalExercises'
import { useAuth } from '../context/AuthContext'
import { toDisplayWeight, fromInputWeight, weightUnit } from '../utils/units'
import { card, input, btnPrimary } from '../styles/tokens'
import PageTransition from '../components/PageTransition'

const today = () => new Date().toISOString().split('T')[0]

const GUIDED_DRAFT_KEY = 'guided_workout_draft'

interface GuidedDraft {
  templateId: number
  template: TemplateDetail
  exerciseIndex: number
  setIndex: number
  completedSets: CompletedSet[]
  skippedQueue: TemplateExerciseResponse[]
  savedPhase: 'active' | 'summary'
  workoutName: string
  date: string
}

interface CompletedSet {
  exerciseIndex: number
  exerciseName: string
  isUnilateral: boolean
  attachment: string | null
  setNumber: number
  targetWeight: number | null
  targetReps: number | null
  actualWeight: number | null  // lbs (canonical) — left side for unilateral
  actualReps: number | null
  actualRpe: number | null
  actualWeightRight: number | null  // right side for unilateral
  actualRepsRight: number | null
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'ready'; template: TemplateDetail }
  | { kind: 'active'; template: TemplateDetail; exerciseIndex: number; setIndex: number; completedSets: CompletedSet[]; actualWeight: string; actualReps: string; actualRpe: string; actualWeightRight: string; actualRepsRight: string }
  | { kind: 'resting'; template: TemplateDetail; exerciseIndex: number; setIndex: number; completedSets: CompletedSet[]; totalSeconds: number; restType: 'set' | 'exercise'; nextExerciseIndex: number; nextSetIndex: number }
  | { kind: 'summary'; template: TemplateDetail; completedSets: CompletedSet[]; workoutName: string; date: string }
  | { kind: 'saving' }

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function totalSetCount(exercises: TemplateExerciseResponse[]) {
  return exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
}

function RestTimer({ phase, onDone, onSkip, onAdd }: {
  phase: Extract<Phase, { kind: 'resting' }>
  onDone: () => void
  onSkip: () => void
  onAdd: (sec: number) => void
}) {
  const [secondsLeft, setSecondsLeft] = useState(phase.totalSeconds)
  const startRef = useRef(Date.now())
  const totalRef = useRef(phase.totalSeconds)
  const addedRef = useRef(0)
  const doneCalledRef = useRef(false)

  useEffect(() => {
    doneCalledRef.current = false
    startRef.current = Date.now()
    totalRef.current = phase.totalSeconds
    addedRef.current = 0
    setSecondsLeft(phase.totalSeconds)
  }, [phase.totalSeconds])

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000)
      const remaining = totalRef.current + addedRef.current - elapsed
      if (remaining <= 0) {
        clearInterval(id)
        setSecondsLeft(0)
        if (!doneCalledRef.current) { doneCalledRef.current = true; onDone() }
      } else {
        setSecondsLeft(remaining)
      }
    }, 500)
    return () => clearInterval(id)
  }, [])

  const handleAdd = (sec: number) => {
    addedRef.current += sec
    setSecondsLeft(prev => prev + sec)
    onAdd(sec)
  }

  const template = phase.template
  const nextEx = template.exercises[phase.nextExerciseIndex]
  const isLastExercise = phase.nextExerciseIndex >= template.exercises.length

  const pct = Math.max(0, Math.min(1, secondsLeft / (totalRef.current + addedRef.current)))

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="text-slate-400 text-sm font-medium uppercase tracking-wide">
        {phase.restType === 'exercise' ? 'Rest before next exercise' : 'Rest between sets'}
      </div>

      {/* Circular timer */}
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#1e293b" strokeWidth="8" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="#3b82f6" strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-black text-slate-100 tabular-nums">{formatTime(secondsLeft)}</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button onClick={() => handleAdd(30)} className="px-3 py-2 rounded-xl bg-slate-700/50 border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors">
          +30s
        </button>
        <button onClick={() => handleAdd(60)} className="px-3 py-2 rounded-xl bg-slate-700/50 border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors">
          +60s
        </button>
        <button onClick={onSkip} className="px-4 py-2 rounded-xl bg-slate-700/50 border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors font-medium">
          Skip Rest
        </button>
      </div>

      {/* Coming up */}
      {!isLastExercise && nextEx && (
        <div className="text-center">
          <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Coming up</div>
          <div className="text-slate-300 font-medium">{nextEx.name}</div>
          {phase.nextSetIndex < nextEx.sets.length && (
            <div className="text-slate-500 text-sm">Set {phase.nextSetIndex + 1}</div>
          )}
        </div>
      )}
      {isLastExercise && (
        <div className="text-slate-500 text-sm">Last exercise complete</div>
      )}
    </div>
  )
}

export default function GuidedWorkoutPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const { units } = useAuth()
  const wt = weightUnit(units.weight)

  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [, setSecondsLeftResting] = useState(0)
  const startTimeRef = useRef<number>(0)
  const [savingError, setSavingError] = useState('')
  const [showExitModal, setShowExitModal] = useState(false)
  const [savedDraft, setSavedDraft] = useState<GuidedDraft | null>(null)

  // Always-current refs for unmount cleanup — same pattern as LogWorkoutPage's draftRef
  const phaseRef = useRef<Phase>(phase)
  phaseRef.current = phase

  // Exercises parked for later — shown as "do one now?" prompts
  const [skippedQueue, setSkippedQueue] = useState<TemplateExerciseResponse[]>([])
  const skippedQueueRef = useRef(skippedQueue)
  skippedQueueRef.current = skippedQueue

  // Add-exercise modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addFilter, setAddFilter] = useState('')
  const [addSets, setAddSets] = useState(3)
  const [library, setLibrary] = useState<GlobalExercise[]>([])

  useEffect(() => {
    getTemplate(Number(templateId)).then(r => {
      // Check for a saved draft matching this template before showing the ready screen
      try {
        const raw = localStorage.getItem(GUIDED_DRAFT_KEY)
        if (raw) {
          const draft: GuidedDraft = JSON.parse(raw)
          if (draft.templateId === Number(templateId) && draft.completedSets.length > 0) {
            setSavedDraft(draft)
          }
        }
      } catch {
        localStorage.removeItem(GUIDED_DRAFT_KEY)
      }
      setPhase({ kind: 'ready', template: r.data })
    })
    listExercises().then(r => setLibrary(r.data)).catch(() => {})
  }, [templateId])

  // Save draft to localStorage on unmount — fires when user navigates away mid-workout.
  // Uses refs so the cleanup always reads the latest state even though deps is empty.
  useEffect(() => {
    return () => {
      const p = phaseRef.current
      const sq = skippedQueueRef.current
      const tid = Number(templateId)

      if (p.kind === 'active' && p.completedSets.length > 0) {
        localStorage.setItem(GUIDED_DRAFT_KEY, JSON.stringify({
          templateId: tid, template: p.template,
          exerciseIndex: p.exerciseIndex, setIndex: p.setIndex,
          completedSets: p.completedSets, skippedQueue: sq,
          savedPhase: 'active', workoutName: p.template.name, date: today(),
        }))
      } else if (p.kind === 'resting' && p.completedSets.length > 0) {
        // The rest timer can't be resumed — restore to the next active position instead
        localStorage.setItem(GUIDED_DRAFT_KEY, JSON.stringify({
          templateId: tid, template: p.template,
          exerciseIndex: p.nextExerciseIndex, setIndex: p.nextSetIndex,
          completedSets: p.completedSets, skippedQueue: sq,
          savedPhase: 'active', workoutName: p.template.name, date: today(),
        }))
      } else if (p.kind === 'summary' && p.completedSets.length > 0) {
        localStorage.setItem(GUIDED_DRAFT_KEY, JSON.stringify({
          templateId: tid, template: p.template,
          exerciseIndex: p.template.exercises.length - 1, setIndex: 0,
          completedSets: p.completedSets, skippedQueue: sq,
          savedPhase: 'summary', workoutName: p.workoutName, date: p.date,
        }))
      }
    }
  }, []) // empty deps — only the cleanup runs, on unmount

  const beginWorkout = (template: TemplateDetail) => {
    if (template.exercises.length === 0) return
    startTimeRef.current = Date.now()
    const firstEx = template.exercises[0]
    setPhase({
      kind: 'active', template, exerciseIndex: 0, setIndex: 0, completedSets: [],
      actualWeight: firstEx.sets[0]?.target_weight != null
        ? String(toDisplayWeight(firstEx.sets[0].target_weight, units.weight)) : '',
      actualReps: firstEx.sets[0]?.target_reps != null ? String(firstEx.sets[0].target_reps) : '',
      actualRpe: '', actualWeightRight: '', actualRepsRight: '',
    })
  }

  const goToActive = (template: TemplateDetail, exIdx: number, setIdx: number, completedSets: CompletedSet[]) => {
    const ex = template.exercises[exIdx]
    const s = ex.sets[setIdx]
    setPhase({
      kind: 'active', template, exerciseIndex: exIdx, setIndex: setIdx, completedSets,
      actualWeight: s?.target_weight != null ? String(toDisplayWeight(s.target_weight, units.weight)) : '',
      actualReps: s?.target_reps != null ? String(s.target_reps) : '',
      actualRpe: '', actualWeightRight: '', actualRepsRight: '',
    })
  }

  const resumeDraft = (draft: GuidedDraft) => {
    setSavedDraft(null)
    localStorage.removeItem(GUIDED_DRAFT_KEY)
    setSkippedQueue(draft.skippedQueue ?? [])
    if (draft.savedPhase === 'summary') {
      setPhase({
        kind: 'summary', template: draft.template,
        completedSets: draft.completedSets,
        workoutName: draft.workoutName, date: draft.date,
      })
    } else {
      goToActive(draft.template, draft.exerciseIndex, draft.setIndex, draft.completedSets)
    }
  }

  const logSet = (p: Extract<Phase, { kind: 'active' }>) => {
    const { template, exerciseIndex, setIndex, completedSets, actualWeight, actualReps, actualRpe } = p
    const ex = template.exercises[exerciseIndex]
    const s = ex.sets[setIndex]

    const newSet: CompletedSet = {
      exerciseIndex, exerciseName: ex.name,
      isUnilateral: ex.is_unilateral, attachment: ex.attachment,
      setNumber: setIndex + 1,
      targetWeight: s.target_weight, targetReps: s.target_reps,
      actualWeight: actualWeight ? fromInputWeight(parseFloat(actualWeight), units.weight) : null,
      actualReps: actualReps ? parseInt(actualReps) : null,
      actualRpe: actualRpe ? parseInt(actualRpe) : null,
      actualWeightRight: ex.is_unilateral && p.actualWeightRight
        ? fromInputWeight(parseFloat(p.actualWeightRight), units.weight) : null,
      actualRepsRight: ex.is_unilateral && p.actualRepsRight ? parseInt(p.actualRepsRight) : null,
    }
    const newCompleted = [...completedSets, newSet]

    const moreSetsSameExercise = setIndex + 1 < ex.sets.length
    const moreExercises = exerciseIndex + 1 < template.exercises.length

    if (!moreSetsSameExercise && !moreExercises) {
      setPhase({ kind: 'summary', template, completedSets: newCompleted, workoutName: template.name, date: today() })
      return
    }

    const nextExIdx = moreSetsSameExercise ? exerciseIndex : exerciseIndex + 1
    const nextSetIdx = moreSetsSameExercise ? setIndex + 1 : 0
    const restType = moreSetsSameExercise ? 'set' : 'exercise'
    const restSec = restType === 'set'
      ? (ex.set_rest_override ?? template.default_set_rest)
      : (ex.exercise_rest_override ?? template.default_exercise_rest)

    const nextPhase: Extract<Phase, { kind: 'resting' }> = {
      kind: 'resting', template,
      exerciseIndex, setIndex,
      completedSets: newCompleted,
      totalSeconds: restSec,
      restType,
      nextExerciseIndex: nextExIdx,
      nextSetIndex: nextSetIdx,
    }
    setPhase(nextPhase)
    setSecondsLeftResting(restSec)
  }

  // Skip this set without logging it (no rest timer)
  const skipSet = (p: Extract<Phase, { kind: 'active' }>) => {
    const { template, exerciseIndex, setIndex, completedSets } = p
    const ex = template.exercises[exerciseIndex]
    const moreSetsSameExercise = setIndex + 1 < ex.sets.length
    const moreExercises = exerciseIndex + 1 < template.exercises.length

    if (!moreSetsSameExercise && !moreExercises) {
      setPhase({ kind: 'summary', template, completedSets, workoutName: template.name, date: today() })
      return
    }
    const nextExIdx = moreSetsSameExercise ? exerciseIndex : exerciseIndex + 1
    const nextSetIdx = moreSetsSameExercise ? setIndex + 1 : 0
    goToActive(template, nextExIdx, nextSetIdx, completedSets)
  }

  // Skip the rest of this exercise, jump straight to the next (no rest)
  const skipExercise = (p: Extract<Phase, { kind: 'active' }>) => {
    const { template, exerciseIndex, completedSets } = p
    const moreExercises = exerciseIndex + 1 < template.exercises.length
    if (!moreExercises) {
      setPhase({ kind: 'summary', template, completedSets, workoutName: template.name, date: today() })
      return
    }
    goToActive(template, exerciseIndex + 1, 0, completedSets)
  }

  // Park this exercise for later — add to queue, skip immediately
  const skipExerciseReturnLater = (p: Extract<Phase, { kind: 'active' }>) => {
    setSkippedQueue(prev => [...prev, p.template.exercises[p.exerciseIndex]])
    skipExercise(p)
  }

  // Insert a queued exercise at a specific index in the template, then go to it
  const insertFromQueue = (
    ex: TemplateExerciseResponse,
    queueIdx: number,
    insertAt: number,
    template: TemplateDetail,
    completedSets: CompletedSet[]
  ) => {
    const exs = [...template.exercises]
    exs.splice(insertAt, 0, { ...ex, id: -(Date.now()) })
    const newTemplate = { ...template, exercises: exs }
    setSkippedQueue(prev => prev.filter((_, i) => i !== queueIdx))
    goToActive(newTemplate, insertAt, 0, completedSets)
  }

  // Clone the last set's targets and append it to the current exercise plan
  const addExtraSet = (p: Extract<Phase, { kind: 'active' }>) => {
    const { template, exerciseIndex } = p
    const ex = template.exercises[exerciseIndex]
    const lastSet = ex.sets[ex.sets.length - 1]
    const newExercises = template.exercises.map((e, i) =>
      i === exerciseIndex ? { ...e, sets: [...e.sets, { ...lastSet }] } : e
    )
    setPhase({ ...p, template: { ...template, exercises: newExercises } })
  }

  // Add a brand-new exercise from the library mid-workout
  const addExerciseMidWorkout = (name: string, sets: number, position: 'next' | 'end') => {
    if (phase.kind !== 'active') return
    const newSets = Array.from({ length: sets }, (_, i) => ({
      id: -(Date.now() + i), set_number: i + 1,
      target_weight: null, target_reps: null,
    }))
    const newEx: TemplateExerciseResponse = {
      id: -Date.now(), name, order_index: 0,
      set_rest_override: null, exercise_rest_override: null,
      sets: newSets, is_unilateral: false, attachment: null,
    }
    const exs = [...phase.template.exercises]
    const insertAt = position === 'next' ? phase.exerciseIndex + 1 : exs.length
    exs.splice(insertAt, 0, newEx)
    setPhase({ ...phase, template: { ...phase.template, exercises: exs } })
    setShowAddModal(false)
    setAddFilter('')
    setAddSets(3)
  }

  const afterRest = (p: Extract<Phase, { kind: 'resting' }>) => {
    goToActive(p.template, p.nextExerciseIndex, p.nextSetIndex, p.completedSets)
  }

  // Exit workout — if sets completed, offer save; otherwise discard
  const exitWithSave = (completedSets: CompletedSet[], template: TemplateDetail) => {
    setShowExitModal(false)
    if (completedSets.length === 0) { navigate(-1); return }
    setPhase({ kind: 'summary', template, completedSets, workoutName: template.name, date: today() })
  }

  const exitDiscard = () => {
    setShowExitModal(false)
    localStorage.removeItem(GUIDED_DRAFT_KEY)
    navigate(-1)
  }

  const saveWorkout = async (p: Extract<Phase, { kind: 'summary' }>) => {
    setPhase({ kind: 'saving' })
    setSavingError('')
    try {
      const exMap = new Map<number, CompletedSet[]>()
      p.completedSets.forEach(cs => {
        const arr = exMap.get(cs.exerciseIndex) ?? []
        arr.push(cs)
        exMap.set(cs.exerciseIndex, arr)
      })
      const exercises = Array.from(exMap.entries()).map(([, sets]) => ({
        name: sets[0].exerciseName,
        is_unilateral: sets[0].isUnilateral,
        attachment: sets[0].attachment,
        sets: sets.map(cs => ({
          weight: cs.actualWeight, reps: cs.actualReps, rpe: cs.actualRpe,
          weight_right: cs.actualWeightRight, reps_right: cs.actualRepsRight,
        })),
      }))
      const res = await createWorkout({ name: p.workoutName, date: p.date, exercises })
      localStorage.removeItem(GUIDED_DRAFT_KEY)
      navigate(`/workouts/${res.data.id}`)
    } catch (err: any) {
      setSavingError(err.response?.data?.detail || 'Failed to save workout')
      setPhase(p)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (phase.kind === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-500">Loading template...</div>
      </div>
    )
  }

  if (phase.kind === 'ready') {
    const { template } = phase
    return (
      <PageTransition>
        <div className="space-y-6 max-w-xl mx-auto">
          <div>
            <button onClick={() => navigate('/templates')} className="text-slate-500 hover:text-slate-300 text-sm mb-3 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Templates
            </button>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">{template.name}</h1>
            {template.description && <p className="text-slate-400 text-sm mt-1">{template.description}</p>}
          </div>

          {/* Resume card — shown when a draft for this template exists in localStorage */}
          {savedDraft && (
            <div className={`${card} border-blue-500/40 bg-blue-500/5`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-blue-300">Resume in-progress workout</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {savedDraft.completedSets.length} set{savedDraft.completedSets.length !== 1 ? 's' : ''} already logged
                    {savedDraft.savedPhase === 'summary' ? ' — ready to save' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => resumeDraft(savedDraft)} className={btnPrimary}>
                    Resume
                  </button>
                  <button
                    onClick={() => { setSavedDraft(null); localStorage.removeItem(GUIDED_DRAFT_KEY) }}
                    className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={card}>
            <h2 className="font-semibold text-slate-200 mb-3">Workout Overview</h2>
            <div className="space-y-2">
              {template.exercises.map((ex) => (
                <div key={ex.id} className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0">
                  <div>
                    <span className="text-slate-300 text-sm font-medium">{ex.name}</span>
                    <span className="text-slate-500 text-xs ml-2">{ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}</span>
                    {ex.attachment && <span className="text-slate-500 text-xs ml-2">· {ex.attachment}</span>}
                    {ex.is_unilateral && <span className="text-blue-400 text-xs ml-2">Unilateral</span>}
                  </div>
                  <div className="text-xs text-slate-500">
                    Rest: {ex.set_rest_override ?? template.default_set_rest}s
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-slate-500">
              {totalSetCount(template.exercises)} total sets · Set rest: {template.default_set_rest}s · Exercise rest: {template.default_exercise_rest}s
            </div>
          </div>

          <button onClick={() => beginWorkout(template)}
            className="w-full bg-blue-500 text-slate-950 font-black text-lg py-4 rounded-2xl hover:bg-blue-400 active:scale-98 transition-all shadow-lg shadow-blue-500/20">
            Begin Workout
          </button>
        </div>
      </PageTransition>
    )
  }

  // Exit confirmation modal — rendered on top of active/resting phases
  const exitModalCompletedSets = phase.kind === 'active' || phase.kind === 'resting' ? phase.completedSets : []
  const exitModalTemplate = phase.kind === 'active' || phase.kind === 'resting' ? phase.template : null

  const ExitModal = () => showExitModal && exitModalTemplate ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-lg font-bold text-slate-100 mb-2">Exit workout?</h3>
        <p className="text-slate-400 text-sm mb-5">
          {exitModalCompletedSets.length > 0
            ? `You've logged ${exitModalCompletedSets.length} set${exitModalCompletedSets.length !== 1 ? 's' : ''} so far.`
            : 'No sets logged yet.'}
        </p>
        <div className="space-y-2">
          {exitModalCompletedSets.length > 0 && (
            <button onClick={() => exitWithSave(exitModalCompletedSets, exitModalTemplate)}
              className="w-full py-3 rounded-xl bg-blue-500 text-slate-950 font-bold hover:bg-blue-400 transition-colors">
              Save what I've done
            </button>
          )}
          <button onClick={exitDiscard}
            className="w-full py-3 rounded-xl border border-red-500/40 text-red-400 font-medium hover:bg-red-500/10 transition-colors">
            Discard workout
          </button>
          <button onClick={() => setShowExitModal(false)}
            className="w-full py-2.5 rounded-xl text-slate-500 hover:text-slate-300 text-sm transition-colors">
            Keep going
          </button>
        </div>
      </div>
    </div>
  ) : null

  // Add exercise modal — full-screen overlay
  const AddExerciseModal = () => showAddModal ? (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-slate-800">
        <h2 className="font-bold text-slate-100 text-lg">Add Exercise</h2>
        <button onClick={() => { setShowAddModal(false); setAddFilter('') }}
          className="text-slate-500 hover:text-slate-300 text-xl leading-none transition-colors">
          ✕
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <input className={input} value={addFilter}
          onChange={e => setAddFilter(e.target.value)}
          placeholder="Search exercises..." autoFocus />
      </div>

      {/* Set count */}
      <div className="px-4 pb-3 flex items-center gap-3">
        <span className="text-slate-400 text-sm">Sets:</span>
        <button onClick={() => setAddSets(s => Math.max(1, s - 1))}
          className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-lg leading-none">
          −
        </button>
        <span className="text-slate-100 font-bold w-5 text-center tabular-nums">{addSets}</span>
        <button onClick={() => setAddSets(s => s + 1)}
          className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-lg leading-none">
          +
        </button>
        <span className="text-slate-600 text-xs ml-2">Tap Next or End to add</span>
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {library
          .filter(l => !addFilter.trim() || l.name.toLowerCase().includes(addFilter.toLowerCase()))
          .slice(0, 40)
          .map(l => (
            <div key={l.id} className="flex items-center justify-between py-2.5 border-b border-slate-800/60">
              <span className="text-slate-300 text-sm flex-1 mr-3">{l.name}</span>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => addExerciseMidWorkout(l.name, addSets, 'next')}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-500 text-slate-950 font-bold hover:bg-blue-400 transition-colors">
                  Next
                </button>
                <button onClick={() => addExerciseMidWorkout(l.name, addSets, 'end')}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors">
                  End
                </button>
              </div>
            </div>
          ))}
        {library.filter(l => !addFilter.trim() || l.name.toLowerCase().includes(addFilter.toLowerCase())).length === 0 && (
          <div className="text-slate-500 text-sm text-center py-8">No exercises found</div>
        )}
      </div>
    </div>
  ) : null

  if (phase.kind === 'active') {
    const { template, exerciseIndex, setIndex, completedSets, actualWeight, actualReps, actualRpe } = phase
    const ex = template.exercises[exerciseIndex]
    const s = ex.sets[setIndex]
    const total = totalSetCount(template.exercises)
    const done = completedSets.length
    const hasMoreExercises = exerciseIndex + 1 < template.exercises.length

    return (
      <PageTransition>
        <ExitModal />
        <AddExerciseModal />
        <div className="space-y-4 max-w-xl mx-auto">

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>Exercise {exerciseIndex + 1} of {template.exercises.length}</span>
              <span>{done} / {total} sets</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${(done / total) * 100}%` }} />
            </div>
          </div>

          {/* Parked exercises banner */}
          {skippedQueue.length > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
              <div className="text-xs text-amber-400/70 uppercase tracking-wide mb-2">
                Parked — insert one next?
              </div>
              <div className="flex flex-wrap gap-2">
                {skippedQueue.map((qex, i) => (
                  <button key={i}
                    onClick={() => insertFromQueue(qex, i, exerciseIndex + 1, template, completedSets)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 transition-colors">
                    ↩ {qex.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Current set card */}
          <div className={card}>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              Set {setIndex + 1} of {ex.sets.length}
            </div>
            <h2 className="text-2xl font-black text-slate-100 mb-1 capitalize">{ex.name}</h2>
            {ex.attachment && <div className="text-slate-500 text-xs mb-1">{ex.attachment}</div>}
            {(s.target_weight != null || s.target_reps != null) && (
              <div className="text-slate-400 text-sm mb-4">
                Target: {s.target_weight != null ? `${toDisplayWeight(s.target_weight, units.weight)} ${wt}` : 'BW'}
                {s.target_reps != null && ` × ${s.target_reps} reps`}
              </div>
            )}

            {ex.is_unilateral ? (
              <div className="space-y-3 mb-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide">
                      <span className="text-blue-400">L</span> Reps
                    </label>
                    <input className={`${input} text-lg font-bold`} type="number" min="0"
                      value={actualReps}
                      onChange={e => setPhase({ ...phase, actualReps: e.target.value })}
                      placeholder="reps" autoFocus />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide">
                      <span className="text-blue-400">L</span> Weight ({wt})
                    </label>
                    <input className={`${input} text-lg font-bold`} type="number" step="0.5" min="0"
                      value={actualWeight}
                      onChange={e => setPhase({ ...phase, actualWeight: e.target.value })}
                      placeholder="BW" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide">
                      <span className="text-amber-400">R</span> Reps
                    </label>
                    <input className={`${input} text-lg font-bold`} type="number" min="0"
                      value={phase.actualRepsRight}
                      onChange={e => setPhase({ ...phase, actualRepsRight: e.target.value })}
                      placeholder="reps" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide">
                      <span className="text-amber-400">R</span> Weight ({wt})
                    </label>
                    <input className={`${input} text-lg font-bold`} type="number" step="0.5" min="0"
                      value={phase.actualWeightRight}
                      onChange={e => setPhase({ ...phase, actualWeightRight: e.target.value })}
                      placeholder="BW" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide">Reps</label>
                  <input className={`${input} text-lg font-bold`} type="number" min="0"
                    value={actualReps}
                    onChange={e => setPhase({ ...phase, actualReps: e.target.value })}
                    placeholder="reps" autoFocus />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide">Weight ({wt})</label>
                  <input className={`${input} text-lg font-bold`} type="number" step="0.5" min="0"
                    value={actualWeight}
                    onChange={e => setPhase({ ...phase, actualWeight: e.target.value })}
                    placeholder="BW" />
                </div>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide">RPE <span className="normal-case text-slate-600">(1–10, optional)</span></label>
              <input className={input} type="number" min="1" max="10"
                value={actualRpe}
                onChange={e => setPhase({ ...phase, actualRpe: e.target.value })}
                placeholder="—" />
            </div>

            <button onClick={() => logSet(phase)} className={`${btnPrimary} w-full py-3.5 text-base`}>
              Log Set →
            </button>

            {/* Secondary actions */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button type="button" onClick={() => skipSet(phase)}
                className="flex-1 min-w-[80px] py-2 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-slate-500 hover:text-slate-300 transition-colors">
                Skip Set
              </button>
              {hasMoreExercises && (
                <button type="button" onClick={() => skipExerciseReturnLater(phase)}
                  className="flex-1 min-w-[80px] py-2 rounded-xl border border-amber-500/30 text-amber-400/80 text-sm hover:bg-amber-500/10 transition-colors">
                  ↩ Return Later
                </button>
              )}
              {hasMoreExercises && (
                <button type="button" onClick={() => skipExercise(phase)}
                  className="flex-1 min-w-[80px] py-2 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-slate-500 hover:text-slate-300 transition-colors">
                  Skip
                </button>
              )}
              <button type="button" onClick={() => addExtraSet(phase)}
                className="flex-1 min-w-[80px] py-2 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-slate-500 hover:text-slate-300 transition-colors">
                + Set
              </button>
              <button type="button" onClick={() => setShowAddModal(true)}
                className="flex-1 min-w-[80px] py-2 rounded-xl border border-slate-700 text-slate-400 text-sm hover:border-blue-500/40 hover:text-blue-400 transition-colors">
                ＋ Exercise
              </button>
            </div>
          </div>

          {/* Next up */}
          {setIndex + 1 < ex.sets.length ? (
            <div className="text-center text-xs text-slate-500">
              Next: {ex.name} — Set {setIndex + 2} · Rest {ex.set_rest_override ?? template.default_set_rest}s after this set
            </div>
          ) : hasMoreExercises ? (
            <div className="text-center text-xs text-slate-500">
              Next exercise: {template.exercises[exerciseIndex + 1].name} · Rest {ex.exercise_rest_override ?? template.default_exercise_rest}s after this set
            </div>
          ) : (
            <div className="text-center text-xs text-slate-500">Last set — almost done!</div>
          )}

          {/* Exit workout */}
          <div className="text-center">
            <button type="button" onClick={() => setShowExitModal(true)}
              className="text-slate-600 hover:text-red-400 text-xs transition-colors">
              Exit workout
            </button>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (phase.kind === 'resting') {
    return (
      <PageTransition>
        <ExitModal />
        <div className="max-w-xl mx-auto space-y-4">
          <div className={card}>
            <h2 className="text-xl font-black text-slate-100 text-center mb-6">Rest</h2>
            <RestTimer
              phase={phase}
              onDone={() => afterRest(phase)}
              onSkip={() => afterRest(phase)}
              onAdd={sec => setSecondsLeftResting(prev => prev + sec)}
            />

            {/* Parked exercises — offer to insert next during rest */}
            {skippedQueue.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-700">
                <div className="text-xs text-amber-400/70 uppercase tracking-wide mb-3">
                  Machine free? Insert next:
                </div>
                <div className="space-y-2">
                  {skippedQueue.map((qex, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <span className="text-slate-300 text-sm">{qex.name}</span>
                      <button
                        onClick={() => insertFromQueue(qex, i, phase.nextExerciseIndex, phase.template, phase.completedSets)}
                        className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 transition-colors">
                        Do Next
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="text-center">
            <button type="button" onClick={() => setShowExitModal(true)}
              className="text-slate-600 hover:text-red-400 text-xs transition-colors">
              Exit workout
            </button>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (phase.kind === 'summary') {
    const { completedSets, workoutName, date } = phase
    const grouped: Record<number, CompletedSet[]> = {}
    completedSets.forEach(cs => {
      grouped[cs.exerciseIndex] = grouped[cs.exerciseIndex] ?? []
      grouped[cs.exerciseIndex].push(cs)
    })

    return (
      <PageTransition>
        <div className="space-y-6 max-w-xl mx-auto">
          <div className="text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h1 className="text-2xl font-black text-slate-100">Workout Complete!</h1>
            <p className="text-slate-400 text-sm mt-1">{completedSets.length} sets logged</p>
          </div>

          <div className={card}>
            <h2 className="font-semibold text-slate-200 mb-3">Results</h2>
            <div className="space-y-4">
              {Object.entries(grouped).map(([exIdxStr, sets]) => (
                <div key={exIdxStr}>
                  <div className="font-medium text-slate-300 text-sm mb-1.5">{sets[0].exerciseName}</div>
                  <div className="space-y-1">
                    {sets.map((cs, i) => (
                      <div key={i} className="grid grid-cols-[32px_1fr_1fr] gap-2 text-sm">
                        <span className="text-slate-500 text-center">{cs.setNumber}</span>
                        <span className="text-slate-200">
                          {cs.actualWeight != null ? `${toDisplayWeight(cs.actualWeight, units.weight)} ${wt}` : 'BW'}
                          {cs.targetWeight != null && cs.actualWeight !== cs.targetWeight && (
                            <span className="text-slate-600 text-xs ml-1">
                              (target: {toDisplayWeight(cs.targetWeight, units.weight)})
                            </span>
                          )}
                        </span>
                        <span className="text-slate-200">
                          {cs.actualReps ?? '—'} reps
                          {cs.targetReps != null && cs.actualReps !== cs.targetReps && (
                            <span className="text-slate-600 text-xs ml-1">(target: {cs.targetReps})</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={card}>
            <h2 className="font-semibold text-slate-200 mb-3">Save to workout log</h2>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Workout Name</label>
                <input className={input} value={workoutName}
                  onChange={e => setPhase({ ...phase, workoutName: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
                <input className={input} type="date" value={date}
                  onChange={e => setPhase({ ...phase, date: e.target.value })} />
              </div>
            </div>
            {savingError && <p className="text-red-400 text-sm mb-3">{savingError}</p>}
            <button onClick={() => saveWorkout(phase)} className={`${btnPrimary} w-full py-3`}>
              Save Workout
            </button>
            <button onClick={() => { localStorage.removeItem(GUIDED_DRAFT_KEY); navigate('/templates') }}
              className="w-full text-slate-500 hover:text-slate-300 text-sm mt-3 transition-colors">
              Discard
            </button>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (phase.kind === 'saving') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-500">Saving workout...</div>
      </div>
    )
  }

  return null
}
