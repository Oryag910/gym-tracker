import { useEffect, useState } from 'react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, ReferenceLine
} from 'recharts'
import { getVolume, getExerciseTrend, getPRs, getPRHistory } from '../api/stats'
import type { VolumePoint, TrendPoint, PREntry, PRHistoryPoint } from '../api/stats'
import { card, skeleton, input } from '../styles/tokens'
import PageTransition from '../components/PageTransition'
import ComparePage from './ComparePage'

const VolumeTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-sm">
      <div className="text-slate-400 text-xs">{label}</div>
      <div className="text-emerald-400 font-bold">{Number(payload[0].value).toLocaleString()} lbs</div>
    </div>
  )
}

const TrendTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-sm space-y-1">
      <div className="text-slate-400 text-xs">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }} className="font-bold">
          {p.name}: {Number(p.value).toLocaleString()} lbs
        </div>
      ))}
    </div>
  )
}

const PRTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-sm">
      <div className="text-slate-400 text-xs">{label}</div>
      <div className="text-amber-400 font-bold">{payload[0].value} lbs</div>
    </div>
  )
}

type Tab = 'volume' | 'exercise' | 'compare' | 'prs'

const RANGES: { label: string; days: number }[] = [
  { label: '1D', days: 1 },
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
]

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('volume')
  const [volume, setVolume] = useState<VolumePoint[]>([])
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [trendExercise, setTrendExercise] = useState('')
  const [trendInput, setTrendInput] = useState('')
  const [trendError, setTrendError] = useState('')
  const [prMap, setPrMap] = useState<Record<string, number>>({})
  const [prList, setPrList] = useState<PREntry[]>([])
  const [loading, setLoading] = useState(true)

  // PR Progress state
  const [prHistory, setPrHistory] = useState<PRHistoryPoint[]>([])
  const [prExercise, setPrExercise] = useState('')
  const [prRange, setPrRange] = useState(30)
  const [prLoading, setPrLoading] = useState(false)

  useEffect(() => {
    Promise.all([getVolume(), getPRs()]).then(([vRes, prRes]) => {
      setVolume(vRes.data)
      const map: Record<string, number> = {}
      prRes.data.forEach((p: PREntry) => { map[p.exercise.toLowerCase()] = p.weight })
      setPrMap(map)
      setPrList(prRes.data)
      setLoading(false)
    })
  }, [])

  // Auto-load first exercise's PR history when PR list loads
  useEffect(() => {
    if (prList.length > 0 && !prExercise) {
      loadPRHistory(prList[0].exercise)
    }
  }, [prList])

  const loadPRHistory = async (exercise: string) => {
    setPrLoading(true)
    setPrExercise(exercise)
    try {
      const r = await getPRHistory(exercise)
      setPrHistory(r.data)
    } finally {
      setPrLoading(false)
    }
  }

  const handleTrend = async () => {
    setTrendError('')
    if (!trendInput.trim()) return
    const r = await getExerciseTrend(trendInput.trim())
    if (r.data.length === 0) {
      setTrendError(`No data for "${trendInput}"`)
    } else {
      setTrend(r.data)
      setTrendExercise(trendInput.trim())
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'volume', label: 'Volume' },
    { key: 'prs', label: 'PR Progress' },
    { key: 'exercise', label: 'Exercise Trend' },
    { key: 'compare', label: 'Compare' },
  ]

  const pr = prMap[trendExercise.toLowerCase()]

  // Filter PR history by selected range
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - prRange)
  const filteredPRHistory = prHistory.filter(p => new Date(p.date) >= cutoff)

  return (
    <PageTransition>
      <div className="space-y-6">
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">Analytics</h1>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-slate-800 rounded-xl w-fit flex-wrap">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? 'bg-blue-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Volume chart */}
        {tab === 'volume' && (
          <div className={card}>
            <h2 className="font-semibold text-slate-200 mb-4">Volume per Session</h2>
            {loading ? (
              <div className={`${skeleton} h-56`} />
            ) : volume.length === 0 ? (
              <p className="text-slate-500 text-center py-10">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={volume.map(v => ({ date: v.date, volume: Math.round(v.volume), name: v.workout_name }))}>
                  <defs>
                    <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} unit=" lbs" width={65} />
                  <Tooltip content={<VolumeTooltip />} />
                  <Area type="monotone" dataKey="volume" stroke="#34d399" strokeWidth={2.5} fill="url(#volGrad)" dot={{ fill: '#34d399', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* PR Progress */}
        {tab === 'prs' && (
          <div className={card}>
            <h2 className="font-semibold text-slate-200 mb-4">PR Progress</h2>

            {loading ? (
              <div className={`${skeleton} h-56`} />
            ) : prList.length === 0 ? (
              <p className="text-slate-500 text-center py-10">Log some workouts to see your PRs.</p>
            ) : (
              <>
                {/* Exercise selector */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {prList.map(p => (
                    <button
                      key={p.exercise}
                      onClick={() => loadPRHistory(p.exercise)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        prExercise === p.exercise
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                      }`}
                    >
                      {p.exercise}
                    </button>
                  ))}
                </div>

                {/* Time range selector */}
                <div className="flex gap-1 mb-5">
                  {RANGES.map(r => (
                    <button
                      key={r.days}
                      onClick={() => setPrRange(r.days)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        prRange === r.days
                          ? 'bg-slate-600 text-slate-100'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {prLoading ? (
                  <div className={`${skeleton} h-56`} />
                ) : filteredPRHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-500 text-sm">No PRs recorded in this period.</p>
                    <p className="text-slate-600 text-xs mt-1">Try a wider time range.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500 capitalize">{prExercise}</span>
                      <span className="text-xs text-amber-400 font-medium">
                        Current PR: {prMap[prExercise.toLowerCase()] ?? '—'} lbs
                      </span>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={filteredPRHistory}>
                        <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} unit=" lbs" width={65} domain={['auto', 'auto']} />
                        <Tooltip content={<PRTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          stroke="#f59e0b"
                          strokeWidth={2.5}
                          dot={{ fill: '#f59e0b', r: 4 }}
                          activeDot={{ r: 6 }}
                          name="PR Weight"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Exercise trend */}
        {tab === 'exercise' && (
          <div className={card}>
            <h2 className="font-semibold text-slate-200 mb-4">Exercise Trend</h2>
            <div className="flex gap-2 mb-4">
              <input
                value={trendInput}
                onChange={(e) => setTrendInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTrend()}
                placeholder="e.g. bench press"
                className={input}
              />
              <button
                onClick={handleTrend}
                className="bg-blue-500 text-slate-950 font-bold rounded-lg px-4 py-2 hover:bg-blue-400 transition-colors shrink-0"
              >
                Load
              </button>
            </div>
            {trendError && <p className="text-red-400 text-sm mb-3">{trendError}</p>}
            {trend.length === 0 ? (
              <p className="text-slate-500 text-center py-8 text-sm">Enter an exercise name above to see its trend.</p>
            ) : (
              <>
                <div className="text-slate-400 text-sm mb-3 capitalize font-medium">{trendExercise}</div>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trend.map(t => ({ date: t.date, 'Max Weight': t.max_weight, 'Volume': Math.round(t.total_volume) }))}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip content={<TrendTooltip />} />
                    <Legend />
                    {pr && (
                      <ReferenceLine y={pr} stroke="#f59e0b" strokeDasharray="5 5"
                        label={{ value: 'PR', fill: '#f59e0b', fontSize: 11 }} />
                    )}
                    <Line type="monotone" dataKey="Max Weight" stroke="#60a5fa" strokeWidth={2.5} dot={{ fill: '#60a5fa', r: 3 }} unit=" lbs" />
                    <Line type="monotone" dataKey="Volume" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} unit=" lbs" />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        )}

        {/* Compare tab */}
        {tab === 'compare' && <ComparePage embedded />}
      </div>
    </PageTransition>
  )
}
