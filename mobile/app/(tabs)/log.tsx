import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet
} from 'react-native'
import { router } from 'expo-router'
import { createWorkout } from '../../src/api/workouts'
import { lookupExercise, ExerciseLookup } from '../../src/api/exercises'
import MuscleMap from '../../src/components/MuscleMap'
import { useDebounce } from '../../src/hooks/useDebounce'
import { C } from '../../src/constants/colors'
import { S } from '../../src/constants/styles'

interface SetForm { weight: string; reps: string }
interface ExerciseForm {
  name: string
  sets: SetForm[]
  lookup: ExerciseLookup | null
  showMuscles: boolean
}

const emptySet = (): SetForm => ({ weight: '', reps: '' })
const emptyExercise = (): ExerciseForm => ({ name: '', sets: [emptySet()], lookup: null, showMuscles: false })

function ExerciseCard({
  exercise, index, onChange, onRemove
}: {
  exercise: ExerciseForm
  index: number
  onChange: (e: ExerciseForm) => void
  onRemove: () => void
}) {
  const debouncedName = useDebounce(exercise.name, 500)

  useEffect(() => {
    if (debouncedName.length < 2) return
    lookupExercise(debouncedName).then((data) => {
      onChange({ ...exercise, lookup: data, showMuscles: true })
    }).catch(() => {})
  }, [debouncedName])

  const updateSet = (i: number, field: keyof SetForm, val: string) => {
    const sets = exercise.sets.map((s, si) => si === i ? { ...s, [field]: val } : s)
    onChange({ ...exercise, sets })
  }

  return (
    <View style={S.card}>
      <View style={[S.row, { marginBottom: 8 }]}>
        <Text style={{ color: C.muted, fontSize: 12, marginRight: 8 }}>Exercise {index + 1}</Text>
        <Pressable onPress={onRemove}>
          <Text style={{ color: C.red, fontSize: 12 }}>Remove</Text>
        </Pressable>
      </View>

      <TextInput
        style={[S.input, { marginBottom: 8 }]}
        value={exercise.name}
        onChangeText={(v) => onChange({ ...exercise, name: v })}
        placeholder="Exercise name (e.g. Bench Press)"
        placeholderTextColor={C.muted}
      />

      {exercise.lookup && exercise.showMuscles && (
        <View style={{ marginBottom: 12 }}>
          <MuscleMap primary={exercise.lookup.muscles_primary} secondary={exercise.lookup.muscles_secondary} />
        </View>
      )}

      {/* Sets */}
      <View style={ls.setHeader}>
        <Text style={[S.label, { flex: 0.5 }]}>#</Text>
        <Text style={[S.label, { flex: 1 }]}>Weight (lbs)</Text>
        <Text style={[S.label, { flex: 1 }]}>Reps</Text>
        <View style={{ width: 40 }} />
      </View>

      {exercise.sets.map((set, si) => (
        <View key={si} style={ls.setRow}>
          <Text style={{ color: C.muted, flex: 0.5, fontSize: 13 }}>{si + 1}</Text>
          <TextInput
            style={[S.input, { flex: 1, marginRight: 6, paddingVertical: 6 }]}
            value={set.weight}
            onChangeText={(v) => updateSet(si, 'weight', v)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={C.muted}
          />
          <TextInput
            style={[S.input, { flex: 1, marginRight: 6, paddingVertical: 6 }]}
            value={set.reps}
            onChangeText={(v) => updateSet(si, 'reps', v)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={C.muted}
          />
          <Pressable onPress={() => {
            const sets = exercise.sets.filter((_, i) => i !== si)
            onChange({ ...exercise, sets: sets.length ? sets : [emptySet()] })
          }}>
            <Text style={{ color: C.red, fontSize: 18, width: 40, textAlign: 'center' }}>×</Text>
          </Pressable>
        </View>
      ))}

      <Pressable onPress={() => onChange({ ...exercise, sets: [...exercise.sets, emptySet()] })} style={ls.addSetBtn}>
        <Text style={{ color: C.blue, fontSize: 13 }}>+ Add Set</Text>
      </Pressable>
    </View>
  )
}

export default function LogScreen() {
  const [name, setName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [exercises, setExercises] = useState<ExerciseForm[]>([emptyExercise()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateExercise = (i: number, e: ExerciseForm) => {
    setExercises((prev) => prev.map((ex, idx) => idx === i ? e : ex))
  }

  const save = async () => {
    if (!name.trim()) { setError('Workout name is required'); return }
    setError('')
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        date,
        exercises: exercises
          .filter((e) => e.name.trim())
          .map((e) => ({
            name: e.name.trim(),
            sets: e.sets.map((s) => ({
              weight: s.weight ? Number(s.weight) : null,
              reps: s.reps ? Number(s.reps) : null,
            })),
          })),
      }
      const res = await createWorkout(payload)
      router.replace(`/(tabs)/workouts/${res.data.id}` as any)
    } catch {
      setError('Failed to save workout')
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 56, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={[S.title, { marginBottom: 20 }]}>Log Workout</Text>

        <Text style={S.label}>Workout Name</Text>
        <TextInput style={[S.input, { marginBottom: 16 }]} value={name} onChangeText={setName} placeholder="e.g. Push Day" placeholderTextColor={C.muted} />

        <Text style={S.label}>Date</Text>
        <TextInput style={[S.input, { marginBottom: 24 }]} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={C.muted} />

        {exercises.map((ex, i) => (
          <ExerciseCard
            key={i}
            exercise={ex}
            index={i}
            onChange={(e) => updateExercise(i, e)}
            onRemove={() => setExercises((prev) => prev.filter((_, idx) => idx !== i))}
          />
        ))}

        <Pressable onPress={() => setExercises((prev) => [...prev, emptyExercise()])} style={ls.addExBtn}>
          <Text style={{ color: C.blue, fontWeight: '600' }}>+ Add Exercise</Text>
        </Pressable>

        {error ? <Text style={{ color: C.red, marginBottom: 12 }}>{error}</Text> : null}

        <Pressable style={[S.btnPrimary, { marginTop: 8 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={C.bg} /> : <Text style={S.btnPrimaryText}>Save Workout</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const ls = StyleSheet.create({
  setHeader: { flexDirection: 'row', marginBottom: 4 },
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  addSetBtn: { paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 8, borderStyle: 'dashed' },
  addExBtn: { paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 12, borderStyle: 'dashed', marginBottom: 16 },
})
