<template>
  <div class="page-content mb-5" v-loading="loading">
    <ElAlert
      v-if="refreshError"
      :title="refreshError"
      type="warning"
      :closable="false"
      class="mb-4"
    />
    <ElCard shadow="never" class="mb-4">
      <template #header
        ><div class="host-summary">{{ hostSummary }}</div></template
      >
      <ElRow :gutter="16" class="gauge-grid">
        <ElCol v-for="item in gauges" :key="item.title" :xs="24" :sm="12" :lg="6">
          <div class="art-card-sm server-gauge">
            <div class="gauge-description">
              <span>{{ item.title }}</span
              ><strong>{{ item.description }}</strong>
              <small :title="item.detail">{{ item.detail }}</small>
            </div>
            <ElProgress
              type="circle"
              :width="110"
              :stroke-width="9"
              :percentage="Math.min(100, item.value ?? 0)"
              :color="progressColors"
            >
              <span class="gauge-percentage">{{
                item.value == null ? '—' : item.value.toFixed(0) + '%'
              }}</span>
            </ElProgress>
          </div>
        </ElCol>
      </ElRow>
      <ElAlert
        v-for="(error, key) in info.unavailable"
        :key="key"
        :title="key + ': ' + error"
        type="info"
        :closable="false"
        class="mt-2"
      />
    </ElCard>
    <ElRow :gutter="20">
      <ElCol :span="24" class="mb-4"
        ><ElCard class="art-table-card" shadow="never">
          <template #header
            ><span class="text-lg font-medium">{{ t('当前应用运行状态') }}</span></template
          >
          <div class="application-status">
            <ElDescriptions :column="3" border class="app-metrics">
              <ElDescriptionsItem
                v-for="item in applicationFields"
                :key="item.label"
                :label="t(item.label)"
                :span="item.span || 1"
              >
                {{ item.value ?? '—' }}
              </ElDescriptionsItem>
            </ElDescriptions>
            <div class="app-memory"
              ><div class="pb-3.5">{{ t('堆内存使用率') }}</div
              ><ElProgress
                type="dashboard"
                :percentage="
                  info.heap_sys ? Math.round((info.heap_bytes / info.heap_sys) * 100) : 0
                "
            /></div>
          </div> </ElCard
      ></ElCol>
      <ElCol :span="24" class="mb-4">
        <ElCard class="art-table-card" shadow="never">
          <template #header>
            <div class="embedding-header">
              <span class="text-lg font-medium">{{ t('向量服务') }}</span>
              <ElTag :type="embedding.health?.ready ? 'success' : 'info'">{{
                embeddingStatus
              }}</ElTag>
            </div>
          </template>
          <template v-if="embedding.enabled">
            <div class="mb-4">{{ embedding.health?.model || '—' }}</div>
            <ElDescriptions :column="2" border>
              <ElDescriptionsItem
                v-for="item in embeddingFields"
                :key="item.label"
                :label="t(item.label)"
              >
                {{ item.value ?? '—' }}
              </ElDescriptionsItem>
            </ElDescriptions>
            <ElAlert
              v-if="embedding.error || embedding.service?.last_error"
              class="mt-4"
              type="warning"
              :closable="false"
              :title="embedding.error || embedding.service?.last_error"
            />
          </template>
          <div v-if="embedding.indexes?.length" class="embedding-indexes">
            <div class="font-medium mb-3">{{ t('知识索引') }}</div>
            <div v-for="index in embedding.indexes" :key="index.id" class="embedding-index">
              <div
                >{{ index.app_name }} · {{ t(indexStatus[index.status] || index.status) }} ·
                {{ index.model }} / {{ index.dimensions }}</div
              >
              <ElProgress
                v-if="index.status === 'building'"
                :percentage="index.total ? Math.round((index.completed * 100) / index.total) : 0"
              />
              <small>{{ index.completed }} / {{ index.total }} · {{ index.error || '' }}</small>
            </div>
          </div>
          <ElAlert
            v-if="embedding.indexes_error"
            class="mt-4"
            type="warning"
            :closable="false"
            :title="embedding.indexes_error"
          />
        </ElCard>
      </ElCol>
      <ElCol :span="24" class="mb-4"
        ><ElCard class="art-table-card" shadow="never">
          <template #header
            ><span class="text-lg font-medium">{{ t('Go及运行环境') }}</span></template
          >
          <ElDescriptions :column="2" border>
            <ElDescriptionsItem :label="t('应用名称')">{{ info.name }}</ElDescriptionsItem
            ><ElDescriptionsItem label="Go">{{ info.go }}</ElDescriptionsItem>
            <ElDescriptionsItem :label="t('架构')">{{ info.arch }}</ElDescriptionsItem>
            <ElDescriptionsItem :label="t('数据库驱动')">{{ info.driver }}</ElDescriptionsItem>
          </ElDescriptions>
        </ElCard></ElCol
      >
      <ElCol :span="24"
        ><ElCard class="art-table-card" shadow="never">
          <template #header
            ><span class="text-lg font-medium">{{ t('数据库连接') }}</span></template
          >
          <ElDescriptions :column="2" border>
            <ElDescriptionsItem v-for="(label, key) in dbLabels" :key="key" :label="t(label)">{{
              info.db[key]
            }}</ElDescriptionsItem>
          </ElDescriptions>
        </ElCard></ElCol
      >
    </ElRow>
  </div>
</template>
<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import request from '@/utils/http'
  import { useIntervalFn } from '@vueuse/core'
  const { t } = useI18n()
  const info = ref<any>({ db: {} }),
    loading = ref(false),
    refreshError = ref('')
  let busy = false
  const progressColors = [
    { color: 'var(--el-color-success)', percentage: 70 },
    { color: 'var(--el-color-warning)', percentage: 90 },
    { color: 'var(--el-color-danger)', percentage: 100 }
  ]
  const capacity = (value: number) => `${(value / 1024 ** 3).toFixed(1)} GB`
  const gauges = computed(() => {
    const system = info.value.system
    const load =
      system?.load && info.value.cpus ? (system.load.load1 / info.value.cpus) * 100 : undefined
    return [
      {
        title: t('负载'),
        value: load,
        description:
          load == null ? '—' : t(load < 70 ? '运行流畅' : load < 100 ? '较忙' : '负载较高'),
        detail: system?.load
          ? [system.load.load1, system.load.load5, system.load.load15]
              .map((value) => value.toFixed(2))
              .join(' / ')
          : '—'
      },
      {
        title: 'CPU',
        value: system?.cpu_percent?.[0],
        description: `${t('CPU核心数')}: ${info.value.cpus ?? '—'}`,
        detail: system?.cpu?.[0]?.modelName || '—'
      },
      {
        title: t('内存'),
        value: system?.memory?.usedPercent,
        description: system?.memory
          ? `${capacity(system.memory.used)} / ${capacity(system.memory.total)}`
          : '—',
        detail: ''
      },
      {
        title: t('磁盘'),
        value: system?.disk?.usedPercent,
        description: system?.disk
          ? `${capacity(system.disk.used)} / ${capacity(system.disk.total)}`
          : '—',
        detail: system?.disk?.path || '—'
      }
    ]
  })
  const dbLabels = {
    OpenConnections: '打开连接数',
    InUse: '使用中',
    Idle: '空闲连接',
    WaitCount: '等待次数'
  }
  const bytes = (v = 0) => `${(v / 1024 / 1024).toFixed(2)} MB`
  const embedding = computed(() => info.value.embedding || {})
  const embeddingStatus = computed(() => {
    if (!embedding.value.enabled) return t('未启用')
    if (embedding.value.health?.ready) return t('运行中')
    if (['starting', 'waiting'].includes(embedding.value.service?.state)) return t('启动中')
    return t('不可用')
  })
  const indexStatus: Record<string, string> = {
    active: '使用中',
    building: '构建中',
    failed: '构建失败',
    cleanup: '待清理'
  }
  const embeddingFields = computed(() => {
    const health = embedding.value.health || {}
    const service = embedding.value.service || {}
    const process = service.process?.children?.[0] || {}
    return [
      { label: '进程PID', value: process.pid },
      { label: '向量维度', value: health.dimensions },
      {
        label: 'CPU使用率',
        value: process.cpu_percent == null ? '—' : process.cpu_percent.toFixed(2) + '%'
      },
      { label: '运行设备', value: health.device },
      { label: '常驻内存', value: process.rss_bytes == null ? '—' : bytes(process.rss_bytes) },
      { label: '最大输入长度', value: health.max_length },
      { label: '线程数', value: process.threads },
      { label: '推理线程数', value: health.threads },
      { label: '模型文件', value: health.model_bytes == null ? '—' : bytes(health.model_bytes) },
      { label: '缓存目录', value: health.cache_bytes == null ? '—' : bytes(health.cache_bytes) },
      {
        label: '运行时长',
        value: process.started_at
          ? ((Date.now() - process.started_at) / 3600000).toFixed(2) + 'h'
          : '—'
      },
      { label: '重启次数', value: service.restarts }
    ]
  })

  const hostSummary = computed(() => {
    const system = info.value.system
    return [
      `${t('主机名')}: ${system?.host?.hostname ?? '—'}`,
      `${t('系统平台')}: ${system?.host?.platform ?? '—'}`,
      `${t('运行时长')}: ${system?.host ? (system.host.uptime / 3600).toFixed(2) + 'h' : '—'}`,
      `${t('进程数')}: ${system?.process_count ?? '—'}`
    ].join(' · ')
  })
  const applicationFields = computed(() => [
    { label: '当前进程PID', value: info.value.pid },
    {
      label: '当前进程CPU使用率',
      value:
        info.value.system?.process_cpu_percent == null
          ? '—'
          : info.value.system.process_cpu_percent.toFixed(2) + '%'
    },
    { label: '当前进程线程数', value: info.value.system?.threads },
    {
      label: '当前进程常驻内存',
      value: info.value.system?.process_memory ? bytes(info.value.system.process_memory.rss) : '—',
      span: 2
    },
    {
      label: '当前进程运行时长',
      value:
        info.value.system?.uptime_seconds == null
          ? '—'
          : (info.value.system.uptime_seconds / 3600).toFixed(2) + 'h'
    },
    { label: '堆内存使用', value: bytes(info.value.heap_bytes), span: 2 },
    { label: '堆内存保留', value: bytes(info.value.heap_sys) },
    { label: '运行时内存', value: bytes(info.value.system_bytes), span: 2 },
    { label: '协程数', value: info.value.goroutines }
  ])
  async function load(background = false) {
    if (busy) return
    busy = true
    loading.value = !background
    try {
      info.value = await request.get({ url: '/server', showErrorMessage: !background })
      refreshError.value = ''
    } catch {
      refreshError.value = t('更新失败，当前显示上次数据')
    } finally {
      busy = false
      loading.value = false
    }
  }
  const { pause, resume } = useIntervalFn(() => {
    if (!document.hidden) load(true)
  }, 3000)
  onMounted(() => load())
  onActivated(() => {
    resume()
    load(!!info.value.pid)
  })
  onDeactivated(pause)
</script>

<style scoped>
  .embedding-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .embedding-indexes {
    margin-top: 20px;
  }
  .embedding-index {
    margin-top: 12px;
  }
  .embedding-index small {
    color: var(--el-text-color-secondary);
  }

  .host-summary {
    font-size: 14px;
    line-height: 1.8;
    overflow-wrap: anywhere;
  }
  .application-status {
    display: flex;
    align-items: center;
    gap: 24px;
  }
  .app-metrics {
    flex: 1;
    min-width: 0;
  }
  .app-metrics :deep(.el-descriptions__cell) {
    padding: 12px 14px;
  }
  .app-memory {
    width: 260px;
    flex-shrink: 0;
    padding: 16px;
    text-align: center;
  }
  .gauge-grid {
    row-gap: 16px;
  }
  @media (max-width: 767px) {
    .application-status {
      flex-direction: column;
    }
    .app-metrics {
      width: 100%;
    }
  }

  .server-gauge {
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    min-height: 190px;
    padding: 16px 16px 48px;
  }
  .gauge-description {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
    padding-top: 12px;
  }
  .gauge-description > span {
    color: var(--el-text-color-secondary);
  }
  .gauge-description strong {
    position: absolute;
    right: 16px;
    bottom: 16px;
    left: 16px;
    font-size: 16px;
    font-weight: 600;
    white-space: nowrap;
  }
  .gauge-description small {
    color: var(--el-text-color-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .gauge-percentage {
    font-size: 24px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .server-gauge :deep(.el-progress) {
    flex-shrink: 0;
  }
</style>
