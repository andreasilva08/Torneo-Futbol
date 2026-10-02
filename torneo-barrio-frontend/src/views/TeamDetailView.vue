<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTournamentStore } from '@/stores/tournament'
import ImagePreview from '@/components/ImagePreview.vue'

const route = useRoute()
const router = useRouter()
const store = useTournamentStore()

onMounted(async () => {
  await store.fetchTeamDetail(route.params.id)
})

const team = computed(() => store.teamDetail?.team || null)
const players = computed(() => store.teamDetail?.players || [])
</script>

<template>
  <div>
    <div class="row items-center q-mb-lg">
      <q-btn flat round icon="arrow_back" @click="router.back()" class="q-mr-sm" />
      <div>
        <p class="text-caption text-uppercase text-grey-7 q-mb-xs">Detalle</p>
        <h1 class="text-h4 text-weight-bold q-ma-none">Equipo</h1>
      </div>
    </div>

    <div v-if="store.loading">
      <q-skeleton type="rect" height="220px" />
    </div>

    <div v-else-if="store.error" class="q-mb-md">
      <q-banner rounded class="bg-negative text-white">
        {{ store.error }}
      </q-banner>
    </div>

    <div v-else-if="team" class="q-gutter-md">
      <q-card flat bordered>
        <q-card-section class="row items-center q-col-gutter-md">
          <div class="col-12 col-md-2">
            <ImagePreview
              :src="team.logoUrl"
              fallback="/images/default-team.svg"
              :alt="`Escudo de ${team.name}`"
              width="90px"
              height="90px"
              show-error
            />
          </div>
          <div class="col-12 col-md-10">
            <div class="text-h5 text-weight-bold">{{ team.name }}</div>
            <div class="text-subtitle2 text-grey-7 q-mt-xs">{{ team.shortName }} • {{ team.stadium || 'Sin estadio registrado' }}</div>
          </div>
        </q-card-section>
      </q-card>

      <q-card flat bordered>
        <q-card-section>
          <div class="text-subtitle1 text-weight-bold q-mb-md">Plantilla del equipo</div>

          <q-table
            :rows="players"
            :columns="[
              { name: 'name', label: 'Jugador', field: 'name', sortable: true },
              { name: 'number', label: 'Dorsal', field: 'number', sortable: true },
              { name: 'position', label: 'Posición', field: 'position', sortable: true },
            ]"
            row-key="_id"
            flat
            hide-pagination
          >
            <template #body-cell-name="props">
              <q-td :props="props">
                <div class="row items-center no-wrap">
                  <ImagePreview
                    :src="props.row.photoUrl"
                    fallback="/images/default-player.svg"
                    :alt="`Fotografía de ${props.row.name}`"
                    width="36px"
                    height="36px"
                    show-error
                    class="q-mr-sm"
                  />
                  <span class="text-weight-medium">{{ props.row.name }}</span>
                </div>
              </q-td>
            </template>
          </q-table>

          <div v-if="!players.length" class="text-grey-7 q-mt-md">
            Este equipo aún no tiene jugadores registrados.
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>
