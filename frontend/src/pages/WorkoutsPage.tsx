import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { listWorkouts } from '../api/workouts'
import type { WorkoutSummary } from '../api/workouts'
import { btnPrimary, skeleton } from '../styles/tokens'
import PageTransition from '../components/PageTransition'

const PAGE = 20

function groupByMonth(workouts: WorkoutSummary[]) {
  const groups: Record<string, WorkoutSummary[]> = {}
  for (const w of workouts) {
    const [year, month] = w.date.split('-')
    const key = `${year}-${month}`
    if (!groups[key]) groups[key] = []
    groups[key].push(w)
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

function formatMonthKey(key: string) {
  const [year, month] = key.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  // Tracks how many items we've loaded so far (used to calculate next offset)
  const [loadedCount, setLoadedCount] = useState(0)
  // True as long as the last batch was a full page (meaning there may be more)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    listWorkouts(PAGE, 0).then(r => {
      setWorkouts(r.data)
      setLoadedCount(r.data.length)
      setHasMore(r.data.length === PAGE)
      setLoading(false)
    })
  }, [])

  const loadMore = () => {
    setLoadingMore(true)
    listWorkouts(PAGE, loadedCount).then(r => {
      setWorkouts(prev => [...prev, ...r.data])
      setLoadedCount(prev => prev + r.data.length)
      setHasMore(r.data.length === PAGE)
      setLoadingMore(false)
    })
  }

  const filtered = workouts.filter(w => w.name.toLowerCase().includes(search.toLowerCase()))
  const grouped = groupByMonth(filtered)

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Workouts</h1>
          <button onClick={() => navigate('/log')} className={btnPrimary}>
            + Log Workout
          </button>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search workouts..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-blue-400 focus:outline-none transition-colors"
        />

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className={`${skeleton} h-16`} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            {search ? 'No workouts match your search.' : 'No workouts logged yet.'}
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([monthKey, monthWorkouts]) => (
              <div key={monthKey}>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 px-1">
                  {formatMonthKey(monthKey)}
                </div>
                <div className="space-y-2">
                  {monthWorkouts.map((w, i) => (
                    <motion.div
                      key={w.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      whileHover={{ x: 4 }}
                      onClick={() => navigate(`/workouts/${w.id}`)}
                      className="flex items-center justify-between bg-slate-800 hover:bg-slate-700/80 border border-slate-700 hover:border-blue-400/40 rounded-xl px-5 py-4 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 rounded-full bg-blue-500/40" />
                        <div>
                          <div className="font-semibold text-slate-100">{w.name}</div>
                          <div className="text-slate-500 text-sm">
                            {w.date} · {w.exercise_count} exercise{w.exercise_count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}

            {/* Load More — only shown when there may be more and no active search */}
            {!search && (
              hasMore ? (
                <div className="pt-2 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-6 py-2.5 rounded-xl text-sm font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:border-blue-400/40 hover:text-slate-100 disabled:opacity-50 transition-colors"
                  >
                    {loadingMore ? 'Loading…' : 'Load More'}
                  </button>
                </div>
              ) : loadedCount > PAGE ? (
                <p className="text-center text-xs text-slate-600 py-2">All {loadedCount} workouts loaded</p>
              ) : null
            )}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
