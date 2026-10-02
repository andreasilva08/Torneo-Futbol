<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useTournamentStore, getApiErrorMessage } from '@/stores/tournament'
import MatchSummaryCard from '@/components/MatchSummaryCard.vue'

const store = useTournamentStore()
const $q = useQuasar()
const router = useRouter()
const dialog = ref(false)
const saving = ref(false)
const form = reactive({
  matchday: 1,
  date: '',
  homeTeam: '',
  awayTeam: '',
})

const teamOptions = computed(() => store.teams.map((team) => ({
  label: team.name,
  value: team._id,
})))

const resetForm = () => {
  Object.assign(form, {
    matchday: 1,
    date: '',
    homeTeam: '',
    awayTeam: '',
  })
}

const openDialog = () => {
  resetForm()
  dialog.value = true
}

const scheduleMatch = async () => {
  if (form.homeTeam === form.awayTeam) {
    $q.notify({ type: 'warning', message: 'El equipo local y el visitante deben ser distintos.' })
    return
  }

  saving.value = true

  try {
    const created = await store.createMatch({
      matchday: Number(form.matchday),
      date: new Date(form.date).toISOString(),
      homeTeam: form.homeTeam,
      awayTeam: form.awayTeam,
    })

    dialog.value = false
    $q.notify({ type: 'positive', message: 'Partido programado correctamente.' })
    if (created._id) {
      await router.push({ name: 'match-detail', params: { id: created._id } })
    }
  } catch (error) {
    $q.notify({ type: 'negative', message: getApiErrorMessage(error) })
  } finally {
    saving.value = false
  }
}

const matchesByDate = computed(() => [...store.matches].sort((first, second) => (
  new Date(first.date).getTime() - new Date(second.date).getTime()
)))

onMounted(async () => {
  await Promise.all([store.fetchTeams(), store.fetchMatches()])
})
</script>

<template>
  <div>
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <p class="text-caption text-uppercase text-grey-7 q-mb-xs">Calendario</p>
        <h1 class="text-h4 text-weight-bold q-ma-none">Partidos</h1>
      </div>
      <q-btn
        color="primary"
        icon="add"
        label="Programar partido"
        :disable="store.teams.length < 2"
        @click="openDialog"
      />
    </div>

    <q-banner v-if="store.matchesError" rounded class="bg-negative text-white q-mb-md">
      No se pudieron consultar los partidos: {{ store.matchesError }}
    </q-banner>
    <q-banner v-if="store.teams.length < 2" rounded class="bg-info text-white q-mb-md">
      Registra al menos dos equipos antes de programar un encuentro.
    </q-banner>

    <div v-if="store.matchesLoading && !store.matches.length" class="q-gutter-md">
      <q-skeleton v-for="item in 3" :key="item" type="rect" height="120px" />
    </div>

    <div v-else-if="matchesByDate.length" class="q-gutter-md">
      <MatchSummaryCard v-for="match in matchesByDate" :key="match._id" :match="match" />
    </div>

    <q-card v-else flat bordered class="q-pa-xl text-center">
      <q-icon name="event_busy" color="grey-6" size="3rem" />
      <div class="text-h6 q-mt-md">Todavía no hay partidos</div>
      <div class="text-body2 text-grey-7 q-mt-sm">Los encuentros programados aparecerán aquí.</div>
    </q-card>

    <q-dialog v-model="dialog" persistent>
      <q-card class="match-dialog">
        <q-card-section>
          <div class="text-h6">Programar partido</div>
          <div class="text-caption text-grey-7">Los campos coinciden con los requisitos de la API.</div>
        </q-card-section>

        <q-form class="q-gutter-md q-pa-md" @submit.prevent="scheduleMatch">
          <q-input v-model.number="form.matchday" type="number" min="1" label="Jornada" outlined required />
          <q-input v-model="form.date" type="datetime-local" label="Fecha y hora" outlined required />
          <q-select
            v-model="form.homeTeam"
            :options="teamOptions"
            emit-value
            map-options
            label="Equipo local"
            outlined
            required
          />
          <q-select
            v-model="form.awayTeam"
            :options="teamOptions"
            emit-value
            map-options
            label="Equipo visitante"
            outlined
            required
          />

          <div class="row justify-end q-gutter-sm">
            <q-btn flat label="Cancelar" color="grey-7" @click="dialog = false" />
            <q-btn type="submit" label="Programar" color="primary" :loading="saving" />
          </div>
        </q-form>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
.match-dialog {
  width: 92vw;
  max-width: 520px;
}
</style>
