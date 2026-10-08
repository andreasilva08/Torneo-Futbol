<script setup>
import { onMounted } from 'vue'
import { useTournamentStore } from '@/stores/tournament'

const store = useTournamentStore()

onMounted(async () => {
  await store.fetchGoalkeepersStats()
})
</script>

<template>
  <div>
    <div class="row items-center q-mb-lg">
      <div>
        <p class="text-caption text-uppercase text-grey-7 q-mb-xs">Estadísticas</p>
        <h1 class="text-h4 text-weight-bold q-ma-none">Valla menos vencida</h1>
      </div>
    </div>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold q-mb-md">Porteros y vallas</div>

        <q-table
          :rows="store.goalkeepers"
          :columns="[
            { name: 'position', label: 'Puesto', field: 'position', align: 'center' },
            { name: 'team', label: 'Equipo', field: 'team' },
            { name: 'matches', label: 'Partidos', field: 'matches', align: 'center' },
            { name: 'goalsAgainst', label: 'Goles encajados', field: 'goalsAgainst', align: 'center' },
            { name: 'cleanSheets', label: 'Vallas a cero', field: 'cleanSheets', align: 'center' },
          ]"
          row-key="teamId"
          flat
          hide-pagination
          class="q-mt-md"
        />

        <div v-if="!store.goalkeepers.length" class="text-grey-7 q-mt-md">
          No hay suficientes partidos finalizados para mostrar la clasificación de porteros.
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>
