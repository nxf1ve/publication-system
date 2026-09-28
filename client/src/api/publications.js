import http from './http'
export const getPublications = () => http.get('/publications')
export const getPublication = id => http.get(`/publications/${id}`)
export const createPublication = data => http.post('/publications', data)
export const deletePublication = id => http.delete(`/publications/${id}`)
