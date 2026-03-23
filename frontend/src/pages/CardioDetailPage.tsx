import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getCardioSession, deleteCardioSession } from '../api/cardio'
import type { CardioSessionDetail, CardioSegment } from '../api/cardio'
import { useAuth } from '../context/AuthContext'
import {
  toDisplayDistance, distanceUnit,
  toDisplayTemp, tempUnit,
  paceToDisplay, paceUnit,
} from '../utils/units'
import { card, skeleton, btnDanger } from '../styles/tokens'
import PageTransition from '../components/PageTransition'

const SEGMENT_COLORS: Record<string, string> = {
  warmup: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  easy: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  moderate: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  hard: 'bg-red-500/10 border-red-500/30 text-red-400',
  interval: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  recovery: 'bg-slate-600/30 border-slate-500/30 text-slate-300',
  cool_down: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
}

const SEGMENT_LABELS: Record<string, string> = {
  warmup: 'Warm-up', easy: 'Easy', moderate: 'Moderate', hard: 'Hard',
  interval: 'Interval', recovery: 'Recovery', cool_down: 'Cool-down',
}

const ACTIVITY_ICONS: Record<string, string> = {
  run: '🏃', swim: '🏊', bike: '🚴', hike: '🥾', other: '⚡',
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function SegmentRow({ seg, unitSystem }: { seg: CardioSegment; unitSystem: string }) {
  const du = distanceUnit(unitSystem as any)
  const pu = paceUnit(unitSystem as any)
  const colorClass = SEGMENT_COLORS[seg.segment_type] ?? 'bg-slate-700/30 border-slate-600 text-slate-400'

  return (
    <div className={`rounded-lg border p-3 ${colorClass}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide">
            {SEGMENT_LABELS[seg.segment_type] ?? seg.segment_type}
          </span>
          {seg.label && <span className="text-xs opacity-70">— {seg.label}</span>}
          {seg.reps > 1 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10">
              ×{seg.reps}
            </span>
          )}
        </div>
        {seg.hr && <span className="text-xs opacity-70">♥ {seg.hr} bpm</span>}
      </div>
      <div className="flex flex-wrap gap-3 text-sm font-medium">
        {seg.distance != null && (
          <span>{toDisplayDistance(seg.distance, unitSystem as any)} {du}</span>
        )}
        {seg.pace != null && (
          <span>{paceToDisplay(seg.pace, unitSystem as any)} {pu}</span>
        )}
        {seg.duration != null && (
          <span>{formatDuration(seg.duration)}</span>
        )}
      </div>
      {seg.notes && <p className="text-xs opacity-60 mt-1">{seg.notes}</p>}
    </div>
  )
}

export default function CardioDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { unitSystem } = useAuth()
  const [session, setSession] = useState<CardioSessionDetail | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getCardioSession(Number(id)).then(r => setSession(r.data))
  }, [id])

  const handleDelete = async () => {
    setDeleting(true)
    await deleteCardioSession(Number(id))
    navigate('/cardio')
  }

  const du = distanceUnit(unitSystem)
  const tu = tempUnit(unitSystem)

  if (!session) return (
    <div className="space-y-4">
      <div className={`${skeleton} h-8 w-48`} />
      <div className={`${skeleton} h-40`} />
    </div>
  )

  return (
    <PageTransition>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <button onClick={() => navigate('/cardio')} className="text-slate-500 hover:text-slate-300 text-sm mb-3 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{ACTIVITY_ICONS[session.activity_type] ?? '⚡'}</span>
              <div>
                <h1 className="text-2xl font-black text-slate-100 tracking-tight">{session.name}</h1>
                <div className="text-slate-500 text-sm mt-0.5">{session.date}</div>
              </div>
            </div>
            <button onClick={() => setShowDeleteModal(true)} className={btnDanger}>Delete</button>
          </div>
        </div>

        {/* Summary stats */}
        <div className={card}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {session.total_distance != null && (
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Distance</div>
                <div className="text-lg font-bold text-slate-100">
                  {toDisplayDistance(session.total_distance, unitSystem)} {du}
                </div>
              </div>
            )}
            {session.total_duration != null && (
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Duration</div>
                <div className="text-lg font-bold text-slate-100">{formatDuration(session.total_duration)}</div>
              </div>
            )}
            {session.avg_hr != null && (
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Avg HR</div>
                <div className="text-lg font-bold text-slate-100">{session.avg_hr} bpm</div>
              </div>
            )}
            {session.max_hr != null && (
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Max HR</div>
                <div className="text-lg font-bold text-slate-100">{session.max_hr} bpm</div>
              </div>
            )}
            {session.calories != null && (
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Calories</div>
                <div className="text-lg font-bold text-slate-100">{session.calories} kcal</div>
              </div>
            )}
            {session.temperature != null && (
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Temp</div>
                <div className="text-lg font-bold text-slate-100">
                  {toDisplayTemp(session.temperature, unitSystem)}{tu}
                </div>
              </div>
            )}
          </div>
          {session.notes && <p className="text-slate-400 text-sm mt-4 border-t border-slate-700 pt-4">{session.notes}</p>}
        </div>

        {/* Segments */}
        {session.segments.length > 0 && (
          <div className={card}>
            <h2 className="font-semibold text-slate-200 mb-3">Segments</h2>
            <div className="space-y-2">
              {session.segments.map(seg => (
                <SegmentRow key={seg.id} seg={seg} unitSystem={unitSystem} />
              ))}
            </div>
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
                <h2 className="text-lg font-bold text-slate-100 mb-2">Delete Session?</h2>
                <p className="text-slate-400 text-sm mb-6">
                  This will permanently delete <strong className="text-slate-200">{session.name}</strong>.
                </p>
                <div className="flex gap-3">
                  <button onClick={handleDelete} disabled={deleting}
                    className="flex-1 bg-red-500 text-white font-bold rounded-xl py-2.5 hover:bg-red-400 transition-all disabled:opacity-50">
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
