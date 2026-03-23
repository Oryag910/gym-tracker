import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCardioSessions } from '../api/cardio'
import type { CardioSessionSummary } from '../api/cardio'
import { useAuth } from '../context/AuthContext'
import { toDisplayDistance, distanceUnit } from '../utils/units'
import { cardHover, btnPrimary, skeleton } from '../styles/tokens'
import PageTransition from '../components/PageTransition'

const ACTIVITY_ICONS: Record<string, string> = {
  run: '🏃', swim: '🏊', bike: '🚴', hike: '🥾', other: '⚡',
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function CardioPage() {
  const navigate = useNavigate()
  const { unitSystem } = useAuth()
  const [sessions, setSessions] = useState<CardioSessionSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCardioSessions().then(r => { setSessions(r.data); setLoading(false) })
  }, [])

  const du = distanceUnit(unitSystem)

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Cardio</h1>
          <button onClick={() => navigate('/cardio/log')} className={btnPrimary}>+ Log Session</button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className={`${skeleton} h-20`} />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-12 border border-slate-700 text-center">
            <div className="text-4xl mb-3">🏃</div>
            <p className="text-slate-400">No cardio sessions yet.</p>
            <p className="text-slate-500 text-sm mt-1">Click "+ Log Session" to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <div key={s.id} onClick={() => navigate(`/cardio/${s.id}`)} className={cardHover}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ACTIVITY_ICONS[s.activity_type] ?? '⚡'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-100 truncate">{s.name}</h3>
                      <span className="text-slate-500 text-xs shrink-0">{s.date}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                      {s.total_distance != null && (
                        <span>{toDisplayDistance(s.total_distance, unitSystem)} {du}</span>
                      )}
                      {s.total_duration != null && (
                        <span>{formatDuration(s.total_duration)}</span>
                      )}
                      {s.avg_hr != null && (
                        <span>♥ {s.avg_hr} bpm</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
