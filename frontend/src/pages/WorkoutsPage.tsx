import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { listWorkouts } from '../api/workouts'
import type { WorkoutSummary } from '../api/workouts'
import { btnPrimary, btnOutline, skeleton, input, pageTitle, pageSubtitle, pageHeader, sectionLabel, listRow } from '../styles/tokens'
import { formatDate, plural } from '../utils/format'
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
        <div className={pageHeader}>
          <div>
            <h1 className={pageTitle}>Workouts</h1>
            <p className={pageSubtitle}>Full training history, newest first</p>
          </div>
          <button onClick={() => navigate('/log')} className={btnPrimary}>
            + Log Workout
          </button>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by workout name…"
          aria-label="Search workouts"
          className={input}
        />

        {/* Content */}
        {loading ? (
          <div className="space-y-2">
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
                <div className="flex items-baseline justify-between mb-2 px-1">
                  <h2 className={sectionLabel}>{formatMonthKey(monthKey)}</h2>
                  <span className="text-xs text-slate-600">{plural(monthWorkouts.length, 'workout')}</span>
                </div>
                <div className="space-y-2">
                  {monthWorkouts.map((w, i) => (
                    <motion.div
                      key={w.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 8) * 0.03 }}
                      onClick={() => navigate(`/workouts/${w.id}`)}
                      className={listRow}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 shrink-0 text-center">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500 leading-none">
                            {formatDate(w.date, { year: false }).split(' ')[0]}
                          </div>
                          <div className="text-lg font-semibold text-slate-200 leading-tight tabular-nums">
                            {w.date.slice(8, 10)}
                          </div>
                        </div>
                        <div className="w-px h-8 bg-slate-700 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-100 truncate">{w.name}</div>
                          <div className="text-slate-500 text-sm">{plural(w.exercise_count, 'exercise')}</div>
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-slate-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <button onClick={loadMore} disabled={loadingMore} className={`${btnOutline} px-6`}>
                    {loadingMore ? 'Loading…' : 'Load more'}
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
