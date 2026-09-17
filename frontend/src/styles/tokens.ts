// Shared Tailwind class strings — reuse these across pages
// instead of writing the same classes repeatedly.

// ── Surfaces ────────────────────────────────────────────────────────────────
export const card = 'bg-slate-800 rounded-xl p-5 border border-slate-700'
export const cardHover = 'bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-blue-400/50 cursor-pointer transition-colors'
// Clickable list row (workout history, recent workouts)
export const listRow =
  'flex items-center justify-between bg-slate-800 hover:bg-slate-700/70 border border-slate-700 hover:border-slate-500 rounded-xl px-4 sm:px-5 py-3.5 cursor-pointer transition-colors'

// ── Forms ───────────────────────────────────────────────────────────────────
export const input =
  'bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 w-full focus:border-blue-400 focus:outline-none transition-colors placeholder:text-slate-500 text-sm'
export const label = 'block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide'

// ── Buttons ─────────────────────────────────────────────────────────────────
export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 bg-blue-500 text-slate-950 font-semibold rounded-lg px-4 py-2.5 text-sm hover:bg-blue-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400'
export const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 bg-slate-700 text-slate-200 font-medium rounded-lg px-4 py-2 text-sm hover:bg-slate-600 active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400'
// Outlined, low-emphasis action (Edit, Skip, Load more)
export const btnOutline =
  'inline-flex items-center justify-center gap-1.5 border border-slate-600 text-slate-300 font-medium rounded-lg px-4 py-2 text-sm hover:border-slate-400 hover:text-slate-100 active:scale-[0.98] transition-all disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400'
export const btnDanger =
  'inline-flex items-center justify-center border border-red-500/40 text-red-400 rounded-lg px-4 py-2 text-sm hover:bg-red-500/10 active:scale-[0.98] transition-all'
export const btnGhost =
  'text-slate-400 hover:text-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-700/50 transition-all text-sm'

// ── Text ────────────────────────────────────────────────────────────────────
export const badge =
  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20'
export const muted = 'text-slate-400 text-sm'
export const pageTitle = 'text-2xl font-bold text-slate-100 tracking-tight'
export const pageSubtitle = 'text-slate-500 text-sm mt-0.5'
// Small uppercase label used above sections and groups
export const sectionLabel = 'text-xs font-semibold text-slate-500 uppercase tracking-wider'
// Title inside a card
export const cardTitle = 'text-base font-semibold text-slate-200'
export const sectionTitle = 'text-lg font-semibold text-slate-200 mb-4'
// Big numeric readout (dashboard stats, PR values)
export const stat = 'text-3xl font-bold tracking-tight tabular-nums'

// ── Layout ──────────────────────────────────────────────────────────────────
// Page header: title on the left, primary action on the right
export const pageHeader = 'flex items-start justify-between gap-4'

// Skeleton loader
export const skeleton = 'bg-slate-700/50 rounded-lg animate-pulse'
