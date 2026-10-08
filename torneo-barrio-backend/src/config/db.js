const mongoose = require('mongoose');

// Función asíncrona para conectar a MongoDB Atlas
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // Aborta si Atlas no responde en 5s
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