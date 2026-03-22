import { View, Text } from 'react-native'
import Svg, { Ellipse, Rect, Path, Line } from 'react-native-svg'
import { C } from '../constants/colors'

interface Props { primary: string[]; secondary: string[] }

const PRIMARY = 'rgba(96,165,250,0.85)'
const SECONDARY = 'rgba(52,211,153,0.65)'
const INACTIVE = '#334155'
const OUTLINE = '#475569'

function fill(muscle: string, primary: string[], secondary: string[]) {
  if (primary.includes(muscle)) return PRIMARY
  if (secondary.includes(muscle)) return SECONDARY
  return INACTIVE
}

function FrontBody({ primary, secondary }: Props) {
  const f = (m: string) => fill(m, primary, secondary)
  return (
    <Svg viewBox="0 0 120 260" width="100%" height="100%" fill="none">
      <Ellipse cx="60" cy="22" rx="16" ry="18" fill={INACTIVE} stroke={OUTLINE} strokeWidth="1"/>
      <Rect x="54" y="38" width="12" height="10" rx="2" fill={INACTIVE} stroke={OUTLINE} strokeWidth="1"/>
      <Path d="M40 48 Q60 44 80 48 L78 58 Q60 54 42 58 Z" fill={f('traps')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="34" cy="62" rx="12" ry="10" fill={f('shoulders')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="86" cy="62" rx="12" ry="10" fill={f('shoulders')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Path d="M44 58 Q60 54 76 58 L76 84 Q68 90 60 88 Q52 90 44 84 Z" fill={f('chest')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="26" cy="82" rx="9" ry="18" fill={f('biceps')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="94" cy="82" rx="9" ry="18" fill={f('biceps')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="22" cy="116" rx="7" ry="16" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="98" cy="116" rx="7" ry="16" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <Path d="M48 88 Q60 84 72 88 L72 140 Q60 144 48 140 Z" fill={f('abs')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Line x1="50" y1="100" x2="70" y2="100" stroke={OUTLINE} strokeWidth="0.6" opacity="0.5"/>
      <Line x1="50" y1="113" x2="70" y2="113" stroke={OUTLINE} strokeWidth="0.6" opacity="0.5"/>
      <Line x1="50" y1="126" x2="70" y2="126" stroke={OUTLINE} strokeWidth="0.6" opacity="0.5"/>
      <Line x1="60" y1="88" x2="60" y2="140" stroke={OUTLINE} strokeWidth="0.6" opacity="0.5"/>
      <Ellipse cx="50" cy="186" rx="14" ry="32" fill={f('quads')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="70" cy="186" rx="14" ry="32" fill={f('quads')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="50" cy="222" rx="10" ry="8" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="70" cy="222" rx="10" ry="8" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="50" cy="244" rx="8" ry="14" fill={f('calves')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="70" cy="244" rx="8" ry="14" fill={f('calves')} stroke={OUTLINE} strokeWidth="0.8"/>
    </Svg>
  )
}

function BackBody({ primary, secondary }: Props) {
  const f = (m: string) => fill(m, primary, secondary)
  return (
    <Svg viewBox="0 0 120 260" width="100%" height="100%" fill="none">
      <Ellipse cx="60" cy="22" rx="16" ry="18" fill={INACTIVE} stroke={OUTLINE} strokeWidth="1"/>
      <Rect x="54" y="38" width="12" height="10" rx="2" fill={INACTIVE} stroke={OUTLINE} strokeWidth="1"/>
      <Path d="M40 48 Q60 43 80 48 L80 70 Q60 66 40 70 Z" fill={f('traps')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="32" cy="65" rx="12" ry="10" fill={f('shoulders')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="88" cy="65" rx="12" ry="10" fill={f('shoulders')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Path d="M42 70 Q60 66 78 70 L80 108 Q60 116 40 108 Z" fill={f('lats')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="26" cy="85" rx="9" ry="18" fill={f('triceps')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="94" cy="85" rx="9" ry="18" fill={f('triceps')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="22" cy="116" rx="7" ry="16" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="98" cy="116" rx="7" ry="16" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="50" cy="160" rx="16" ry="14" fill={f('glutes')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="70" cy="160" rx="16" ry="14" fill={f('glutes')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="50" cy="196" rx="14" ry="28" fill={f('hamstrings')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="70" cy="196" rx="14" ry="28" fill={f('hamstrings')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="50" cy="224" rx="10" ry="8" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="70" cy="224" rx="10" ry="8" fill={INACTIVE} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="50" cy="244" rx="8" ry="14" fill={f('calves')} stroke={OUTLINE} strokeWidth="0.8"/>
      <Ellipse cx="70" cy="244" rx="8" ry="14" fill={f('calves')} stroke={OUTLINE} strokeWidth="0.8"/>
    </Svg>
  )
}

export default function MuscleMap({ primary, secondary }: Props) {
  if (primary.length === 0 && secondary.length === 0) return null
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', height: 160, gap: 8 }}>
        <View style={{ flex: 1, maxWidth: 100 }}>
          <Text style={{ textAlign: 'center', fontSize: 10, color: C.muted, marginBottom: 2 }}>Front</Text>
          <FrontBody primary={primary} secondary={secondary} />
        </View>
        <View style={{ flex: 1, maxWidth: 100 }}>
          <Text style={{ textAlign: 'center', fontSize: 10, color: C.muted, marginBottom: 2 }}>Back</Text>
          <BackBody primary={primary} secondary={secondary} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 6 }}>
        {primary.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.blue }} />
            <Text style={{ fontSize: 10, color: C.muted }}>Primary: {primary.join(', ')}</Text>
          </View>
        )}
        {secondary.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.emerald }} />
            <Text style={{ fontSize: 10, color: C.muted }}>Secondary: {secondary.join(', ')}</Text>
          </View>
        )}
      </View>
    </View>
  )
}
