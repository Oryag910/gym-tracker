import { useEffect, useState } from 'react'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, LineChart, Line,
} from 'recharts'
import { getPRs, getPRHistory, getExerciseTrend } from '../api/stats'
import type { PREntry, PRHistoryPoint, TrendPoint } from '../api/stats'
import { card, skeleton, input, pageTitle, pageSubtitle, sectionLabel, cardTitle, btnOutline } from '../styles/tokens'
import { formatDate, formatWeight, formatCompact, formatInt } from '../utils/format'
import PageTransition from '../components/PageTransition'

const axisTick = { fill: '#64748b', fontSize: 11 }
const PR_COLOR = '#f59e0b'
const VOLUME_COLOR = '#34d399'

// Pad the Y domain so a flat PR line doesn't get zoomed into a 2-lb window
const paddedDomain: [(min: number) => number, (max: number) => number] = [
  min => Math.floor(min * 0.9), max => Math.ceil(max * 1.05),
]

const PRTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-sm">
      <div className="text-slate-400 text-xs">{formatDate(label)}</div>
      <div className="text-amber-400 font-semibold">{formatWeight(payload[0].value)} lbs</div>
    </div>
  )
}

const VolumeTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-sm">
      <div className="text-slate-400 text-xs">{formatDate(label)}</div>
      <div className="text-emerald-400 font-semibold">{formatInt(payload[0].value)} lbs</div>
    </div>
  )
}

export default function PRPage() {
  const [prs, setPRs] = useState<PREntry[]>([])
  const [selected, setSelected] = useState('')
  const [filter, setFilter] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [history, setHistory] = useState<PRHistoryPoint[]>([])
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)

  useEffect(() => {
    getPRs().then(r => { setPRs(r.data); setLoading(false) })
  }, [])

  const handleSelect = async (exercise: string) => {
    setSelected(exercise)
    setFilter('')
    setShowPicker(false)
    setChartLoading(true)
    // Load PR history and volume trend in parallel
    const [histRes, trendRes] = await Promise.all([
      getPRHistory(exercise),
      getExerciseTrend(exercise),
    ])
    setHistory(histRes.data)
    setTrend(trendRes.data)
    setChartLoading(false)
  }

  const clearSelection = () => { setSelected(''); setHistory([]); setTrend([]) }

  const currentPR = prs.find(p => p.exercise.toLowerCase() === selected.toLowerCase())
  const sortedPRs = [...prs].sort((a, b) => b.weight - a.weight)

  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className={pageTitle}>Personal Records</h1>
          <p className={pageSubtitle}>Heaviest set ever logged per exercise, with the date it was hit</p>
        </div>

        {/* Exercise picker */}
        {loading ? (
          <div className={`${skeleton} h-12`} />
        ) : prs.length === 0 ? (
          <div className={`${card} text-center py-12`}>
            <div className="text-slate-300 font-medium">No PRs yet</div>
            <p className="text-slate-500 text-sm mt-1">Log workouts with weights to track PRs</p>
          </div>
        ) : selected ? (
          /* Selected state — exercise name + PR readout + back to list */
          <div className={`${card} flex items-center justify-between gap-4`}>
            <div className="min-w-0">
              <div className={sectionLabel}>Exercise</div>
              <div className="text-lg font-semibold text-slate-100 capitalize truncate mt-0.5">{selected}</div>
            </div>
            {currentPR && (
              <div className="text-right shrink-0">
                <div className={sectionLabel}>All-time PR</div>
                <div className="text-2xl font-bold text-amber-400 leading-none mt-0.5 tabular-nums">
                  {formatWeight(currentPR.weight)} <span className="text-sm font-medium text-amber-400/70">lbs</span>
                </div>
                <div className="text-slate-500 text-xs mt-1">{formatDate(currentPR.date)}</div>
              </div>
            )}
            <button onClick={clearSelection} className={`${btnOutline} shrink-0 px-3 py-1.5`}>
              All PRs
            </button>
          </div>
        ) : (
          /* Unselected state — searchable dropdown */
          <div className="relative">
            <input
              className={input}
              value={filter}
              onChange={e => setFilter(e.target.value)}
              onFocus={() => setShowPicker(true)}
              onBlur={() => setTimeout(() => setShowPicker(false), 150)}
              placeholder="Search exercises…"
              aria-label="Search exercises"
            />
            {showPicker && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                {prs
                  .filter(p => filter.trim() === '' || p.exercise.toLowerCase().includes(filter.toLowerCase()))
                  .map(p => (
                    <button
                      key={p.exercise}
                      type="button"
                      onMouseDown={() => handleSelect(p.exercise)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-700/60 transition-colors text-left border-b border-slate-700/50 last:border-0"
                    >
                      <span className="text-sm text-slate-200 capitalize">{p.exercise}</span>
                      <span className="text-xs text-amber-400 font-medium tabular-nums">{formatWeight(p.weight)} lbs</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* All-time PR grid — visible until an exercise is selected */}
        {!loading && !selected && prs.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className={sectionLabel}>All-time PRs</h2>
              <span className="text-xs text-slate-500">{prs.length} exercises · tap one for its progression</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {sortedPRs.map(p => (
                <button
                  key={p.exercise}
                  type="button"
                  onClick={() => handleSelect(p.exercise)}
                  className={`${card} p-4 text-left hover:border-amber-400/40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400`}
                >
                  <div className="text-sm text-slate-300 capitalize truncate">{p.exercise}</div>
                  <div className="text-xl font-bold text-amber-400 mt-1.5 tabular-nums">
                    {formatWeight(p.weight)} <span className="text-xs font-medium text-amber-400/70">lbs</span>
                  </div>
                  <div className="text-slate-500 text-xs mt-1">{formatDate(p.date)}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Charts — appear once an exercise is selected */}
        {selected && (
          chartLoading ? (
            <div className="space-y-4">
              <div className={`${skeleton} h-56`} />
              <div className={`${skeleton} h-56`} />
            </div>
          ) : (
            <div className="space-y-4">
              {/* PR Over Time */}
              <div className={card}>
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className={cardTitle}>PR progression</h2>
                  <span className="text-xs text-slate-500">Running max per session</span>
                </div>
                {history.length === 0 ? (
                  <p className="text-slate-500 text-center py-8 text-sm">No PR history found.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={history.map(p => ({ date: p.date, weight: p.weight }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="date" tick={axisTick} tickFormatter={d => formatDate(d, { year: false })} minTickGap={24} />
                      <YAxis tick={axisTick} width={44} domain={paddedDomain} tickFormatter={formatCompact} allowDecimals={false} />
                      <Tooltip content={<PRTooltip />} />
                      <Line type="monotone" dataKey="weight" stroke={PR_COLOR} strokeWidth={2.5}
                        dot={{ fill: PR_COLOR, r: 3.5, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Volume Over Time */}
              <div className={card}>
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className={cardTitle}>Session volume</h2>
                  <span className="text-xs text-slate-500">weight × reps, per session</span>
                </div>
                {trend.length === 0 ? (
                  <p className="text-slate-500 text-center py-8 text-sm">No volume data found.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={trend.map(t => ({ date: t.date, volume: Math.round(t.total_volume) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="prVolGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={VOLUME_COLOR} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={VOLUME_COLOR} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="date" tick={axisTick} tickFormatter={d => formatDate(d, { year: false })} minTickGap={24} />
                      <YAxis tick={axisTick} width={44} tickFormatter={formatCompact} />
                      <Tooltip content={<VolumeTooltip />} />
                      <Area type="monotone" dataKey="volume" stroke={VOLUME_COLOR} strokeWidth={2}
                        fill="url(#prVolGrad)" dot={{ fill: VOLUME_COLOR, r: 2.5, strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </PageTransition>
  )
}
