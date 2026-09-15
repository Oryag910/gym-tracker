import { useEffect, useState } from 'react'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, LineChart, Line,
} from 'recharts'
import { getPRs, getPRHistory, getExerciseTrend } from '../api/stats'
import type { PREntry, PRHistoryPoint, TrendPoint } from '../api/stats'
import { card, skeleton, input } from '../styles/tokens'
import PageTransition from '../components/PageTransition'

const PRTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-sm">
      <div className="text-slate-400">{label}</div>
      <div className="text-amber-400 font-bold">{payload[0].value} lbs</div>
    </div>
  )
}

const VolumeTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-sm">
      <div className="text-slate-400">{label}</div>
      <div className="text-emerald-400 font-bold">{Number(payload[0].value).toLocaleString()} lbs</div>
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

  const currentPR = prs.find(p => p.exercise.toLowerCase() === selected.toLowerCase())

  return (
    <PageTransition>
      <div className="space-y-6">
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">Personal Records</h1>

        {/* Exercise picker */}
        {loading ? (
          <div className={`${skeleton} h-12`} />
        ) : prs.length === 0 ? (
          <div className={`${card} text-center py-12`}>
            <div className="text-4xl mb-3">🏆</div>
            <div className="text-slate-300 font-medium">No PRs yet</div>
            <p className="text-slate-500 text-sm mt-1">Log workouts with weights to track PRs</p>
          </div>
        ) : selected ? (
          /* Selected state — show exercise name + PR badge + Change button */
          <div className="flex items-center gap-3">
            <div className={`${input} flex-1 text-slate-100 capitalize cursor-default`}>{selected}</div>
            {currentPR && (
              <div className="text-right shrink-0">
                <div className="text-2xl font-black text-amber-400 leading-none">{currentPR.weight} lbs</div>
                <div className="text-slate-500 text-xs mt-0.5">{currentPR.date}</div>
              </div>
            )}
            <button
              onClick={() => { setSelected(''); setHistory([]); setTrend([]) }}
              className="text-xs text-slate-500 hover:text-blue-400 transition-colors shrink-0"
            >
              Change
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
              placeholder="Search exercises..."
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
                      <span className="text-xs text-amber-400 font-medium">{p.weight} lbs</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* All-time PR grid — visible until an exercise is selected */}
        {!loading && !selected && prs.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              All-time PRs · {prs.length} exercises
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...prs].sort((a, b) => b.weight - a.weight).map(p => (
                <button
                  key={p.exercise}
                  type="button"
                  onClick={() => handleSelect(p.exercise)}
                  className={`${card} text-left hover:border-slate-600 transition-colors`}
                >
                  <div className="text-sm text-slate-200 capitalize truncate">{p.exercise}</div>
                  <div className="text-xl font-black text-amber-400 mt-1">{p.weight} lbs</div>
                  <div className="text-slate-500 text-xs mt-0.5">{p.date}</div>
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
                <h2 className="font-semibold text-slate-200 mb-4">PR Over Time</h2>
                {history.length === 0 ? (
                  <p className="text-slate-500 text-center py-8 text-sm">No PR history found.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={history.map(p => ({ date: p.date, weight: p.weight }))}>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit=" lbs" width={65} domain={['auto', 'auto']} />
                      <Tooltip content={<PRTooltip />} />
                      <Line type="monotone" dataKey="weight" stroke="#f59e0b" strokeWidth={2.5}
                        dot={{ fill: '#f59e0b', r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Volume Over Time */}
              <div className={card}>
                <h2 className="font-semibold text-slate-200 mb-4">Volume Over Time</h2>
                {trend.length === 0 ? (
                  <p className="text-slate-500 text-center py-8 text-sm">No volume data found.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={trend.map(t => ({ date: t.date, volume: Math.round(t.total_volume) }))}>
                      <defs>
                        <linearGradient id="prVolGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit=" lbs" width={70} />
                      <Tooltip content={<VolumeTooltip />} />
                      <Area type="monotone" dataKey="volume" stroke="#34d399" strokeWidth={2.5}
                        fill="url(#prVolGrad)" dot={{ fill: '#34d399', r: 3 }} />
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
