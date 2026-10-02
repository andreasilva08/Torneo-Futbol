<script setup>
const scorers = []
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

        <q-banner rounded class="bg-info text-white">
          Los goles se guardan dentro de cada partido, pero el backend aún no expone una tabla de goleadores agregada. Confirma con el Integrante 1 el endpoint y la respuesta para el ranking; no se calculan posiciones estimadas desde el frontend.
        </q-banner>

        <q-table
          :rows="scorers"
          :columns="[
            { name: 'position', label: 'Puesto', field: 'position', align: 'center' },
            { name: 'player', label: 'Jugador', field: 'player' },
            { name: 'team', label: 'Equipo', field: 'team' },
            { name: 'goals', label: 'Goles', field: 'goals', align: 'center' },
          ]"
          row-key="player"
          flat
          hide-pagination
          class="q-mt-md"
        />
      </q-card-section>
    </q-card>
  </div>
</template>
