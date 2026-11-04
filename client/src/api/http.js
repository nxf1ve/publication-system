import axios from 'axios'

const http = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api' })
http.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
http.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401 && !['/auth/login', '/auth/register'].includes(error.config?.url)) {
    localStorage.removeItem('access_token')
    window.dispatchEvent(new Event('session-expired'))
  }
  return Promise.reject(error)
})
export default http
