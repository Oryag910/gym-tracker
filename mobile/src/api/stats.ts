import client from './client'

export interface PREntry { exercise: string; weight: number; date: string }
export interface PRHistoryPoint { date: string; weight: number }
export interface VolumePoint { workout_id: number; workout_name: string; date: string; volume: number }
export interface TrendPoint { date: string; workout_id: number; workout_name: string; max_weight: number | null; total_volume: number }
export interface CompareExercise {
  exercise: string
  workout_a: { id: number; set_number: number; weight: number | null; reps: number | null }[] | null
  workout_b: { id: number; set_number: number; weight: number | null; reps: number | null }[] | null
}
export interface CompareResponse {
  workout_a: { id: number; name: string; date: string; exercise_count: number }
  workout_b: { id: number; name: string; date: string; exercise_count: number }
  exercises: CompareExercise[]
}

export const getPRs = () => client.get<PREntry[]>('/stats/prs')
export const getPRHistory = (exercise: string) => client.get<PRHistoryPoint[]>(`/stats/prs/${encodeURIComponent(exercise)}/history`)
export const getVolume = () => client.get<VolumePoint[]>('/stats/volume')
export const getExerciseTrend = (exercise: string) => client.get<TrendPoint[]>(`/stats/exercise/${encodeURIComponent(exercise)}/trend`)
export const compareWorkouts = (a: number, b: number) => client.get<CompareResponse>(`/stats/compare?workout_a=${a}&workout_b=${b}`)
