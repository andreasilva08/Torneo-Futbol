<script setup>
import ImagePreview from '@/components/ImagePreview.vue'
import { getDefaultTeamLogo } from '@/utils/defaultAssets'

defineProps({
  rows: { type: Array, required: true },
  columns: { type: Array, required: true },
  emptyMessage: { type: String, default: 'No hay datos registrados.' },
  rowKey: { type: String, default: 'playerId' }
})
</script>

<template>
  <q-table
    :rows="rows"
    :columns="columns"
    :row-key="rowKey"
    flat
    hide-pagination
    :pagination="{ rowsPerPage: 0 }"
    class="stats-sports-table"
  >
    <!-- Slots heredados dinámicamente -->
    <template v-for="(_, slot) in $slots" #[slot]="props">
      <slot :name="slot" v-bind="props" />
    </template>
  </q-table>

  <div v-if="!rows.length" class="text-grey-5 text-center q-pa-xl">
    {{ emptyMessage }}
  </div>
</template>

<style scoped>
.stats-sports-table :deep(thead th) {
  background: var(--tb-surface-raised) !important;
  color: var(--tb-muted) !important;
  font-size: 0.74rem !important;
  font-weight: 800 !important;
  letter-spacing: 0.08em !important;
  padding: 14px 16px !important;
}

.stats-sports-table :deep(tbody tr) {
  height: 60px;
}

.stats-sports-table :deep(tbody tr:nth-child(even)) {
  background: rgba(30, 41, 59, 0.45) !important;
}

.stats-sports-table :deep(tbody tr:hover) {
  background: rgba(16, 185, 129, 0.08) !important;
}
</style>
