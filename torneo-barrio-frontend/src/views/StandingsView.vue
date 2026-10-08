<script setup>
import { computed, onMounted } from 'vue'
import { useTournamentStore } from '@/stores/tournament'

const store = useTournamentStore()

const positionStyles = (position) => {
  if (position === 1) return 'standings-table__podium standings-table__podium--gold'
  if (position === 2) return 'standings-table__podium standings-table__podium--silver'
  if (position === 3) return 'standings-table__podium standings-table__podium--bronze'
  return 'standings-table__position'
}

const goalDiffClass = (value) => {
  if (Number(value) > 0) return 'standings-table__diff standings-table__diff--positive'
  if (Number(value) < 0) return 'standings-table__diff standings-table__diff--negative'
  return 'standings-table__diff standings-table__diff--neutral'
}

const pointsClass = (value) => {
  return Number(value) > 0 ? 'standings-table__points' : 'standings-table__points standings-table__points--muted'
}

const teamNameClass = (value) => {
  if (!value) return 'standings-table__team-name'
  return 'standings-table__team-name'
}

onMounted(async () => {
  await store.fetchStandings()
})
</script>

<template>
  <div>
    <div class="row items-center q-mb-lg">
      <div>
        <p class="text-caption text-uppercase text-grey-7 q-mb-xs">Estadísticas</p>
        <h1 class="text-h4 text-weight-bold q-ma-none">Tabla de posiciones</h1>
      </div>
    </div>

    <q-card flat bordered class="standings-card">
      <q-card-section>
        <div class="standings-header q-mb-md">
          <div class="text-subtitle1 text-weight-bold">Clasificación general</div>
          <q-badge color="primary" rounded class="standings-header__badge">Liga</q-badge>
        </div>

        <q-table
          :rows="store.standings"
          :columns="[
            { name: 'position', label: 'Puesto', field: 'position', align: 'center' },
            { name: 'team', label: 'Equipo', field: 'name' },
            { name: 'played', label: 'PJ', field: 'played', align: 'center' },
            { name: 'wins', label: 'G', field: 'wins', align: 'center' },
            { name: 'draws', label: 'E', field: 'draws', align: 'center' },
            { name: 'losses', label: 'P', field: 'losses', align: 'center' },
            { name: 'goalsFor', label: 'GF', field: 'goalsFor', align: 'center' },
            { name: 'goalsAgainst', label: 'GC', field: 'goalsAgainst', align: 'center' },
            { name: 'goalDifference', label: 'DG', field: 'goalDifference', align: 'center' },
            { name: 'points', label: 'Pts', field: 'points', align: 'center' },
          ]"
          row-key="_id"
          flat
          hide-pagination
          class="standings-table q-mt-md"
        >
          <template #body-cell-position="props">
            <q-td :props="props" class="text-center">
              <span :class="positionStyles(props.row.position)">{{ props.row.position }}</span>
            </q-td>
          </template>

          <template #body-cell-team="props">
            <q-td :props="props">
              <div class="standings-table__team-cell">
                <div class="standings-table__team-mark">{{ props.row.name?.charAt(0)?.toUpperCase() || 'E' }}</div>
                <span :class="teamNameClass(props.row.name)">{{ props.row.name }}</span>
              </div>
            </q-td>
          </template>

          <template #body-cell-goalDifference="props">
            <q-td :props="props" class="text-center">
              <span :class="goalDiffClass(props.row.goalDifference)">{{ props.row.goalDifference > 0 ? '+' : '' }}{{ props.row.goalDifference }}</span>
            </q-td>
          </template>

          <template #body-cell-points="props">
            <q-td :props="props" class="text-center">
              <span :class="pointsClass(props.row.points)">{{ props.row.points }}</span>
            </q-td>
          </template>
        </q-table>

        <div v-if="!store.standings.length" class="text-grey-7 q-mt-md">
          Aún no hay datos suficientes para calcular la tabla.
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<style scoped>
.standings-card {
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(243,249,245,0.96));
}

.standings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.standings-header__badge {
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 800;
}

.standings-table :deep(.q-table__middle) {
  border-radius: 18px;
  overflow: hidden;
}

.standings-table :deep(thead th) {
  font-size: 0.72rem;
}

.standings-table :deep(tbody tr) {
  height: 72px;
}

.standings-table__team-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 180px;
}

.standings-table__team-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, #1f6d53, #37a66d);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
}

.standings-table__team-name {
  font-weight: 800;
  color: #143327;
  letter-spacing: -0.02em;
}

.standings-table__position,
.standings-table__podium {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 30px;
  border-radius: 10px;
  font-weight: 800;
  color: #1e382f;
  background: rgba(22, 86, 63, 0.07);
}

.standings-table__podium--gold {
  background: linear-gradient(135deg, #f8d765, #f3b927);
  color: #4a2b00;
}

.standings-table__podium--silver {
  background: linear-gradient(135deg, #e3e7ee, #c7ced9);
  color: #243347;
}

.standings-table__podium--bronze {
  background: linear-gradient(135deg, #f4d8c0, #dd9e6e);
  color: #5b2b12;
}

.standings-table__diff,
.standings-table__points {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 32px;
  border-radius: 10px;
  font-weight: 800;
}

.standings-table__diff--positive {
  background: rgba(29, 143, 92, 0.12);
  color: var(--tb-success);
}

.standings-table__diff--negative {
  background: rgba(214, 82, 82, 0.12);
  color: var(--tb-danger);
}

.standings-table__diff--neutral {
  background: rgba(81, 108, 98, 0.08);
  color: #49615b;
}

.standings-table__points {
  background: linear-gradient(135deg, rgba(28, 100, 74, 0.12), rgba(46, 143, 100, 0.18));
  color: #0d442f;
}

.standings-table__points--muted {
  opacity: 0.75;
}

@media (max-width: 768px) {
  .standings-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
