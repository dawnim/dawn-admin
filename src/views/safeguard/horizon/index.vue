<template>
  <div class="page-content mb-5">
    <ElAlert
      v-if="refreshError"
      :title="refreshError"
      type="warning"
      :closable="false"
      class="mb-4"
    />
    <ElCard shadow="never">
      <template #header>{{ t('队列监控') }}</template>
      <ElDescriptions :column="3" border class="mb-5">
        <ElDescriptionsItem :label="t('状态')">{{
          status.status ? t(statusLabels[status.status]) : '—'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem :label="t('管理进程')">{{
          status.supervisor_count ?? '—'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem :label="t('工作进程')">{{
          status.worker_count ?? '—'
        }}</ElDescriptionsItem>
      </ElDescriptions>
      <ElTabs v-model="view" @tab-change="load()">
        <ElTabPane v-for="(label, name) in views" :key="name" :name="name" :label="t(label)" />
      </ElTabs>
      <ArtTable :data="rows" :columns="columns" :loading="loading">
        <template #operation="{ row }"
          ><ElButton
            text
            type="primary"
            @click="((detail = JSON.stringify(row, null, 2)), (visible = true))"
            >{{ t('查看') }}</ElButton
          ></template
        >
      </ArtTable>
    </ElCard>
    <ElDialog v-model="visible" :title="t('数据详情')" width="min(1000px,95vw)" align-center
      ><DawnCode :code="detail" language="json"
    /></ElDialog>
  </div>
</template>
<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import request from '@/utils/http'
  import { useIntervalFn } from '@vueuse/core'
  const { t, te } = useI18n()
  const status = ref<any>({}),
    rows = ref<any[]>([]),
    view = ref('queues'),
    loading = ref(false),
    refreshError = ref(''),
    visible = ref(false),
    detail = ref('')
  const statusLabels: Record<string, string> = {
    running: '运行中',
    inactive: '未运行',
    paused: '已暂停',
    terminating: '停止中'
  }
  const views = {
    queues: '队列',
    masters: '主进程',
    supervisors: '管理进程',
    workers: '工作进程',
    metrics: '处理统计',
    details: '任务详情'
  }
  let busy = false
  const columns = computed(() => [
    ...[...new Set(rows.value.flatMap((row) => Object.keys(row)))].slice(0, 8).map((key) => ({
      prop: key,
      label: te('fields.horizon.' + key) ? t('fields.horizon.' + key) : key,
      minWidth: 150,
      showOverflowTooltip: true,
      formatter: (row: any) =>
        typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key] ?? '—')
    })),
    {
      prop: 'operation',
      label: t('操作'),
      width: 100,
      useSlot: true,
      fixed: 'right' as const
    }
  ])
  async function load(background = false) {
    if (busy) return
    busy = true
    loading.value = !background
    const selected = view.value
    try {
      const [summary, data] = await Promise.all([
        request.get<any>({ url: '/system/horizon/status', showErrorMessage: !background }),
        request.get<any>({ url: '/system/horizon/' + selected, showErrorMessage: !background })
      ])
      status.value = summary
      if (selected === view.value)
        rows.value = Array.isArray(data) ? data : data.queues || data.data || data.items || []
      refreshError.value = ''
    } catch {
      refreshError.value = t('更新失败，当前显示上次数据')
    } finally {
      busy = false
      loading.value = false
      if (selected !== view.value) load()
    }
  }
  const { pause, resume } = useIntervalFn(() => {
    if (!document.hidden) load(true)
  }, 3000)
  onMounted(() => load())
  onActivated(() => {
    resume()
    load(!!status.value.status)
  })
  onDeactivated(pause)
</script>
