import axios from 'axios'

// In development: '/' uses Vite proxy → localhost:8000
// In production: VITE_API_URL = https://your-backend.up.railway.app
const client = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/' })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default client
