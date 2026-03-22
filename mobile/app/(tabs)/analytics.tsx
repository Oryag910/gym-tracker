import { useEffect, useState } from 'react'
import {
  View, Text, Pressable, ScrollView, TextInput,
  ActivityIndicator, StyleSheet
} from 'react-native'
import {
  getVolume, getExerciseTrend, compareWorkouts,
  getPRs, VolumePoint, TrendPoint, CompareResponse, PREntry
} from '../../src/api/stats'
import { listWorkouts, WorkoutSummary } from '../../src/api/workouts'
import { C } from '../../src/constants/colors'
import { S } from '../../src/constants/styles'
import { CartesianChart, Area, Line } from 'victory-native'

type Tab = 'volume' | 'trend' | 'compare'

function VolumeTab() {
  const [data, setData] = useState<VolumePoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getVolume().then((r) => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} />
  if (data.length === 0) return <Text style={[S.subtitle, { padding: 24 }]}>No volume data yet</Text>

  const chartData = data.map((d, i) => ({ x: i, y: d.volume }))

  return (
    <View style={{ padding: 16 }}>
      <Text style={[S.label, { marginBottom: 8 }]}>Volume per Session (lbs)</Text>
      <View style={{ height: 200, backgroundColor: C.surface, borderRadius: 12, padding: 8 }}>
        <CartesianChart data={chartData} xKey="x" yKeys={["y"]}>
          {({ points, chartBounds }) => (
            <Area points={points.y} y0={chartBounds.bottom} color={C.blue} opacity={0.6} />
          )}
        </CartesianChart>
      </View>
      <View style={{ marginTop: 12, gap: 6 }}>
        {data.slice(-5).reverse().map((d, i) => (
          <View key={i} style={[S.card, { marginBottom: 0, paddingVertical: 10 }]}>
            <View style={S.row}>
              <Text style={{ color: C.text, flex: 1, fontSize: 14 }}>{d.workout_name}</Text>
              <Text style={{ color: C.blue, fontWeight: '700' }}>{Math.round(d.volume).toLocaleString()} lbs</Text>
            </View>
            <Text style={S.subtitle}>{d.date}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function TrendTab() {
  const [input, setInput] = useState('')
  const [data, setData] = useState<TrendPoint[]>([])
  const [prs, setPRs] = useState<PREntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getPRs().then((r) => setPRs(r.data)).catch(() => {})
  }, [])

  const load = async () => {
    if (!input.trim()) return
    setLoading(true)
    const r = await getExerciseTrend(input.trim()).then((r) => r.data).catch(() => [])
    setData(r)
    setLoading(false)
  }

  const pr = prs.find((p) => p.exercise.toLowerCase() === input.toLowerCase())
  const chartData = data.map((d, i) => ({ x: i, y: d.max_weight ?? 0 }))

  return (
    <View style={{ padding: 16 }}>
      <View style={[S.row, { gap: 8, marginBottom: 16 }]}>
        <TextInput
          style={[S.input, { flex: 1 }]}
          value={input}
          onChangeText={setInput}
          placeholder="Exercise name..."
          placeholderTextColor={C.muted}
          onSubmitEditing={load}
          returnKeyType="search"
        />
        <Pressable style={[S.btnPrimary, { paddingVertical: 10, paddingHorizontal: 14 }]} onPress={load}>
          <Text style={S.btnPrimaryText}>Load</Text>
        </Pressable>
      </View>

      {loading ? <ActivityIndicator color={C.blue} /> : data.length > 1 ? (
        <>
          {pr && <Text style={{ color: C.emerald, marginBottom: 8, fontSize: 13 }}>PR: {pr.weight} lbs on {pr.date}</Text>}
          <View style={{ height: 200, backgroundColor: C.surface, borderRadius: 12, padding: 8 }}>
            <CartesianChart data={chartData} xKey="x" yKeys={["y"]}>
              {({ points, chartBounds }) => (
                <Line points={points.y} color={C.blue} strokeWidth={2} />
              )}
            </CartesianChart>
          </View>
        </>
      ) : data.length > 0 ? (
        <Text style={S.subtitle}>Not enough data to show a trend</Text>
      ) : null}
    </View>
  )
}

function CompareTab() {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([])
  const [a, setA] = useState<number | null>(null)
  const [b, setB] = useState<number | null>(null)
  const [result, setResult] = useState<CompareResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    listWorkouts().then((r) => setWorkouts(r.data)).finally(() => setFetching(false))
  }, [])

  const compare = async () => {
    if (!a || !b || a === b) return
    setLoading(true)
    const r = await compareWorkouts(a, b).then((r) => r.data).catch(() => null)
    setResult(r)
    setLoading(false)
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={[S.label, { marginBottom: 8 }]}>Select Workout A</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {workouts.map((w) => (
          <Pressable key={w.id} onPress={() => setA(w.id)}
            style={[cs.pill, a === w.id && cs.pillActive]}>
            <Text style={{ color: a === w.id ? '#020617' : C.text, fontSize: 12 }}>{w.name} ({w.date})</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={[S.label, { marginBottom: 8 }]}>Select Workout B</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {workouts.map((w) => (
          <Pressable key={w.id} onPress={() => setB(w.id)}
            style={[cs.pill, b === w.id && cs.pillActive]}>
            <Text style={{ color: b === w.id ? '#020617' : C.text, fontSize: 12 }}>{w.name} ({w.date})</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable style={S.btnPrimary} onPress={compare} disabled={!a || !b || a === b || loading}>
        {loading ? <ActivityIndicator color={C.bg} /> : <Text style={S.btnPrimaryText}>Compare</Text>}
      </Pressable>

      {result && (
        <View style={{ marginTop: 20 }}>
          <View style={[S.row, { marginBottom: 8 }]}>
            <Text style={{ color: C.text, flex: 1, fontWeight: '700' }}>Exercise</Text>
            <Text style={{ color: C.blue, flex: 1, textAlign: 'center', fontWeight: '700' }}>{result.workout_a.name}</Text>
            <Text style={{ color: C.emerald, flex: 1, textAlign: 'center', fontWeight: '700' }}>{result.workout_b.name}</Text>
          </View>
          {result.exercises.map((ex, i) => (
            <View key={i} style={[S.card, { marginBottom: 6, paddingVertical: 10 }]}>
              <Text style={{ color: C.text, fontWeight: '600', marginBottom: 4 }}>{ex.exercise}</Text>
              <View style={S.row}>
                <Text style={{ flex: 1, color: C.muted, fontSize: 12 }}>
                  {ex.workout_a ? ex.workout_a.map((s) => `${s.weight ?? 'BW'}×${s.reps}`).join(', ') : '—'}
                </Text>
                <Text style={{ flex: 1, color: C.muted, fontSize: 12, textAlign: 'right' }}>
                  {ex.workout_b ? ex.workout_b.map((s) => `${s.weight ?? 'BW'}×${s.reps}`).join(', ') : '—'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

export default function AnalyticsScreen() {
  const [tab, setTab] = useState<Tab>('volume')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'volume', label: 'Volume' },
    { key: 'trend', label: 'Trend' },
    { key: 'compare', label: 'Compare' },
  ]

  return (
    <View style={S.screen}>
      <View style={{ padding: 16, paddingTop: 56 }}>
        <Text style={S.title}>Analytics</Text>
        <View style={as.tabRow}>
          {tabs.map((t) => (
            <Pressable key={t.key} style={[as.tab, tab === t.key && as.tabActive]} onPress={() => setTab(t.key)}>
              <Text style={[as.tabText, tab === t.key && as.tabTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView>
        {tab === 'volume' && <VolumeTab />}
        {tab === 'trend' && <TrendTab />}
        {tab === 'compare' && <CompareTab />}
      </ScrollView>
    </View>
  )
}

const as = StyleSheet.create({
  tabRow: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 10, padding: 4, marginTop: 12 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: C.blueDark },
  tabText: { color: C.muted, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#020617' },
})

const cs = StyleSheet.create({
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border, marginRight: 8 },
  pillActive: { backgroundColor: C.blueDark, borderColor: C.blueDark },
})
