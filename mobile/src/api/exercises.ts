import client from './client'

export interface ExerciseLookup {
  canonical_name: string | null
  image_url: string | null
  muscles_primary: string[]
  muscles_secondary: string[]
}

export const lookupExercise = async (name: string): Promise<ExerciseLookup> => {
  const res = await client.get<ExerciseLookup>(`/exercises/lookup?q=${encodeURIComponent(name)}`)
  return res.data
}
