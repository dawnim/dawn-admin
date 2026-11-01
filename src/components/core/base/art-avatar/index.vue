<template>
  <img
    v-if="src && !failed"
    :src="src"
    :style="style"
    class="rounded-full object-cover shrink-0"
    :alt="alt"
    @error="failed = true"
  />
  <ArtLogo v-else :size="size" :style="style" :title="alt" />
</template>
<script setup lang="ts">
  import ArtLogo from '../art-logo/index.vue'
  const props = withDefaults(defineProps<{ src?: string; size?: number; alt?: string }>(), {
    src: '',
    size: 36,
    alt: 'Avatar'
  })
  const failed = ref(false)
  const style = computed(() => ({ width: props.size + 'px', height: props.size + 'px' }))
  watch(
    () => props.src,
    () => (failed.value = false)
  )
</script>
