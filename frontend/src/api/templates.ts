import client from './client'

export interface TemplateSetData {
  set_number: number
  target_weight: number | null
  target_reps: number | null
}

export interface TemplateExerciseData {
  name: string
  order_index: number
  set_rest_override: number | null
  exercise_rest_override: number | null
  sets: TemplateSetData[]
}

export interface TemplateCreate {
  name: string
  description?: string
  default_set_rest: number
  default_exercise_rest: number
  exercises: TemplateExerciseData[]
}

export interface TemplateSetResponse {
  id: number
  set_number: number
  target_weight: number | null
  target_reps: number | null
}

export interface TemplateExerciseResponse {
  id: number
  name: string
  order_index: number
  set_rest_override: number | null
  exercise_rest_override: number | null
  sets: TemplateSetResponse[]
}

export interface TemplateSummary {
  id: number
  name: string
  description: string | null
  default_set_rest: number
  default_exercise_rest: number
  exercise_count: number
}

export interface TemplateDetail {
  id: number
  name: string
  description: string | null
  default_set_rest: number
  default_exercise_rest: number
  exercises: TemplateExerciseResponse[]
}

export const listTemplates = () =>
  client.get<TemplateSummary[]>('/templates')

export const getTemplate = (id: number) =>
  client.get<TemplateDetail>(`/templates/${id}`)

export const createTemplate = (data: TemplateCreate) =>
  client.post<TemplateDetail>('/templates', data)

export const updateTemplate = (id: number, data: Partial<TemplateCreate>) =>
  client.put<TemplateDetail>(`/templates/${id}`, data)

export const deleteTemplate = (id: number) =>
  client.delete(`/templates/${id}`)
