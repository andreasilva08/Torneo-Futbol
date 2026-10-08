<template>
  <div class="row items-center justify-center q-pa-xl" style="min-height: 60vh;">
    <q-card flat class="sports-panel-card q-pa-xl text-center" style="max-width: 520px; width: 100%;">
      <div class="sport-crest-container q-mx-auto q-mb-md" style="width: 80px; height: 80px; background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.3);">
        <q-icon name="sports" color="negative" size="42px" />
      </div>
      <h1 class="text-h3 text-weight-bolder text-white q-mt-md q-mb-xs">404</h1>
      <div class="text-subtitle1 text-weight-bold text-primary q-mb-sm">Página No Encontrada</div>
      <p class="text-body2 text-grey-5 q-mb-lg">La sección o encuentro que buscas no existe o ha sido reubicada.</p>
      <q-btn unelevated color="primary" to="/" label="Volver al Dashboard" icon="dashboard" />
    </q-card>
  </div>
</template>

<style scoped>
.sports-panel-card {
  background: var(--tb-surface) !important;
  border: 1px solid var(--tb-border) !important;
  border-radius: var(--tb-radius-lg) !important;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5) !important;
}
</style>
