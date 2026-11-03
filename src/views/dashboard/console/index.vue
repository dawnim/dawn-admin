<template>
  <component :is="dashboards[userStore.info.dashboard || 'statistics']" />
</template>

<script setup lang="ts">
  import { defineAsyncComponent } from 'vue'
  import { useUserStore } from '@/store/modules/user'
  import { ComponentLoader } from '@/router/core/ComponentLoader'

  const userStore = useUserStore()
  const loader = new ComponentLoader()
  const dashboards = {
    statistics: defineAsyncComponent(loader.load('/dashboard/statistics')),
    work: defineAsyncComponent(loader.load('/dashboard/work'))
  }
</script>
