import client from './client'

export interface SetData {
  weight: number | null; reps: number | null; rpe?: number | null
  weight_right?: number | null; reps_right?: number | null
}
export interface ExerciseData {
  name: string; sets: SetData[]
  is_unilateral?: boolean; attachment?: string | null
}
export interface WorkoutCreate { name: string; date: string; exercises: ExerciseData[] }

export interface SetResponse {
  id: number; set_number: number
  weight: number | null; reps: number | null; rpe: number | null
  weight_right: number | null; reps_right: number | null
}
export interface ExerciseResponse {
  id: number; name: string; order_index: number; sets: SetResponse[]
  is_unilateral: boolean; attachment: string | null
}
export interface WorkoutSummary { id: number; name: string; date: string; exercise_count: number }
export interface WorkoutDetail { id: number; name: string; date: string; exercises: ExerciseResponse[] }

export const listWorkouts = (limit = 0, offset = 0) => {
  const params = limit > 0 ? `?limit=${limit}&offset=${offset}` : ''
  return client.get<WorkoutSummary[]>(`/workouts${params}`)
}
export const getWorkout = (id: number) => client.get<WorkoutDetail>(`/workouts/${id}`)
export const createWorkout = (data: WorkoutCreate) => client.post<WorkoutDetail>('/workouts', data)
export const updateWorkout = (id: number, data: { name?: string; date?: string }) =>
  client.put<WorkoutDetail>(`/workouts/${id}`, data)
export const deleteWorkout = (id: number) => client.delete(`/workouts/${id}`)
export const updateSet = (workoutId: number, exerciseId: number, setId: number, data: { weight?: number; reps?: number; rpe?: number; weight_right?: number; reps_right?: number }) =>
  client.put(`/workouts/${workoutId}/exercises/${exerciseId}/sets/${setId}`, data)

export const addExercise = (workoutId: number, data: { name: string; is_unilateral?: boolean; attachment?: string | null }) =>
  client.post<ExerciseResponse>(`/workouts/${workoutId}/exercises`, data)

export const updateExercise = (workoutId: number, exerciseId: number, data: { name?: string; is_unilateral?: boolean; attachment?: string | null }) =>
  client.put<ExerciseResponse>(`/workouts/${workoutId}/exercises/${exerciseId}`, data)

export const deleteExercise = (workoutId: number, exerciseId: number) =>
  client.delete(`/workouts/${workoutId}/exercises/${exerciseId}`)

export const addSet = (workoutId: number, exerciseId: number, data: { weight?: number | null; reps?: number | null; rpe?: number | null; weight_right?: number | null; reps_right?: number | null }) =>
  client.post<SetResponse>(`/workouts/${workoutId}/exercises/${exerciseId}/sets`, data)

export const deleteSet = (workoutId: number, exerciseId: number, setId: number) =>
  client.delete(`/workouts/${workoutId}/exercises/${exerciseId}/sets/${setId}`)
