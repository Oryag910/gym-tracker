/**
 * MuscleMap — renders a front + back body silhouette with highlighted muscles.
 * Primary muscles: blue. Secondary muscles: green. Inactive: slate.
 */

export type MuscleGroup =
  | 'chest' | 'shoulders' | 'biceps' | 'abs' | 'quads'     // front
  | 'triceps' | 'lats' | 'traps' | 'hamstrings' | 'glutes' | 'calves' // back

interface Props {
  primary: string[]
  secondary: string[]
}

const PRIMARY = 'rgba(96,165,250,0.85)'   // blue-400
const SECONDARY = 'rgba(52,211,153,0.65)' // emerald-400
const INACTIVE = '#334155'                 // slate-700
const OUTLINE = '#475569'                  // slate-600

function fill(muscle: string, primary: string[], secondary: string[]) {
  if (primary.includes(muscle)) return PRIMARY
  if (secondary.includes(muscle)) return SECONDARY
  return INACTIVE
}

function FrontBody({ primary, secondary }: Props) {
  const f = (m: string) => fill(m, primary, secondary)
  return (
    <svg viewBox="0 0 120 260" className="w-full h-full" fill="none">
      {/* Head */}
      <ellipse cx="60" cy="22" rx="16" ry="18" fill={INACTIVE} stroke={OUTLINE} strokeWidth="1"/>
      {/* Neck */}
      <rect x="54" y="38" width="12" height="10" rx="2" fill={INACTIVE} stroke={OUTLINE} strokeWidth="1"/>

      {/* Traps (front) */}
      <path d="M40 48 Q60 44 80 48 L78 58 Q60 54 42 58 Z" fill={f('traps')} stroke={OUTLINE} strokeWidth="0.8"/>

      {/* Shoulders */}
      <ellipse cx="34" cy="62" rx="12" ry="10" fill={f('shoulders')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="86" cy="62" rx="12" ry="10" fill={f('shoulders')} stroke={OUTLINE} strokeWidth="0.8"/>

      {/* Chest */}
      <path d="M44 58 Q60 54 76 58 L76 84 Q68 90 60 88 Q52 90 44 84 Z" fill={f('chest')} stroke={OUTLINE} strokeWidth="0.8"/>

      {/* Biceps */}
      <ellipse cx="26" cy="82" rx="9" ry="18" fill={f('biceps')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="94" cy="82" rx="9" ry="18" fill={f('biceps')} stroke={OUTLINE} strokeWidth="0.8"/>

      {/* Forearms */}
      <ellipse cx="22" cy="116" rx="7" ry="16" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="98" cy="116" rx="7" ry="16" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>

      {/* Abs */}
      <path d="M48 88 Q60 84 72 88 L72 140 Q60 144 48 140 Z" fill={f('abs')} stroke={OUTLINE} strokeWidth="0.8"/>
      {/* Abs grid lines */}
      {[100, 113, 126].map(y => (
        <line key={y} x1="50" y1={y} x2="70" y2={y} stroke={OUTLINE} strokeWidth="0.6" opacity="0.5"/>
      ))}
      <line x1="60" y1="88" x2="60" y2="140" stroke={OUTLINE} strokeWidth="0.6" opacity="0.5"/>

      {/* Hip / obliques */}
      <path d="M44 140 L48 140 L48 155 Q44 158 40 155 Z" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <path d="M76 140 L72 140 L72 155 Q76 158 80 155 Z" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>

      {/* Quads */}
      <ellipse cx="50" cy="186" rx="14" ry="32" fill={f('quads')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="70" cy="186" rx="14" ry="32" fill={f('quads')} stroke={OUTLINE} strokeWidth="0.8"/>

      {/* Knees */}
      <ellipse cx="50" cy="222" rx="10" ry="8" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="70" cy="222" rx="10" ry="8" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>

      {/* Calves (front shin) */}
      <ellipse cx="50" cy="244" rx="8" ry="14" fill={f('calves')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="70" cy="244" rx="8" ry="14" fill={f('calves')} stroke={OUTLINE} strokeWidth="0.8"/>
    </svg>
  )
}

function BackBody({ primary, secondary }: Props) {
  const f = (m: string) => fill(m, primary, secondary)
  return (
    <svg viewBox="0 0 120 260" className="w-full h-full" fill="none">
      {/* Head */}
      <ellipse cx="60" cy="22" rx="16" ry="18" fill={INACTIVE} stroke={OUTLINE} strokeWidth="1"/>
      {/* Neck */}
      <rect x="54" y="38" width="12" height="10" rx="2" fill={INACTIVE} stroke={OUTLINE} strokeWidth="1"/>

      {/* Traps */}
      <path d="M40 48 Q60 43 80 48 L80 70 Q60 66 40 70 Z" fill={f('traps')} stroke={OUTLINE} strokeWidth="0.8"/>

      {/* Shoulders (rear delt) */}
      <ellipse cx="32" cy="65" rx="12" ry="10" fill={f('shoulders')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="88" cy="65" rx="12" ry="10" fill={f('shoulders')} stroke={OUTLINE} strokeWidth="0.8"/>

      {/* Lats */}
      <path d="M42 70 Q60 66 78 70 L80 108 Q60 116 40 108 Z" fill={f('lats')} stroke={OUTLINE} strokeWidth="0.8"/>

      {/* Triceps */}
      <ellipse cx="26" cy="85" rx="9" ry="18" fill={f('triceps')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="94" cy="85" rx="9" ry="18" fill={f('triceps')} stroke={OUTLINE} strokeWidth="0.8"/>

      {/* Forearms */}
      <ellipse cx="22" cy="116" rx="7" ry="16" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="98" cy="116" rx="7" ry="16" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>

      {/* Lower back */}
      <path d="M46 108 Q60 112 74 108 L74 148 Q60 152 46 148 Z" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>

      {/* Glutes */}
      <ellipse cx="50" cy="160" rx="16" ry="14" fill={f('glutes')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="70" cy="160" rx="16" ry="14" fill={f('glutes')} stroke={OUTLINE} strokeWidth="0.8"/>

      {/* Hamstrings */}
      <ellipse cx="50" cy="196" rx="14" ry="28" fill={f('hamstrings')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="70" cy="196" rx="14" ry="28" fill={f('hamstrings')} stroke={OUTLINE} strokeWidth="0.8"/>

      {/* Knees */}
      <ellipse cx="50" cy="224" rx="10" ry="8" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="70" cy="224" rx="10" ry="8" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>

      {/* Calves */}
      <ellipse cx="50" cy="244" rx="8" ry="14" fill={f('calves')} stroke={OUTLINE} strokeWidth="0.8"/>
      <ellipse cx="70" cy="244" rx="8" ry="14" fill={f('calves')} stroke={OUTLINE} strokeWidth="0.8"/>
    </svg>
  )
}

export default function MuscleMap({ primary, secondary }: Props) {
  const hasMuscles = primary.length > 0 || secondary.length > 0
  if (!hasMuscles) return null

  return (
    <div className="select-none">
      <div className="flex gap-2 justify-center" style={{ height: 160 }}>
        <div className="flex-1 max-w-[100px]">
          <div className="text-center text-[10px] text-slate-500 mb-1">Front</div>
          <FrontBody primary={primary} secondary={secondary} />
        </div>
        <div className="flex-1 max-w-[100px]">
          <div className="text-center text-[10px] text-slate-500 mb-1">Back</div>
          <BackBody primary={primary} secondary={secondary} />
        </div>
      </div>
      {/* Legend */}
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
