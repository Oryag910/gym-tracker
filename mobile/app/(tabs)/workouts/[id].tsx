import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, Pressable, TextInput,
  Alert, ActivityIndicator, StyleSheet
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { getWorkout, deleteWorkout, updateSet, WorkoutDetail, ExerciseResponse, SetResponse } from '../../../src/api/workouts'
import { lookupExercise, ExerciseLookup } from '../../../src/api/exercises'
import MuscleMap from '../../../src/components/MuscleMap'
import { C } from '../../../src/constants/colors'
import { S } from '../../../src/constants/styles'

function SetRow({ set, workoutId, exerciseId, onUpdate }: {
  set: SetResponse; workoutId: number; exerciseId: number; onUpdate: (s: SetResponse) => void
}) {
  const [editing, setEditing] = useState(false)
  const [weight, setWeight] = useState(String(set.weight ?? ''))
  const [reps, setReps] = useState(String(set.reps ?? ''))
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await updateSet(workoutId, exerciseId, set.id, {
        weight: weight ? Number(weight) : undefined,
        reps: reps ? Number(reps) : undefined,
      })
      onUpdate({ ...set, weight: weight ? Number(weight) : null, reps: reps ? Number(reps) : null })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={ds.setRow}>
      <Text style={{ color: C.muted, width: 24, fontSize: 13 }}>#{set.set_number}</Text>
      {editing ? (
        <>
          <TextInput style={[S.input, ds.setInput]} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="lbs" placeholderTextColor={C.muted} />
          <TextInput style={[S.input, ds.setInput]} value={reps} onChangeText={setReps} keyboardType="numeric" placeholder="reps" placeholderTextColor={C.muted} />
          <Pressable onPress={save} disabled={saving} style={[ds.setBtn, { backgroundColor: C.blueDark }]}>
            <Text style={{ color: '#020617', fontSize: 12, fontWeight: '700' }}>{saving ? '...' : 'Save'}</Text>
          </Pressable>
          <Pressable onPress={() => setEditing(false)} style={ds.setBtn}>
            <Text style={{ color: C.muted, fontSize: 12 }}>Cancel</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={{ color: C.text, flex: 1, fontSize: 14 }}>
            {set.weight != null ? `${set.weight} lbs` : 'BW'} × {set.reps ?? '—'} reps
          </Text>
          <Pressable onPress={() => setEditing(true)} style={ds.setBtn}>
            <Text style={{ color: C.blue, fontSize: 12 }}>Edit</Text>
          </Pressable>
        </>
      )}
    </View>
  )
}

function ExerciseCard({ exercise, workoutId }: { exercise: ExerciseResponse; workoutId: number }) {
  const [sets, setSets] = useState(exercise.sets)
  const [lookup, setLookup] = useState<ExerciseLookup | null>(null)
  const [showMuscles, setShowMuscles] = useState(false)

  const toggleMuscles = async () => {
    if (!lookup) {
      const data = await lookupExercise(exercise.name).catch(() => null)
      setLookup(data)
    }
    setShowMuscles((v) => !v)
  }

  return (
    <View style={S.card}>
      <View style={[S.row, { marginBottom: 8 }]}>
        <Text style={{ color: C.text, fontWeight: '700', fontSize: 15, flex: 1 }}>{exercise.name}</Text>
        <Pressable onPress={toggleMuscles}>
          <Text style={{ color: C.blue, fontSize: 12 }}>Muscles</Text>
        </Pressable>
      </View>
      {showMuscles && lookup && (
        <View style={{ marginBottom: 12 }}>
          <MuscleMap primary={lookup.muscles_primary} secondary={lookup.muscles_secondary} />
        </View>
      )}
      {sets.map((s) => (
        <SetRow
          key={s.id}
          set={s}
          workoutId={workoutId}
          exerciseId={exercise.id}
          onUpdate={(updated) => setSets((prev) => prev.map((x) => x.id === updated.id ? updated : x))}
        />
      ))}
    </View>
  )
}

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    getWorkout(Number(id)).then((r) => setWorkout(r.data)).finally(() => setLoading(false))
  }, [id])

  const confirmDelete = () => {
    Alert.alert('Delete Workout', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setDeleting(true)
          await deleteWorkout(Number(id))
          router.replace('/(tabs)/workouts')
        }
      },
    ])
  }

  if (loading) return <View style={[S.screen, { justifyContent: 'center' }]}><ActivityIndicator color={C.blue} /></View>
  if (!workout) return <View style={S.screen}><Text style={{ color: C.muted, padding: 24 }}>Workout not found</Text></View>

  return (
    <View style={S.screen}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 56, paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Text style={{ color: C.blue, fontSize: 14 }}>← Back</Text>
        </Pressable>
        <View style={[S.row, { marginBottom: 20 }]}>
          <View style={{ flex: 1 }}>
            <Text style={S.title}>{workout.name}</Text>
            <Text style={S.subtitle}>{workout.date}</Text>
          </View>
          <Pressable style={S.btnDanger} onPress={confirmDelete} disabled={deleting}>
            <Text style={S.btnDangerText}>Delete</Text>
          </Pressable>
        </View>
        {workout.exercises.map((ex) => (
          <ExerciseCard key={ex.id} exercise={ex} workoutId={workout.id} />
        ))}
      </ScrollView>
    </View>
  )
}

const ds = StyleSheet.create({
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  setInput: { flex: 1, paddingVertical: 6, paddingHorizontal: 8, fontSize: 13 },
  setBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: C.border },
})
