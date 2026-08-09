import axios from 'axios'

const api = axios.create({
  baseURL: '/bienes/api',
  timeout: 30000
})

export default api
