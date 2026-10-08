import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  timeout: 20000,
})

// Interceptor de respuesta: normaliza todos los errores en un formato consistente
api.interceptors.response.use(
  // Respuesta exitosa: pasa tal cual
  (response) => response,

  // Error: lo transforma en un mensaje legible
  (error) => {
    if (error.code === 'ECONNABORTED') {
      // Timeout de la petición
      return Promise.reject(new Error('La petición tardó demasiado. Verifica tu conexión.'))
    }

    if (!error.response) {
      // Error de red (servidor caído, sin internet)
      return Promise.reject(new Error('No se pudo conectar con el servidor. Verifica que el backend esté activo.'))
    }

    // Error HTTP del servidor (4xx, 5xx): usa el mensaje que devuelve la API
    const serverMessage = error.response?.data?.message || `Error ${error.response.status}`
    return Promise.reject(new Error(serverMessage))
  }
)

export default api
