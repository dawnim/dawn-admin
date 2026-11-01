<template>
  <div class="art-full-height">
    <!-- 搜索面板 -->
    <TableSearch
      v-model="searchForm"
      @search="handleSearch"
      @reset="resetSearchParams"
    ></TableSearch>

    <ElCard class="art-table-card" shadow="never">
      <!-- 表格头部 -->
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton
              v-permission="'dawn.logs.delete'"
              :disabled="selectedRows.length === 0"
              @click="deleteSelectedRows(api.delete, refreshData)"
              v-ripple
            >
              <template #icon>
                <ArtSvgIcon icon="ri:delete-bin-5-line" />
              </template>
              {{ t('删除') }}
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable
        ref="tableRef"
        rowKey="id"
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @sort-change="handleSortChange"
        @selection-change="handleSelectionChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <!-- 操作列 -->
        <template #status="{ row }">
          <ElTag v-if="row.status < 400" type="success">{{ t('成功') }}</ElTag>
          <ElTag v-else type="danger">{{ t('失败') }}</ElTag>
        </template>
        <template #operation="{ row }">
          <div class="flex">
            <DawnButton
              v-permission="'dawn.logs.delete'"
              type="error"
              @click="deleteRow(row, api.delete, refreshData)"
            />
          </div>
        </template>
      </ArtTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { $t as t } from '@/locales'
  import { dateLabel } from '@/dawn/types'
  import { useTable } from '@/hooks/core/useTable'
  import { useAdmin } from '@/composables/useAdmin'
  import api from '@/api/safeguard/emailLog'
  import TableSearch from './modules/table-search.vue'

  // 搜索表单
  const searchForm = ref({
    from: undefined,
    email: undefined,
    status: undefined,
    create_time: undefined,
    orderField: 'created_at',
    orderType: 'desc'
  })

  // 搜索处理
  const handleSearch = (params: Record<string, any>) => {
    Object.assign(searchParams, params)
    getData()
  }

  // 表格配置
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
      apiFn: api.list,
      apiParams: {
        ...searchForm.value
      },
      columnsFactory: () => [
        { type: 'selection' },
        { prop: 'id', label: t('编号'), width: 100, align: 'center' },
        { prop: 'sender', label: t('发件人'), minWidth: 160 },
        { prop: 'recipient', label: t('收件人'), minWidth: 160 },
        { prop: 'status', label: t('发送状态'), useSlot: true },
        {
          prop: 'message',
          label: t('发送结果'),
          minWidth: 150,
          showOverflowTooltip: true
        },
        {
          prop: 'created_at',
          label: t('发送时间'),
          width: 180,
          sortable: true,
          formatter: (row: any) => dateLabel(row.created_at)
        },
        { prop: 'operation', label: t('操作'), width: 80, fixed: 'right', useSlot: true }
      ]
    }
  })

  // 编辑配置
  const { deleteRow, deleteSelectedRows, selectedRows, handleSelectionChange } = useAdmin()
</script>
