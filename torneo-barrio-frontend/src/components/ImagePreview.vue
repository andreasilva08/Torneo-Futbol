<script setup>
import { computed, ref, watch } from 'vue'
import { normalizeImageUrl } from '@/utils/imageUrl'

const props = defineProps({
  src: {
    type: String,
    default: '',
  },
  fallback: {
    type: String,
    required: true,
  },
  alt: {
    type: String,
    default: '',
  },
  width: {
    type: String,
    default: '100%',
  },
  height: {
    type: String,
    default: '100%',
  },
  showStatus: {
    type: Boolean,
    default: false,
  },
  showError: {
    type: Boolean,
    default: false,
  },
})

const loadFailed = ref(false)
const loaded = ref(false)
const normalizedSrc = computed(() => normalizeImageUrl(props.src))
const usingFallback = computed(() => !normalizedSrc.value || loadFailed.value)
const displaySrc = computed(() => (usingFallback.value ? props.fallback : normalizedSrc.value))
const statusVisible = computed(() => {
  return props.showStatus || (props.showError && loadFailed.value)
})
const imageStyle = computed(() => ({
  width: props.width,
  height: props.height,
}))

const statusMessage = computed(() => {
  if (!props.src?.trim() || !normalizedSrc.value) {
    return 'Se utilizará el escudo por defecto.'
  }

  if (loadFailed.value) {
    return 'No se pudo cargar la imagen; se mostrará el escudo por defecto.'
  }

  return loaded.value ? 'Vista previa cargada.' : 'Cargando vista previa…'
})

watch(
  () => props.src,
  () => {
    loadFailed.value = false
    loaded.value = false
  },
)

const handleLoad = () => {
  if (!usingFallback.value) {
    loaded.value = true
  }
}

const handleError = () => {
  if (!usingFallback.value) {
    loadFailed.value = true
    loaded.value = false
  }
}
</script>

<template>
  <div class="image-preview" :class="{ 'image-preview--with-status': statusVisible }">
    <img
      :src="displaySrc"
      :alt="alt"
      :style="imageStyle"
      class="image-preview__image"
      @load="handleLoad"
      @error="handleError"
    />
    <p v-if="statusVisible" class="image-preview__status" aria-live="polite">
      {{ statusMessage }}
    </p>
  </div>
</template>

<style scoped>
.image-preview {
  display: inline-flex;
  flex-direction: column;
  vertical-align: middle;
  overflow: hidden;
}

.image-preview__image {
  display: block;
  max-width: 100%;
  object-fit: contain;
  border-radius: inherit;
  background: #eef2ef;
}

.image-preview--with-status {
  width: 100%;
  gap: 8px;
}

.image-preview__status {
  margin: 0;
  color: #52605a;
  font-size: 0.8rem;
  line-height: 1.4;
}
</style>
