<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useTournamentStore } from '@/stores/tournament'

const store = useTournamentStore()

const podiumScorers = computed(() => [
  { rank: 2, scorer: store.scorers[1], rankClass: 'sport-podium-card--2', medal: '🥈' },
  { rank: 1, scorer: store.scorers[0], rankClass: 'sport-podium-card--1', medal: '🥇' },
  { rank: 3, scorer: store.scorers[2], rankClass: 'sport-podium-card--3', medal: '🥉' },
].filter((item) => item.scorer))

onMounted(async () => {
  await store.fetchTopScorers()
})
</script>

<template>
  <div class="stats-page">
    <!-- PAGE HEADER -->
    <div class="sport-page-header">
      <div class="sport-page-header__left">
        <div class="sport-page-header__icon-box">
          <q-icon name="emoji_events" />
        </div>
        <div>
          <div class="sport-page-header__eyebrow">ESTADÍSTICAS INDIVIDUALES · TEMPORADA 2026</div>
          <h1 class="sport-page-header__title">Líderes de Goleo</h1>
        </div>
      </div>
    </div>

    <!-- STATS NAVIGATION TABS -->
    <div class="stats-nav-bar q-mb-xl">
      <RouterLink to="/goleadores" class="stats-nav-item stats-nav-item--active">
        <span>⚽</span> GOLEADORES
      </RouterLink>
      <RouterLink to="/asistencias" class="stats-nav-item">
        <span>👟</span> ASISTENCIAS
      </RouterLink>
      <RouterLink to="/porteros" class="stats-nav-item">
        <span>🛡️</span> VALLA INVICTA
      </RouterLink>
    </div>

    <!-- PODIUM TOP 3 -->
    <div v-if="podiumScorers.length" class="podium-container q-mb-xl">
      <div
        v-for="item in podiumScorers"
        :key="item.scorer.playerId || item.scorer.player"
        class="podium-card"
        :class="item.rankClass"
      >
        <!-- Rank Badge -->
        <div class="podium-badge-rank" :class="`podium-badge-rank--${item.rank}`">
          {{ item.rank }}
        </div>

        <!-- Avatar -->
        <div class="podium-avatar-box" :class="`podium-avatar-box--${item.rank}`">
          {{ item.scorer.player?.charAt(0)?.toUpperCase() || 'J' }}
        </div>

        <!-- Player info -->
        <div class="podium-player-name">{{ item.scorer.player }}</div>
        <div class="podium-team-name">{{ item.scorer.team }}</div>

        <!-- Score / Goals -->
        <div class="podium-score-pill">
          <span class="podium-score-num">{{ item.scorer.goals }}</span>
          <span class="podium-score-lbl">GOLES</span>
        </div>
      </div>
    </div>

    <!-- FULL SCORERS TABLE -->
    <q-card flat class="sports-panel-card">
      <q-card-section class="q-pa-lg">
        <div class="row items-center justify-between q-mb-md">
          <div class="text-subtitle1 text-weight-bold text-white">Tabla General de Goleadores</div>
          <div class="text-caption text-grey-5">Torneo Oficial 2026</div>
        </div>

        <q-table
          :rows="store.scorers"
          :columns="[
            { name: 'position', label: 'POS', field: 'position', align: 'center' },
            { name: 'player', label: 'JUGADOR', field: 'player', align: 'left' },
            { name: 'team', label: 'EQUIPO', field: 'team', align: 'left' },
            { name: 'goals', label: 'GOLES ANOTADOS', field: 'goals', align: 'center' },
          ]"
          row-key="playerId"
          flat
          hide-pagination
          class="scorers-sports-table"
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

          <!-- GOALS -->
          <template #body-cell-goals="props">
            <q-td :props="props" class="text-center">
              <span class="goals-count-badge">
                {{ props.row.goals }} <small>GOLES</small>
              </span>
            </q-td>
          </template>
        </q-table>

        <div v-if="!store.scorers.length" class="text-grey-5 text-center q-pa-xl">
          Todavía no hay goles registrados para el ranking oficial.
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

/* Stats Nav Tabs */
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

/* Podium Layout */
.podium-container {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: end;
  gap: 20px;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}

.podium-card {
  background: var(--tb-surface);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius-lg);
  padding: 24px 18px 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  transition: transform 0.2s ease;
}

.sport-podium-card--1 {
  min-height: 290px;
  border-color: rgba(234, 179, 8, 0.6) !important;
  background: linear-gradient(180deg, rgba(234, 179, 8, 0.14) 0%, var(--tb-surface) 70%) !important;
  transform: translateY(-12px);
  box-shadow: 0 10px 30px rgba(234, 179, 8, 0.15);
}

.sport-podium-card--2 {
  min-height: 250px;
  border-color: rgba(203, 213, 225, 0.4) !important;
  background: linear-gradient(180deg, rgba(203, 213, 225, 0.08) 0%, var(--tb-surface) 70%) !important;
}

.sport-podium-card--3 {
  min-height: 230px;
  border-color: rgba(217, 119, 6, 0.4) !important;
  background: linear-gradient(180deg, rgba(217, 119, 6, 0.08) 0%, var(--tb-surface) 70%) !important;
}

.podium-badge-rank {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 900;
  margin-bottom: 12px;
  background: var(--tb-surface-raised);
  color: #ffffff;
}

.podium-badge-rank--1 {
  background: #eab308;
  color: #0b111e;
  box-shadow: 0 0 12px rgba(234, 179, 8, 0.5);
}

.podium-badge-rank--2 {
  background: #cbd5e1;
  color: #0b111e;
}

.podium-badge-rank--3 {
  background: #d97706;
  color: #ffffff;
}

.podium-avatar-box {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--tb-surface-raised);
  border: 2px solid var(--tb-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 900;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.podium-avatar-box--1 {
  width: 72px;
  height: 72px;
  border-color: #eab308;
}

.podium-player-name {
  font-size: 1.05rem;
  font-weight: 800;
  color: #ffffff;
  margin-top: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.podium-team-name {
  font-size: 0.74rem;
  color: var(--tb-muted);
  font-weight: 600;
  margin-top: 2px;
}

.podium-score-pill {
  margin-top: 14px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  padding: 4px 14px;
  border-radius: 9999px;
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.podium-score-num {
  font-size: 1.5rem;
  font-weight: 900;
  color: #10b981;
}

.podium-score-lbl {
  font-size: 0.65rem;
  font-weight: 800;
  color: #10b981;
  letter-spacing: 0.06em;
}

/* Scorers Table */
.sports-panel-card {
  background: var(--tb-surface) !important;
  border: 1px solid var(--tb-border) !important;
  border-radius: var(--tb-radius-md) !important;
  overflow: hidden;
}

.scorers-sports-table :deep(thead th) {
  background: var(--tb-surface-raised) !important;
  color: var(--tb-muted) !important;
  font-size: 0.74rem !important;
  font-weight: 800 !important;
  letter-spacing: 0.08em !important;
  padding: 14px 16px !important;
}

.scorers-sports-table :deep(tbody tr) {
  height: 60px;
}

.scorers-sports-table :deep(tbody tr:nth-child(even)) {
  background: rgba(30, 41, 59, 0.45) !important;
}

.scorers-sports-table :deep(tbody tr:hover) {
  background: rgba(16, 185, 129, 0.08) !important;
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

.goals-count-badge {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  background: rgba(16, 185, 129, 0.14);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #10b981;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 900;
}

.goals-count-badge small {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

@media (max-width: 650px) {
  .podium-container {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
  .sport-podium-card--1,
  .sport-podium-card--2,
  .sport-podium-card--3 {
    min-height: 0;
    transform: none;
  }
}
</style>
