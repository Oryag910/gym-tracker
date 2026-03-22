import client from './client'

export interface SetData { weight: number | null; reps: number | null }
export interface ExerciseData { name: string; sets: SetData[] }
export interface WorkoutCreate { name: string; date: string; exercises: ExerciseData[] }

export interface SetResponse { id: number; set_number: number; weight: number | null; reps: number | null }
export interface ExerciseResponse { id: number; name: string; order_index: number; sets: SetResponse[] }
export interface WorkoutSummary { id: number; name: string; date: string; exercise_count: number }
export interface WorkoutDetail { id: number; name: string; date: string; exercises: ExerciseResponse[] }

export const listWorkouts = () => client.get<WorkoutSummary[]>('/workouts')
export const getWorkout = (id: number) => client.get<WorkoutDetail>(`/workouts/${id}`)
export const createWorkout = (data: WorkoutCreate) => client.post<WorkoutDetail>('/workouts', data)
export const updateWorkout = (id: number, data: { name?: string; date?: string }) =>
  client.put<WorkoutDetail>(`/workouts/${id}`, data)
export const deleteWorkout = (id: number) => client.delete(`/workouts/${id}`)
export const updateSet = (workoutId: number, exerciseId: number, setId: number, data: { weight?: number; reps?: number }) =>
  client.put(`/workouts/${workoutId}/exercises/${exerciseId}/sets/${setId}`, data)
