<script setup>
const assists = []
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

        <q-banner rounded class="bg-info text-white">
          El backend permite registrar asistencias como eventos del partido (PUT /api/matches/:id/events), pero no ofrece un endpoint de tabla agregada por jugador. Esta tabla queda vacía hasta confirmar esa ruta y su estructura con el Integrante 1.
        </q-banner>

        <q-table
          :rows="assists"
          :columns="[
            { name: 'position', label: 'Puesto', field: 'position', align: 'center' },
            { name: 'player', label: 'Jugador', field: 'player' },
            { name: 'team', label: 'Equipo', field: 'team' },
            { name: 'assists', label: 'Asistencias', field: 'assists', align: 'center' },
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
