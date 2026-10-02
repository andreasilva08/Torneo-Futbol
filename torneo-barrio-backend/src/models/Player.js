const mongoose = require('mongoose');

// Definición del esquema para la colección 'players'
const playerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del jugador es obligatorio'],
      trim: true
    },
    number: {
      type: Number,
      required: [true, 'El número de camiseta es obligatorio'],
      min: [1, 'El número de camiseta debe ser mayor a 0'],
      max: [99, 'El número de camiseta no puede ser mayor a 99']
    },
    position: {
      type: String,
      required: [true, 'La posición es obligatoria'],
      enum: {
        values: ['Portero', 'Defensa', 'Mediocampista', 'Delantero'],
        message: '{VALUE} no es una posición válida'
      }
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team', // Nombre exacto del modelo con el que se relaciona
      required: [true, 'El jugador debe pertenecer a un equipo']
    },
    photoUrl: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

//  ÍNDICE COMPUESTO ÚNICO
// Evita que existan dos documentos con el mismo 'team' y el mismo 'number'
playerSchema.index({ team: 1, number: 1 }, { unique: true });

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;