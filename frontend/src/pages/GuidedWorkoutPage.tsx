import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getTemplate } from '../api/templates'
import type { TemplateDetail, TemplateExerciseResponse } from '../api/templates'
import { createWorkout } from '../api/workouts'
import { useAuth } from '../context/AuthContext'
import { toDisplayWeight, fromInputWeight, weightUnit } from '../utils/units'
import { card, input, btnPrimary } from '../styles/tokens'
import PageTransition from '../components/PageTransition'

const today = () => new Date().toISOString().split('T')[0]

interface CompletedSet {
  exerciseIndex: number
  exerciseName: string
  setNumber: number
  targetWeight: number | null
  targetReps: number | null
  actualWeight: number | null  // lbs (canonical)
  actualReps: number | null
  actualRpe: number | null
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'ready'; template: TemplateDetail }
  | { kind: 'active'; template: TemplateDetail; exerciseIndex: number; setIndex: number; completedSets: CompletedSet[]; actualWeight: string; actualReps: string; actualRpe: string }
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

  useEffect(() => {
    getTemplate(Number(templateId)).then(r => {
      setPhase({ kind: 'ready', template: r.data })
    })
  }, [templateId])

  const beginWorkout = (template: TemplateDetail) => {
    if (template.exercises.length === 0) return
    startTimeRef.current = Date.now()
    const firstEx = template.exercises[0]
    setPhase({
      kind: 'active', template, exerciseIndex: 0, setIndex: 0, completedSets: [],
      actualWeight: firstEx.sets[0]?.target_weight != null
        ? String(toDisplayWeight(firstEx.sets[0].target_weight, units.weight)) : '',
      actualReps: firstEx.sets[0]?.target_reps != null ? String(firstEx.sets[0].target_reps) : '',
      actualRpe: '',
    })
  }

  const goToActive = (template: TemplateDetail, exIdx: number, setIdx: number, completedSets: CompletedSet[]) => {
    const ex = template.exercises[exIdx]
    const s = ex.sets[setIdx]
    setPhase({
      kind: 'active', template, exerciseIndex: exIdx, setIndex: setIdx, completedSets,
      actualWeight: s?.target_weight != null ? String(toDisplayWeight(s.target_weight, units.weight)) : '',
      actualReps: s?.target_reps != null ? String(s.target_reps) : '',
      actualRpe: '',
    })
  }

  const logSet = (p: Extract<Phase, { kind: 'active' }>) => {
    const { template, exerciseIndex, setIndex, completedSets, actualWeight, actualReps, actualRpe } = p
    const ex = template.exercises[exerciseIndex]
    const s = ex.sets[setIndex]

    const newSet: CompletedSet = {
      exerciseIndex, exerciseName: ex.name, setNumber: setIndex + 1,
      targetWeight: s.target_weight, targetReps: s.target_reps,
      actualWeight: actualWeight ? fromInputWeight(parseFloat(actualWeight), units.weight) : null,
      actualReps: actualReps ? parseInt(actualReps) : null,
      actualRpe: actualRpe ? parseInt(actualRpe) : null,
    }
    const newCompleted = [...completedSets, newSet]

    const moreSetsSameExercise = setIndex + 1 < ex.sets.length
    const moreExercises = exerciseIndex + 1 < template.exercises.length

    if (!moreSetsSameExercise && !moreExercises) {
      // Done — go to summary
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

  const afterRest = (p: Extract<Phase, { kind: 'resting' }>) => {
    goToActive(p.template, p.nextExerciseIndex, p.nextSetIndex, p.completedSets)
  }

  const saveWorkout = async (p: Extract<Phase, { kind: 'summary' }>) => {
    setPhase({ kind: 'saving' })
    setSavingError('')
    try {
      // Group completed sets by exercise
      const exMap = new Map<number, CompletedSet[]>()
      p.completedSets.forEach(cs => {
        const arr = exMap.get(cs.exerciseIndex) ?? []
        arr.push(cs)
        exMap.set(cs.exerciseIndex, arr)
      })

      const exercises = Array.from(exMap.entries()).map(([, sets]) => ({
        name: sets[0].exerciseName,
        sets: sets.map(cs => ({
          weight: cs.actualWeight,
          reps: cs.actualReps,
          rpe: cs.actualRpe,
        })),
      }))

      const res = await createWorkout({ name: p.workoutName, date: p.date, exercises })
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

          <div className={card}>
            <h2 className="font-semibold text-slate-200 mb-3">Workout Overview</h2>
            <div className="space-y-2">
              {template.exercises.map((ex) => (
                <div key={ex.id} className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0">
                  <div>
                    <span className="text-slate-300 text-sm font-medium">{ex.name}</span>
                    <span className="text-slate-500 text-xs ml-2">{ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}</span>
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

  if (phase.kind === 'active') {
    const { template, exerciseIndex, setIndex, completedSets, actualWeight, actualReps, actualRpe } = phase
    const ex = template.exercises[exerciseIndex]
    const s = ex.sets[setIndex]
    const total = totalSetCount(template.exercises)
    const done = completedSets.length

    return (
      <PageTransition>
        <div className="space-y-5 max-w-xl mx-auto">
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

          {/* Current set card */}
          <div className={card}>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              Set {setIndex + 1} of {ex.sets.length}
            </div>
            <h2 className="text-2xl font-black text-slate-100 mb-1 capitalize">{ex.name}</h2>
            {(s.target_weight != null || s.target_reps != null) && (
              <div className="text-slate-400 text-sm mb-4">
                Target: {s.target_weight != null ? `${toDisplayWeight(s.target_weight, units.weight)} ${wt}` : 'BW'}
                {s.target_reps != null && ` × ${s.target_reps} reps`}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide">Weight ({wt})</label>
                <input
                  className={`${input} text-lg font-bold`}
                  type="number" step="0.5" min="0"
                  value={actualWeight}
                  onChange={e => setPhase({ ...phase, actualWeight: e.target.value })}
                  placeholder="BW"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide">Reps</label>
                <input
                  className={`${input} text-lg font-bold`}
                  type="number" min="0"
                  value={actualReps}
                  onChange={e => setPhase({ ...phase, actualReps: e.target.value })}
                  placeholder="reps"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide">RPE <span className="normal-case text-slate-600">(1–10, optional)</span></label>
              <input
                className={input}
                type="number" min="1" max="10"
                value={actualRpe}
                onChange={e => setPhase({ ...phase, actualRpe: e.target.value })}
                placeholder="—"
              />
            </div>

            <button onClick={() => logSet(phase)}
              className={`${btnPrimary} w-full py-3.5 text-base`}>
              Log Set →
            </button>
          </div>

          {/* Next up */}
          {setIndex + 1 < ex.sets.length ? (
            <div className="text-center text-xs text-slate-500">
              Next: {ex.name} — Set {setIndex + 2} · Rest {ex.set_rest_override ?? template.default_set_rest}s after this set
            </div>
          ) : exerciseIndex + 1 < template.exercises.length ? (
            <div className="text-center text-xs text-slate-500">
              Next exercise: {template.exercises[exerciseIndex + 1].name} · Rest {ex.exercise_rest_override ?? template.default_exercise_rest}s after this set
            </div>
          ) : (
            <div className="text-center text-xs text-slate-500">Last set — almost done!</div>
          )}
        </div>
      </PageTransition>
    )
  }

  if (phase.kind === 'resting') {
    return (
      <PageTransition>
        <div className="max-w-xl mx-auto">
          <div className={card}>
            <h2 className="text-xl font-black text-slate-100 text-center mb-6">Rest</h2>
            <RestTimer
              phase={phase}
              onDone={() => afterRest(phase)}
              onSkip={() => afterRest(phase)}
              onAdd={sec => setSecondsLeftResting(prev => prev + sec)}
            />
          </div>
        </div>
      </PageTransition>
    )
  }

  if (phase.kind === 'summary') {
    const { completedSets, workoutName, date } = phase
    // Group by exercise
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

          {/* Summary table */}
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

          {/* Save form */}
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
            <button onClick={() => navigate('/templates')}
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
