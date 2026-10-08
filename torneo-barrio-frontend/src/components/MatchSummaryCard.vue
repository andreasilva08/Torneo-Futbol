<script setup>
import { computed } from 'vue'
import { formatMatchDate, getId, matchStatusColor, matchStatusLabel, normalizeMatchStatus } from '@/utils/matchFormatting'
import ImagePreview from '@/components/ImagePreview.vue'
import { useTournamentStore } from '@/stores/tournament'

const props = defineProps({
  match: {
    type: Object,
    required: true,
  },
})

const store = useTournamentStore()

const getPlayerName = (player) => {
  if (!player) return 'Jugador'
  if (typeof player === 'object' && player.name) return player.name
  const id = getId(player)
  return store.players.find((item) => item._id === id)?.name || 'Jugador'
}

const matchGoals = computed(() => {
  const homeId = getId(props.match.homeTeam)
  const awayId = getId(props.match.awayTeam)
  const homeScorers = []
  const awayScorers = []

  for (const goal of props.match.goals || []) {
    const teamId = getId(goal.team)
    const entry = {
      player: getPlayerName(goal.player),
      minute: Number(goal.minute) || 0,
      assist: goal.assistPlayer ? getPlayerName(goal.assistPlayer) : null,
      type: 'GOAL',
    }

    if (teamId === homeId) {
      homeScorers.push(entry)
    } else if (teamId === awayId) {
      awayScorers.push(entry)
    }
  }

  for (const event of props.match.events || []) {
    if (!['YELLOW_CARD', 'RED_CARD'].includes(event.type)) continue

    const entry = {
      player: getPlayerName(event.player),
      minute: Number(event.minute) || 0,
      type: event.type,
    }
    const teamId = getId(event.team)

    if (teamId === homeId) {
      homeScorers.push(entry)
    } else if (teamId === awayId) {
      awayScorers.push(entry)
    }
  }

  return { home: homeScorers.sort((a, b) => a.minute - b.minute), away: awayScorers.sort((a, b) => a.minute - b.minute) }
})
</script>

<template>
  <router-link :to="{ name: 'match-detail', params: { id: match._id } }" class="match-link">
    <q-card flat class="match-card">
      <q-card-section class="match-card__body">
        <div class="match-card__header">
          <div class="match-card__context">
            <q-badge v-if="match.matchday" color="positive" text-color="dark" rounded>
              Jornada {{ match.matchday }}
            </q-badge>
            <span v-if="match.homeTeam?.stadium">{{ match.homeTeam.stadium }}</span>
          </div>
          <q-badge :color="matchStatusColor(match.status)" rounded class="match-card__status">
            {{ matchStatusLabel(match.status) }}
          </q-badge>
        </div>

        <div class="match-card__topline">
          <div class="match-card__team match-card__team--home">
            <ImagePreview
              :src="match.homeTeam?.logoUrl"
              fallback="/images/default-team.svg"
              :alt="`Escudo de ${match.homeTeam?.name || 'equipo local'}`"
              width="42px"
              height="42px"
              class="match-card__crest"
            />
            <div class="match-card__team-meta">
              <span class="match-card__team-name">{{ match.homeTeam?.name || 'Local' }}</span>
              <span class="match-card__team-role">Local</span>
            </div>
          </div>

          <div class="match-card__center">
            <div class="match-card__status-text">{{ matchStatusLabel(match.status) }}</div>
            <div class="match-card__date">{{ formatMatchDate(match.date) }}</div>
            <div v-if="normalizeMatchStatus(match.status) === 'SCHEDULED'" class="match-card__score match-card__score--scheduled">VS</div>
            <div v-else class="match-card__score">
              {{ match.homeScore ?? 0 }} <span>–</span> {{ match.awayScore ?? 0 }}
            </div>
          </div>

          <div class="match-card__team match-card__team--away">
            <div class="match-card__team-meta match-card__team-meta--right">
              <span class="match-card__team-name">{{ match.awayTeam?.name || 'Visitante' }}</span>
              <span class="match-card__team-role">Visitante</span>
            </div>
            <ImagePreview
              :src="match.awayTeam?.logoUrl"
              fallback="/images/default-team.svg"
              :alt="`Escudo de ${match.awayTeam?.name || 'equipo visitante'}`"
              width="42px"
              height="42px"
              class="match-card__crest"
            />
          </div>
        </div>

        <div class="match-card__scorers" v-if="matchGoals.home.length || matchGoals.away.length">
          <div class="match-card__scorer-column">
            <div v-for="goal in matchGoals.home" :key="`home-${goal.player}-${goal.minute}`" class="match-card__scorer-item">
              <span class="match-card__goal-icon">{{ goal.type === 'RED_CARD' ? '🟥' : goal.type === 'YELLOW_CARD' ? '🟨' : '⚽' }}</span>
              <span>{{ goal.player }} {{ goal.minute }}'</span>
            </div>
          </div>

          <div class="match-card__scorer-column match-card__scorer-column--away">
            <div v-for="goal in matchGoals.away" :key="`away-${goal.player}-${goal.minute}`" class="match-card__scorer-item">
              <span>{{ goal.player }} {{ goal.minute }}'</span>
              <span class="match-card__goal-icon">{{ goal.type === 'RED_CARD' ? '🟥' : goal.type === 'YELLOW_CARD' ? '🟨' : '⚽' }}</span>
            </div>
          </div>
        </div>

        <div v-else class="match-card__no-goals">Sin goles registrados</div>
      </q-card-section>
    </q-card>
  </router-link>
</template>

<style scoped>
.match-link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.match-card {
  background: var(--tb-surface-raised, #1e293b);
  border: 1px solid var(--tb-border, #2a374a);
  border-radius: 8px;
  box-shadow: none;
}

.match-card__body {
  padding: 16px;
}

.match-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.match-card__context {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--tb-muted, #94a3b8);
  font-size: 0.72rem;
}

.match-card__status {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.match-card__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.match-card__team {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.match-card__team--away {
  justify-content: flex-end;
  text-align: right;
}

.match-card__team-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.match-card__team-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--tb-text, #f8fafc);
}

.match-card__team-role {
  font-size: 0.66rem;
  color: var(--tb-muted, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.match-card__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 120px;
  text-align: center;
}

.match-card__status-text,
.match-card__date {
  font-size: 0.7rem;
  color: var(--tb-muted, #94a3b8);
}

.match-card__score {
  margin-top: 6px;
  font-size: 2rem;
  line-height: 1;
  font-weight: 700;
  color: var(--tb-text, #f8fafc);
}

.match-card__score span {
  font-size: 1rem;
  color: var(--tb-muted, #94a3b8);
}

.match-card__score--scheduled {
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--tb-bg, #0b111e);
}

.match-card__scorers {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--tb-border, #2a374a);
}

.match-card__scorer-column {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.match-card__scorer-column--away {
  align-items: flex-end;
  text-align: right;
}

.match-card__scorer-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--tb-text, #cbd5e1);
}

.match-card__goal-icon {
  font-size: 0.8rem;
}

.match-card__no-goals {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--tb-border, #2a374a);
  color: var(--tb-muted, #94a3b8);
  font-size: 0.75rem;
  text-align: center;
}

@media (max-width: 768px) {
  .match-card__topline {
    flex-direction: column;
    align-items: stretch;
  }

  .match-card__team,
  .match-card__team--away {
    justify-content: center;
    text-align: center;
  }

  .match-card__center {
    min-width: 0;
  }
}
</style>
