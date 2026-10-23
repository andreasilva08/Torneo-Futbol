<script setup>
import { onMounted, ref } from 'vue'
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

const handleExportExcel = async () => {
  exportingExcel.value = true
  try {
    await exportTournamentExcel(store, 'torneo-barrio-porteros.xlsx')
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
    await downloadElementAsPng(exportElement, 'tabla-valla-menos-vencida.png')
    $q.notify({ type: 'positive', message: 'Imagen PNG descargada con éxito.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: error.message || 'Error al descargar la imagen.' })
  } finally {
    exportingPng.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    store.fetchGoalkeepersStats(),
    store.fetchStandings(),
    store.fetchTopScorers(),
    store.fetchTopAssists(),
  ])
})
</script>

<template>
  <div class="stats-page">
    <!-- PAGE HEADER -->
    <div class="sport-page-header">
      <div class="sport-page-header__left">
        <div class="sport-page-header__icon-box">
          <q-icon name="shield" />
        </div>
        <div>
          <div class="sport-page-header__eyebrow">ESTADÍSTICAS DEFENSIVAS · TEMPORADA 2026</div>
          <h1 class="sport-page-header__title">Valla Menos Vencida</h1>
        </div>
      </div>

      <div class="row items-center q-gutter-sm flex-wrap">
        <q-btn
          outline
          color="secondary"
          icon="image"
          label="Descargar Tabla en Imagen (PNG)"
          :loading="exportingPng"
          :disable="!store.goalkeepers.length"
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
      <RouterLink to="/goleadores" class="stats-nav-item">
        <span>⚽</span> GOLEADORES
      </RouterLink>
      <RouterLink to="/asistencias" class="stats-nav-item">
        <span>👟</span> ASISTENCIAS
      </RouterLink>
      <RouterLink to="/porteros" class="stats-nav-item stats-nav-item--active">
        <span>🛡️</span> VALLA INVICTA
      </RouterLink>
    </div>

    <!-- FULL GOALKEEPERS TABLE -->
    <div ref="exportRef" class="stats-export-surface">
    <q-card flat class="sports-panel-card">
      <q-card-section class="q-pa-lg">
        <div class="row items-center justify-between q-mb-md">
          <div class="text-subtitle1 text-weight-bold text-white">Desempeño Defensivo y Porterías</div>
          <div class="text-caption text-grey-5">Menor promedio de goles recibidos</div>
        </div>

        <q-table
          :rows="store.goalkeepers"
          :columns="[
            { name: 'position', label: 'POS', field: 'position', align: 'center' },
            { name: 'goalkeepers', label: 'ARQUERO(S)', field: (row) => row.goalkeepers?.map((keeper) => keeper.player).join(', '), align: 'left' },
            { name: 'team', label: 'EQUIPO', field: 'team', align: 'left' },
            { name: 'matches', label: 'PJ', field: 'matches', align: 'center' },
            { name: 'goalsAgainst', label: 'GOLES RECIBIDOS', field: 'goalsAgainst', align: 'center' },
            { name: 'cleanSheets', label: 'VALLAS A CERO', field: 'cleanSheets', align: 'center' },
          ]"
          row-key="teamId"
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

          <template #body-cell-goalkeepers="props">
            <q-td :props="props">
              <div v-if="props.row.goalkeepers?.length" class="goalkeeper-list">
                <div v-for="goalkeeper in props.row.goalkeepers" :key="goalkeeper.playerId" class="stats-person-cell">
                  <div class="sport-crest-container stats-person-avatar">
                    <ImagePreview
                      :src="goalkeeper.photoUrl || '/images/default-avatar.svg'"
                      fallback="/images/default-avatar.svg"
                      :alt="`Foto de ${goalkeeper.player}`"
                      width="40px"
                      height="40px"
                    />
                  </div>
                  <span>{{ goalkeeper.player }}</span>
                </div>
              </div>
              <span v-else class="text-grey-5">Sin portero registrado</span>
            </q-td>
          </template>

          <!-- TEAM -->
          <template #body-cell-team="props">
            <q-td :props="props">
              <div class="stats-person-cell">
                <div class="sport-crest-container stats-team-crest">
                  <ImagePreview
                    :src="props.row.logoUrl || getDefaultTeamLogo({ _id: props.row.teamId, name: props.row.team })"
                    :fallback="getDefaultTeamLogo({ _id: props.row.teamId, name: props.row.team })"
                    :alt="`Escudo de ${props.row.team}`"
                    width="24px"
                    height="24px"
                  />
                </div>
                <span class="text-weight-bold text-white">{{ props.row.team }}</span>
              </div>
            </q-td>
          </template>

          <!-- MATCHES -->
          <template #body-cell-matches="props">
            <q-td :props="props" class="text-center text-weight-bold text-grey-4">
              {{ props.row.matches }}
            </q-td>
          </template>

          <!-- GOALS AGAINST -->
          <template #body-cell-goalsAgainst="props">
            <q-td :props="props" class="text-center">
              <span class="stat-count-badge stat-count-badge--amber">
                {{ props.row.goalsAgainst }} <small>RECIBIDOS</small>
              </span>
            </q-td>
          </template>

          <!-- CLEAN SHEETS -->
          <template #body-cell-cleanSheets="props">
            <q-td :props="props" class="text-center">
              <span class="stat-count-badge stat-count-badge--green">
                {{ props.row.cleanSheets }} <small>A CERO</small>
              </span>
            </q-td>
          </template>
        </q-table>

        <div v-if="!store.goalkeepers.length" class="text-grey-5 text-center q-pa-xl">
          No hay suficientes partidos finalizados para calcular la clasificación de porteros.
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

.stats-export-surface {
  padding: 8px;
  background: #0b111e;
  border-radius: var(--tb-radius-md);
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
  background: rgba(16, 185, 129, 0.08) !important;
}

.stats-person-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.stats-person-avatar {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  padding: 0 !important;
  background: transparent !important;
}

.stats-person-avatar :deep(.image-preview),
.stats-person-avatar :deep(.image-preview__image) {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  object-position: center !important;
  padding: 0 !important;
}

.stats-team-crest {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
}

.goalkeeper-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
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

.stat-count-badge--amber {
  background: rgba(245, 158, 11, 0.14);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #f59e0b;
}

.stat-count-badge--green {
  background: rgba(16, 185, 129, 0.14);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #10b981;
}

.stat-count-badge small {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}
</style>
