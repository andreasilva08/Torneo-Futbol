<script setup>
import { formatMatchDate, matchStatusColor, matchStatusLabel } from '@/utils/matchFormatting'
import ImagePreview from '@/components/ImagePreview.vue'

defineProps({
  match: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <router-link :to="{ name: 'match-detail', params: { id: match._id } }" class="match-link">
    <q-card flat bordered class="match-card">
      <q-card-section class="row items-center justify-between q-col-gutter-md">
        <div class="col-12 col-sm-4">
          <div class="row items-center no-wrap">
            <ImagePreview
              :src="match.homeTeam?.logoUrl"
              fallback="/images/default-team.svg"
              :alt="`Escudo de ${match.homeTeam?.name || 'equipo local'}`"
              width="42px"
              height="42px"
              class="q-mr-sm"
            />
            <div class="ellipsis">
              <div class="text-weight-bold ellipsis">{{ match.homeTeam?.name || 'Equipo local' }}</div>
              <div class="text-caption text-grey-7">Local</div>
            </div>
          </div>
        </div>

        <div class="col-12 col-sm-4 text-center">
          <div v-if="match.status === 'SCHEDULED'" class="text-subtitle1 text-weight-bold">VS</div>
          <div v-else class="match-score">{{ match.homeScore ?? 0 }} <span>–</span> {{ match.awayScore ?? 0 }}</div>
          <div class="text-caption text-grey-7">Jornada {{ match.matchday }}</div>
        </div>

        <div class="col-12 col-sm-4">
          <div class="row items-center justify-end no-wrap">
            <div class="ellipsis text-right q-mr-sm">
              <div class="text-weight-bold ellipsis">{{ match.awayTeam?.name || 'Equipo visitante' }}</div>
              <div class="text-caption text-grey-7">Visitante</div>
            </div>
            <ImagePreview
              :src="match.awayTeam?.logoUrl"
              fallback="/images/default-team.svg"
              :alt="`Escudo de ${match.awayTeam?.name || 'equipo visitante'}`"
              width="42px"
              height="42px"
            />
          </div>
        </div>

        <div class="col-12 row items-center justify-between q-pt-sm">
          <span class="text-caption text-grey-7">{{ formatMatchDate(match.date) }}</span>
          <q-badge :color="matchStatusColor(match.status)" rounded>{{ matchStatusLabel(match.status) }}</q-badge>
        </div>
      </q-card-section>
    </q-card>
  </router-link>
</template>

<style scoped>
.match-link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.match-card {
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.match-link:hover .match-card,
.match-link:focus-visible .match-card {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgb(15 23 42 / 9%);
}

.match-score {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.match-score span {
  color: #718096;
  font-size: 1rem;
}
</style>
