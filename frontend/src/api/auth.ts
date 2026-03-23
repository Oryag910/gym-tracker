import client from './client'

export interface UserResponse {
  id: number
  username: string
  email: string
  is_admin: boolean
  unit_system: string
  pref_weight: string | null
  pref_distance: string | null
  pref_measure: string | null
  pref_temp: string | null
}

export const register = (username: string, email: string, password: string) =>
  client.post('/auth/register', { username, email, password })

export const login = (username: string, password: string) =>
  client.post<{ access_token: string; token_type: string }>('/auth/login', { username, password })

export const forgotPassword = (email: string) =>
  client.post('/auth/forgot-password', { email })

export const resetPassword = (token: string, new_password: string) =>
  client.post('/auth/reset-password', { token, new_password })

export const forgotAccount = (email: string) =>
  client.post('/auth/forgot-account', { email })

export const getMe = () =>
  client.get<UserResponse>('/auth/me')

export const updatePreferences = (prefs: {
  unit_system?: string
  pref_weight?: string
  pref_distance?: string
  pref_measure?: string
  pref_temp?: string
}) =>
  client.patch<UserResponse>('/auth/me/preferences', prefs)
