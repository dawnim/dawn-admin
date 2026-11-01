<template>
  <div class="art-full-height">
    <!-- 搜索面板 -->
    <TableSearch v-model="searchForm" @search="handleSearch" @reset="resetSearchParams" />

    <ElCard class="art-table-card" shadow="never">
      <!-- 表格头部 -->
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton v-permission="'dawn.posts.create'" @click="showDialog('add')" v-ripple>
              <template #icon>
                <ArtSvgIcon icon="ri:add-fill" />
              </template>
              {{ t('新增') }}
            </ElButton>
            <ElButton
              v-permission="'dawn.posts.delete'"
              :disabled="selectedRows.length === 0"
              @click="deleteSelectedRows(api.delete, refreshData)"
              v-ripple
            >
              <template #icon>
                <ArtSvgIcon icon="ri:delete-bin-5-line" />
              </template>
              {{ t('删除') }}
            </ElButton>
            <DawnImport
              v-permission="'dawn.posts.create'"
              download-url="/system/posts/template"
              accept=".csv"
              upload-url="/system/posts/import"
              @success="refreshData"
            />
            <DawnExport
              v-permission="'dawn.posts.export'"
              url="/system/posts/export"
              method="get"
              file-name="posts.csv"
            />
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
            <DawnButton
              v-permission="'dawn.posts.update'"
              type="secondary"
              @click="showDialog('edit', row)"
            />
            <DawnButton
              v-permission="'dawn.posts.delete'"
              type="error"
              @click="deleteRow(row, api.delete, refreshData)"
            />
          </div>
        </template>
      </ArtTable>
    </ElCard>

    <!-- 编辑弹窗 -->
    <EditDialog
      v-model="dialogVisible"
      :dialog-type="dialogType"
      :data="dialogData"
      @success="refreshData"
    />
  </div>
</template>

<script setup lang="ts">
  import { $t as t } from '@/locales'
  import { dateLabel } from '@/dawn/types'
  import { useTable } from '@/hooks/core/useTable'
  import { useAdmin } from '@/composables/useAdmin'
  import api from '@/api/system/post'
  import TableSearch from './modules/table-search.vue'
  import EditDialog from './modules/edit-dialog.vue'

  // 搜索表单
  const searchForm = ref({
    name: undefined,
    code: undefined,
    status: undefined
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
      columnsFactory: () => [
        { type: 'selection' },
        { prop: 'id', label: t('编号'), width: 100, align: 'center' },
        { prop: 'name', label: t('岗位名称'), minWidth: 120 },
        { prop: 'code', label: t('岗位编码'), minWidth: 120 },
        {
          prop: 'remark',
          label: t('描述'),
          minWidth: 150,
          showOverflowTooltip: true
        },
        { prop: 'sort', label: t('排序'), width: 100 },
        {
          prop: 'status',
          label: t('状态'),
          dawnType: 'dict',
          dawnDict: 'data_status',
          width: 100
        },
        {
          prop: 'created_at',
          label: t('创建日期'),
          width: 180,
          sortable: true,
          formatter: (row: any) => dateLabel(row.created_at)
        },
        { prop: 'operation', label: t('操作'), width: 100, fixed: 'right', useSlot: true }
      ]
    }
  })

  // 编辑配置
  const {
    dialogType,
    dialogVisible,
    dialogData,
    showDialog,
    deleteRow,
    deleteSelectedRows,
    handleSelectionChange,
    selectedRows
  } = useAdmin()
</script>
