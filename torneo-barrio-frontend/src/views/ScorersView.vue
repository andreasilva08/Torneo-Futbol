<script setup>
import { computed, onMounted } from 'vue'
import { useTournamentStore } from '@/stores/tournament'

const store = useTournamentStore()
const podiumScorers = computed(() => [
  { rank: 2, scorer: store.scorers[1] },
  { rank: 1, scorer: store.scorers[0] },
  { rank: 3, scorer: store.scorers[2] },
].filter((item) => item.scorer))

onMounted(async () => {
  await store.fetchTopScorers()
})
</script>

<template>
  <div>
    <div class="row items-center q-mb-lg">
      <div>
        <p class="text-caption text-uppercase text-grey-7 q-mb-xs">Estadísticas</p>
        <h1 class="text-h4 text-weight-bold q-ma-none">Goleadores</h1>
      </div>
    </div>

    <div v-if="podiumScorers.length" class="scorer-podium q-mb-lg">
      <q-card
        v-for="item in podiumScorers"
        :key="item.scorer.playerId"
        flat
        class="scorer-podium__item"
        :class="`scorer-podium__item--${item.rank}`"
      >
        <q-card-section class="column items-center text-center">
          <div class="scorer-podium__rank">{{ item.rank }}</div>
          <q-avatar size="64px" color="blue-grey-8" text-color="white" class="scorer-podium__avatar">
            {{ item.scorer.player?.charAt(0)?.toUpperCase() || 'J' }}
          </q-avatar>
          <div class="scorer-podium__name">{{ item.scorer.player }}</div>
          <div class="scorer-podium__team">{{ item.scorer.team }}</div>
          <div class="scorer-podium__goals">{{ item.scorer.goals }} <span>GOLES</span></div>
        </q-card-section>
      </q-card>
    </div>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold q-mb-md">Tabla de goleadores</div>

        <q-table
          :rows="store.scorers"
          :columns="[
            { name: 'position', label: 'Puesto', field: 'position', align: 'center' },
            { name: 'player', label: 'Jugador', field: 'player' },
            { name: 'team', label: 'Equipo', field: 'team' },
            { name: 'goals', label: 'Goles', field: 'goals', align: 'center' },
          ]"
          row-key="playerId"
          flat
          hide-pagination
          class="q-mt-md"
        />

        <div v-if="!store.scorers.length" class="text-grey-7 q-mt-md">
          Todavía no hay goles registrados para el ranking.
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<style scoped>
.scorer-podium {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: end;
  gap: 16px;
}

.scorer-podium__item {
  border: 1px solid var(--tb-border, #2a374a);
  background: var(--tb-surface, #161f30);
}

.scorer-podium__item--1 {
  min-height: 250px;
  border-color: rgba(234, 179, 8, 0.5);
  background: linear-gradient(180deg, rgba(234, 179, 8, 0.12), var(--tb-surface, #161f30) 70%);
}

.scorer-podium__item--2,
.scorer-podium__item--3 {
  min-height: 218px;
}

.scorer-podium__rank {
  display: grid;
  place-items: center;
  width: 30px;
  aspect-ratio: 1;
  margin-bottom: 12px;
  border-radius: 50%;
  background: var(--tb-surface-raised, #334155);
  color: var(--tb-text, #f8fafc);
  font-weight: 800;
}

.scorer-podium__item--1 .scorer-podium__rank {
  background: #eab308;
  color: #0b111e;
}

.scorer-podium__name {
  margin-top: 12px;
  font-weight: 800;
}

.scorer-podium__team {
  color: var(--tb-muted, #94a3b8);
  font-size: 0.8rem;
}

.scorer-podium__goals {
  margin-top: 12px;
  color: #34d399;
  font-size: 1.55rem;
  font-weight: 900;
}

.scorer-podium__goals span {
  color: var(--tb-muted, #94a3b8);
  font-size: 0.65rem;
  letter-spacing: 0.04em;
}

@media (max-width: 600px) {
  .scorer-podium {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .scorer-podium__item--1,
  .scorer-podium__item--2,
  .scorer-podium__item--3 {
    min-height: 0;
  }
}
</style>
