<script setup>
import { computed, onMounted } from 'vue'
import { useTournamentStore } from '@/stores/tournament'
import ImagePreview from '@/components/ImagePreview.vue'

const store = useTournamentStore()

const positionStyles = (position) => {
  if (position === 1) return 'standings-rank standings-rank--champion'
  if (position >= 2 && position <= 4) return 'standings-rank standings-rank--playoff'
  return 'standings-rank standings-rank--regular'
}

const goalDiffClass = (value) => {
  if (Number(value) > 0) return 'dg-badge dg-badge--positive'
  if (Number(value) < 0) return 'dg-badge dg-badge--negative'
  return 'dg-badge dg-badge--neutral'
}

const getTeamSubtext = (row) => {
  if (row.cleanSheets !== undefined && row.cleanSheets !== null) {
    return `${row.cleanSheets} vallas invictas`
  }
  if (row.neighborhood) {
    return `${row.neighborhood} · 0 vallas invictas`
  }
  return '0 vallas invictas'
}

onMounted(async () => {
  await store.fetchStandings()
})
</script>

<template>
  <div class="standings-page">
    <!-- PAGE HEADER -->
    <div class="sport-page-header">
      <div class="sport-page-header__left">
        <div class="sport-page-header__icon-box">
          <q-icon name="table_chart" />
        </div>
        <div>
          <div class="sport-page-header__eyebrow">ESTADÍSTICAS OFICIALES · TEMPORADA 2026</div>
          <h1 class="sport-page-header__title">Tabla General de Posiciones</h1>
        </div>
      </div>

      <div class="row items-center q-gutter-sm">
        <q-badge color="primary" class="q-px-sm q-py-xs text-weight-bolder" style="font-size: 0.76rem;">
          LIGA REGULAR
        </q-badge>
      </div>
    </div>

    <!-- MAIN STANDINGS CARD -->
    <q-card flat class="standings-card">
      <q-card-section class="q-pa-lg">
        <div class="row items-center justify-between q-mb-md">
          <div class="row items-center gap-sm">
            <q-icon name="military_tech" color="accent" size="22px" />
            <div class="text-subtitle1 text-weight-bold text-white">Clasificación General</div>
          </div>
          <div class="text-caption text-grey-5">
            Puntos: Victoria = 3 pts · Empate = 1 pt · Derrota = 0 pts
          </div>
        </div>

        <!-- STANDINGS TABLE -->
        <q-table
          :rows="store.standings"
          :columns="[
            { name: 'position', label: 'POS', field: 'position', align: 'center' },
            { name: 'team', label: 'EQUIPO', field: 'name', align: 'left' },
            { name: 'played', label: 'PJ', field: 'played', align: 'center' },
            { name: 'wins', label: 'PG', field: 'wins', align: 'center' },
            { name: 'draws', label: 'PE', field: 'draws', align: 'center' },
            { name: 'losses', label: 'PP', field: 'losses', align: 'center' },
            { name: 'goalsFor', label: 'GF', field: 'goalsFor', align: 'center' },
            { name: 'goalsAgainst', label: 'GC', field: 'goalsAgainst', align: 'center' },
            { name: 'goalDifference', label: 'DG', field: 'goalDifference', align: 'center' },
            { name: 'points', label: 'PUNTOS', field: 'points', align: 'center' },
          ]"
          row-key="_id"
          flat
          hide-pagination
          class="standings-sports-table"
        >
          <!-- POSITION CELL -->
          <template #body-cell-position="props">
            <q-td :props="props" class="text-center">
              <span :class="positionStyles(props.row.position)">{{ props.row.position }}</span>
            </q-td>
          </template>

          <!-- TEAM CELL -->
          <template #body-cell-team="props">
            <q-td :props="props">
              <div class="row items-center no-wrap gap-md">
                <div class="sport-crest-container standings-crest-box">
                  <ImagePreview
                    :src="props.row.logoUrl"
                    fallback="/images/default-team.svg"
                    :alt="`Escudo de ${props.row.name || 'equipo'}`"
                    width="36px"
                    height="36px"
                  />
                </div>
                <div>
                  <div class="standings-team-name">{{ props.row.name }}</div>
                  <div class="standings-team-subtext">{{ getTeamSubtext(props.row) }}</div>
                </div>
              </div>
            </q-td>
          </template>

          <!-- STATS CELLS (PJ, PG, PE, PP, GF, GC) -->
          <template #body-cell-played="props">
            <q-td :props="props" class="text-center text-weight-bold text-slate-200" style="font-size: 0.95rem;">
              {{ props.row.played }}
            </q-td>
          </template>
          <template #body-cell-wins="props">
            <q-td :props="props" class="text-center text-weight-bold text-slate-200" style="font-size: 0.95rem;">
              {{ props.row.wins }}
            </q-td>
          </template>
          <template #body-cell-draws="props">
            <q-td :props="props" class="text-center text-weight-bold text-slate-200" style="font-size: 0.95rem;">
              {{ props.row.draws }}
            </q-td>
          </template>
          <template #body-cell-losses="props">
            <q-td :props="props" class="text-center text-weight-bold text-slate-200" style="font-size: 0.95rem;">
              {{ props.row.losses }}
            </q-td>
          </template>
          <template #body-cell-goalsFor="props">
            <q-td :props="props" class="text-center text-weight-bold text-slate-200" style="font-size: 0.95rem;">
              {{ props.row.goalsFor }}
            </q-td>
          </template>
          <template #body-cell-goalsAgainst="props">
            <q-td :props="props" class="text-center text-weight-bold text-slate-200" style="font-size: 0.95rem;">
              {{ props.row.goalsAgainst }}
            </q-td>
          </template>

          <!-- DG (GOAL DIFFERENCE) -->
          <template #body-cell-goalDifference="props">
            <q-td :props="props" class="text-center">
              <span :class="goalDiffClass(props.row.goalDifference)">
                [{{ props.row.goalDifference > 0 ? '+' : '' }}{{ props.row.goalDifference }}]
              </span>
            </q-td>
          </template>

          <!-- POINTS CELL (PUNTOS) -->
          <template #body-cell-points="props">
            <q-td :props="props" class="text-center">
              <span class="pts-badge">
                {{ props.row.points }} <small>PTS</small>
              </span>
            </q-td>
          </template>
        </q-table>

        <div v-if="!store.standings.length" class="text-grey-5 q-mt-lg text-center q-pa-lg">
          Aún no hay datos suficientes de partidos disputados para calcular la tabla.
        </div>

        <!-- LEYENDA Y CRITERIO DE DESEMPATE (FOOTER) -->
        <div class="standings-footer row items-center justify-between q-mt-lg q-pt-md">
          <div class="row items-center gap-md">
            <div class="row items-center gap-xs text-caption">
              <span class="legend-dot legend-dot--champion"></span>
              <span class="text-weight-bold text-white">1º Puesto:</span>
              <span class="text-grey-4">Campeón de Barrio</span>
            </div>
            <div class="row items-center gap-xs text-caption">
              <span class="legend-dot legend-dot--playoff"></span>
              <span class="text-weight-bold text-white">2º - 4º:</span>
              <span class="text-grey-4">Clasificación a Liguilla</span>
            </div>
          </div>
          <div class="text-caption text-grey-5 text-right standings-tiebreaker">
            Criterio: Puntos → Diferencia de Gol → Goles a Favor → Partidos Ganados
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<style scoped>
.standings-page {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.standings-card {
  background: var(--tb-surface) !important;
  border: 1px solid var(--tb-border) !important;
  border-radius: var(--tb-radius-md) !important;
  overflow: hidden;
}

.standings-sports-table {
  background: transparent !important;
}

.standings-sports-table :deep(thead th) {
  background: var(--tb-surface-raised) !important;
  color: #94a3b8 !important;
  font-size: 0.8rem !important;
  font-weight: 800 !important;
  letter-spacing: 0.08em !important;
  padding: 14px 12px !important;
  text-transform: uppercase;
}

.standings-sports-table :deep(tbody tr) {
  height: 64px;
}

.standings-sports-table :deep(tbody tr:nth-child(even)) {
  background: rgba(30, 41, 59, 0.45) !important;
}

.standings-sports-table :deep(tbody tr:hover) {
  background: rgba(16, 185, 129, 0.08) !important;
}

/* Position Rank Badges */
.standings-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 0.82rem;
  font-weight: 900;
  background: var(--tb-surface-raised);
  color: var(--tb-muted);
}

.standings-rank--champion {
  background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%) !important;
  color: #0b111e !important;
  box-shadow: 0 0 14px rgba(234, 179, 8, 0.55);
}

.standings-rank--playoff {
  background: #2563eb !important;
  color: #ffffff !important;
  box-shadow: 0 0 10px rgba(37, 99, 235, 0.4);
}

.standings-rank--regular {
  background: #1e293b !important;
  color: #94a3b8 !important;
}

/* Team Crest & Names */
.standings-crest-box {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 1px solid var(--tb-border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--tb-surface-raised);
}

.standings-team-name {
  font-size: 0.98rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.01em;
}

.standings-team-subtext {
  font-size: 0.72rem;
  color: #94a3b8;
  font-weight: 500;
}

/* Goal Difference (DG) Delimited Box */
.dg-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.84rem;
  font-weight: 800;
  font-family: monospace;
  letter-spacing: 0.04em;
}

.dg-badge--positive {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.35);
}

.dg-badge--negative {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.35);
}

.dg-badge--neutral {
  background: rgba(148, 163, 184, 0.1);
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.25);
}

/* Points Badge (PUNTOS) */
.pts-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(234, 179, 8, 0.16);
  border: 1px solid rgba(234, 179, 8, 0.45);
  color: #facc15;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  box-shadow: 0 0 10px rgba(234, 179, 8, 0.15);
}

.pts-badge small {
  font-size: 0.68rem;
  font-weight: 800;
  opacity: 0.9;
}

/* Footer & Legend */
.standings-footer {
  border-top: 1px solid var(--tb-border);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.legend-dot--champion {
  background: #f97316;
  box-shadow: 0 0 6px #f97316;
}

.legend-dot--playoff {
  background: #2563eb;
  box-shadow: 0 0 6px #2563eb;
}

.standings-tiebreaker {
  letter-spacing: 0.02em;
}

@media (max-width: 768px) {
  .standings-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .standings-tiebreaker {
    text-align: left;
  }
}
</style>
