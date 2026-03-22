import { useEffect, useState } from 'react'
import { View, Text, TextInput, SectionList, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { listWorkouts, WorkoutSummary } from '../../src/api/workouts'
import { C } from '../../src/constants/colors'
import { S } from '../../src/constants/styles'

function groupByMonth(workouts: WorkoutSummary[]) {
  const map: Record<string, WorkoutSummary[]> = {}
  for (const w of workouts) {
    const key = w.date.slice(0, 7)
    if (!map[key]) map[key] = []
    map[key].push(w)
  }
  return Object.entries(map).map(([month, data]) => ({ title: month, data }))
}

export default function WorkoutsScreen() {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listWorkouts().then((r) => setWorkouts(r.data)).finally(() => setLoading(false))
  }, [])

  const filtered = workouts.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  )
  const sections = groupByMonth(filtered)

  return (
    <View style={S.screen}>
      <View style={ws.header}>
        <Text style={S.title}>Workouts</Text>
        <Pressable style={[S.btnPrimary, { paddingVertical: 8 }]} onPress={() => router.push('/(tabs)/log')}>
          <Text style={S.btnPrimaryText}>+ Log</Text>
        </Pressable>
      </View>

      <TextInput
        style={[S.input, ws.search]}
        value={search}
        onChangeText={setSearch}
        placeholder="Search workouts..."
        placeholderTextColor={C.muted}
      />

      {loading ? (
        <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16 }}
          renderSectionHeader={({ section }) => (
            <Text style={ws.monthHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <Pressable style={S.card} onPress={() => router.push(`/(tabs)/workouts/${item.id}` as any)}>
              <View style={S.row}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '600', fontSize: 15 }}>{item.name}</Text>
                  <Text style={S.subtitle}>{item.date} · {item.exercise_count} exercises</Text>
                </View>
                <Text style={{ color: C.muted }}>›</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ color: C.muted }}>No workouts found</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const ws = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 56,
  },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  monthHeader: {
    color: C.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },
})
