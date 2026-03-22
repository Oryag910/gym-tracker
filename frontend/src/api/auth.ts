import client from './client'

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
