<script setup>
import { computed, watch } from 'vue'
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

const navItems = computed(() => [
  { label: 'Dashboard', icon: 'dashboard', to: '/' },
  { label: 'Equipos', icon: 'groups', to: '/equipos', count: tournamentStore.teams.length },
  { label: 'Jugadores', icon: 'sports_soccer', to: '/jugadores', count: tournamentStore.players.length },
  { label: 'Partidos', icon: 'event', to: '/partidos', count: tournamentStore.matches.length },
  { label: 'Tabla', icon: 'table_chart', to: '/tabla' },
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
  <q-layout view="hHh lpR fFf" class="bg-dark text-white">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn flat round dense icon="menu" @click="uiStore.sidebarOpen = !uiStore.sidebarOpen" class="lt-md" />
        <q-avatar rounded color="positive" text-color="dark" icon="sports_soccer" size="38px" class="q-mr-sm" />
        <q-toolbar-title class="text-weight-bold">
          Torneo de Barrio
          <div class="text-caption text-blue-grey-4">Liga local · Temporada actual</div>
        </q-toolbar-title>
        <q-space />
        <q-badge v-if="tournamentStore.liveMatches.length" color="negative" rounded class="live-badge q-mr-md">
          {{ tournamentStore.liveMatches.length }} EN VIVO
        </q-badge>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="uiStore.sidebarOpen"
      show-if-above
      :width="240"
      bordered
      class="bg-grey-9 text-white"
    >
      <q-list padding>
        <q-item-label header class="text-uppercase text-weight-bold">Gestión del torneo</q-item-label>

        <q-item
          v-for="item in navItems"
          :key="item.label"
          clickable
          v-ripple
          :active="isRouteActive(item.to)"
          active-class="nav-item--active"
          @click="goTo(item.to)"
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" />
          </q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
          <q-item-section v-if="item.count !== undefined" side>
            <q-badge color="blue-grey-8" text-color="blue-grey-2" rounded>{{ item.count }}</q-badge>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <q-page class="q-pa-md q-pa-sm-xl">
        <router-view />
      </q-page>
    </q-page-container>
  </q-layout>
</template>
