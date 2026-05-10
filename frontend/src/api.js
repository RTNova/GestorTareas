// ============================================================
// CONFIGURACIÓN DE AXIOS
// Todas las peticiones al backend pasan por aquí
// ============================================================
import axios from 'axios';

// Creamos una instancia de axios apuntando al backend
const api = axios.create({
  baseURL: 'http://localhost:3000'
});

// Interceptor: antes de cada petición, añadimos el token automáticamente
// Así no tenemos que escribirlo en cada llamada
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
