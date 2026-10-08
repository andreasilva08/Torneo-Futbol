/**
 * Middleware centralizado de manejo de errores.
 * Debe registrarse DESPUÉS de todas las rutas en app.js.
 * Captura errores lanzados con next(error) desde cualquier controlador.
 */
const errorHandler = (err, req, res, next) => {
  // Determinar el código de estado: si ya viene en el error úsalo, sino 500
  const statusCode = err.statusCode || res.statusCode === 200 ? (err.statusCode || 500) : res.statusCode;

  // Log en consola para debugging interno (nunca exponer stack al cliente)
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${statusCode}: ${err.message}`);

  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Error interno del servidor',
    // Solo mostrar el stack en desarrollo
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
