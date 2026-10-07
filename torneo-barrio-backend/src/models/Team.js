const mongoose = require('mongoose');

// Definición del esquema para la colección 'teams'
const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del equipo es obligatorio'],
      trim: true,
      unique: true
    },
    shortName: {
      type: String,
      required: [true, 'El nombre corto/sigla es obligatorio'],
      trim: true,
      uppercase: true,
      maxlength: [4, 'El nombre corto no puede superar los 4 caracteres']
    },
    logoUrl: {
      type: String,
      default: '' // Si no se provee un logo, queda como cadena vacía
    },
    stadium: {
      type: String,
      trim: true,
      default: 'Cancha Local'
    }
  },
  {
    timestamps: true // Genera automáticamente los campos createdAt y updatedAt
  }
);

// Creación del modelo a partir del esquema
const Team = mongoose.model('Team', teamSchema);

module.exports = Team;