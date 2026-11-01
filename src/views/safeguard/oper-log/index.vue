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
        <template #operation="{ row }">
          <div class="flex gap-2">
            <DawnButton type="success" @click="handleParams(row)" />
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
  import { ElMessageBox } from 'element-plus'
  import api from '@/api/safeguard/operLog'
  import TableSearch from './modules/table-search.vue'

  // 搜索表单
  const searchForm = ref({
    username: undefined,
    ip: undefined,
    service_name: undefined,
    router: undefined,
    created_at: undefined,
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
        { prop: 'username', label: t('操作用户') },
        { prop: 'method', label: t('业务名称') },
        { prop: 'path', label: t('路由'), minWidth: 180, showOverflowTooltip: true },
        { prop: 'ip', label: t('操作IP') },
        { prop: 'status', label: t('状态'), width: 100 },
        { prop: 'duration', label: t('耗时(ms)'), width: 100 },
        {
          prop: 'message',
          label: t('操作信息'),
          minWidth: 160,
          showOverflowTooltip: true
        },
        {
          prop: 'created_at',
          label: t('操作时间'),
          width: 180,
          sortable: true,
          formatter: (row: any) => dateLabel(row.created_at)
        },
        { prop: 'operation', label: t('操作'), width: 100, fixed: 'right', useSlot: true }
      ]
    }
  })

  // 编辑配置
  const { deleteRow, deleteSelectedRows, selectedRows, handleSelectionChange } = useAdmin()

  // 预览参数
  const handleParams = (row: any) => {
    ElMessageBox({
      title: t('数据详情'),
      message: h(
        'pre',
        {
          style: {
            maxHeight: '400px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            color: 'var(--el-text-color-primary)'
          }
        },
        JSON.stringify(
          {
            ...row,
            request_data: row.request_data && JSON.parse(row.request_data),
            response_data: row.response_data && JSON.parse(row.response_data)
          },
          null,
          2
        )
      )
    })
  }
</script>
