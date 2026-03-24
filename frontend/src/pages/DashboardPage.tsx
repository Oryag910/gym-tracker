import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getDashboard } from '../api/stats'
import type { DashboardData } from '../api/stats'
import { card, skeleton, btnPrimary } from '../styles/tokens'
import PageTransition from '../components/PageTransition'

function StatCard({ label, value, sub, loading }: { label: string; value: string; sub?: string; loading: boolean }) {
  if (loading) return <div className={`${skeleton} h-24 flex-1 min-w-32`} />
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${card} flex-1 min-w-32`}
    >
      <div className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">{label}</div>
      <div className="text-3xl font-black text-blue-400 leading-none">{value}</div>
      {sub && <div className="text-slate-500 text-xs mt-1">{sub}</div>}
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/log')}
            className={btnPrimary}
          >
            + Log Workout
          </motion.button>
        </div>

        {/* Stat cards */}
        <div className="flex gap-4 flex-wrap">
          <StatCard
            label="Total Workouts"
            value={loading ? '—' : (dash?.total_workouts ?? 0).toString()}
            loading={loading}
          />
          <StatCard
            label="Total Volume"
            value={loading ? '—' : Math.round(dash?.total_volume ?? 0).toLocaleString()}
            sub="lbs lifted"
            loading={loading}
          />
          <StatCard
            label="This Week"
            value={loading ? '—' : (dash?.this_week ?? 0).toString()}
            sub="sessions"
            loading={loading}
          />
        </div>

        {/* Recent workouts */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Recent Workouts</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className={`${skeleton} h-16`} />)}
            </div>
          ) : recent.length === 0 ? (
            <div className={`${card} text-center py-10`}>
              <div className="text-4xl mb-3">🏋️</div>
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
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate(`/workouts/${w.id}`)}
                  className="flex items-center justify-between bg-slate-800 hover:bg-slate-700/80 border border-slate-700 hover:border-blue-400/40 rounded-xl px-5 py-4 cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-semibold text-slate-100">{w.name}</div>
                    <div className="text-slate-500 text-sm mt-0.5">
                      {w.date} · {w.exercise_count} exercise{w.exercise_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
