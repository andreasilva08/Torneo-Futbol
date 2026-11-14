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
})

const loadFailed = ref(false)
const loaded = ref(false)
const normalizedSrc = computed(() => normalizeImageUrl(props.src))
const usingFallback = computed(() => !normalizedSrc.value || loadFailed.value)
const displaySrc = computed(() => (usingFallback.value ? props.fallback : normalizedSrc.value))

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
  <div class="image-preview">
    <img
      :src="displaySrc"
      :alt="alt"
      class="image-preview__image"
      @load="handleLoad"
      @error="handleError"
    />
  </div>
</template>

<style scoped>
.image-preview {
  display: inline-flex;
  flex-direction: column;
  vertical-align: middle;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.image-preview__image {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain !important;
  border-radius: inherit;
  background: transparent;
  padding: 4px;
  box-sizing: border-box;
}

</style>
