import client from './client'

export interface CustomExercise {
  id: number
  name: string
  category: string | null
  muscles_primary: string[]
  muscles_secondary: string[]
  muscles_primary_ids: number[]
  muscles_secondary_ids: number[]
  description: string | null
}

export interface CustomExercisePayload {
  name: string
  category?: string
  muscles_primary_ids: number[]
  muscles_secondary_ids: number[]
  description?: string
}

export const listCustomExercises = () =>
  client.get<CustomExercise[]>('/library')

export const createCustomExercise = (data: CustomExercisePayload) =>
  client.post<CustomExercise>('/library', data)

export const updateCustomExercise = (id: number, data: Partial<CustomExercisePayload>) =>
  client.put<CustomExercise>(`/library/${id}`, data)

export const deleteCustomExercise = (id: number) =>
  client.delete(`/library/${id}`)
