<!-- 工作台页面 -->
<template>
  <div>
    <CardList></CardList>

    <ElRow :gutter="20">
      <ElCol :sm="24" :md="12" :lg="10">
        <ActiveUser />
      </ElCol>
      <ElCol :sm="24" :md="12" :lg="14">
        <SalesOverview />
      </ElCol>
    </ElRow>

    <AboutProject />
  </div>
</template>

<script setup lang="ts">
  import CardList from '../console/modules/card-list.vue'
  import ActiveUser from '../console/modules/active-user.vue'
  import SalesOverview from '../console/modules/sales-overview.vue'
  import AboutProject from '../console/modules/about-project.vue'
</script>
