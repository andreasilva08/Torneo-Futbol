const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Importar rutas
const teamRoutes = require('./routes/teamRoutes');
const playerRoutes = require('./routes/playerRoutes');
const matchRoutes = require('./routes/matchRoutes');
const statsRoutes = require('./routes/statsRoutes');

dotenv.config();

const app = express();

// Conectar a MongoDB
connectDB();

// Middlewares Globales
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:4173'];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origin (ej: Postman, curl) o del listado autorizado
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origen no permitido → ${origin}`));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Ruta de comprobación
app.get('/', (req, res) => {
  res.send({ status: 'OK', message: 'API del Torneo de Barrio funcionando correctamente' });
});

// Registrar los módulos de la API
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api', statsRoutes);

// Ruta 404 — debe ir DESPUÉS de todas las rutas registradas
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Middleware global de errores — debe ir AL FINAL, después de las rutas y el 404
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Servidor ejecutándose en el puerto ${PORT}`);
});