<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTournamentStore } from '@/stores/tournament'
import ImagePreview from '@/components/ImagePreview.vue'
import { getDefaultTeamLogo } from '@/utils/defaultAssets'

const route = useRoute()
const router = useRouter()
const store = useTournamentStore()

onMounted(async () => {
  await store.fetchTeamDetail(route.params.id)
})

const team = computed(() => store.teamDetail?.team || null)
const players = computed(() => store.teamDetail?.players || [])

const openAddPlayerForm = () => {
  if (!team.value?._id) return

  router.push({
    name: 'players',
    query: { teamId: team.value._id },
  })
}

const positionBadgeClass = (position) => {
  if (position === 'Portero') return 'pos-chip pos-chip--gk'
  if (position === 'Defensa') return 'pos-chip pos-chip--def'
  if (position === 'Delantero') return 'pos-chip pos-chip--fwd'
  return 'pos-chip pos-chip--mid'
}

const getCondicionMeta = (val) => {
  const normalized = String(val || 'TITULAR').toUpperCase()
  if (normalized.includes('ROJA') || normalized === 'EXPULSADO') {
    return { label: 'SANCIONADO (ROJA)', bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.45)', text: '#f87171' }
  }
  if (normalized.includes('AMARILLA') || normalized.includes('AMARILLAS')) {
    return { label: 'SANCIONADO (AMARILLAS)', bg: 'rgba(245, 158, 11, 0.18)', border: 'rgba(245, 158, 11, 0.45)', text: '#fbbf24' }
  }
  if (normalized.includes('LESION') || normalized.includes('LESIONADO')) {
    return { label: 'LESIONADO', bg: 'rgba(251, 146, 60, 0.18)', border: 'rgba(251, 146, 60, 0.45)', text: '#fb923c' }
  }
  if (normalized.includes('SUPLENTE') || normalized === 'BANCA') {
    return { label: 'SUPLENTE', bg: 'rgba(56, 189, 248, 0.18)', border: 'rgba(56, 189, 248, 0.45)', text: '#38bdf8' }
  }
  return { label: 'TITULAR', bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.45)', text: '#10b981' }
}
</script>

<template>
  <div class="team-detail-page">
    <!-- PAGE HEADER -->
    <div class="sport-page-header">
      <div class="sport-page-header__left">
        <q-btn flat round icon="arrow_back" color="grey-4" @click="router.back()" class="q-mr-xs" />
        <div class="sport-page-header__icon-box">
          <q-icon name="groups" />
        </div>
        <div>
          <div class="sport-page-header__eyebrow">FICHA DE CLUB OFICIAL · TEMPORADA 2026</div>
          <h1 class="sport-page-header__title">{{ team ? team.name : 'Detalle de Equipo' }}</h1>
        </div>
      </div>
    </div>

    <!-- LOADING & ERROR STATES -->
    <div v-if="store.loading">
      <q-skeleton type="rect" height="180px" />
    </div>

    <div v-else-if="store.error" class="q-mb-md">
      <q-banner rounded class="bg-negative text-white">
        {{ store.error }}
      </q-banner>
    </div>

    <div v-else-if="team" class="q-gutter-y-lg">
      <!-- TEAM HERO BANNER -->
      <q-card flat class="sports-team-hero">
        <q-card-section class="row items-center q-col-gutter-lg q-pa-lg">
          <div class="col-12 col-sm-auto text-center">
            <div class="sport-crest-container team-hero-crest">
              <ImagePreview
                :src="team.logoUrl"
                :fallback="getDefaultTeamLogo(team)"
                :alt="`Escudo de ${team.name}`"
                width="92px"
                height="92px"
              />
            </div>
          </div>

          <div class="col-12 col-sm row items-center justify-between">
            <div>
              <div class="team-hero-title">{{ team.name }}</div>
              <div class="row items-center gap-sm q-mt-xs">
                <q-badge color="secondary" class="text-weight-bold">{{ team.shortName }}</q-badge>
                <span class="text-grey-5">·</span>
                <span class="text-grey-4">
                  <q-icon name="place" size="14px" class="q-mr-xs" />
                  {{ team.stadium || 'Cancha Local' }}
                </span>
                <span class="text-grey-5">·</span>
                <span class="text-primary text-weight-bold">{{ players.length }} Jugadores</span>
              </div>
            </div>

            <q-btn
              unelevated
              color="primary"
              icon="person_add"
              label="Agregar Jugador"
              @click="openAddPlayerForm"
              class="q-mt-sm q-mt-sm-none"
            />
          </div>
        </q-card-section>
      </q-card>

      <!-- ROSTER TABLE -->
      <q-card flat class="sports-panel-card">
        <q-card-section class="q-pa-lg">
          <div class="row items-center justify-between q-mb-md">
            <div class="row items-center gap-sm">
              <q-icon name="sports_soccer" color="primary" size="20px" />
              <div class="text-subtitle1 text-weight-bold text-white">Plantilla Oficial de Jugadores</div>
            </div>
            <div class="text-caption text-grey-5">
              Total registrados: {{ players.length }}
            </div>
          </div>

          <q-table
            :rows="players"
            :columns="[
              { name: 'player', label: 'JUGADOR', field: (row) => row.name || row.nombre, align: 'left', sortable: true },
              { name: 'number', label: 'DORSAL', field: (row) => row.number ?? row.dorsal, align: 'center', sortable: true },
              { name: 'position', label: 'POSICIÓN', field: (row) => row.position || row.posicion, align: 'center', sortable: true },
              { name: 'status', label: 'CONDICIÓN', field: (row) => row.status || row.condicion, align: 'center' },
            ]"
            row-key="_id"
            flat
            hide-pagination
            class="roster-sports-table"
          >
            <!-- PLAYER -->
            <template #body-cell-player="props">
              <q-td :props="props">
                <div class="row items-center no-wrap gap-md">
                  <div class="sport-crest-container" style="width: 36px; height: 36px;">
                    <ImagePreview
                      :src="props.row.photoUrl"
                      fallback="/images/default-player.svg"
                      :alt="`Fotografía de ${props.row.name || props.row.nombre}`"
                      width="32px"
                      height="32px"
                    />
                  </div>
                  <span class="text-weight-bold text-white">{{ props.row.name || props.row.nombre }}</span>
                </div>
              </q-td>
            </template>

            <!-- DORSAL -->
            <template #body-cell-number="props">
              <q-td :props="props" class="text-center">
                <span class="jersey-badge">
                  #{{ props.row.number ?? props.row.dorsal ?? '-' }}
                </span>
              </q-td>
            </template>

            <!-- POSITION -->
            <template #body-cell-position="props">
              <q-td :props="props" class="text-center">
                <span :class="positionBadgeClass(props.row.position || props.row.posicion)">
                  {{ props.row.position || props.row.posicion }}
                </span>
              </q-td>
            </template>

            <!-- STATUS -->
            <template #body-cell-status="props">
              <q-td :props="props" class="text-center">
                <span
                  class="status-titular-chip"
                  :style="{
                    background: getCondicionMeta(props.row.status || props.row.condicion).bg,
                    borderColor: getCondicionMeta(props.row.status || props.row.condicion).border,
                    color: getCondicionMeta(props.row.status || props.row.condicion).text,
                  }"
                >
                  {{ getCondicionMeta(props.row.status || props.row.condicion).label }}
                </span>
              </q-td>
            </template>
          </q-table>

          <div v-if="!players.length" class="text-caption text-grey-5 text-center q-pa-xl">
            Este club todavía no tiene jugadores registrados en su plantilla.
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<style scoped>
.team-detail-page {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.sports-team-hero {
  background: var(--tb-surface) !important;
  border: 1px solid var(--tb-border) !important;
  border-radius: var(--tb-radius-lg) !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
}

.team-hero-crest {
  width: 96px;
  height: 96px;
  border: 2px solid var(--tb-border);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.team-hero-title {
  font-size: 1.8rem;
  font-weight: 900;
  color: #ffffff;
  line-height: 1.1;
}

.sports-panel-card {
  background: var(--tb-surface) !important;
  border: 1px solid var(--tb-border) !important;
  border-radius: var(--tb-radius-md) !important;
  overflow: hidden;
}

.roster-sports-table :deep(thead th) {
  background: var(--tb-surface-raised) !important;
  color: var(--tb-muted) !important;
  font-size: 0.74rem !important;
  font-weight: 800 !important;
  letter-spacing: 0.08em !important;
  padding: 14px 16px !important;
}

.roster-sports-table :deep(tbody tr) {
  height: 60px;
}

.roster-sports-table :deep(tbody tr:nth-child(even)) {
  background: rgba(30, 41, 59, 0.45) !important;
}

.roster-sports-table :deep(tbody tr:hover) {
  background: rgba(16, 185, 129, 0.08) !important;
}

.jersey-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 28px;
  border-radius: 6px;
  background: var(--tb-surface-raised);
  border: 1px solid var(--tb-border);
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 900;
}

/* Position Chips */
.pos-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pos-chip--gk {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #f59e0b;
}

.pos-chip--def {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.35);
  color: #3b82f6;
}

.pos-chip--mid {
  background: rgba(6, 182, 212, 0.15);
  border: 1px solid rgba(6, 182, 212, 0.35);
  color: #06b6d4;
}

.pos-chip--fwd {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #10b981;
}

.status-titular-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: #22c55e;
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.06em;
}
</style>
