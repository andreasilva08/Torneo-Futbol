import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 20000,
})

<<<<<<< HEAD
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

=======
>>>>>>> f9aca878e81b62e76df11422a5a30e277108745a
export default api
