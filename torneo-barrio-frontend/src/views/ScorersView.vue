<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useQuasar } from 'quasar'
import { useTournamentStore } from '@/stores/tournament'
import ImagePreview from '@/components/ImagePreview.vue'
import { getDefaultTeamLogo } from '@/utils/defaultAssets'
import { downloadElementAsPng } from '@/utils/downloadElementAsPng'
import { exportTournamentExcel } from '@/utils/exportTournamentExcel'

const store = useTournamentStore()
const $q = useQuasar()
const exportRef = ref(null)
const exportingPng = ref(false)
const exportingExcel = ref(false)

const podiumScorers = computed(() => [
  { rank: 2, scorer: store.scorers[1], rankClass: 'sport-podium-card--2', medal: '🥈' },
  { rank: 1, scorer: store.scorers[0], rankClass: 'sport-podium-card--1', medal: '🥇' },
  { rank: 3, scorer: store.scorers[2], rankClass: 'sport-podium-card--3', medal: '🥉' },
].filter((item) => item.scorer))

const handleExportExcel = async () => {
  exportingExcel.value = true
  try {
    await exportTournamentExcel(store, 'torneo-barrio-goleadores.xlsx')
    $q.notify({ type: 'positive', message: 'Archivo Excel (.xlsx) exportado exitosamente.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message || 'Error al exportar a Excel.' })
  } finally {
    exportingExcel.value = false
  }
}

const downloadPng = async () => {
  const exportElement = exportRef.value?.$el || exportRef.value
  if (!exportElement) return
  exportingPng.value = true
  try {
    await downloadElementAsPng(exportElement, 'tabla-lideres-de-goleo.png')
    $q.notify({ type: 'positive', message: 'Imagen PNG descargada con éxito.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message || 'Error al descargar la imagen.' })
  } finally {
    exportingPng.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    store.fetchTopScorers(),
    store.fetchStandings(),
    store.fetchTopAssists(),
    store.fetchGoalkeepersStats(),
  ])
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

      <div class="row items-center q-gutter-sm flex-wrap">
        <q-btn
          outline
          color="secondary"
          icon="image"
          label="Descargar Tabla en Imagen (PNG)"
          :loading="exportingPng"
          :disable="!store.scorers.length"
          @click="downloadPng"
        />
        <q-btn
          outline
          color="primary"
          icon="table_view"
          label="Exportar Excel (.xlsx)"
          :loading="exportingExcel"
          @click="handleExportExcel"
        />
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
          <ImagePreview
            :src="item.scorer.playerPhotoUrl || '/images/default-avatar.svg'"
            fallback="/images/default-avatar.svg"
            :alt="`Foto de ${item.scorer.player}`"
            width="100%"
            height="100%"
          />
        </div>

        <!-- Player info -->
        <div class="podium-player-name">{{ item.scorer.player }}</div>
        <div class="row items-center justify-center gap-xs q-mt-xs">
          <div class="sport-crest-container stats-team-crest" style="width: 20px; height: 20px;">
            <ImagePreview
              :src="item.scorer.teamLogoUrl || getDefaultTeamLogo({ _id: item.scorer.teamId, name: item.scorer.team })"
              :fallback="getDefaultTeamLogo({ _id: item.scorer.teamId, name: item.scorer.team })"
              :alt="`Escudo de ${item.scorer.team}`"
              width="18px"
              height="18px"
            />
          </div>
          <div class="podium-team-name">{{ item.scorer.team }}</div>
        </div>

        <!-- Score / Goals -->
        <div class="podium-score-pill">
          <span class="podium-score-num">{{ item.scorer.goals }}</span>
          <span class="podium-score-lbl">GOLES</span>
        </div>
      </div>
    </div>

    <!-- FULL SCORERS TABLE -->
    <div ref="exportRef" class="stats-export-surface">
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
          :pagination="{ rowsPerPage: 0 }"
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
              <div class="stats-person-cell">
                <div class="sport-crest-container stats-person-avatar">
                  <ImagePreview
                    :src="props.row.playerPhotoUrl || '/images/default-avatar.svg'"
                    fallback="/images/default-avatar.svg"
                    :alt="`Foto de ${props.row.player}`"
                    width="34px"
                    height="34px"
                  />
                </div>
                <span class="text-weight-bold text-white">{{ props.row.player }}</span>
              </div>
            </q-td>
          </template>

          <!-- TEAM -->
          <template #body-cell-team="props">
            <q-td :props="props">
              <div class="stats-person-cell">
                <div class="sport-crest-container stats-team-crest">
                  <ImagePreview
                    :src="props.row.teamLogoUrl || getDefaultTeamLogo({ _id: props.row.teamId, name: props.row.team })"
                    :fallback="getDefaultTeamLogo({ _id: props.row.teamId, name: props.row.team })"
                    :alt="`Escudo de ${props.row.team}`"
                    width="24px"
                    height="24px"
                  />
                </div>
                <span class="text-grey-4">{{ props.row.team }}</span>
              </div>
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
  overflow: hidden;
}

.podium-avatar-box :deep(.image-preview),
.podium-avatar-box :deep(.image-preview__image) {
  width: 100% !important;
  height: 100% !important;
}

.stats-person-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.stats-person-avatar {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
}

.stats-team-crest {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
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
