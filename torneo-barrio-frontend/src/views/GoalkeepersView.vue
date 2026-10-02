<script setup>
const goalkeepers = []
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

        <q-banner rounded class="bg-info text-white">
          La métrica de valla menos vencida aún no se expone en el backend, por lo que se muestra un estado vacío a la espera de los datos reales.
        </q-banner>

        <q-table
          :rows="goalkeepers"
          :columns="[
            { name: 'position', label: 'Puesto', field: 'position', align: 'center' },
            { name: 'player', label: 'Portero', field: 'player' },
            { name: 'team', label: 'Equipo', field: 'team' },
            { name: 'goalsAgainst', label: 'Goles encajados', field: 'goalsAgainst', align: 'center' },
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
