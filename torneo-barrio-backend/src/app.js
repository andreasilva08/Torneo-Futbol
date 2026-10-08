const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
<<<<<<< HEAD
const errorHandler = require('./middleware/errorHandler');
=======
>>>>>>> f9aca878e81b62e76df11422a5a30e277108745a

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
<<<<<<< HEAD
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

=======
app.use(cors());
app.use(express.json());

>>>>>>> f9aca878e81b62e76df11422a5a30e277108745a
// Registrar los módulos de la API
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api', statsRoutes);

<<<<<<< HEAD
// Ruta 404 — debe ir DESPUÉS de todas las rutas registradas
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Middleware global de errores — debe ir AL FINAL, después de las rutas y el 404
app.use(errorHandler);

=======
// Ruta de comprobación
app.get('/', (req, res) => {
  res.send({ status: 'OK', message: 'API del Torneo de Barrio funcionando correctamente' });
});

>>>>>>> f9aca878e81b62e76df11422a5a30e277108745a
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Servidor ejecutándose en el puerto ${PORT}`);
});