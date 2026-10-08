<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useTournamentStore } from '@/stores/tournament'

const store = useTournamentStore()

onMounted(async () => {
  await store.fetchTopAssists()
})
</script>

<template>
  <div class="stats-page">
    <!-- PAGE HEADER -->
    <div class="sport-page-header">
      <div class="sport-page-header__left">
        <div class="sport-page-header__icon-box">
          <q-icon name="assistant" />
        </div>
        <div>
          <div class="sport-page-header__eyebrow">ESTADÍSTICAS INDIVIDUALES · TEMPORADA 2026</div>
          <h1 class="sport-page-header__title">Líderes de Asistencias</h1>
        </div>
      </div>
    </div>

    <!-- STATS NAVIGATION TABS -->
    <div class="stats-nav-bar q-mb-xl">
      <RouterLink to="/goleadores" class="stats-nav-item">
        <span>⚽</span> GOLEADORES
      </RouterLink>
      <RouterLink to="/asistencias" class="stats-nav-item stats-nav-item--active">
        <span>👟</span> ASISTENCIAS
      </RouterLink>
      <RouterLink to="/porteros" class="stats-nav-item">
        <span>🛡️</span> VALLA INVICTA
      </RouterLink>
    </div>

    <!-- FULL ASSISTS TABLE -->
    <q-card flat class="sports-panel-card">
      <q-card-section class="q-pa-lg">
        <div class="row items-center justify-between q-mb-md">
          <div class="text-subtitle1 text-weight-bold text-white">Tabla General de Asistidores</div>
          <div class="text-caption text-grey-5">Torneo Oficial 2026</div>
        </div>

        <q-table
          :rows="store.assists"
          :columns="[
            { name: 'position', label: 'POS', field: 'position', align: 'center' },
            { name: 'player', label: 'JUGADOR', field: 'player', align: 'left' },
            { name: 'team', label: 'EQUIPO', field: 'team', align: 'left' },
            { name: 'assists', label: 'ASISTENCIAS', field: 'assists', align: 'center' },
          ]"
          row-key="playerId"
          flat
          hide-pagination
          class="stats-sports-table"
        >
          <!-- POSITION -->
          <template #body-cell-position="props">
            <q-td :props="props" class="text-center">
              <span
                class="rank-circle"
                :class="{
                  'rank-circle--gold': props.row.position === 1,
                  'rank-circle--silver': props.row.position === 2,
                  'rank-circle--bronze': props.row.position === 3,
                }"
              >
                {{ props.row.position }}
              </span>
            </q-td>
          </template>

          <!-- PLAYER -->
          <template #body-cell-player="props">
            <q-td :props="props">
              <span class="text-weight-bold text-white">{{ props.row.player }}</span>
            </q-td>
          </template>

          <!-- TEAM -->
          <template #body-cell-team="props">
            <q-td :props="props">
              <span class="text-grey-4">{{ props.row.team }}</span>
            </q-td>
          </template>

          <!-- ASSISTS -->
          <template #body-cell-assists="props">
            <q-td :props="props" class="text-center">
              <span class="stat-count-badge stat-count-badge--blue">
                {{ props.row.assists }} <small>PASES GOL</small>
              </span>
            </q-td>
          </template>
        </q-table>

        <div v-if="!store.assists.length" class="text-grey-5 text-center q-pa-xl">
          Todavía no hay asistencias registradas en los partidos disputados.
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<style scoped>
.stats-page {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.stats-nav-bar {
  display: flex;
  background: var(--tb-surface);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-md);
  padding: 4px;
  gap: 4px;
  width: fit-content;
}

.stats-nav-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--tb-radius-sm);
  color: var(--tb-muted);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-decoration: none;
  transition: all 0.2s ease;
}

.stats-nav-item:hover {
  color: #ffffff;
  background: var(--tb-surface-raised);
}

.stats-nav-item--active {
  background: var(--tb-surface-raised) !important;
  color: var(--tb-primary) !important;
  border: 1px solid var(--tb-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.sports-panel-card {
  background: var(--tb-surface) !important;
  border: 1px solid var(--tb-border) !important;
  border-radius: var(--tb-radius-md) !important;
  overflow: hidden;
}

.stats-sports-table :deep(thead th) {
  background: var(--tb-surface-raised) !important;
  color: var(--tb-muted) !important;
  font-size: 0.74rem !important;
  font-weight: 800 !important;
  letter-spacing: 0.08em !important;
  padding: 14px 16px !important;
}

.stats-sports-table :deep(tbody tr) {
  height: 60px;
}

.stats-sports-table :deep(tbody tr:nth-child(even)) {
  background: rgba(30, 41, 59, 0.45) !important;
}

.stats-sports-table :deep(tbody tr:hover) {
  background: rgba(59, 130, 246, 0.08) !important;
}

.rank-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-size: 0.76rem;
  font-weight: 900;
  background: var(--tb-surface-raised);
  color: var(--tb-muted);
}

.rank-circle--gold {
  background: #eab308;
  color: #0b111e;
}

.rank-circle--silver {
  background: #cbd5e1;
  color: #0b111e;
}

.rank-circle--bronze {
  background: #d97706;
  color: #ffffff;
}

.stat-count-badge {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 900;
}

.stat-count-badge--blue {
  background: rgba(59, 130, 246, 0.14);
  border: 1px solid rgba(59, 130, 246, 0.35);
  color: #60a5fa;
}

.stat-count-badge small {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}
</style>
