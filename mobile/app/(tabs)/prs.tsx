import { useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, Dimensions } from 'react-native'
import { getPRs, getPRHistory, PREntry, PRHistoryPoint } from '../../src/api/stats'
import { C } from '../../src/constants/colors'
import { S } from '../../src/constants/styles'
import { CartesianChart, Area, useChartPressState } from 'victory-native'
import { useFont } from '@shopify/react-native-skia'

const CARD_WIDTH = (Dimensions.get('window').width - 48) / 2

function PRCard({ pr }: { pr: PREntry }) {
  const [expanded, setExpanded] = useState(false)
  const [history, setHistory] = useState<PRHistoryPoint[]>([])
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    if (!expanded && history.length === 0) {
      setLoading(true)
      const data = await getPRHistory(pr.exercise).then((r) => r.data).catch(() => [])
      setHistory(data)
      setLoading(false)
    }
    setExpanded((v) => !v)
  }

  const chartData = history.map((h, i) => ({ x: i, y: h.weight, date: h.date }))

  return (
    <Pressable style={[S.card, ps.card]} onPress={toggle}>
      <Text style={ps.exName} numberOfLines={2}>{pr.exercise}</Text>
      <Text style={ps.weight}>{pr.weight} lbs</Text>
      <Text style={S.subtitle}>{pr.date}</Text>

      {expanded && (
        <View style={{ marginTop: 12 }}>
          {loading ? (
            <ActivityIndicator color={C.blue} />
          ) : chartData.length > 1 ? (
            <View style={{ height: 100 }}>
              <CartesianChart data={chartData} xKey="x" yKeys={["y"]}>
                {({ points, chartBounds }) => (
                  <Area points={points.y} y0={chartBounds.bottom} color={C.blue} opacity={0.7} />
                )}
              </CartesianChart>
            </View>
          ) : (
            <Text style={{ color: C.muted, fontSize: 11, textAlign: 'center' }}>Not enough history</Text>
          )}
        </View>
      )}
    </Pressable>
  )
}

export default function PRsScreen() {
  const [prs, setPRs] = useState<PREntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPRs().then((r) => setPRs(r.data)).finally(() => setLoading(false))
  }, [])

  return (
    <View style={S.screen}>
      <View style={{ padding: 16, paddingTop: 56 }}>
        <Text style={S.title}>Personal Records</Text>
        <Text style={[S.subtitle, { marginBottom: 16 }]}>Your best lifts</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={C.blue} />
      ) : prs.length === 0 ? (
        <View style={{ alignItems: 'center', padding: 40 }}>
          <Text style={{ fontSize: 32 }}>🏆</Text>
          <Text style={{ color: C.muted, marginTop: 8 }}>No PRs yet — log some workouts!</Text>
        </View>
      ) : (
        <FlatList
          data={prs}
          keyExtractor={(item) => item.exercise}
          numColumns={2}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          columnWrapperStyle={{ gap: 8 }}
          renderItem={({ item }) => <PRCard pr={item} />}
        />
      )}
    </View>
  )
}

const ps = StyleSheet.create({
  card: { width: CARD_WIDTH, marginBottom: 0 },
  exName: { color: C.text, fontWeight: '600', fontSize: 13, marginBottom: 4 },
  weight: { color: C.blue, fontSize: 22, fontWeight: '800', marginBottom: 2 },
})
