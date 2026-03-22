import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area
} from 'recharts'
import { getPRs, getPRHistory } from '../api/stats'
import type { PREntry, PRHistoryPoint } from '../api/stats'
import { card, skeleton } from '../styles/tokens'
import PageTransition from '../components/PageTransition'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-sm">
      <div className="text-slate-400">{label}</div>
      <div className="text-blue-400 font-bold">{payload[0].value} lbs</div>
    </div>
  )
}

export default function PRPage() {
  const [prs, setPRs] = useState<PREntry[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [history, setHistory] = useState<PRHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPRs().then((r) => { setPRs(r.data); setLoading(false) })
  }, [])

  const handleSelect = async (exercise: string) => {
    if (selected === exercise) { setSelected(null); return }
    setSelected(exercise)
    const r = await getPRHistory(exercise)
    setHistory(r.data)
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">Personal Records</h1>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className={`${skeleton} h-20`} />)}
          </div>
        ) : prs.length === 0 ? (
          <div className={`${card} text-center py-12`}>
            <div className="text-4xl mb-3">🏆</div>
            <div className="text-slate-300 font-medium">No PRs yet</div>
            <p className="text-slate-500 text-sm mt-1">Log workouts with weights to track PRs</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {prs.map((pr, i) => (
              <motion.div
                key={pr.exercise}
                layout
                layoutId={`pr-${pr.exercise}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleSelect(pr.exercise)}
                className={`bg-slate-800 border rounded-xl p-4 cursor-pointer transition-colors ${
                  selected === pr.exercise
                    ? 'border-blue-400/60 bg-slate-700/80'
                    : 'border-slate-700 hover:border-blue-400/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-slate-100 text-sm capitalize">{pr.exercise}</div>
                    <div className="text-slate-500 text-xs mt-0.5">{pr.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-blue-400 leading-none">{pr.weight}</div>
                    <div className="text-slate-500 text-xs">lbs</div>
                  </div>
                </div>

                <AnimatePresence>
                  {selected === pr.exercise && history.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 overflow-hidden"
                    >
                      <div className="text-xs text-slate-500 mb-2">PR progression</div>
                      <ResponsiveContainer width="100%" height={120}>
                        <AreaChart data={history.map(p => ({ date: p.date, weight: p.weight }))}>
                          <defs>
                            <linearGradient id={`grad-${pr.exercise}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} unit=" lbs" width={55} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="weight"
                            stroke="#60a5fa"
                            strokeWidth={2}
                            fill={`url(#grad-${pr.exercise})`}
                            dot={{ fill: '#60a5fa', r: 3 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
