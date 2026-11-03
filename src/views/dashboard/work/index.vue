<!-- 工作台页面 -->
<template>
  <div>
    <ElRow :gutter="20">
      <ElCol :sm="24" :md="24" :lg="12">
        <NewUser />
      </ElCol>
      <ElCol :sm="24" :md="12" :lg="6">
        <Dynamic />
      </ElCol>
      <ElCol :sm="24" :md="12" :lg="6">
        <TodoList />
      </ElCol>
    </ElRow>

    <AboutProject />
  </div>
</template>

<script setup lang="ts">
  import AboutProject from '../console/modules/about-project.vue'
  import NewUser from './modules/new-user.vue'
  import Dynamic from './modules/dynamic-stats.vue'
  import TodoList from './modules/todo-list.vue'
  import { useCommon } from '@/hooks/core/useCommon'

  defineOptions({ name: 'WorkDashboard' })

  const { scrollToTop } = useCommon()
  scrollToTop()
</script>
