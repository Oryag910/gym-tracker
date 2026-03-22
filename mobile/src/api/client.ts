import axios from 'axios'
import { router } from 'expo-router'

const BASE_URL = 'https://web-production-5f3fad.up.railway.app'

let _token: string | null = null

export const setClientToken = (t: string | null) => {
  _token = t
}

const client = axios.create({ baseURL: BASE_URL })

client.interceptors.request.use((config) => {
  if (_token) config.headers.Authorization = `Bearer ${_token}`
  return config
})

client.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      setClientToken(null)
      router.replace('/(auth)/login')
    }
    return Promise.reject(err)
  }
)

export default client
