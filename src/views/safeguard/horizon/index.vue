<template>
  <div class="page-content horizon-page">
    <ElCard shadow="never">
      <template #header>
        <div class="card-header"
          ><span>{{ t('队列监控') }}</span>
          <ElTag type="info">{{ t('只读') }}</ElTag>
        </div>
      </template>
      <ElAlert
        v-if="refreshError"
        :title="refreshError"
        type="warning"
        :closable="false"
        class="mb-3"
      />
      <div class="summary-grid">
        <div v-for="(value, label) in summary" :key="label"
          ><span>{{ t(label) }}</span
          ><strong>{{ value ?? '—' }}</strong></div
        >
      </div>
      <div class="capabilities"
        ><ElTag
          v-for="(value, key) in status.capabilities"
          :key="key"
          size="small"
          :type="value === 'supported' ? 'success' : 'info'"
          >{{ key }}: {{ stateText(value) }}</ElTag
        ></div
      >
    </ElCard>

    <ElCard shadow="never">
      <template #header
        ><div class="card-header"
          ><span>{{ t('处理统计与监控诊断') }}</span
          ><ElButton text @click="showMetrics()">{{ t('数据详情') }}</ElButton></div
        ></template
      >
      <ElDescriptions :column="4" size="small" border>
        <ElDescriptionsItem v-for="(label, key) in totalLabels" :key="key" :label="t(label)">{{
          metrics.totals?.[key] ?? '—'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem :label="t('缓冲区使用率')">{{
          metrics.observability
            ? (metrics.observability.buffer_utilization * 100).toFixed(1) + '%'
            : '—'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem :label="t('丢弃事件数')">{{
          metrics.observability?.dropped_count ?? '—'
        }}</ElDescriptionsItem>
        <ElDescriptionsItem :label="t('刷新延迟')"
          >{{ metrics.observability?.flush_lag_ms ?? '—' }} ms</ElDescriptionsItem
        >
        <ElDescriptionsItem :label="t('采集状态')">{{
          metrics.observability ? t(metrics.observability.degraded ? '已降级' : '正常') : '—'
        }}</ElDescriptionsItem>
      </ElDescriptions>
      <ElAlert
        v-if="metricsError"
        :title="metricsError"
        type="warning"
        :closable="false"
        class="mt-3"
      />
    </ElCard>

    <div class="monitor-grid">
      <ElCard v-for="panel in panels" :key="panel.key" shadow="never" :class="{ wide: panel.wide }">
        <template #header
          ><div class="card-header"
            ><span
              >{{ t(panel.title) }} <small>{{ panel.total }}</small></span
            >
            <ElButton text size="small" :loading="panel.loading" @click="loadPanel(panel)">{{
              t('刷新')
            }}</ElButton>
          </div></template
        >
        <ElForm
          v-if="panel.key === 'sources' || panel.key === 'history'"
          inline
          size="small"
          class="filters metric-filters"
          :class="{ 'history-filters': panel.key === 'history' }"
          @submit.prevent="loadPanel(panel, true)"
        >
          <ElFormItem v-if="panel.key === 'history'"
            ><ElSelect v-model="historyKind"
              ><ElOption value="queue" :label="t('队列')" /><ElOption
                value="job"
                :label="t('任务')" /></ElSelect
          ></ElFormItem>
          <ElFormItem v-if="panel.key === 'history'"
            ><ElInput
              v-model="historyKey"
              :placeholder="t('队列/任务')"
              :title="t('队列键或任务名称')"
              clearable
          /></ElFormItem>
          <ElFormItem v-for="(label, key) in filterLabels" :key="key"
            ><ElInput v-model="metricFilters[key]" :placeholder="t(label)" clearable
          /></ElFormItem>
          <ElFormItem
            ><ElDatePicker
              v-model="metricRange"
              type="datetimerange"
              size="small"
              :start-placeholder="t('开始时间')"
              :end-placeholder="t('结束时间')"
          /></ElFormItem>
          <ElFormItem
            ><ElButton native-type="submit" type="primary">{{ t('查询') }}</ElButton></ElFormItem
          >
        </ElForm>
        <ElForm
          v-if="panel.key === 'highValue'"
          inline
          size="small"
          class="filters"
          @submit.prevent="loadPanel(panel, true)"
        >
          <ElFormItem
            ><ElSelect
              v-model="detailKind"
              :placeholder="t('任务类型')"
              clearable
              style="width: 135px"
              ><ElOption
                v-for="kind in ['failed', 'slow', 'poison']"
                :key="kind"
                :label="stateText(kind)"
                :value="kind" /></ElSelect
          ></ElFormItem>
          <ElFormItem
            ><ElDatePicker
              v-model="detailRange"
              type="datetimerange"
              :start-placeholder="t('开始时间')"
              :end-placeholder="t('结束时间')"
              style="width: 330px"
          /></ElFormItem>
          <ElFormItem
            ><ElButton native-type="submit" type="primary">{{ t('查询') }}</ElButton></ElFormItem
          >
        </ElForm>
        <ElInput
          v-if="panel.key === 'batches'"
          v-model="batchQuery"
          :placeholder="t('搜索批次ID或名称')"
          clearable
          size="small"
          class="mb-3"
          @keyup.enter="loadPanel(panel, true)"
          @clear="loadPanel(panel, true)"
        />
        <ElAlert
          v-if="panel.error || panel.reason"
          :title="panel.error || panel.reason"
          :type="panel.error ? 'warning' : 'info'"
          :closable="false"
          class="mb-2"
        />
        <ElTable :data="panel.items" size="small" max-height="240" v-loading="panel.loading" stripe>
          <ElTableColumn
            v-for="column in panel.columns"
            :key="column.key"
            :label="t(column.label)"
            :min-width="column.width || 110"
            show-overflow-tooltip
          >
            <template #default="{ row }"
              ><span :title="column.kind === 'metric' ? row[column.key]?.reason : ''">{{
                cell(row[column.key], column.kind)
              }}</span></template
            >
          </ElTableColumn>
          <ElTableColumn :label="t('详情')" width="105" fixed="right"
            ><template #default="{ row }">
              <ElButton link type="primary" size="small" @click="showDetail(panel, row)">{{
                t('查看')
              }}</ElButton>
              <ElButton
                v-if="panel.key === 'queues'"
                link
                type="primary"
                size="small"
                @click="showHistory(row)"
                >{{ t('历史') }}</ElButton
              >
            </template></ElTableColumn
          >
          <template #empty>{{ panel.reason || t('暂无数据') }}</template>
        </ElTable>
        <template v-if="panel.total > 0" #footer>
          <ElPagination
            v-model:current-page="panel.page"
            v-model:page-size="panel.pageSize"
            :page-sizes="[2, 3, 5, 10, 20, 50, 100]"
            :total="panel.total"
            size="small"
            layout="total, sizes, prev, pager, next"
            @current-change="loadPanel(panel)"
            @size-change="loadPanel(panel, true)"
          />
        </template>
      </ElCard>
    </div>

    <ElDrawer v-model="visible" :title="t('数据详情')" size="min(960px, 95vw)">
      <ElAlert
        v-if="detailError"
        :title="detailError"
        type="warning"
        :closable="false"
        class="mb-3"
      />
      <DawnCode :code="JSON.stringify(detail, null, 2)" language="json" />
    </ElDrawer>
  </div>
</template>
<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { useIntervalFn } from '@vueuse/core'
  import request from '@/utils/http'
  import { dawnConfig } from '@/dawn/config'
  const { t } = useI18n()
  const stateLabels: Record<string, string> = {
    supported: '已启用',
    disabled: '未启用',
    unsupported: '不支持',
    unavailable: '暂不可用',
    running: '运行中',
    inactive: '未运行',
    paused: '已暂停',
    terminating: '停止中',
    failed: '失败',
    slow: '慢任务',
    poison: '异常消息'
  }
  const stateText = (value: string) => t(stateLabels[value] || value)

  type Column = { key: string; label: string; kind?: 'metric' | 'date'; width?: number }
  type Panel = {
    key: string
    title: string
    path: string
    columns: Column[]
    wide?: boolean
    section?: string
    items: any[]
    total: number
    page: number
    pageSize: number
    loading: boolean
    error: string
    reason: string
  }
  const processColumns: Column[] = [
    { key: 'name', label: '名称', width: 160 },
    { key: 'host', label: '主机名' },
    { key: 'pid', label: 'PID', width: 75 },
    { key: 'status', label: '状态' },
    { key: 'cpu_percent', label: 'CPU使用率', kind: 'metric' },
    { key: 'memory_rss_bytes', label: '常驻内存', kind: 'metric' },
    { key: 'goroutine_count', label: '协程数', kind: 'metric' },
    { key: 'configured_queues', label: '队列' },
    { key: 'last_heartbeat_at', label: '最后心跳', kind: 'date' as const, width: 170 }
  ]
  const windowColumns: Column[] = [
    { key: 'source_host', label: '来源主机' },
    { key: 'source_environment', label: '环境' },
    { key: 'source_supervisor', label: '管理进程' },
    { key: 'connection', label: '连接' },
    { key: 'queue', label: '队列' },
    { key: 'job_name', label: '任务名称' },
    { key: 'processed', label: '已处理' },
    { key: 'failed', label: '失败' },
    { key: 'released', label: '已释放' },
    { key: 'effective_sample_rate', label: '采样率' },
    { key: 'window_start', label: '窗口开始', kind: 'date' as const, width: 170 }
  ]
  // 各卡片保留独立的上游分页，不截取数组伪造总数。
  const panels = reactive<Panel[]>(
    [
      {
        key: 'queues',
        title: '队列',
        path: '/queues',
        wide: true,
        columns: [
          { key: 'connection', label: '连接' },
          { key: 'queue', label: '队列' },
          ...[
            ['size', '积压'],
            ['avg_runtime', '平均耗时'],
            ['max_runtime', '最大耗时'],
            ['avg_memory', '平均内存'],
            ['max_memory', '最大内存'],
            ['wait_time', '等待时间'],
            ['throughput', '吞吐量'],
            ['processed', '已处理'],
            ['failed', '失败'],
            ['released', '已释放']
          ].map(([key, label]) => ({ key, label, kind: 'metric' as const }))
        ]
      },
      { key: 'masters', title: '主进程', path: '/masters', columns: processColumns },
      { key: 'supervisors', title: '管理进程', path: '/supervisors', columns: processColumns },
      { key: 'workers', title: '工作进程', path: '/workers', columns: processColumns },
      {
        key: 'staleSupervisors',
        title: '失联管理进程',
        path: '/stale',
        section: 'supervisors',
        columns: processColumns
      },
      {
        key: 'staleWorkers',
        title: '失联工作进程',
        path: '/stale',
        section: 'workers',
        columns: processColumns
      },
      {
        key: 'batches',
        title: '批次',
        path: '/batches',
        columns: [
          { key: 'name', label: '名称' },
          { key: 'id', label: 'ID', width: 160 },
          { key: 'status', label: '状态' },
          { key: 'total', label: '总数' },
          { key: 'pending', label: '待处理' },
          { key: 'processed', label: '已处理' },
          { key: 'failed', label: '失败' }
        ]
      },
      {
        key: 'highValue',
        title: '高价值任务',
        path: '/high-value-detail',
        wide: true,
        columns: [
          { key: 'kind', label: '类型' },
          { key: 'connection', label: '连接' },
          { key: 'queue', label: '队列' },
          { key: 'job_name', label: '任务名称', width: 150 },
          { key: 'runtime_ms', label: '耗时(ms)' },
          { key: 'error_summary', label: '错误摘要', width: 180 },
          { key: 'occurred_at', label: '发生时间', kind: 'date' as const, width: 170 }
        ]
      },
      {
        key: 'sources',
        title: '指标来源',
        path: '/metrics/sources',
        wide: true,
        columns: windowColumns
      },
      { key: 'history', title: '指标历史', path: '', wide: true, columns: windowColumns }
    ].map((panel) => ({
      ...panel,
      items: [],
      total: 0,
      page: 1,
      pageSize: 2,
      loading: false,
      error: '',
      reason: ''
    }))
  )
  const status = ref<any>({}),
    metrics = ref<any>({}),
    refreshing = ref(false),
    refreshError = ref(''),
    metricsError = ref(''),
    visible = ref(false),
    detail = ref<any>(),
    detailError = ref(''),
    historyKind = ref('queue'),
    historyKey = ref(''),
    batchQuery = ref(''),
    detailKind = ref(''),
    metricRange = ref<Date[]>([]),
    detailRange = ref<Date[]>([])
  const filterLabels = {
    source_host: '来源主机',
    source_environment: '环境',
    source_supervisor: '管理进程',
    connection: '连接',
    queue: '队列'
  }
  const metricFilters = reactive({
    source_host: '',
    source_environment: '',
    source_supervisor: '',
    connection: '',
    queue: ''
  })
  const totalLabels = {
    queued: '已入队',
    processed: '已处理',
    failed: '失败',
    released: '已释放',
    poison_envelopes: '异常消息',
    consumer_started: '消费者启动',
    consumer_stopped: '消费者停止',
    consumer_stop_failed: '消费者停止失败'
  }
  const summary = computed(() => ({
    状态: status.value.status ? stateText(status.value.status.Status) : '—',
    管理进程: status.value.status?.SupervisorCount,
    工作进程: status.value.status?.WorkerCount,
    失联进程: status.value.status
      ? status.value.status.StaleSupervisorCount + status.value.status.StaleWorkerCount
      : undefined,
    队列数: status.value.status?.queue_count,
    每分钟任务数: status.value.status?.jobs_per_minute?.toFixed(2),
    最近一小时任务数: status.value.status?.jobs_past_hour,
    已处理总数: status.value.status?.total_processed
  }))
  let apiPath = ''
  function get<T = any>(path: string, params = {}) {
    return request.get<T>({
      url: apiPath + path,
      params,
      rawResponse: true,
      showErrorMessage: false
    })
  }
  function cell(value: any, kind?: Column['kind']): string {
    if (value == null) return '—'
    if (kind === 'date') return value.startsWith('0001-') ? '—' : new Date(value).toLocaleString()
    if (kind === 'metric') {
      if (value.status !== 'available') return stateText(value.status)
      if (value.unit === 'bytes') return (value.value / 1024 ** 2).toFixed(1) + ' MB'
      return (
        String(value.value) +
        (value.unit === 'percent' ? '%' : value.unit === 'milliseconds' ? ' ms' : '')
      )
    }
    return Array.isArray(value)
      ? value.join(', ')
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)
  }
  function metricsParams() {
    return {
      ...Object.fromEntries(Object.entries(metricFilters).filter(([, value]) => value)),
      ...(metricRange.value?.length === 2
        ? { from: metricRange.value[0].toISOString(), to: metricRange.value[1].toISOString() }
        : {})
    }
  }
  const pendingPanels = new Set<string>()
  async function loadPanel(panel: Panel, reset = false, background = false) {
    if (pendingPanels.has(panel.key) || !apiPath) return
    if (reset) panel.page = 1
    if (panel.key === 'history' && !historyKey.value) return
    pendingPanels.add(panel.key)
    panel.loading = !background
    try {
      const params: Record<string, any> = { page: panel.page, page_size: panel.pageSize }
      let path = panel.path
      if (panel.key === 'sources' || panel.key === 'history') Object.assign(params, metricsParams())
      if (panel.key === 'history')
        path = `/metrics/history/${historyKind.value}/${encodeURIComponent(historyKey.value)}`
      if (panel.key === 'batches' && batchQuery.value) params.query = batchQuery.value
      if (panel.key === 'highValue') {
        if (detailKind.value) params.kind = detailKind.value
        if (detailRange.value?.length === 2)
          Object.assign(params, {
            occurred_from: detailRange.value[0].toISOString(),
            occurred_to: detailRange.value[1].toISOString()
          })
      }
      const result = await get(path, params)
      const page = panel.section ? result[panel.section] : result
      panel.items = page.items || []
      panel.total = page.total
      panel.page = page.page
      panel.pageSize = page.page_size
      panel.reason =
        page.capability && page.capability !== 'supported'
          ? `${stateText(page.capability)}: ${page.reason || ''}`
          : ''
      panel.error = ''
      if (panel.key === 'history') historyEstimate.value = result.estimate
    } catch {
      panel.error = t('更新失败，当前显示上次数据')
    } finally {
      pendingPanels.delete(panel.key)
      panel.loading = false
    }
  }
  const historyEstimate = ref<any>()
  async function showDetail(panel: Panel, row: any) {
    detail.value = row
    detailError.value = ''
    visible.value = true
    try {
      if (panel.key === 'highValue')
        detail.value = await get('/high-value-detail/' + encodeURIComponent(row.id))
      if (panel.key === 'batches')
        detail.value = await get('/batches/' + encodeURIComponent(row.id))
      if (panel.key === 'sources')
        detail.value = await get('/metrics/current', {
          ...metricsParams(),
          source_host: row.source_host,
          source_environment: row.source_environment,
          source_supervisor: row.source_supervisor,
          connection: row.connection,
          queue: row.queue,
          source_details: 1,
          page: 1,
          page_size: 20
        })
      if (panel.key === 'history') detail.value = { window: row, estimate: historyEstimate.value }
    } catch {
      detailError.value = t('加载失败')
    }
  }
  function showHistory(row: any) {
    historyKind.value = 'queue'
    historyKey.value = row.key
    const panel = panels.find((p) => p.key === 'history')!
    loadPanel(panel, true)
    document.querySelector('.monitor-grid > :last-child')?.scrollIntoView({ behavior: 'smooth' })
  }
  async function showMetrics() {
    detailError.value = ''
    detail.value = metrics.value
    visible.value = true
    try {
      detail.value = await get('/metrics/current', {
        ...metricsParams(),
        source_details: 1,
        page: 1,
        page_size: 100
      })
    } catch {
      detailError.value = t('加载失败')
    }
  }
  async function refresh(background = false) {
    if (refreshing.value) return
    refreshing.value = true
    try {
      if (!apiPath) {
        const config = await request.get<{ api_path: string }>({ url: '/horizon/configuration' })
        apiPath = new URL(config.api_path, new URL(dawnConfig.apiBase, location.href)).href
      }
      status.value = await get('/status')
      refreshError.value = ''
      await Promise.all([
        get('/metrics/current', { ...metricsParams(), summary_only: 1, page: 1, page_size: 5 })
          .then((data) => {
            metrics.value = data
            metricsError.value = ''
          })
          .catch(() => {
            metricsError.value = t('更新失败，当前显示上次数据')
          }),
        ...panels
          .filter(
            (p) =>
              !background ||
              [
                'queues',
                'masters',
                'supervisors',
                'workers',
                'staleSupervisors',
                'staleWorkers'
              ].includes(p.key)
          )
          .map((p) => loadPanel(p, false, background))
      ])
    } catch {
      refreshError.value = t('更新失败，当前显示上次数据')
    } finally {
      refreshing.value = false
    }
  }
  const { pause, resume } = useIntervalFn(() => {
    if (!document.hidden) refresh(true)
  }, 5000)
  onMounted(() => refresh())
  onActivated(() => {
    resume()
    refresh(true)
  })
  onDeactivated(pause)
</script>
<style scoped>
  .horizon-page {
    display: grid;
    gap: 16px;
    padding-bottom: 20px;
  }
  .card-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .card-header small {
    color: var(--el-text-color-secondary);
    margin-left: 8px;
  }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 16px;
  }
  .summary-grid span {
    display: block;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    margin-bottom: 6px;
  }
  .summary-grid strong {
    font-size: 21px;
    font-variant-numeric: tabular-nums;
  }
  .capabilities {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 16px;
  }
  .monitor-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  .monitor-grid > :deep(.el-card) {
    display: flex;
    flex-direction: column;
  }
  .monitor-grid :deep(.el-card__body) {
    flex: 1;
    min-height: 0;
  }
  .monitor-grid :deep(.el-card__footer) {
    padding: 12px 16px;
  }
  .wide {
    grid-column: 1 / -1;
  }
  .filters :deep(.el-form-item) {
    margin-right: 8px;
    margin-bottom: 10px;
  }
  .metric-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }
  .metric-filters :deep(.el-form-item) {
    flex: 1 1 64px;
    min-width: 64px;
    margin: 0;
  }
  .metric-filters :deep(.el-form-item:nth-last-child(2)) {
    flex: 0 1 330px;
  }
  .metric-filters :deep(.el-form-item:last-child) {
    flex: 0 0 auto;
    min-width: 0;
  }
  .metric-filters :deep(.el-form-item__content) {
    min-width: 0;
  }
  .metric-filters :deep(.el-input),
  .metric-filters :deep(.el-select),
  .metric-filters :deep(.el-date-editor) {
    width: 100%;
  }
  .history-filters :deep(.el-form-item:first-child) {
    flex: 0 0 68px;
  }
  .history-filters :deep(.el-form-item:nth-child(2)) {
    flex: 0 0 88px;
  }
  :deep(.el-card__header) {
    padding: 12px 16px;
  }
  :deep(.el-card__body) {
    padding: 14px 16px;
  }
  @media (max-width: 1000px) {
    .monitor-grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .summary-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
</style>
