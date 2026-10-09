const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    scorer: {
      type: String,
      default: '',
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    minute: {
      type: Number,
      required: [true, 'El minuto del gol es obligatorio'],
      min: [0, 'El minuto no puede ser negativo'],
      max: [120, 'El minuto no puede superar 120'],
      default: 1,
    },
    assistPlayer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    assist: {
      type: String,
      default: '',
    },
    isOwnGoal: {
      type: Boolean,
      default: false,
    },
    isAutogol: {
      type: Boolean,
      default: false,
    },
  },
  { strict: false }
);

const eventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, 'El tipo de evento es obligatorio'],
      default: 'YELLOW_CARD',
    },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    minute: {
      type: Number,
      required: [true, 'El minuto del evento es obligatorio'],
      min: [0, 'El minuto no puede ser negativo'],
      max: [120, 'El minuto no puede superar 120'],
      default: 1,
    },
    playerIn: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    playerOut: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
    injuryTime: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
  },
  { strict: false }
);

const matchSchema = new mongoose.Schema(
  {
    matchday: {
      type: Number,
      required: [true, 'La jornada es obligatoria'],
      min: [1, 'La jornada debe ser mayor a 0'],
      max: [38, 'La jornada no puede superar la 38']
    },
    date: {
      type: Date,
      required: [true, 'La fecha del partido es obligatoria']
    },
    homeTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'El equipo local es obligatorio']
    },
    awayTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'El equipo visitante es obligatorio']
    },
    homeScore: {
      type: Number,
      default: 0,
      min: [0, 'El marcador no puede ser negativo']
    },
    awayScore: {
      type: Number,
      default: 0,
      min: [0, 'El marcador no puede ser negativo']
    },
    status: {
      type: String,
      enum: {
        values: ['SCHEDULED', 'IN_PROGRESS', 'FINISHED'],
        message: '{VALUE} no es un estado válido'
      },
      default: 'SCHEDULED'
    },
    goals: [goalSchema],
    events: [eventSchema]
  },
  {
    timestamps: true
  }
);

matchSchema.pre('validate', function () {
  if (this.homeTeam && this.awayTeam && this.homeTeam.toString() === this.awayTeam.toString()) {
    throw new Error('El equipo local y el visitante no pueden ser el mismo');
  }
});

const Match = mongoose.model('Match', matchSchema);

module.exports = Match;
