import client from './client'

export interface GlobalExercise {
  id: number
  name: string
  category: string | null
  image_url: string | null
  muscles_primary: string[]
  muscles_secondary: string[]
  muscles_primary_ids: number[]
  muscles_secondary_ids: number[]
  description: string | null
}

export interface GlobalExercisePayload {
  name: string
  category?: string
  image_url?: string
  muscles_primary_ids: number[]
  muscles_secondary_ids: number[]
  description?: string
}

export const listExercises = () =>
  client.get<GlobalExercise[]>('/library')

export const searchExercises = (q: string) =>
  client.get<GlobalExercise[]>(`/library/search?q=${encodeURIComponent(q)}`)

export const createExercise = (data: GlobalExercisePayload) =>
  client.post<GlobalExercise>('/library', data)

export const updateExercise = (id: number, data: Partial<GlobalExercisePayload>) =>
  client.put<GlobalExercise>(`/library/${id}`, data)

export const deleteExercise = (id: number) =>
  client.delete(`/library/${id}`)

export interface ExerciseDBResult {
  name: string
  gif_url: string
  body_part: string
  target: string
  secondary_muscles: string[]
}

export const searchExerciseDB = (q: string) =>
  client.get<ExerciseDBResult[]>(`/library/exercisedb-search?q=${encodeURIComponent(q)}`)

export const importFromWger = (limit = 50, offset = 0) =>
  client.post<{ imported: number; skipped: number; total_in_batch: number }>(
    `/library/import-wger?limit=${limit}&offset=${offset}`
  )
