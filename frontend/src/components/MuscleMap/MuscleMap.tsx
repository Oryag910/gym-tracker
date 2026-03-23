/**
 * MuscleMap — renders a front + back anatomical diagram using wger.de PNG overlays.
 * Primary muscles: red overlay. Secondary muscles: orange overlay.
 * Falls back to legacy SVG silhouette if no muscle IDs are provided.
 */

export type MuscleGroup =
  | 'chest' | 'shoulders' | 'biceps' | 'abs' | 'quads'
  | 'triceps' | 'lats' | 'traps' | 'hamstrings' | 'glutes' | 'calves'

interface Props {
  primary: string[]
  secondary: string[]
  primaryIds?: number[]
  secondaryIds?: number[]
}

// wger static images — self-hosted in /public/muscles/ to avoid hotlink blocking
const FRONT_BASE = '/muscles/muscular_system_front.svg'
const BACK_BASE = '/muscles/muscular_system_back.svg'
const primaryOverlay = (id: number) => `/muscles/main/muscle-${id}.svg`
const secondaryOverlay = (id: number) => `/muscles/secondary/muscle-${id}.svg`

// Which muscle IDs belong to each view
const FRONT_IDS = new Set([1, 2, 3, 4, 9, 13])
const BACK_IDS = new Set([5, 6, 7, 8, 10, 11, 12, 14])

function WgerDiagram({
  view, primaryIds, secondaryIds,
}: {
  view: 'front' | 'back'
  primaryIds: number[]
  secondaryIds: number[]
}) {
  const base = view === 'front' ? FRONT_BASE : BACK_BASE
  const relevant = view === 'front' ? FRONT_IDS : BACK_IDS

  const priOverlays = primaryIds.filter((id) => relevant.has(id))
  const secOverlays = secondaryIds.filter((id) => relevant.has(id))

  return (
    <div className="relative w-full" style={{ paddingBottom: '216%' }}>
      <img
        src={base}
        alt={`${view} body`}
        className="absolute inset-0 w-full h-full object-contain"
        loading="lazy"
      />
      {secOverlays.map((id) => (
        <img
          key={`sec-${id}`}
          src={secondaryOverlay(id)}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          loading="lazy"
        />
      ))}
      {priOverlays.map((id) => (
        <img
          key={`pri-${id}`}
          src={primaryOverlay(id)}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          loading="lazy"
        />
      ))}
    </div>
  )
}

// ── Legacy SVG fallback (used when no muscle IDs are available) ───────────────

const PRIMARY_COLOR = 'rgba(96,165,250,0.85)'
const SECONDARY_COLOR = 'rgba(52,211,153,0.65)'
const INACTIVE = '#334155'
const OUTLINE = '#475569'

function svgFill(muscle: string, primary: string[], secondary: string[]) {
  if (primary.includes(muscle)) return PRIMARY_COLOR
  if (secondary.includes(muscle)) return SECONDARY_COLOR
  return INACTIVE
}

function LegacySVGFront({ primary, secondary }: { primary: string[]; secondary: string[] }) {
  const f = (m: string) => svgFill(m, primary, secondary)
  return (
    <svg viewBox="0 0 120 260" className="w-full h-full" fill="none">
      <ellipse cx="60" cy="22" rx="16" ry="18" fill={INACTIVE} stroke={OUTLINE} strokeWidth="1"/>
      <rect x="54" y="38" width="12" height="10" rx="2" fill={INACTIVE} stroke={OUTLINE} strokeWidth="1"/>
      <path d="M40 48 Q60 44 80 48 L78 58 Q60 54 42 58 Z" fill={f('traps')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="34" cy="62" rx="12" ry="10" fill={f('shoulders')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="86" cy="62" rx="12" ry="10" fill={f('shoulders')} stroke={OUTLINE} strokeWidth="0.8"/>
      <path d="M44 58 Q60 54 76 58 L76 84 Q68 90 60 88 Q52 90 44 84 Z" fill={f('chest')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="26" cy="82" rx="9" ry="18" fill={f('biceps')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="94" cy="82" rx="9" ry="18" fill={f('biceps')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="22" cy="116" rx="7" ry="16" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="98" cy="116" rx="7" ry="16" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <path d="M48 88 Q60 84 72 88 L72 140 Q60 144 48 140 Z" fill={f('abs')} stroke={OUTLINE} strokeWidth="0.8"/>
      <line x1="50" y1="100" x2="70" y2="100" stroke={OUTLINE} strokeWidth="0.6" opacity="0.5"/>
      <line x1="50" y1="113" x2="70" y2="113" stroke={OUTLINE} strokeWidth="0.6" opacity="0.5"/>
      <line x1="50" y1="126" x2="70" y2="126" stroke={OUTLINE} strokeWidth="0.6" opacity="0.5"/>
      <line x1="60" y1="88" x2="60" y2="140" stroke={OUTLINE} strokeWidth="0.6" opacity="0.5"/>
      <ellipse cx="50" cy="186" rx="14" ry="32" fill={f('quads')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="70" cy="186" rx="14" ry="32" fill={f('quads')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="50" cy="222" rx="10" ry="8" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="70" cy="222" rx="10" ry="8" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="50" cy="244" rx="8" ry="14" fill={f('calves')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="70" cy="244" rx="8" ry="14" fill={f('calves')} stroke={OUTLINE} strokeWidth="0.8"/>
    </svg>
  )
}

function LegacySVGBack({ primary, secondary }: { primary: string[]; secondary: string[] }) {
  const f = (m: string) => svgFill(m, primary, secondary)
  return (
    <svg viewBox="0 0 120 260" className="w-full h-full" fill="none">
      <ellipse cx="60" cy="22" rx="16" ry="18" fill={INACTIVE} stroke={OUTLINE} strokeWidth="1"/>
      <rect x="54" y="38" width="12" height="10" rx="2" fill={INACTIVE} stroke={OUTLINE} strokeWidth="1"/>
      <path d="M40 48 Q60 43 80 48 L80 70 Q60 66 40 70 Z" fill={f('traps')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="32" cy="65" rx="12" ry="10" fill={f('shoulders')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="88" cy="65" rx="12" ry="10" fill={f('shoulders')} stroke={OUTLINE} strokeWidth="0.8"/>
      <path d="M42 70 Q60 66 78 70 L80 108 Q60 116 40 108 Z" fill={f('lats')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="26" cy="85" rx="9" ry="18" fill={f('triceps')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="94" cy="85" rx="9" ry="18" fill={f('triceps')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="22" cy="116" rx="7" ry="16" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="98" cy="116" rx="7" ry="16" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="50" cy="160" rx="16" ry="14" fill={f('glutes')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="70" cy="160" rx="16" ry="14" fill={f('glutes')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="50" cy="196" rx="14" ry="28" fill={f('hamstrings')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="70" cy="196" rx="14" ry="28" fill={f('hamstrings')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="50" cy="224" rx="10" ry="8" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="70" cy="224" rx="10" ry="8" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="50" cy="244" rx="8" ry="14" fill={f('calves')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="70" cy="244" rx="8" ry="14" fill={f('calves')} stroke={OUTLINE} strokeWidth="0.8"/>
    </svg>
  )
}

function LegacySVGMuscleMap({ primary, secondary }: { primary: string[]; secondary: string[] }) {
  return (
    <div className="select-none">
      <div className="flex gap-2 justify-center" style={{ height: 160 }}>
        <div className="flex-1 max-w-[100px]">
          <div className="text-center text-[10px] text-slate-500 mb-1">Front</div>
          <LegacySVGFront primary={primary} secondary={secondary} />
        </div>
        <div className="flex-1 max-w-[100px]">
          <div className="text-center text-[10px] text-slate-500 mb-1">Back</div>
          <LegacySVGBack primary={primary} secondary={secondary} />
        </div>
      </div>
      <div className="flex gap-4 justify-center mt-2">
        {primary.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <span className="text-[10px] text-slate-500">Primary: {primary.join(', ')}</span>
          </div>
        )}
        {secondary.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-slate-500">Secondary: {secondary.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function MuscleMap({ primary, secondary, primaryIds = [], secondaryIds = [] }: Props) {
  const hasMuscles = primary.length > 0 || secondary.length > 0
  const hasIds = primaryIds.length > 0 || secondaryIds.length > 0

  if (!hasMuscles && !hasIds) return null

  // Fall back to SVG silhouette if no wger IDs available
  if (!hasIds) return <LegacySVGMuscleMap primary={primary} secondary={secondary} />

  return (
    <div className="select-none">
      <div className="flex gap-6 justify-center">
        <div className="w-[80px]">
          <div className="text-center text-[10px] text-slate-500 mb-1">Front</div>
          <WgerDiagram view="front" primaryIds={primaryIds} secondaryIds={secondaryIds} />
        </div>
        <div className="w-[80px]">
          <div className="text-center text-[10px] text-slate-500 mb-1">Back</div>
          <WgerDiagram view="back" primaryIds={primaryIds} secondaryIds={secondaryIds} />
        </div>
      </div>
      <div className="flex gap-4 justify-center mt-3 flex-wrap">
        {primary.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="text-[10px] text-slate-500">Primary: {primary.join(', ')}</span>
          </div>
        )}
        {secondary.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
            <span className="text-[10px] text-slate-500">Secondary: {secondary.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  )
}
