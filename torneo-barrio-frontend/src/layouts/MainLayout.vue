<script setup>
import { computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { useTournamentStore } from '@/stores/tournament'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const uiStore = useUiStore()
const tournamentStore = useTournamentStore()

watch(() => $q.screen.lt.md, (isCompact) => {
  if (isCompact) {
    uiStore.sidebarOpen = false
  }
}, { immediate: true })

onMounted(async () => {
  if (!tournamentStore.teams.length && !tournamentStore.matches.length) {
    await tournamentStore.fetchDashboard()
  }
})

const operationalItems = computed(() => [
  { label: 'Dashboard', icon: 'dashboard', to: '/' },
  { label: 'Partidos', icon: 'event', to: '/partidos', count: tournamentStore.matches.length },
  { label: 'Tabla de Posiciones', icon: 'table_chart', to: '/tabla' },
  { label: 'Equipos', icon: 'groups', to: '/equipos', count: tournamentStore.teams.length },
  { label: 'Jugadores', icon: 'sports_soccer', to: '/jugadores', count: tournamentStore.players.length },
])

const analyticsItems = computed(() => [
  { label: 'Goleadores', icon: 'emoji_events', to: '/goleadores' },
  { label: 'Asistencias', icon: 'assistant', to: '/asistencias' },
  { label: 'Valla Invicta', icon: 'shield', to: '/porteros' },
])

const isRouteActive = (path) => {
  if (path === '/') {
    return route.path === path
  }
  return route.path.startsWith(path)
}

const goTo = (path) => {
  router.push(path)
}
</script>

<template>
  <q-layout view="hHh lpR fFf" class="dark-sports-layout">
    <!-- TOP HEADER -->
    <q-header class="top-sports-header">
      <q-toolbar class="q-px-md q-px-md-lg">
        <q-btn
          flat
          round
          dense
          icon="menu"
          aria-label="Abrir menú"
          @click="uiStore.sidebarOpen = !uiStore.sidebarOpen"
          class="lt-md q-mr-sm text-grey-4"
        />

        <div class="row items-center cursor-pointer" @click="goTo('/')">
          <div class="header-logo-badge q-mr-md">
            <q-icon name="sports_soccer" size="24px" />
          </div>

          <div>
            <div class="header-title text-weight-bolder">
              TORNEO DE BARRIO
            </div>
            <div class="header-subtitle text-caption">
              LIGA LOCAL · TEMPORADA 2026
            </div>
          </div>
        </div>

        <q-space />

        <!-- RIGHT STATUS BADGE -->
        <div class="row items-center q-gutter-x-sm">
          <div v-if="tournamentStore.liveMatches.length" class="live-badge">
            <span class="live-dot"></span>
            <span>🔴 {{ tournamentStore.liveMatches.length }} EN VIVO</span>
          </div>
          <q-badge
            v-else
            color="primary"
            outline
            class="text-weight-bold q-px-sm q-py-xs text-uppercase"
            style="letter-spacing: 0.06em; font-size: 0.72rem; border-radius: 9999px;"
          >
            TEMPORADA REGULAR
          </q-badge>
        </div>
      </q-toolbar>
    </q-header>

    <!-- SIDEBAR DRAWER -->
    <q-drawer
      v-model="uiStore.sidebarOpen"
      show-if-above
      :width="260"
      bordered
      class="sports-sidebar"
    >
      <q-list padding class="q-px-sm q-py-md">
        <!-- GRUPO 1: GESTIÓN OPERATIVA -->
        <div class="drawer-section-title q-px-md q-pb-xs">
          Gestión del Torneo
        </div>

        <q-item
          v-for="item in operationalItems"
          :key="item.label"
          clickable
          v-ripple
          :active="isRouteActive(item.to)"
          class="drawer-nav-item"
          :class="{ 'nav-item--active': isRouteActive(item.to) }"
          @click="goTo(item.to)"
        >
          <q-item-section avatar style="min-width: 40px;">
            <q-icon :name="item.icon" size="20px" />
          </q-item-section>

          <q-item-section class="nav-item-label">
            {{ item.label }}
          </q-item-section>

          <q-item-section v-if="item.count !== undefined" side>
            <span class="nav-badge-count">
              {{ item.count }}
            </span>
          </q-item-section>
        </q-item>

        <!-- SEPARADOR / DIVISOR -->
        <q-separator class="q-my-md" style="background: var(--tb-border);" />

        <!-- GRUPO 2: ESTADÍSTICAS Y ANALÍTICA -->
        <div class="drawer-section-title q-px-md q-pb-xs">
          Estadísticas y Reportes
        </div>

        <q-item
          v-for="item in analyticsItems"
          :key="item.label"
          clickable
          v-ripple
          :active="isRouteActive(item.to)"
          class="drawer-nav-item"
          :class="{ 'nav-item--active': isRouteActive(item.to) }"
          @click="goTo(item.to)"
        >
          <q-item-section avatar style="min-width: 40px;">
            <q-icon :name="item.icon" size="20px" />
          </q-item-section>

          <q-item-section class="nav-item-label">
            {{ item.label }}
          </q-item-section>
        </q-item>
      </q-list>

      <!-- SIDEBAR FOOTER -->
      <div class="sidebar-footer q-pa-md text-caption text-grey-6 text-center">
        <div>Torneo de Barrio 2.0</div>
        <div class="text-grey-7" style="font-size: 0.7rem;">Dark Sports UI</div>
      </div>
    </q-drawer>

    <!-- PAGE CONTAINER -->
    <q-page-container>
      <q-page class="q-page">
        <router-view />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<style scoped>
.dark-sports-layout {
  background-color: var(--tb-bg);
  min-height: 100vh;
}

.top-sports-header {
  background: var(--tb-bg) !important;
  border-bottom: 1px solid var(--tb-border) !important;
}

.header-title {
  font-size: 1.15rem;
  letter-spacing: 0.04em;
  color: #ffffff;
  line-height: 1.1;
}

.header-subtitle {
  color: var(--tb-muted);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  font-weight: 700;
  margin-top: 2px;
}

.sports-sidebar {
  background: var(--tb-surface) !important;
  border-right: 1px solid var(--tb-border) !important;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.sidebar-footer {
  border-top: 1px solid var(--tb-border);
  margin-top: auto;
}

.nav-item-label {
  font-size: 0.88rem;
  font-weight: 600;
}
</style>
