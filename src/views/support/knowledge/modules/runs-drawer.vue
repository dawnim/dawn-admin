<template>
  <ElDrawer v-model="visible" :title="t('执行记录')" size="min(900px,100%)" destroy-on-close>
    <div class="art-full-height">
      <DawnSearchBar
        v-model="filters"
        label-width="80px"
        :show-expand="false"
        @search="search"
        @reset="reset"
      >
        <ElCol :xs="24" :sm="12" :md="6"
          ><ElFormItem :label="t('客服应用')"
            ><ElSelect v-model="filters.app_id" clearable
              ><ElOption
                v-for="app in apps"
                :key="app.id"
                :value="app.id"
                :label="app.name" /></ElSelect></ElFormItem
        ></ElCol>
        <ElCol :xs="24" :sm="12" :md="6"
          ><ElFormItem :label="t('类型')"
            ><ElSelect v-model="filters.kind" clearable
              ><ElOption value="import,index,index_cleanup" :label="t('知识任务')" /><ElOption
                v-for="(label, value) in runKinds"
                :key="value"
                :value="value"
                :label="t(label)" /></ElSelect></ElFormItem
        ></ElCol>
        <ElCol :xs="24" :sm="12" :md="6"
          ><ElFormItem :label="t('状态')"
            ><ElSelect v-model="filters.status" clearable
              ><ElOption
                v-for="value in [
                  'queued',
                  'running',
                  'completed',
                  'failed',
                  'cancelled',
                  'waiting'
                ]"
                :key="value"
                :value="value"
                :label="t(statusLabels[value])" /></ElSelect></ElFormItem
        ></ElCol>
      </DawnSearchBar>
      <ElCard class="art-table-card" shadow="never">
        <ArtTableHeader
          v-model:columns="columnChecks"
          layout="refresh,size,settings"
          :loading="loading"
          @refresh="refreshData"
        />
        <ElAlert
          v-if="error"
          :title="t('加载失败，请重试')"
          type="error"
          :closable="false"
          class="mb-3"
        />
        <ArtTable
          :data="data"
          :loading="loading"
          :columns="columns"
          :pagination="pagination"
          @pagination:current-change="handleCurrentChange"
          @pagination:size-change="handleSizeChange"
        >
          <template #app_id="{ row }">{{
            apps.find((app) => app.id === row.app_id)?.name || row.app_id
          }}</template>
          <template #status="{ row }"
            ><ElTag size="small" effect="light" :type="statusTypes[row.status] || 'info'">{{
              statusLabels[row.status] ? t(statusLabels[row.status]) : row.status
            }}</ElTag></template
          >
          <template #kind="{ row }"
            ><ElTag size="small" type="primary" effect="light">{{
              runKinds[row.kind] ? t(runKinds[row.kind]) : row.kind
            }}</ElTag></template
          >
          <template #error="{ row }">
            <div class="run-error">
              <ElTooltip v-if="row.error" :content="t('复制错误详情')" placement="top">
                <ElButton
                  link
                  type="primary"
                  size="small"
                  :aria-label="t('复制错误详情')"
                  @click="copyError(row.error)"
                >
                  <ArtSvgIcon icon="ri:file-copy-line" />
                </ElButton>
              </ElTooltip>
              <ElTooltip v-if="row.error" :content="row.error" placement="top" :show-after="300">
                <span class="run-error-text">{{ row.error }}</span>
              </ElTooltip>
              <span v-else class="run-error-text">-</span>
            </div>
          </template>
        </ArtTable>
      </ElCard>
    </div>
  </ElDrawer>
</template>
<script setup lang="ts">
  import { $t as t } from '@/locales'
  import { useIntervalFn } from '@vueuse/core'
  import { ElMessage } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { supportApi, type SupportApp } from '@/api/support'
  import { dateLabel } from '@/dawn/types'
  import { statusLabels, statusTypes, runKinds } from './options'
  const visible = defineModel<boolean>({ required: true })
  const props = defineProps<{ apps: Pick<SupportApp, 'id' | 'name'>[]; appId?: number }>()
  const filters = ref({
    app_id: undefined as number | undefined,
    kind: '',
    status: ''
  })
  const {
    data,
    columns,
    columnChecks,
    loading,
    error,
    searchParams,
    pagination,
    getData,
    clearData,
    cancelRequest,
    refreshData,
    refreshSoft,
    handleCurrentChange,
    handleSizeChange
  } = useTable({
    core: {
      apiFn: supportApi.runs,
      apiParams: { ...filters.value },
      immediate: false,
      columnsFactory: () => [
        { prop: 'id', label: 'ID', width: 75 },
        { prop: 'app_id', label: t('客服应用'), useSlot: true, minWidth: 140 },
        { prop: 'kind', label: t('类型'), useSlot: true, width: 130 },
        { prop: 'status', label: t('状态'), useSlot: true, width: 100 },
        { prop: 'attempt', label: t('执行次数'), width: 90 },
        { prop: 'error', label: t('错误信息'), useSlot: true, minWidth: 200 },
        {
          prop: 'updated_at',
          label: t('更新时间'),
          width: 175,
          formatter: (row) => dateLabel(row.updated_at)
        }
      ]
    }
  })
  watch(visible, (open) => {
    if (open) reset()
    else {
      cancelRequest()
      clearData()
    }
  })
  function search() {
    Object.assign(searchParams, filters.value)
    getData()
  }
  function reset() {
    filters.value = { app_id: props.appId, kind: '', status: '' }
    search()
  }
  async function copyError(error: string) {
    try {
      await navigator.clipboard.writeText(error)
      ElMessage.success(t('复制成功'))
    } catch {
      ElMessage.error(t('复制失败，请重试'))
    }
  }
  useIntervalFn(() => {
    if (
      visible.value &&
      !document.hidden &&
      !loading.value &&
      data.value.some((row) => ['queued', 'running'].includes(row.status))
    )
      refreshSoft()
  }, 5000)
</script>
<style scoped>
  .run-error {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }
  .run-error-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
