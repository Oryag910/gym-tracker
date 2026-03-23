import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { listTemplates, deleteTemplate } from '../api/templates'
import type { TemplateSummary } from '../api/templates'
import { card, skeleton } from '../styles/tokens'
import PageTransition from '../components/PageTransition'

function formatRest(sec: number) {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s ? `${m}m ${s}s` : `${m}m`
}

export default function TemplatesPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    listTemplates().then(r => { setTemplates(r.data); setLoading(false) })
  }
  useEffect(load, [])

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('Delete this template?')) return
    setDeleting(id)
    await deleteTemplate(id)
    setTemplates(prev => prev.filter(t => t.id !== id))
    setDeleting(null)
  }

  return (
    <PageTransition>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Templates</h1>
          <button
            onClick={() => navigate('/templates/new')}
            className="bg-blue-500 text-slate-950 font-bold text-sm px-4 py-2 rounded-xl hover:bg-blue-400 transition-colors"
          >
            + New Template
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className={`${skeleton} h-20 rounded-xl`} />)}
          </div>
        ) : templates.length === 0 ? (
          <div className={`${card} text-center py-12`}>
            <p className="text-slate-400 mb-2">No templates yet.</p>
            <p className="text-slate-500 text-sm">Create one to save a workout structure you can reuse.</p>
            <button
              onClick={() => navigate('/templates/new')}
              className="mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              Create your first template →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`${card} cursor-pointer hover:border-slate-600 transition-colors`}
                onClick={() => navigate(`/templates/${t.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-100 truncate">{t.name}</div>
                    {t.description && (
                      <div className="text-slate-500 text-xs mt-0.5 truncate">{t.description}</div>
                    )}
                    <div className="flex gap-3 mt-2 text-xs text-slate-500">
                      <span>{t.exercise_count} exercise{t.exercise_count !== 1 ? 's' : ''}</span>
                      <span>Set rest: {formatRest(t.default_set_rest)}</span>
                      <span>Exercise rest: {formatRest(t.default_exercise_rest)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/workout/guided/${t.id}`) }}
                      className="bg-blue-500/15 border border-blue-500/40 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-500/25 transition-colors"
                    >
                      Start
                    </button>
                    <button
                      onClick={e => handleDelete(e, t.id)}
                      disabled={deleting === t.id}
                      className="text-slate-600 hover:text-red-400 transition-colors text-xs px-2 py-1.5"
                    >
                      {deleting === t.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
