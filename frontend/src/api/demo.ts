import client from './client'

export const startDemo = () =>
  client.post<{ access_token: string; token_type: string }>('/demo/start')
