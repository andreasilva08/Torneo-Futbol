const mongoose = require('mongoose');

// Definición del esquema para la colección 'players'
// Compatible tanto con campos en español (MongoDB Atlas import) como en inglés
const playerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: '',
    },
    nombre: {
      type: String,
      trim: true,
      default: '',
    },
    number: {
      type: Number,
      min: [0, 'El número de camiseta debe ser mayor o igual a 0'],
      max: [99, 'El número de camiseta no puede ser mayor a 99'],
    },
    dorsal: {
      type: Number,
      min: [0, 'El dorsal debe ser mayor o igual a 0'],
      max: [99, 'El dorsal no puede ser mayor a 99'],
    },
    position: {
      type: String,
      default: 'Delantero',
    },
    posicion: {
      type: String,
      default: 'Delantero',
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    equipo: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['TITULAR', 'SUPLENTE', 'LESIONADO', 'SANCIONADO_ROJA', 'SANCIONADO_AMARILLAS'],
      default: 'TITULAR',
    },
    condicion: {
      type: String,
      default: 'TITULAR',
    },
    photoUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    strict: false, // Permite coexistencia con colecciones pre-cargadas en MongoDB Atlas
  }
);

// Sincronización automática de campos en español e inglés antes de guardar
playerSchema.pre('save', function (next) {
  if (this.name && !this.nombre) this.nombre = this.name;
  if (this.nombre && !this.name) this.name = this.nombre;

  if (this.number !== undefined && this.dorsal === undefined) this.dorsal = this.number;
  if (this.dorsal !== undefined && this.number === undefined) this.number = this.dorsal;

  if (this.position && !this.posicion) this.posicion = this.position;
  if (this.posicion && !this.position) this.position = this.posicion;

  if (this.status && !this.condicion) this.condicion = this.status;
  if (this.condicion && !this.status) this.status = this.condicion;

  next();
});

// Índice compuesto único cuando team existe
playerSchema.index({ team: 1, number: 1 }, { unique: true, sparse: true });

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;