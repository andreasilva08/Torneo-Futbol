<script setup>
import { onMounted } from 'vue'
import { useTournamentStore } from '@/stores/tournament'

const store = useTournamentStore()

onMounted(async () => {
  await store.fetchTopAssists()
})
</script>

<template>
  <div>
    <div class="row items-center q-mb-lg">
      <div>
        <p class="text-caption text-uppercase text-grey-7 q-mb-xs">Estadísticas</p>
        <h1 class="text-h4 text-weight-bold q-ma-none">Asistencias</h1>
      </div>
    </div>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold q-mb-md">Tabla de asistencias</div>

        <q-table
          :rows="store.assists"
          :columns="[
            { name: 'position', label: 'Puesto', field: 'position', align: 'center' },
            { name: 'player', label: 'Jugador', field: 'player' },
            { name: 'team', label: 'Equipo', field: 'team' },
            { name: 'assists', label: 'Asistencias', field: 'assists', align: 'center' },
          ]"
          row-key="playerId"
          flat
          hide-pagination
          class="q-mt-md"
        />

        <div v-if="!store.assists.length" class="text-grey-7 q-mt-md">
          Todavía no hay asistencias registradas.
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>
