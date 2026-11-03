<!-- 系统logo -->
<template>
  <div class="flex-cc">
    <img
      v-if="dawnConfig.logo"
      :style="logoStyle"
      :src="dawnConfig.logo"
      :alt="dawnConfig.title"
      class="object-contain"
    />
    <span
      v-else
      class="admin-logo"
      :style="logoStyle"
      role="img"
      :aria-label="dawnConfig.title"
      v-html="logo"
    ></span>
  </div>
</template>

<script setup lang="ts">
  import { dawnConfig } from '@/dawn/config'
  import logo from '@/assets/images/common/logo.svg?raw'
  defineOptions({ name: 'ArtLogo' })

  interface Props {
    /** logo 大小 */
    size?: number | string
  }

  const props = withDefaults(defineProps<Props>(), {
    size: 36
  })

  const logoStyle = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }))
</script>

<style scoped>
  .admin-logo {
    display: inline-flex;
    flex-shrink: 0;
    color: var(--admin-logo-color);
    transition: color 0.2s ease;
  }

  .admin-logo :deep(svg) {
    width: 100%;
    height: 100%;
  }
</style>
