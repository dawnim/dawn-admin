<template>
  <ElImage
    :src="images[0]"
    :preview-src-list="previewSrcList.length ? images.slice(1) : []"
    preview-teleported
  >
    <template #error
      ><slot name="error"><ArtSvgIcon icon="ri:image-line" /></slot
    ></template>
  </ElImage>
</template>
<script setup lang="ts">
  import { useImageUrls } from '@/composables/useImageUrls'
  const props = withDefaults(defineProps<{ src?: string; previewSrcList?: string[] }>(), {
    src: '',
    previewSrcList: () => []
  })
  const images = useImageUrls(() => [props.src, ...props.previewSrcList])
</script>
