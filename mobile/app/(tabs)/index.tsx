import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { listWorkouts, WorkoutSummary } from '../../src/api/workouts'
import { getVolume, VolumePoint } from '../../src/api/stats'
import { useAuth } from '../../src/context/AuthContext'
import { C } from '../../src/constants/colors'
import { S } from '../../src/constants/styles'

export default function DashboardScreen() {
  const { logout } = useAuth()
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([])
  const [volume, setVolume] = useState<VolumePoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([listWorkouts(), getVolume()])
      .then(([w, v]) => { setWorkouts(w.data); setVolume(v.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalVolume = volume.reduce((sum, p) => sum + p.volume, 0)
  const thisWeek = workouts.filter((w) => {
    const d = new Date(w.date)
    const now = new Date()
    const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  }).length

  return (
    <View style={S.screen}>
      <ScrollView contentContainerStyle={ds.content}>
        <View style={ds.header}>
          <Text style={S.title}>Dashboard</Text>
          <Pressable onPress={logout}>
            <Text style={{ color: C.muted, fontSize: 13 }}>Logout</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Stat cards */}
            <View style={ds.statsRow}>
              <View style={[S.card, ds.statCard]}>
                <Text style={ds.statValue}>{workouts.length}</Text>
                <Text style={S.subtitle}>Total Workouts</Text>
              </View>
              <View style={[S.card, ds.statCard]}>
                <Text style={ds.statValue}>{Math.round(totalVolume).toLocaleString()}</Text>
                <Text style={S.subtitle}>Total lbs</Text>
              </View>
              <View style={[S.card, ds.statCard]}>
                <Text style={ds.statValue}>{thisWeek}</Text>
                <Text style={S.subtitle}>This Week</Text>
              </View>
            </View>

            {/* Recent workouts */}
            <Text style={[S.label, { marginBottom: 8, marginTop: 8 }]}>Recent Workouts</Text>
            {workouts.length === 0 ? (
              <View style={[S.card, { alignItems: 'center', paddingVertical: 32 }]}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>💪</Text>
                <Text style={{ color: C.muted }}>No workouts yet</Text>
                <Pressable style={[S.btnPrimary, { marginTop: 16 }]} onPress={() => router.push('/(tabs)/log')}>
                  <Text style={S.btnPrimaryText}>Log your first workout</Text>
                </Pressable>
              </View>
            ) : (
              workouts.slice(0, 5).map((w) => (
                <Pressable key={w.id} style={S.card} onPress={() => router.push(`/(tabs)/workouts/${w.id}` as any)}>
                  <View style={S.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: C.text, fontWeight: '600', fontSize: 15 }}>{w.name}</Text>
                      <Text style={S.subtitle}>{w.date} · {w.exercise_count} exercises</Text>
                    </View>
                    <Text style={{ color: C.muted }}>›</Text>
                  </View>
                </Pressable>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  )
}

const ds = StyleSheet.create({
  content: { padding: 16, paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, padding: 12, marginBottom: 0 },
  statValue: { color: C.blue, fontSize: 22, fontWeight: '700', marginBottom: 2 },
})
