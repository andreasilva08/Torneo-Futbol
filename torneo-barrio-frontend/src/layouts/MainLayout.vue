<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', to: '/' },
  { label: 'Equipos', icon: 'groups', to: '/equipos' },
  { label: 'Jugadores', icon: 'sports_soccer', to: '/jugadores' },
  { label: 'Partidos', icon: 'event', to: '/partidos' },
  { label: 'Goleadores', icon: 'emoji_events', to: '/goleadores' },
  { label: 'Asistencias', icon: 'assistant', to: '/asistencias' },
  { label: 'Porteros', icon: 'shield', to: '/porteros' },
]

const isRouteActive = (path) => {
  if (path === '/') {
    return route.path === path
  }

  return route.path.startsWith(path)
}

const goTo = (path) => {
  router.push(path)
}

const themeLabel = computed(() => (uiStore.theme === 'dark' ? 'Modo claro' : 'Modo oscuro'))
</script>

<template>
  <q-layout view="hHh lpR fFf" :class="uiStore.theme === 'dark' ? 'bg-dark text-white' : 'bg-grey-2 text-dark'">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn flat round dense icon="menu" @click="uiStore.sidebarOpen = !uiStore.sidebarOpen" class="lt-md" />
        <q-toolbar-title class="text-weight-bold">Torneo Barrio</q-toolbar-title>
        <q-space />
        <q-btn
          flat
          round
          dense
          :icon="uiStore.theme === 'dark' ? 'light_mode' : 'dark_mode'"
          :label="themeLabel"
          @click="uiStore.toggleTheme()"
          class="q-mr-sm"
        />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="uiStore.sidebarOpen"
      show-if-above
      :width="240"
      bordered
      :class="uiStore.theme === 'dark' ? 'bg-grey-9 text-white' : 'bg-white text-dark'"
    >
      <q-list padding>
        <q-item-label header>Gestión del torneo</q-item-label>

        <q-item
          v-for="item in navItems"
          :key="item.label"
          clickable
          v-ripple
          :active="isRouteActive(item.to)"
          active-class="bg-primary text-white"
          @click="goTo(item.to)"
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" />
          </q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
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
