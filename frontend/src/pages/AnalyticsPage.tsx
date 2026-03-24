import { useEffect, useState } from 'react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, ReferenceLine
} from 'recharts'
import { getVolume, getExerciseTrend, getPRs, getPRHistory } from '../api/stats'
import type { VolumePoint, TrendPoint, PREntry, PRHistoryPoint } from '../api/stats'
import { getMeasurements } from '../api/measurements'
import type { MeasurementEntry } from '../api/measurements'
import { getCardioSessions } from '../api/cardio'
import type { CardioSessionSummary } from '../api/cardio'
import { listExercises } from '../api/globalExercises'
import type { GlobalExercise } from '../api/globalExercises'
import { useAuth } from '../context/AuthContext'
import {
  toDisplayWeight, weightUnit,
  toDisplayDistance, distanceUnit,
  toDisplayMeasure, measureUnit,
} from '../utils/units'
import { card, skeleton, input } from '../styles/tokens'
import PageTransition from '../components/PageTransition'
import ComparePage from './ComparePage'

// ─── Tooltips ────────────────────────────────────────────────────────────────

const VolumeTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-sm">
      <div className="text-slate-400 text-xs">{label}</div>
      <div className="text-emerald-400 font-bold">{Number(payload[0].value).toLocaleString()} {unit ?? 'lbs'}</div>
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

const MeasureTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-sm">
      <div className="text-slate-400 text-xs">{label}</div>
      <div className="text-violet-400 font-bold">{Number(payload[0].value).toFixed(1)} {unit}</div>
    </div>
  )
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'volume' | 'exercise_volume' | 'prs' | 'exercise' | 'body' | 'cardio' | 'compare'

const RANGES: { label: string; days: number }[] = [
  { label: '1D', days: 1 },
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
  { label: 'All', days: 9999 },
]

const MEASURE_FIELDS: { key: keyof MeasurementEntry; label: string }[] = [
  { key: 'weight', label: 'Body Weight' },
  { key: 'body_fat', label: 'Body Fat %' },
  { key: 'waist', label: 'Waist' },
  { key: 'chest', label: 'Chest' },
  { key: 'hips', label: 'Hips' },
  { key: 'arms', label: 'Arms' },
  { key: 'thighs', label: 'Thighs' },
  { key: 'neck', label: 'Neck' },
]

const CARDIO_METRICS = ['distance', 'duration', 'avg_hr'] as const
type CardioMetric = typeof CARDIO_METRICS[number]
const CARDIO_ACTIVITY_TYPES = ['all', 'run', 'swim', 'bike', 'hike', 'other'] as const

// ─── Reusable LibraryPicker ──────────────────────────────────────────────────

function LibraryPicker({
  selected, filter, showPicker, library,
  onFilterChange, onFocus, onBlur, onSelect, onClear,
  placeholder,
}: {
  selected: string
  filter: string
  showPicker: boolean
  library: GlobalExercise[]
  onFilterChange: (v: string) => void
  onFocus: () => void
  onBlur: () => void
  onSelect: (ex: GlobalExercise) => void
  onClear: () => void
  placeholder?: string
}) {
  const filtered = library.filter(l =>
    filter.trim().length === 0 ? true : l.name.toLowerCase().includes(filter.toLowerCase())
  )

  if (selected) {
    return (
      <div className="flex items-center gap-2">
        <div className={`${input} flex-1 text-slate-100 cursor-default`}>{selected}</div>
        <button type="button" onClick={onClear} className="text-xs text-slate-500 hover:text-blue-400 transition-colors shrink-0">
          Change
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        className={input}
        value={filter}
        onChange={e => onFilterChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder ?? 'Search exercises...'}
      />
      {showPicker && library.length > 0 && (
        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-500">No exercises match "{filter}"</div>
          ) : filtered.map(ex => (
            <button
              key={ex.id}
              type="button"
              onMouseDown={() => onSelect(ex)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/60 transition-colors text-left border-b border-slate-700/50 last:border-0"
            >
              {ex.image_url && (
                <img src={ex.image_url} alt={ex.name} className="w-8 h-8 object-cover rounded bg-slate-700 shrink-0" />
              )}
              <div>
                <div className="text-sm text-slate-200">{ex.name}</div>
                {ex.category && <div className="text-[11px] text-slate-500">{ex.category}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Range filter helper ─────────────────────────────────────────────────────

function RangeButtons({ range, setRange }: { range: number; setRange: (d: number) => void }) {
  return (
    <div className="flex gap-1 mb-5">
      {RANGES.map(r => (
        <button key={r.days} onClick={() => setRange(r.days)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            range === r.days ? 'bg-slate-600 text-slate-100' : 'text-slate-500 hover:text-slate-300'
          }`}>
          {r.label}
        </button>
      ))}
    </div>
  )
}

function cutoffDate(days: number): Date {
  const d = new Date(); d.setDate(d.getDate() - days); return d
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { units } = useAuth()
  const [tab, setTab] = useState<Tab>('volume')
  const [library, setLibrary] = useState<GlobalExercise[]>([])

  // Volume
  const [volume, setVolume] = useState<VolumePoint[]>([])
  const [volumeRange, setVolumeRange] = useState(90)
  const [volumeWorkout, setVolumeWorkout] = useState<string>('all')
  const [volumeWorkoutFilter, setVolumeWorkoutFilter] = useState('')
  const [volumeWorkoutShowPicker, setVolumeWorkoutShowPicker] = useState(false)
  const [loading, setLoading] = useState(true)

  // PR Progress
  const [prMap, setPrMap] = useState<Record<string, number>>({})
  const [prList, setPrList] = useState<PREntry[]>([])
  const [prHistory, setPrHistory] = useState<PRHistoryPoint[]>([])
  const [prExercise, setPrExercise] = useState('')
  const [prRange, setPrRange] = useState(30)
  const [prLoading, setPrLoading] = useState(false)
  const [prFilter, setPrFilter] = useState('')
  const [prShowPicker, setPrShowPicker] = useState(false)
  const [prListLoading, setPrListLoading] = useState(false)

  // Exercise Trend (dropdown)
  const [trendExercise, setTrendExercise] = useState('')
  const [trendFilter, setTrendFilter] = useState('')
  const [trendShowPicker, setTrendShowPicker] = useState(false)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [trendRange, setTrendRange] = useState(90)
  const [trendLoading, setTrendLoading] = useState(false)

  // Exercise Volume (dropdown + range)
  const [exVolExercise, setExVolExercise] = useState('')
  const [exVolFilter, setExVolFilter] = useState('')
  const [exVolShowPicker, setExVolShowPicker] = useState(false)
  const [exVolTrend, setExVolTrend] = useState<TrendPoint[]>([])
  const [exVolRange, setExVolRange] = useState(30)
  const [exVolLoading, setExVolLoading] = useState(false)

  // Body measurements
  const [measurements, setMeasurements] = useState<MeasurementEntry[]>([])
  const [measureField, setMeasureField] = useState<keyof MeasurementEntry>('weight')
  const [measureRange, setMeasureRange] = useState(90)

  // Cardio
  const [cardioSessions, setCardioSessions] = useState<CardioSessionSummary[]>([])
  const [cardioActivity, setCardioActivity] = useState<string>('all')
  const [cardioMetric, setCardioMetric] = useState<CardioMetric>('distance')
  const [cardioRange, setCardioRange] = useState(30)

  const wt = weightUnit(units.weight)
  const du = distanceUnit(units.distance)
  const mt = measureUnit(units.measure)

  // Initial load — PRs are excluded here to speed up the first paint.
  // They load lazily when the user navigates to the PR tab (see effect below).
  useEffect(() => {
    Promise.all([
      getVolume(), listExercises(),
      getMeasurements(), getCardioSessions(),
    ]).then(([vRes, libRes, measRes, cardioRes]) => {
      setVolume(vRes.data)
      setLibrary(libRes.data)
      setMeasurements(measRes.data.slice().reverse()) // oldest first for chart
      setCardioSessions(cardioRes.data.slice().reverse())
      setLoading(false)
    })
  }, [])

  // Lazy PR load — only fires when the user navigates to the PR tab
  useEffect(() => {
    if (tab !== 'prs' || prList.length > 0 || prListLoading) return
    setPrListLoading(true)
    getPRs().then(r => {
      const map: Record<string, number> = {}
      r.data.forEach((p: PREntry) => { map[p.exercise.toLowerCase()] = p.weight })
      setPrMap(map)
      setPrList(r.data)
      setPrListLoading(false)
    })
  }, [tab])

  // Auto-load first PR exercise once the PR list arrives
  useEffect(() => {
    if (prList.length > 0 && !prExercise) loadPRHistory(prList[0].exercise)
  }, [prList])

  const loadPRHistory = async (exercise: string) => {
    setPrLoading(true); setPrExercise(exercise)
    try { const r = await getPRHistory(exercise); setPrHistory(r.data) }
    finally { setPrLoading(false) }
  }

  const loadTrend = async (name: string) => {
    setTrendLoading(true); setTrendExercise(name)
    try { const r = await getExerciseTrend(name); setTrend(r.data) }
    finally { setTrendLoading(false) }
  }

  const loadExVol = async (name: string) => {
    setExVolLoading(true); setExVolExercise(name)
    try { const r = await getExerciseTrend(name); setExVolTrend(r.data) }
    finally { setExVolLoading(false) }
  }

  // Filtered data
  const volumeCutoff = cutoffDate(volumeRange)
  // Only include workout names logged 5+ times — filters out one-offs and mistakes
  const volumeWorkoutCounts = volume.reduce((acc, v) => {
    acc[v.workout_name] = (acc[v.workout_name] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const volumeWorkoutNames = Object.entries(volumeWorkoutCounts)
    .filter(([, count]) => count >= 5)
    .map(([name]) => name)
    .sort()
  const filteredVolume = volume
    .filter(v => new Date(v.date) >= volumeCutoff)
    .filter(v => volumeWorkout === 'all' || v.workout_name === volumeWorkout)

  const prCutoff = cutoffDate(prRange)
  const filteredPRHistory = prHistory.filter(p => new Date(p.date) >= prCutoff)

  const trendCutoff = cutoffDate(trendRange)
  const filteredTrend = trend.filter(t => new Date(t.date) >= trendCutoff)

  const exVolCutoff = cutoffDate(exVolRange)
  const filteredExVol = exVolTrend
    .filter(p => new Date(p.date) >= exVolCutoff)
    .map(p => ({ date: p.date, volume: Math.round(p.total_volume) }))

  const measCutoff = cutoffDate(measureRange)
  const filteredMeasurements = measurements.filter(m => new Date(m.date) >= measCutoff)
  const measureChartData = filteredMeasurements
    .filter(m => m[measureField] != null)
    .map(m => {
      const raw = m[measureField] as number
      let val = raw
      if (measureField === 'weight') val = toDisplayWeight(raw, units.weight)
      else if (measureField !== 'body_fat') val = toDisplayMeasure(raw, units.measure)
      return { date: m.date, value: +val.toFixed(2) }
    })

  const cardioCutoff = cutoffDate(cardioRange)
  const filteredCardio = cardioSessions
    .filter(s => new Date(s.date) >= cardioCutoff)
    .filter(s => cardioActivity === 'all' || s.activity_type === cardioActivity)
    .map(s => {
      let val: number | null = null
      if (cardioMetric === 'distance') val = s.total_distance != null ? +toDisplayDistance(s.total_distance, units.distance).toFixed(2) : null
      if (cardioMetric === 'duration') val = s.total_duration
      if (cardioMetric === 'avg_hr') val = s.avg_hr
      return { date: s.date, value: val, name: s.name }
    })
    .filter(s => s.value != null)

  const measureFieldUnit = measureField === 'weight' ? wt : measureField === 'body_fat' ? '%' : mt
  const cardioMetricLabel = cardioMetric === 'distance' ? du : cardioMetric === 'duration' ? 'min' : 'bpm'

  const pr = prMap[trendExercise.toLowerCase()]

  const tabs: { key: Tab; label: string }[] = [
    { key: 'volume', label: 'Volume' },
    { key: 'exercise_volume', label: 'Exercise Volume' },
    { key: 'prs', label: 'PR Progress' },
    { key: 'exercise', label: 'Exercise Trend' },
    { key: 'body', label: 'Body' },
    { key: 'cardio', label: 'Cardio' },
    { key: 'compare', label: 'Compare' },
  ]

  return (
    <PageTransition>
      <div className="space-y-6">
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">Analytics</h1>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-slate-800 rounded-xl w-fit flex-wrap">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? 'bg-blue-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Volume chart ─────────────────────────────────────── */}
        {tab === 'volume' && (
          <div className={card}>
            <h2 className="font-semibold text-slate-200 mb-4">Volume per Session</h2>
            {loading ? (
              <div className={`${skeleton} h-56`} />
            ) : volume.length === 0 ? (
              <p className="text-slate-500 text-center py-10">No data yet.</p>
            ) : (
              <>
                {/* Workout type filter — searchable dropdown, only names with 5+ sessions */}
                {volumeWorkout !== 'all' ? (
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`${input} flex-1 text-slate-100 cursor-default`}>{volumeWorkout}</div>
                    <button onClick={() => setVolumeWorkout('all')}
                      className="text-xs text-slate-500 hover:text-blue-400 transition-colors shrink-0">
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="relative mb-4">
                    <input
                      className={input}
                      value={volumeWorkoutFilter}
                      onChange={e => setVolumeWorkoutFilter(e.target.value)}
                      onFocus={() => setVolumeWorkoutShowPicker(true)}
                      onBlur={() => setTimeout(() => setVolumeWorkoutShowPicker(false), 150)}
                      placeholder="Filter by workout type… (showing all)"
                    />
                    {volumeWorkoutShowPicker && volumeWorkoutNames.length > 0 && (
                      <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                        {volumeWorkoutNames
                          .filter(n => volumeWorkoutFilter.trim() === '' || n.toLowerCase().includes(volumeWorkoutFilter.toLowerCase()))
                          .map(name => (
                            <button key={name} type="button"
                              onMouseDown={() => { setVolumeWorkout(name); setVolumeWorkoutFilter(''); setVolumeWorkoutShowPicker(false) }}
                              className="w-full px-3 py-2.5 hover:bg-slate-700/60 transition-colors text-left text-sm text-slate-200 border-b border-slate-700/50 last:border-0">
                              {name}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}
                <RangeButtons range={volumeRange} setRange={setVolumeRange} />
                {filteredVolume.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-500 text-sm">No data in this period.</p>
                    <p className="text-slate-600 text-xs mt-1">Try a wider time range or different workout type.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={filteredVolume.map(v => ({ date: v.date, volume: Math.round(toDisplayWeight(v.volume, units.weight)), name: v.workout_name }))}>
                      <defs>
                        <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 12 }} unit={` ${wt}`} width={70} />
                      <Tooltip content={<VolumeTooltip unit={wt} />} />
                      <Area type="monotone" dataKey="volume" stroke="#34d399" strokeWidth={2.5} fill="url(#volGrad)" dot={{ fill: '#34d399', r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Exercise Volume ───────────────────────────────────── */}
        {tab === 'exercise_volume' && (
          <div className={card}>
            <h2 className="font-semibold text-slate-200 mb-4">Exercise Volume Over Time</h2>
            <div className="mb-4">
              <LibraryPicker
                selected={exVolExercise} filter={exVolFilter} showPicker={exVolShowPicker} library={library}
                onFilterChange={v => setExVolFilter(v)}
                onFocus={() => setExVolShowPicker(true)}
                onBlur={() => setTimeout(() => setExVolShowPicker(false), 150)}
                onSelect={ex => { setExVolFilter(''); setExVolShowPicker(false); loadExVol(ex.name) }}
                onClear={() => { setExVolExercise(''); setExVolTrend([]) }}
                placeholder="Search exercises..."
              />
            </div>
            {exVolExercise && <RangeButtons range={exVolRange} setRange={setExVolRange} />}
            {exVolLoading ? (
              <div className={`${skeleton} h-56`} />
            ) : !exVolExercise ? (
              <p className="text-slate-500 text-center py-10 text-sm">Select an exercise above to see its volume trend.</p>
            ) : filteredExVol.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 text-sm">No data in this period.</p>
                <p className="text-slate-600 text-xs mt-1">Try a wider time range.</p>
              </div>
            ) : (
              <>
                <div className="text-xs text-slate-500 capitalize mb-2">{exVolExercise}</div>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={filteredExVol}>
                    <defs>
                      <linearGradient id="exVolGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} unit={` ${wt}`} width={70} />
                    <Tooltip content={<VolumeTooltip unit={wt} />} />
                    <Area type="monotone" dataKey="volume" stroke="#34d399" strokeWidth={2.5} fill="url(#exVolGrad)" dot={{ fill: '#34d399', r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        )}

        {/* ── PR Progress ───────────────────────────────────────── */}
        {tab === 'prs' && (
          <div className={card}>
            <h2 className="font-semibold text-slate-200 mb-4">PR Progress</h2>
            {loading || prListLoading ? (
              <div className={`${skeleton} h-56`} />
            ) : prList.length === 0 ? (
              <p className="text-slate-500 text-center py-10">Log some workouts to see your PRs.</p>
            ) : (
              <>
                {/* Exercise picker — replaces pill buttons */}
                {prExercise ? (
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`${input} flex-1 text-slate-100 cursor-default capitalize`}>{prExercise}</div>
                    <button type="button"
                      onClick={() => { setPrExercise(''); setPrHistory([]) }}
                      className="text-xs text-slate-500 hover:text-blue-400 transition-colors shrink-0">
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative mb-4">
                    <input
                      className={input}
                      value={prFilter}
                      onChange={e => setPrFilter(e.target.value)}
                      onFocus={() => setPrShowPicker(true)}
                      onBlur={() => setTimeout(() => setPrShowPicker(false), 150)}
                      placeholder="Search exercises..."
                    />
                    {prShowPicker && (
                      <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                        {prList
                          .filter(p => prFilter.trim() === '' || p.exercise.toLowerCase().includes(prFilter.toLowerCase()))
                          .map(p => (
                            <button key={p.exercise} type="button"
                              onMouseDown={() => { setPrFilter(''); setPrShowPicker(false); loadPRHistory(p.exercise) }}
                              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-700/60 transition-colors text-left border-b border-slate-700/50 last:border-0">
                              <span className="text-sm text-slate-200 capitalize">{p.exercise}</span>
                              <span className="text-xs text-amber-400 font-medium">{p.weight} lbs</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Time range only makes sense after an exercise is selected */}
                {prExercise && <RangeButtons range={prRange} setRange={setPrRange} />}
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
                        <Line type="monotone" dataKey="weight" stroke="#f59e0b" strokeWidth={2.5}
                          dot={{ fill: '#f59e0b', r: 4 }} activeDot={{ r: 6 }} name="PR Weight" />
                      </LineChart>
                    </ResponsiveContainer>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Exercise Trend ────────────────────────────────────── */}
        {tab === 'exercise' && (
          <div className={card}>
            <h2 className="font-semibold text-slate-200 mb-4">Exercise Trend</h2>
            <div className="mb-4">
              <LibraryPicker
                selected={trendExercise} filter={trendFilter} showPicker={trendShowPicker} library={library}
                onFilterChange={v => setTrendFilter(v)}
                onFocus={() => setTrendShowPicker(true)}
                onBlur={() => setTimeout(() => setTrendShowPicker(false), 150)}
                onSelect={ex => { setTrendFilter(''); setTrendShowPicker(false); loadTrend(ex.name) }}
                onClear={() => { setTrendExercise(''); setTrend([]) }}
                placeholder="Search exercises..."
              />
            </div>
            {trendLoading ? (
              <div className={`${skeleton} h-56`} />
            ) : !trendExercise ? (
              <p className="text-slate-500 text-center py-8 text-sm">Select an exercise above to see its trend.</p>
            ) : trend.length === 0 ? (
              <p className="text-slate-500 text-center py-8 text-sm">No data found for "{trendExercise}".</p>
            ) : (
              <>
                <div className="text-slate-400 text-sm mb-3 capitalize font-medium">{trendExercise}</div>
                <RangeButtons range={trendRange} setRange={setTrendRange} />
                {filteredTrend.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-500 text-sm">No data in this period.</p>
                    <p className="text-slate-600 text-xs mt-1">Try a wider time range.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={filteredTrend.map(t => ({ date: t.date, 'Max Weight': t.max_weight, 'Volume': Math.round(t.total_volume) }))}>
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
                )}
              </>
            )}
          </div>
        )}

        {/* ── Body Measurements ─────────────────────────────────── */}
        {tab === 'body' && (
          <div className={card}>
            <h2 className="font-semibold text-slate-200 mb-4">Body Measurements</h2>
            {loading ? (
              <div className={`${skeleton} h-56`} />
            ) : measurements.length === 0 ? (
              <p className="text-slate-500 text-center py-10 text-sm">
                No measurements yet. Go to <span className="text-blue-400">Measurements</span> to log your first entry.
              </p>
            ) : (
              <>
                {/* Field selector */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {MEASURE_FIELDS.map(f => (
                    <button key={f.key} onClick={() => setMeasureField(f.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        measureField === f.key
                          ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                      }`}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <RangeButtons range={measureRange} setRange={setMeasureRange} />
                {measureChartData.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-500 text-sm">No {MEASURE_FIELDS.find(f => f.key === measureField)?.label} data in this period.</p>
                    <p className="text-slate-600 text-xs mt-1">Try a wider time range.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={measureChartData}>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 12 }} unit={` ${measureFieldUnit}`} width={70} domain={['auto', 'auto']} />
                      <Tooltip content={<MeasureTooltip unit={measureFieldUnit} />} />
                      <Line type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={2.5}
                        dot={{ fill: '#a78bfa', r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Cardio ────────────────────────────────────────────── */}
        {tab === 'cardio' && (
          <div className={card}>
            <h2 className="font-semibold text-slate-200 mb-4">Cardio Trends</h2>
            {loading ? (
              <div className={`${skeleton} h-56`} />
            ) : cardioSessions.length === 0 ? (
              <p className="text-slate-500 text-center py-10 text-sm">
                No cardio sessions yet. Go to <span className="text-blue-400">Cardio</span> to log your first session.
              </p>
            ) : (
              <>
                {/* Activity filter */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {CARDIO_ACTIVITY_TYPES.map(t => (
                    <button key={t} onClick={() => setCardioActivity(t)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-colors ${
                        cardioActivity === t
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>

                {/* Metric selector */}
                <div className="flex gap-2 mb-4">
                  {CARDIO_METRICS.map(m => (
                    <button key={m} onClick={() => setCardioMetric(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        cardioMetric === m
                          ? 'bg-slate-600 text-slate-100 border-slate-500'
                          : 'text-slate-500 border-slate-700 hover:text-slate-300'
                      }`}>
                      {m === 'distance' ? `Distance (${du})` : m === 'duration' ? 'Duration (min)' : 'Avg HR (bpm)'}
                    </button>
                  ))}
                </div>

                <RangeButtons range={cardioRange} setRange={setCardioRange} />

                {filteredCardio.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-500 text-sm">No data in this period.</p>
                    <p className="text-slate-600 text-xs mt-1">Try a wider time range or different activity.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={filteredCardio}>
                      <defs>
                        <linearGradient id="cardioGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 12 }} unit={` ${cardioMetricLabel}`} width={70} />
                      <Tooltip content={<VolumeTooltip unit={cardioMetricLabel} />} />
                      <Area type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={2.5}
                        fill="url(#cardioGrad)" dot={{ fill: '#60a5fa', r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Compare tab ───────────────────────────────────────── */}
        {tab === 'compare' && <ComparePage embedded />}
      </div>
    </PageTransition>
  )
}
