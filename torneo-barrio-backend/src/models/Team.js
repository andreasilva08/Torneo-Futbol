const mongoose = require('mongoose');

// Definición del esquema para la colección 'teams'
// Totalmente compatible con campos en español (importados en MongoDB Atlas: nombre, dt, barrio, fundacion, escudo_url)
// y en inglés (name, coach, neighborhood, foundationYear, logoUrl)
const teamSchema = new mongoose.Schema(
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
    shortName: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    siglas: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    logoUrl: {
      type: String,
      default: '',
    },
    escudo_url: {
      type: String,
      default: '',
    },
    stadium: {
      type: String,
      trim: true,
      default: 'Cancha Local',
    },
    cancha: {
      type: String,
      trim: true,
      default: 'Cancha Local',
    },
    coach: {
      type: String,
      trim: true,
      default: '',
    },
    dt: {
      type: String,
      trim: true,
      default: '',
    },
    neighborhood: {
      type: String,
      trim: true,
      default: '',
    },
    barrio: {
      type: String,
      trim: true,
      default: '',
    },
    foundationYear: {
      type: Number,
      default: 2026,
    },
    fundacion: {
      type: Number,
      default: 2026,
    },
    primaryColor: {
      type: String,
      trim: true,
      default: '#15803d',
    },
    secondaryColor: {
      type: String,
      trim: true,
      default: '#facc15',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    resena: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    strict: false, // Permite coexistencia con datos importados en MongoDB Atlas
  }
);

// Sincronización automática pre-guardado
teamSchema.pre('save', function (next) {
  const teamName = this.name || this.nombre || '';
  if (teamName) {
    this.name = teamName;
    this.nombre = teamName;
  }

  if (!this.shortName) {
    this.shortName = teamName.slice(0, 3).toUpperCase();
  }
  if (!this.siglas) {
    this.siglas = this.shortName;
  }

  if (this.coach && !this.dt) this.dt = this.coach;
  if (this.dt && !this.coach) this.coach = this.dt;

  if (this.neighborhood && !this.barrio) this.barrio = this.neighborhood;
  if (this.barrio && !this.neighborhood) this.neighborhood = this.barrio;

  if (this.logoUrl && !this.escudo_url) this.escudo_url = this.logoUrl;
  if (this.escudo_url && !this.logoUrl) this.logoUrl = this.escudo_url;

  next();
});

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;