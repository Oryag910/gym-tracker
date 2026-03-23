import client from './client'

export interface CardioSegment {
  id: number
  sort_order: number
  label: string | null
  segment_type: string
  distance: number | null
  duration: number | null
  pace: number | null
  hr: number | null
  reps: number
  notes: string | null
}

export interface CardioSessionSummary {
  id: number
  date: string
  name: string
  activity_type: string
  total_distance: number | null
  total_duration: number | null
  avg_hr: number | null
}

export interface CardioSessionDetail extends CardioSessionSummary {
  max_hr: number | null
  calories: number | null
  temperature: number | null
  notes: string | null
  segments: CardioSegment[]
}

export interface CardioSegmentCreate {
  sort_order?: number
  label?: string
  segment_type: string
  distance?: number
  duration?: number
  pace?: number
  hr?: number
  reps?: number
  notes?: string
}

export interface CardioSessionCreate {
  date: string
  name: string
  activity_type: string
  total_distance?: number
  total_duration?: number
  avg_hr?: number
  max_hr?: number
  calories?: number
  temperature?: number
  notes?: string
  segments: CardioSegmentCreate[]
}

export const getCardioSessions = () => client.get<CardioSessionSummary[]>('/cardio')

export const createCardioSession = (body: CardioSessionCreate) =>
  client.post<CardioSessionDetail>('/cardio', body)

export const getCardioSession = (id: number) =>
  client.get<CardioSessionDetail>(`/cardio/${id}`)

export const deleteCardioSession = (id: number) =>
  client.delete(`/cardio/${id}`)
