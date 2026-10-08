<script setup>
import { onMounted } from 'vue'
import { useTournamentStore } from '@/stores/tournament'

const store = useTournamentStore()

onMounted(async () => {
  await store.fetchTopScorers()
})
</script>

<template>
  <div>
    <div class="row items-center q-mb-lg">
      <div>
        <p class="text-caption text-uppercase text-grey-7 q-mb-xs">Estadísticas</p>
        <h1 class="text-h4 text-weight-bold q-ma-none">Goleadores</h1>
      </div>
    </div>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold q-mb-md">Tabla de goleadores</div>

        <q-table
          :rows="store.scorers"
          :columns="[
            { name: 'position', label: 'Puesto', field: 'position', align: 'center' },
            { name: 'player', label: 'Jugador', field: 'player' },
            { name: 'team', label: 'Equipo', field: 'team' },
            { name: 'goals', label: 'Goles', field: 'goals', align: 'center' },
          ]"
          row-key="playerId"
          flat
          hide-pagination
          class="q-mt-md"
        />

        <div v-if="!store.scorers.length" class="text-grey-7 q-mt-md">
          Todavía no hay goles registrados para el ranking.
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>
