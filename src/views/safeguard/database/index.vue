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
              v-permission="'dawn.database.update'"
              :disabled="selectedRows.length === 0"
              @click="handleOptimizeRows()"
              v-ripple
            >
              <template #icon>
                <ArtSvgIcon icon="ri:tools-fill" />
              </template>
              {{ t('优化表') }}
            </ElButton>
            <ElButton
              v-permission="'dawn.database.update'"
              :disabled="selectedRows.length === 0"
              @click="handleFragmentRows()"
              v-ripple
            >
              <template #icon>
                <ArtSvgIcon icon="ri:wrench-line" />
              </template>
              {{ t('清理碎片') }}
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable
        ref="tableRef"
        rowKey="name"
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
              v-permission="'dawn.database.list'"
              type="primary"
              icon="ri:node-tree"
              :tool-tip="t('表结构')"
              @click="handleTableDialog(row)"
            />
            <DawnButton
              v-if="row.resource"
              v-permission="'dawn.database.list'"
              type="success"
              icon="ri:recycle-line"
              :tool-tip="t('回收站')"
              @click="handleRecycleDialog(row)"
            />
          </div>
        </template>
      </ArtTable>
    </ElCard>

    <!-- 表结构信息 -->
    <TableDialog v-model="dialogVisible" :data="dialogData" />

    <!-- 回收站 -->
    <RecycleList v-model="recycleVisible" :data="recycleData" />
  </div>
</template>

<script setup lang="ts">
  import { $t as t } from '@/locales'
  import { dateLabel } from '@/dawn/types'
  import { useTable } from '@/hooks/core/useTable'
  import { useAdmin } from '@/composables/useAdmin'
  import { ElMessageBox } from 'element-plus'
  import api from '@/api/safeguard/database'
  import TableSearch from './modules/table-search.vue'
  import TableDialog from './modules/table-dialog.vue'
  import RecycleList from './modules/recycle-list.vue'

  const bytes = (value: number | null) =>
    value == null ? '—' : `${(value / 1024 ** 2).toFixed(2)} MB`

  // 搜索表单
  const searchForm = ref({
    name: undefined,
    sort_by: 'created_at',
    sort_order: 'desc'
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
        { prop: 'name', label: t('表名称'), minWidth: 200 },
        {
          prop: 'comment',
          label: t('表注释'),
          minWidth: 150,
          showOverflowTooltip: true
        },
        {
          prop: 'engine',
          label: t('表引擎'),
          width: 120,
          formatter: (row: any) => row.engine ?? '—'
        },
        {
          prop: 'updated_at',
          label: t('更新时间'),
          width: 180,
          sortable: true,
          formatter: (row: any) => dateLabel(row.updated_at) || '—'
        },
        { prop: 'rows', label: t('总行数'), width: 120, formatter: (row: any) => row.rows ?? '—' },
        {
          prop: 'data_free',
          label: t('碎片大小'),
          width: 120,
          formatter: (row: any) => bytes(row.data_free)
        },
        {
          prop: 'data_length',
          label: t('数据大小'),
          width: 120,
          formatter: (row: any) => bytes(row.data_length)
        },
        {
          prop: 'collation',
          label: t('字符集'),
          width: 180,
          formatter: (row: any) => row.collation ?? '—'
        },
        {
          prop: 'created_at',
          label: t('创建时间'),
          width: 180,
          sortable: true,
          formatter: (row: any) => dateLabel(row.created_at) || '—'
        },
        { prop: 'operation', label: t('操作'), width: 100, fixed: 'right', useSlot: true }
      ]
    }
  })

  // 编辑配置
  const { dialogVisible, dialogData, selectedRows, handleSelectionChange } = useAdmin()
  const recycleVisible = ref(false)
  const recycleData = ref({})

  /**
   * 表结构
   * @param row
   */
  const handleTableDialog = (row: Record<string, any>): void => {
    dialogVisible.value = true
    dialogData.value = row
  }

  /**
   * 回收站
   * @param row
   */
  const handleRecycleDialog = (row: Record<string, any>): void => {
    recycleVisible.value = true
    recycleData.value = row
  }

  /**
   * 优化表
   */
  const handleOptimizeRows = (): void => {
    if (selectedRows.value.length === 0) {
      ElMessage.warning(t('请选择要优化的行'))
      return
    }
    ElMessageBox.confirm(
      t('确定要优化选中的{v0}条数据吗', { v0: selectedRows.value.length }),
      t('优化选中数据'),
      {
        confirmButtonText: t('确定'),
        cancelButtonText: t('取消'),
        type: 'error'
      }
    ).then(() => {
      api.optimize({ tables: selectedRows.value.map((row) => row.name) }).then(() => {
        ElMessage.success(t('操作成功'))
        refreshData()
        selectedRows.value = []
      })
    })
  }

  /**
   * 清理表碎片
   */
  const handleFragmentRows = (): void => {
    if (selectedRows.value.length === 0) {
      ElMessage.warning(t('请选择要清理碎片的行'))
      return
    }
    ElMessageBox.confirm(
      t('确定要清理选中的{v0}条数据吗', { v0: selectedRows.value.length }),
      t('清理碎片操作'),
      {
        confirmButtonText: t('确定'),
        cancelButtonText: t('取消'),
        type: 'error'
      }
    ).then(() => {
      api.fragment({ tables: selectedRows.value.map((row) => row.name) }).then(() => {
        ElMessage.success(t('操作成功'))
        refreshData()
        selectedRows.value = []
      })
    })
  }
</script>
