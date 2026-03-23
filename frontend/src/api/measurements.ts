import client from './client'

export interface MeasurementEntry {
  id: number
  date: string
  weight: number | null
  body_fat: number | null
  chest: number | null
  waist: number | null
  hips: number | null
  arms: number | null
  thighs: number | null
  neck: number | null
  notes: string | null
}

export const getMeasurements = () => client.get<MeasurementEntry[]>('/measurements')

export const createMeasurement = (body: Omit<MeasurementEntry, 'id'>) =>
  client.post<MeasurementEntry>('/measurements', body)

export const deleteMeasurement = (id: number) =>
  client.delete(`/measurements/${id}`)
