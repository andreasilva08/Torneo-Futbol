const mongoose = require('mongoose');
const dns = require('dns');

// Configuración de DNS pública para evitar errores EBADRESP en resolución de registros SRV en macOS
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignorar si el entorno restringe modificar servidores DNS
}

// Función asíncrona para conectar a MongoDB Atlas
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // Tiempo de espera para conexión inicial
      socketTimeoutMS: 45000,         // Tiempo máximo de inactividad de socket
    });

    console.log(`✅ MongoDB Atlas Conectado: ${conn.connection.host}`);
    console.log(`📦 Base de datos: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ Error de conexión a MongoDB: ${error.message}`);
    // Si la base de datos falla, detenemos la ejecución del servidor
    process.exit(1);
  }
};

// Eventos de monitoreo de la conexión
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB desconectado. Intentando reconectar...');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconectado exitosamente.');
});

module.exports = connectDB;