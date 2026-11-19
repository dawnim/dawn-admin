<template>
  <div class="art-full-height">
    <DawnSearchBar
      v-model="searchForm"
      label-width="100px"
      :show-expand="false"
      @search="handleSearch"
      @reset="handleReset"
    >
      <ElCol :xs="24" :sm="12" :md="8" :lg="6">
        <ElFormItem :label="t('应用名称')" prop="name">
          <ElInput v-model="searchForm.name" :placeholder="t('请输入应用名称')" clearable />
        </ElFormItem>
      </ElCol>
    </DawnSearchBar>
    <ElCard class="art-table-card" shadow="never">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton v-permission="'dawn.support_apps.create'" v-ripple @click="showDialog('add')">
              <template #icon><ArtSvgIcon icon="ri:add-fill" /></template>
              {{ t('新增') }}
            </ElButton>
            <ElButton
              v-permission="'dawn.support_apps.delete'"
              v-ripple
              :disabled="!selectedRows.length"
              @click="deleteSelectedRows(supportAppApi.removeMany, refreshData)"
            >
              <template #icon><ArtSvgIcon icon="ri:delete-bin-5-line" /></template>
              {{ t('删除') }}
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>
      <ArtTable
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
        <template #name="{ row }">
          <div class="flex items-center gap-3">
            <ArtAvatar :src="row.avatar" :size="36" />
            <span>{{ row.name }}</span>
          </div>
        </template>
        <template #channels="{ row }">
          <ElSpace wrap>
            <ElTag type="primary" effect="light">{{ t('网站') }}</ElTag>
            <ElTag v-if="row.config.telegram_enabled" type="info" effect="light">Telegram</ElTag>
          </ElSpace>
        </template>
        <template #agent="{ row }">
          <ElTag :type="row.config.ai_enabled ? 'primary' : 'success'" effect="light">
            {{ row.config.ai_enabled ? t('AI接待') : t('人工接待') }}
          </ElTag>
        </template>
        <template #agent_count="{ row }">{{ row.config.agent_ids?.length || 0 }}</template>
        <template #operation="{ row }">
          <div class="flex gap-2">
            <DawnButton
              type="success"
              icon="ri:link"
              :tool-tip="t('接入')"
              @click="integration(row)"
            />
            <DawnButton
              v-permission="'dawn.support_apps.update'"
              type="secondary"
              @click="showDialog('edit', row)"
            />
            <DawnButton
              v-permission="'dawn.support_apps.delete'"
              type="error"
              @click="deleteRow(row, supportAppApi.remove, refreshData)"
            />
          </div>
        </template>
      </ArtTable>
    </ElCard>
    <EditDialog v-model="dialogVisible" :data="dialogData" @success="refreshData" />
    <ElDialog
      v-model="integrating"
      :title="t('网站接入')"
      width="700px"
      align-center
      :close-on-click-modal="false"
    >
      <ElForm label-width="130px">
        <ElFormItem :label="t('聊天链接')">
          <ElInput :model-value="link" readonly>
            <template #append>
              <ElButton @click="copy(link)">{{ t('复制') }}</ElButton>
            </template>
          </ElInput>
        </ElFormItem>
        <ElFormItem :label="t('悬浮客服脚本')">
          <ElInput :model-value="snippet" type="textarea" :rows="4" readonly class="code-input" />
        </ElFormItem>
        <ElSpace>
          <ElButton @click="copy(snippet)">{{ t('复制脚本') }}</ElButton>
          <ElButton type="primary" @click="preview">{{ t('打开预览') }}</ElButton>
        </ElSpace>
      </ElForm>
      <ElAlert
        class="mt-4"
        :title="t('参数通过attributes传入，本站及外部认证方式见接入文档')"
        type="info"
        :closable="false"
      />
    </ElDialog>
  </div>
</template>
<script setup lang="ts">
  import { $t as t } from '@/locales'
  import { ElMessage } from 'element-plus'
  import { dateLabel } from '@/dawn/types'
  import { dawnConfig } from '@/dawn/config'
  import { useTable } from '@/hooks/core/useTable'
  import { useAdmin } from '@/composables/useAdmin'
  import { supportAppApi, type SupportApp } from '@/api/support'
  import EditDialog from './modules/edit-dialog.vue'
  const searchForm = ref({ name: '' })
  const {
    columns,
    columnChecks,
    data,
    loading,
    getData,
    searchParams,
    pagination,
    resetSearchParams,
    handleSortChange,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: supportAppApi.list,
      apiParams: { ...searchForm.value },
      columnsFactory: () => [
        { type: 'selection' },
        { prop: 'id', label: t('编号'), width: 80, align: 'center', sortable: true },
        { prop: 'name', label: t('应用名称'), useSlot: true, minWidth: 180, sortable: true },
        { prop: 'channels', label: t('接入渠道'), useSlot: true, minWidth: 160 },
        { prop: 'agent', label: t('接待方式'), useSlot: true, minWidth: 120 },
        { prop: 'agent_count', label: t('接待人员'), useSlot: true, width: 110 },
        { prop: 'status', label: t('状态'), dawnType: 'dict', dawnDict: 'data_status', width: 100 },
        {
          prop: 'created_at',
          label: t('创建日期'),
          width: 180,
          sortable: true,
          formatter: (row) => dateLabel(row.created_at)
        },
        { prop: 'operation', label: t('操作'), useSlot: true, width: 140, fixed: 'right' }
      ]
    }
  })
  function handleSearch() {
    Object.assign(searchParams, searchForm.value)
    getData()
  }
  function handleReset() {
    searchForm.value.name = ''
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
  const integrating = ref(false),
    selected = ref<SupportApp>()
  const server = computed(() => new URL(dawnConfig.apiBase, location.href).origin)
  const link = computed(() => `${server.value}/chat/${selected.value?.public_key || ''}`)
  const snippet = computed(
    () =>
      `<script src="${server.value}/support-assets/widget.js" data-app="${selected.value?.public_key || ''}" data-theme="system" defer>${'<'}/script>`
  )
  function integration(row: SupportApp) {
    selected.value = row
    integrating.value = true
  }
  async function copy(value: string) {
    await navigator.clipboard.writeText(value)
    ElMessage.success(t('复制成功'))
  }
  function preview() {
    window.open(link.value, '_blank', 'noopener,noreferrer')
  }
</script>
