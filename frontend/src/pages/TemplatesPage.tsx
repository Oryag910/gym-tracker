import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { listTemplates, deleteTemplate } from '../api/templates'
import type { TemplateSummary } from '../api/templates'
import { card, skeleton, btnPrimary, btnOutline, btnGhost, pageTitle, pageSubtitle, pageHeader } from '../styles/tokens'
import { plural } from '../utils/format'
import PageTransition from '../components/PageTransition'

function formatRest(sec: number) {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s ? `${m}m ${s}s` : `${m} min`
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

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this template?')) return
    setDeleting(id)
    await deleteTemplate(id)
    setTemplates(prev => prev.filter(t => t.id !== id))
    setDeleting(null)
  }

  return (
    <PageTransition>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className={pageHeader}>
          <div>
            <h1 className={pageTitle}>Templates</h1>
            <p className={pageSubtitle}>Saved workout structures. Start one for a guided, set-by-set session.</p>
          </div>
          <button onClick={() => navigate('/templates/new')} className={`${btnOutline} shrink-0`}>
            + New
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className={`${skeleton} h-24 rounded-xl`} />)}
          </div>
        ) : templates.length === 0 ? (
          <div className={`${card} text-center py-12`}>
            <p className="text-slate-300 font-medium">No templates yet</p>
            <p className="text-slate-500 text-sm mt-1">Create one to save a workout structure you can reuse.</p>
            <button onClick={() => navigate('/templates/new')} className={`${btnPrimary} mt-4`}>
              Create a template
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
                className={card}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-100 truncate">{t.name}</div>
                    {t.description && (
                      <div className="text-slate-400 text-sm mt-0.5 truncate">{t.description}</div>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                      <span className="whitespace-nowrap">{plural(t.exercise_count, 'exercise')}</span>
                      <span className="whitespace-nowrap">Set rest {formatRest(t.default_set_rest)}</span>
                      <span className="whitespace-nowrap">Exercise rest {formatRest(t.default_exercise_rest)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/workout/guided/${t.id}`)}
                    className={`${btnPrimary} shrink-0`}
                  >
                    Start workout
                  </button>
                </div>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-700/60 -mx-1">
                  <button onClick={() => navigate(`/templates/${t.id}`)} className={btnGhost}>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deleting === t.id}
                    className={`${btnGhost} hover:text-red-400`}
                  >
                    {deleting === t.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
