const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, 'El gol debe tener un jugador asociado']
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'El gol debe tener un equipo asociado']
    },
    minute: {
      type: Number,
      required: [true, 'El minuto del gol es obligatorio'],
      min: [0, 'El minuto no puede ser negativo'],
      max: [120, 'El minuto no puede superar 120']
    }
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: {
        values: ['ASSIST', 'YELLOW_CARD', 'RED_CARD'],
        message: '{VALUE} no es un tipo de evento válido'
      },
      required: [true, 'El tipo de evento es obligatorio']
    },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: [true, 'El evento debe tener un jugador asociado']
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'El evento debe tener un equipo asociado']
    },
    minute: {
      type: Number,
      required: [true, 'El minuto del evento es obligatorio'],
      min: [0, 'El minuto no puede ser negativo'],
      max: [120, 'El minuto no puede superar 120']
    }
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    matchday: {
      type: Number,
      required: [true, 'La jornada es obligatoria'],
      min: [1, 'La jornada debe ser mayor a 0']
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
