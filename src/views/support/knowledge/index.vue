<template>
  <div class="art-full-height">
    <DawnSearchBar
      v-model="searchForm"
      label-width="100px"
      :show-expand="false"
      @search="handleSearch"
      @reset="handleReset"
    >
      <ElCol :xs="24" :sm="12" :md="8" :lg="6"
        ><ElFormItem :label="t('名称')" prop="query"
          ><ElInput v-model="searchForm.query" :placeholder="t('搜索知识')" clearable /></ElFormItem
      ></ElCol>
      <ElCol :xs="24" :sm="12" :md="8" :lg="6"
        ><ElFormItem :label="t('客服应用')" prop="app_id"
          ><ElSelect v-model="searchForm.app_id" clearable
            ><ElOption
              v-for="app in apps"
              :key="app.id"
              :value="app.id"
              :label="app.name" /></ElSelect></ElFormItem
      ></ElCol>
      <ElCol :xs="24" :sm="12" :md="8" :lg="6"
        ><ElFormItem :label="t('状态')" prop="status"
          ><ElSelect v-model="searchForm.status" clearable
            ><ElOption
              v-for="status in tab === 'entries'
                ? ['published', 'draft', 'disabled']
                : ['draft', 'queued', 'processing', 'completed', 'failed']"
              :key="status"
              :value="status"
              :label="
                tab === 'sources' && status === 'draft'
                  ? t('待处理')
                  : t(statusLabels[status] || status)
              " /></ElSelect></ElFormItem
      ></ElCol>
      <ElCol v-if="searchForm.source_id" :xs="24" :sm="12" :md="8" :lg="6"
        ><ElFormItem :label="t('资料来源')"
          ><ElTag
            closable
            @close="
              () => {
                searchForm.source_id = undefined
                handleSearch()
              }
            "
            >{{ searchForm.source_id }}</ElTag
          ></ElFormItem
        ></ElCol
      >
    </DawnSearchBar>
    <ElCard class="art-table-card" shadow="never">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left
          ><ElSpace wrap>
            <ElRadioGroup v-model="tab" @change="changeTab()"
              ><ElRadioButton value="entries">{{ t('知识条目') }}</ElRadioButton
              ><ElRadioButton value="sources">{{ t('资料来源') }}</ElRadioButton></ElRadioGroup
            >
            <ElButton v-permission="'dawn.knowledge.create'" v-ripple @click="showDialog('add')"
              ><template #icon><ArtSvgIcon icon="ri:add-fill" /></template
              >{{ tab === 'entries' ? t('新增') : t('导入资料') }}</ElButton
            >
            <ElButton
              v-permission="'dawn.knowledge.delete'"
              v-ripple
              :disabled="!selectedRows.length"
              @click="deleteSelectedRows(api.removeMany, refreshData)"
              ><template #icon><ArtSvgIcon icon="ri:delete-bin-5-line" /></template
              >{{ t('删除') }}</ElButton
            >
            <ElButton v-ripple @click="runsVisible = true"
              ><template #icon><ArtSvgIcon icon="ri:history-line" /></template
              >{{ t('执行记录') }}</ElButton
            >
            <ElButton v-ripple @click="searchVisible = true"
              ><template #icon><ArtSvgIcon icon="ri:search-line" /></template
              >{{ t('检索测试') }}</ElButton
            >
          </ElSpace></template
        >
      </ArtTableHeader>
      <ArtTable
        ref="tableRef"
        :key="tab"
        row-key="id"
        :data="data"
        :loading="loading"
        :columns="columns"
        :pagination="pagination"
        @sort-change="handleSortChange"
        @selection-change="handleSelectionChange"
        @pagination:current-change="handleCurrentChange"
        @pagination:size-change="handleSizeChange"
      >
        <template #name="{ row }">{{ tab === 'entries' ? row.question : row.name }}</template>
        <template #app_id="{ row }">{{
          apps.find((app) => app.id === row.app_id)?.name || row.app_id
        }}</template>
        <template #kind="{ row }"
          ><ElTag type="info" effect="light">{{
            row.kind === 'text' ? t('文本') : row.kind === 'url' ? 'URL' : 'Markdown'
          }}</ElTag></template
        >
        <template #reply_mode="{ row }"
          ><ElTag :type="row.reply_mode === 'fixed' ? 'warning' : 'primary'" effect="light">{{
            row.reply_mode === 'fixed' ? t('固定原文回复') : t('参考知识回答')
          }}</ElTag></template
        >
        <template #status="{ row }"
          ><ElTag effect="light" :type="statusTypes[row.status] || 'info'">{{
            tab === 'sources' && row.status === 'draft'
              ? t('待处理')
              : statusLabels[row.status]
                ? t(statusLabels[row.status])
                : row.status
          }}</ElTag></template
        >
        <template #operation="{ row }">
          <div class="flex gap-2">
            <DawnButton
              v-permission="'dawn.knowledge.update'"
              type="secondary"
              @click="showDialog('edit', row)"
            />
            <DawnButton
              v-if="tab === 'entries'"
              v-permission="'dawn.knowledge.update'"
              :type="row.status === 'published' ? 'info' : 'success'"
              :icon="row.status === 'published' ? 'ri:pause-line' : 'ri:check-line'"
              :tool-tip="row.status === 'published' ? t('停用') : t('发布')"
              :disabled="pending.has(row.id)"
              @click="setStatus(row)"
            />
            <template v-else>
              <DawnButton
                v-permission="'dawn.knowledge.update'"
                type="info"
                icon="ri:refresh-line"
                :tool-tip="t('重新处理')"
                :disabled="pending.has(row.id) || ['queued', 'processing'].includes(row.status)"
                @click="importSource(row.id)"
              />
              <DawnButton
                type="info"
                icon="ri:file-list-3-line"
                :tool-tip="t('查看生成知识')"
                @click="showSourceEntries(row.id)"
              />
            </template>
            <DawnButton
              v-permission="'dawn.knowledge.delete'"
              type="error"
              @click="deleteRow(row, api.remove, refreshData)"
            />
          </div>
        </template>
      </ArtTable>
    </ElCard>
    <EditDialog
      v-if="tab === 'entries'"
      v-model="dialogVisible"
      :apps="apps"
      :app-id="searchForm.app_id"
      :data="dialogData"
      @success="refreshData"
    />
    <SourceDialog
      v-else
      v-model="dialogVisible"
      :apps="apps"
      :app-id="searchForm.app_id"
      :data="dialogData"
      @success="refreshData"
    />
    <SearchDialog v-model="searchVisible" :apps="apps" :app-id="searchForm.app_id" />
    <RunsDrawer v-model="runsVisible" :apps="apps" :app-id="searchForm.app_id" />
  </div>
</template>
<script setup lang="ts">
  import type { AxiosRequestConfig } from 'axios'
  import { $t as t } from '@/locales'
  import { ElMessage } from 'element-plus'
  import { useIntervalFn } from '@vueuse/core'
  import { useTable } from '@/hooks/core/useTable'
  import { useAdmin } from '@/composables/useAdmin'
  import { dateLabel, type ListQuery, type PageData } from '@/dawn/types'
  import {
    knowledgeApi,
    knowledgeSourceApi,
    supportApi,
    type SupportApp,
    type KnowledgeEntry,
    type KnowledgeSource
  } from '@/api/support'
  import EditDialog from './modules/edit-dialog.vue'
  import SourceDialog from './modules/source-dialog.vue'
  import SearchDialog from './modules/search-dialog.vue'
  import RunsDrawer from './modules/runs-drawer.vue'
  import { statusLabels, statusTypes } from './modules/options'
  const tab = ref('entries'),
    runsVisible = ref(false),
    searchVisible = ref(false)
  const apps = ref<Pick<SupportApp, 'id' | 'name'>[]>([])
  const searchForm = ref({
    query: '',
    app_id: undefined as number | undefined,
    status: '',
    source_id: undefined as number | undefined
  })
  const api = computed(() => (tab.value === 'entries' ? knowledgeApi : knowledgeSourceApi))
  const {
    columns,
    columnChecks,
    data,
    loading,
    getData,
    searchParams,
    pagination,
    resetSearchParams,
    resetColumns,
    handleSortChange,
    handleSizeChange,
    handleCurrentChange,
    refreshData,
    refreshSoft
  } = useTable({
    core: {
      apiFn: (
        params: ListQuery,
        config?: AxiosRequestConfig
      ): Promise<PageData<KnowledgeEntry | KnowledgeSource>> =>
        tab.value === 'entries'
          ? knowledgeApi.list(params, config)
          : knowledgeSourceApi.list(
              { ...params, name: params.query, query: undefined, source_id: undefined },
              config
            ),
      apiParams: { ...searchForm.value },
      columnsFactory: () => [
        { type: 'selection' },
        { prop: 'id', label: 'ID', width: 80, align: 'center', sortable: true },
        { prop: 'name', label: t('名称'), useSlot: true, minWidth: 260, showOverflowTooltip: true },
        { prop: 'app_id', label: t('客服应用'), useSlot: true, minWidth: 150 },
        {
          prop: tab.value === 'entries' ? 'reply_mode' : 'kind',
          label: t('类型'),
          useSlot: true,
          width: 140
        },
        { prop: 'status', label: t('状态'), useSlot: true, width: 100 },
        {
          prop: 'updated_at',
          label: t('更新时间'),
          width: 175,
          sortable: true,
          formatter: (row) => dateLabel(row.updated_at)
        },
        {
          prop: 'operation',
          label: t('操作'),
          useSlot: true,
          width: tab.value === 'entries' ? 150 : 190,
          fixed: 'right'
        }
      ]
    }
  })
  function handleSearch() {
    Object.assign(searchParams, searchForm.value)
    getData()
  }
  function handleReset() {
    searchForm.value = { query: '', app_id: undefined, status: '', source_id: undefined }
    resetSearchParams()
  }
  const {
    dialogVisible,
    dialogData,
    showDialog,
    deleteRow,
    deleteSelectedRows,
    selectedRows,
    handleSelectionChange
  } = useAdmin()
  const tableRef = ref()
  function changeTab() {
    selectedRows.value = []
    tableRef.value?.elTableRef?.clearSelection()
    resetColumns?.()
    handleReset()
  }
  async function showSourceEntries(id: number) {
    tab.value = 'entries'
    selectedRows.value = []
    resetColumns?.()
    Object.keys(searchParams).forEach((key) => delete searchParams[key])
    searchForm.value = { query: '', app_id: undefined, status: '', source_id: id }
    handleSearch()
  }
  const pending = reactive(new Set<number>())
  async function importSource(id: number) {
    pending.add(id)
    try {
      await supportApi.import(id)
      ElMessage.success(t('资料处理已加入队列'))
      await refreshData()
    } finally {
      pending.delete(id)
    }
  }
  async function setStatus(row: KnowledgeEntry) {
    pending.add(row.id)
    try {
      await knowledgeApi.update(row.id, {
        status: row.status === 'published' ? 'disabled' : 'published',
        version: row.version
      })
      await refreshData()
    } finally {
      pending.delete(row.id)
    }
  }
  const pageActive = ref(true)
  onActivated(() => {
    pageActive.value = true
  })
  onDeactivated(() => {
    pageActive.value = false
  })
  useIntervalFn(() => {
    if (
      pageActive.value &&
      !document.hidden &&
      tab.value === 'sources' &&
      !loading.value &&
      data.value.some((row) => ['queued', 'processing'].includes(row.status))
    )
      refreshSoft()
  }, 5000)
  onMounted(async () => {
    let page = 1,
      total = 0
    do {
      const result = await supportApi.knowledgeApps({ page: page++ })
      apps.value.push(...result.data)
      total = result.meta.total
    } while (apps.value.length < total)
  })
</script>
