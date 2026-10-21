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
    recoveryDuration: {
      type: Number,
      min: 1,
      default: null,
    },
    recoveryUnit: {
      type: String,
      enum: ['DAYS', 'WEEKS'],
      default: 'DAYS',
    },
    recoveryDate: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      default: '',
    },
  },
  { strict: false }
);

const lineupEntrySchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    isStarter: {
      type: Boolean,
      default: false,
    },
    isOnField: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const officialLineupEntrySchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    status: {
      type: String,
      enum: ['TITULAR', 'SUPLENTE'],
      required: true,
    },
    isOnField: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    matchday: {
      type: Number,
      required: [true, 'La jornada es obligatoria'],
      min: [1, 'La jornada debe ser mayor a 0'],
    },
    matchdayDate: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      default: null,
    },
    originalDate: {
      type: Date,
      default: null,
    },
    stadium: {
      type: String,
      trim: true,
      default: 'Cancha Local',
    },
    referee: {
      type: String,
      trim: true,
      default: '',
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
    homeLineup: {
      type: [lineupEntrySchema],
      default: [],
    },
    awayLineup: {
      type: [lineupEntrySchema],
      default: [],
    },
    lineup: {
      type: [officialLineupEntrySchema],
      default: [],
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
        values: ['SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'SUSPENDED', 'POSTPONED'],
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
