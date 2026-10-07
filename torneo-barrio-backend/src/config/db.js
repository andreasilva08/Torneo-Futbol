const mongoose = require('mongoose');

// Función asíncrona para conectar a la base de datos
const connectDB = async () => {
  try {
    // mongoose.connect nos devuelve una promesa con la conexión activa
    const conn = await mongoose.connect(process.env.MONGO_URI);
    
    console.log(` MongoDB Conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error(` Error de conexión a MongoDB: ${error.message}`);
    // Si la base de datos falla, detenemos la ejecución del servidor
    process.exit(1);
  }
};

module.exports = connectDB;