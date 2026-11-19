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
        <ElFormItem :label="t('用户信息')" prop="query">
          <ElInput
            v-model="searchForm.query"
            :placeholder="t('用户名、昵称或用户编号')"
            clearable
          />
        </ElFormItem>
      </ElCol>
      <ElCol :xs="24" :sm="12" :md="8" :lg="6">
        <ElFormItem :label="t('类型')" prop="type">
          <ElSelect v-model="searchForm.type" clearable>
            <ElOption v-for="(label, value) in types" :key="value" :value="value" :label="label" />
          </ElSelect>
        </ElFormItem>
      </ElCol>
      <ElCol :xs="24" :sm="12" :md="8" :lg="6">
        <ElFormItem :label="t('状态')" prop="status">
          <DawnSelect v-model="searchForm.status" dict="data_status" clearable />
        </ElFormItem>
      </ElCol>
    </DawnSearchBar>
    <ElCard class="art-table-card" shadow="never">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton v-permission="'dawn.members.create'" v-ripple @click="showDialog('add')">
              <template #icon><ArtSvgIcon icon="ri:add-fill" /></template>
              {{ t('新增') }}
            </ElButton>
            <ElButton
              v-permission="'dawn.members.delete'"
              v-ripple
              :disabled="!selectedRows.length"
              @click="deleteSelectedRows(memberApi.removeMany, refreshData)"
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
        <template #type="{ row }">
          <ElTag :type="typeColors[row.type] || 'info'" effect="light">
            {{ types[row.type] || row.type }}
          </ElTag>
        </template>
        <template #operation="{ row }">
          <div class="flex gap-2">
            <DawnButton
              v-permission="'dawn.members.update'"
              type="secondary"
              @click="showDialog('edit', row)"
            />
            <DawnButton
              v-permission="'dawn.members.delete'"
              type="error"
              @click="deleteRow(row, memberApi.remove, refreshData)"
            />
          </div>
        </template>
      </ArtTable>
    </ElCard>
    <EditDialog v-model="dialogVisible" :data="dialogData" @success="refreshData" />
  </div>
</template>
<script setup lang="ts">
  import { $t as t } from '@/locales'
  import { dateLabel } from '@/dawn/types'
  import { useTable } from '@/hooks/core/useTable'
  import { useAdmin } from '@/composables/useAdmin'
  import { memberApi } from '@/api/support'
  import type { TagProps } from 'element-plus'
  import EditDialog from './modules/edit-dialog.vue'
  const searchForm = ref({ query: '', type: '', status: '' })
  const types = computed<Record<string, string>>(() => ({
    guest: t('访客'),
    member: t('普通用户'),
    ai: t('AI智能体')
  }))
  const typeColors: Record<string, TagProps['type']> = {
    guest: 'info',
    member: 'success',
    ai: 'primary'
  }
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
      apiFn: memberApi.list,
      apiParams: { ...searchForm.value },
      columnsFactory: () => [
        { type: 'selection' },
        { prop: 'id', label: t('用户ID'), width: 100, sortable: true },
        { prop: 'unique_id', label: t('用户编号'), minWidth: 150, sortable: true },
        { prop: 'nickname', label: t('昵称'), minWidth: 120, showOverflowTooltip: true },
        { prop: 'username', label: t('用户名'), minWidth: 120 },
        { prop: 'type', label: t('类型'), useSlot: true, width: 110 },
        { prop: 'telegram_username', label: t('Telegram用户名'), minWidth: 150 },
        { prop: 'status', label: t('状态'), dawnType: 'dict', dawnDict: 'data_status', width: 100 },
        {
          prop: 'created_at',
          label: t('创建日期'),
          width: 180,
          sortable: true,
          formatter: (row) => dateLabel(row.created_at)
        },
        { prop: 'operation', label: t('操作'), useSlot: true, width: 100, fixed: 'right' }
      ]
    }
  })
  function handleSearch() {
    Object.assign(searchParams, searchForm.value)
    getData()
  }
  function handleReset() {
    Object.assign(searchForm.value, { query: '', type: '', status: '' })
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
</script>
