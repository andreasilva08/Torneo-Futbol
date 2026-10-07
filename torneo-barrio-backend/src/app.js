const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

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
app.use(cors());
app.use(express.json());

// Registrar los módulos de la API
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api', statsRoutes);

// Ruta de comprobación
app.get('/', (req, res) => {
  res.send({ status: 'OK', message: 'API del Torneo de Barrio funcionando correctamente' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Servidor ejecutándose en el puerto ${PORT}`);
});