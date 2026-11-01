<template>
  <div class="page-content mb-5" v-loading="loading">
    <ElAlert
      v-if="refreshError"
      :title="refreshError"
      type="warning"
      :closable="false"
      class="mb-4"
    />
    <ElRow :gutter="20">
      <ElCol v-for="item in gauges" :key="item.title" :xs="24" :sm="12" :lg="6" class="mb-4">
        <div class="art-card server-gauge">
          <div class="gauge-description">
            <span>{{ item.title }}</span>
            <strong>{{ item.description }}</strong>
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
    <ElRow :gutter="20">
      <ElCol :span="24" class="mb-4"
        ><ElCard shadow="never">
          <template #header>{{ t('主机与进程') }}</template>
          <ElDescriptions :column="2" border>
            <ElDescriptionsItem v-for="(value, key) in hostFields" :key="key" :label="t(key)">{{
              value ?? '—'
            }}</ElDescriptionsItem>
          </ElDescriptions>
          <ElAlert
            v-for="(error, key) in info.unavailable"
            :key="key"
            :title="key + ': ' + error"
            type="info"
            :closable="false"
            class="mt-2"
          /> </ElCard
      ></ElCol>
      <ElCol :span="24" class="mb-4"
        ><ElCard class="art-table-card" shadow="never">
          <template #header>{{ t('内存信息') }}</template>
          <div class="flex justify-between max-md:flex-col">
            <ElDescriptions :column="1" border class="flex-1">
              <ElDescriptionsItem :label="t('堆内存使用')">{{
                bytes(info.heap_bytes)
              }}</ElDescriptionsItem>
              <ElDescriptionsItem :label="t('堆内存保留')">{{
                bytes(info.heap_sys)
              }}</ElDescriptionsItem>
              <ElDescriptionsItem :label="t('运行时内存')">{{
                bytes(info.system_bytes)
              }}</ElDescriptionsItem>
              <ElDescriptionsItem :label="t('协程数')">{{ info.goroutines }}</ElDescriptionsItem>
            </ElDescriptions>
            <div class="w-80 p-4 text-center"
              ><div class="pb-3.5">{{ t('堆内存使用率') }}</div
              ><ElProgress
                type="dashboard"
                :percentage="
                  info.heap_sys ? Math.round((info.heap_bytes / info.heap_sys) * 100) : 0
                "
            /></div>
          </div> </ElCard
      ></ElCol>
      <ElCol :span="24" class="mb-4"
        ><ElCard class="art-table-card" shadow="never">
          <template #header
            ><span class="text-lg font-medium">{{ t('Go及运行环境') }}</span></template
          >
          <ElDescriptions :column="2" border>
            <ElDescriptionsItem :label="t('应用名称')">{{ info.name }}</ElDescriptionsItem
            ><ElDescriptionsItem label="Go">{{ info.go }}</ElDescriptionsItem>
            <ElDescriptionsItem :label="t('操作系统')">{{ info.os }}</ElDescriptionsItem
            ><ElDescriptionsItem :label="t('架构')">{{ info.arch }}</ElDescriptionsItem>
            <ElDescriptionsItem :label="t('CPU核心数')">{{ info.cpus }}</ElDescriptionsItem
            ><ElDescriptionsItem :label="t('数据库驱动')">{{ info.driver }}</ElDescriptionsItem>
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
  const hostFields = computed(() => ({
    主机名: info.value.system?.host?.hostname,
    主机运行时长:
      info.value.system?.host?.uptime == null
        ? '—'
        : (info.value.system.host.uptime / 3600).toFixed(2) + 'h',
    系统平台: info.value.system?.host?.platform,
    主机总内存: info.value.system?.memory ? bytes(info.value.system.memory.total) : undefined,
    主机已用内存: info.value.system?.memory ? bytes(info.value.system.memory.used) : undefined,
    主机CPU使用率:
      info.value.system?.cpu_percent?.[0] == null
        ? '—'
        : info.value.system.cpu_percent[0].toFixed(2) + '%',
    当前进程CPU使用率:
      info.value.system?.process_cpu_percent == null
        ? '—'
        : info.value.system.process_cpu_percent.toFixed(2) + '%',
    当前进程常驻内存: info.value.system?.process_memory
      ? bytes(info.value.system.process_memory.rss)
      : undefined,
    当前进程PID: info.value.pid,
    当前进程线程数: info.value.system?.threads,
    主机进程数: info.value.system?.process_count,
    当前进程运行时长:
      info.value.system?.uptime_seconds == null
        ? undefined
        : (info.value.system.uptime_seconds / 3600).toFixed(2) + 'h'
  }))
  const bytes = (v = 0) => `${(v / 1024 / 1024).toFixed(2)} MB`
  async function load(background = false) {
    if (busy) return
    busy = true
    loading.value = !background
    try {
      info.value = await request.get({ url: '/system/server', showErrorMessage: !background })
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
  .server-gauge {
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    min-height: 190px;
    padding: 20px;
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
    right: 20px;
    bottom: 20px;
    left: 20px;
    font-size: 18px;
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
