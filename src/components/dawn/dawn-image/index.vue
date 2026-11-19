<template>
  <ElImage
    :src="images[0]"
    :preview-src-list="previewSrcList.length ? images.slice(1) : []"
    preview-teleported
  >
    <template #error
      ><slot name="error"
        ><div class="dawn-image-error"><ArtSvgIcon icon="ri:image-line" /></div></slot
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

<style scoped>
  .dawn-image-error {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: 18px;
    color: var(--el-text-color-placeholder);
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: inherit;
  }
</style>
