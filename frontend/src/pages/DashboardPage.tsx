import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getDashboard } from '../api/stats'
import type { DashboardData } from '../api/stats'
import { card, skeleton, btnPrimary, pageTitle, pageSubtitle, pageHeader, sectionLabel, listRow, stat } from '../styles/tokens'
import { formatDate, formatInt, formatCompact, plural } from '../utils/format'
import PageTransition from '../components/PageTransition'

function StatCard({ label, value, compact, sub, loading }: { label: string; value: string; compact?: string; sub?: string; loading: boolean }) {
  if (loading) return <div className={`${skeleton} h-24`} />
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${card} min-w-0 p-4 sm:p-5`}
    >
      <div className={`${sectionLabel} truncate`}>{label}</div>
      <div className={`${stat} text-blue-400 text-2xl sm:text-3xl mt-2 leading-none`}>
        {/* Narrow phones can't fit "6,525,575" in a third of the width — show "6.5M" there */}
        {compact ? (
          <>
            <span className="sm:hidden">{compact}</span>
            <span className="hidden sm:inline">{value}</span>
          </>
        ) : value}
      </div>
      {sub && <div className="text-slate-500 text-xs mt-1.5">{sub}</div>}
    </motion.div>
  )
}

export default function DashboardPage() {
  const [dash, setDash] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Single lightweight endpoint — replaces listWorkouts() + getVolume() which
    // previously downloaded all 302 workout rows just to count and sum them.
    getDashboard().then(r => { setDash(r.data); setLoading(false) })
  }, [])

  const recent = dash?.recent ?? []

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div className={pageHeader}>
          <div>
            <h1 className={pageTitle}>Dashboard</h1>
            <p className={pageSubtitle}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button onClick={() => navigate('/log')} className={btnPrimary}>
            + Log Workout
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            label="Workouts"
            value={loading ? '—' : formatInt(dash?.total_workouts ?? 0)}
            sub="all time"
            loading={loading}
          />
          <StatCard
            label="Volume"
            value={loading ? '—' : formatInt(dash?.total_volume ?? 0)}
            compact={loading ? '—' : formatCompact(dash?.total_volume ?? 0)}
            sub="lbs lifted"
            loading={loading}
          />
          <StatCard
            label="Week"
            value={loading ? '—' : formatInt(dash?.this_week ?? 0)}
            sub={dash?.this_week === 1 ? 'session' : 'sessions'}
            loading={loading}
          />
        </div>

        {/* Recent workouts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className={sectionLabel}>Recent Workouts</h2>
            <Link to="/workouts" className="text-xs text-slate-400 hover:text-blue-400 transition-colors">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className={`${skeleton} h-16`} />)}
            </div>
          ) : recent.length === 0 ? (
            <div className={`${card} text-center py-10`}>
              <div className="text-slate-300 font-medium">No workouts yet</div>
              <p className="text-slate-500 text-sm mt-1">Log your first workout to get started</p>
              <button onClick={() => navigate('/log')} className={`${btnPrimary} mt-4`}>
                Log Workout
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((w, i) => (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/workouts/${w.id}`)}
                  className={listRow}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-100 truncate">{w.name}</div>
                    <div className="text-slate-500 text-sm mt-0.5">
                      {formatDate(w.date)} · {plural(w.exercise_count, 'exercise')}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-slate-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
