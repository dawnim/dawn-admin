<template>
  <div class="art-full-height">
    <!-- 搜索面板 -->
    <TableSearch v-model="searchForm" @search="handleSearch" @reset="resetSearchParams" />

    <ElCard class="art-table-card" shadow="never">
      <!-- 表格头部 -->
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton v-permission="'dawn.departments.create'" @click="showDialog('add')" v-ripple>
              <template #icon>
                <ArtSvgIcon icon="ri:add-fill" />
              </template>
              {{ t('新增') }}
            </ElButton>
            <ElButton @click="toggleExpand" v-ripple>
              <template #icon>
                <ArtSvgIcon v-if="isExpanded" icon="ri:collapse-diagonal-line" />
                <ArtSvgIcon v-else icon="ri:expand-diagonal-line" />
              </template>
              {{ isExpanded ? t('收起') : t('展开') }}
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
        :default-expand-all="true"
        @sort-change="handleSortChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <!-- 操作列 -->
        <template #operation="{ row }">
          <div class="flex gap-2">
            <DawnButton
              v-permission="'dawn.departments.update'"
              type="secondary"
              @click="showDialog('edit', row)"
            />
            <DawnButton
              v-permission="'dawn.departments.delete'"
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
  import api from '@/api/system/dept'
  import TableSearch from './modules/table-search.vue'
  import EditDialog from './modules/edit-dialog.vue'

  // 状态管理
  const isExpanded = ref(true)
  const tableRef = ref()

  // 搜索表单
  const searchForm = ref({
    name: undefined,
    phone: undefined,
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
    resetSearchParams,
    handleSortChange,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: api.list,
      columnsFactory: () => [
        { prop: 'name', label: t('部门名称'), minWidth: 200 },
        { prop: 'phone', label: t('联系电话'), minWidth: 120 },
        { prop: 'leader', label: t('部门领导'), minWidth: 120 },
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
  const { dialogType, dialogVisible, dialogData, showDialog, deleteRow } = useAdmin()

  /**
   * 切换展开/收起所有菜单
   */
  const toggleExpand = (): void => {
    isExpanded.value = !isExpanded.value
    nextTick(() => {
      if (tableRef.value?.elTableRef && data.value) {
        const processRows = (rows: any[]) => {
          rows.forEach((row) => {
            if (row.children?.length) {
              tableRef.value.elTableRef.toggleRowExpansion(row, isExpanded.value)
              processRows(row.children)
            }
          })
        }
        processRows(data.value)
      }
    })
  }
</script>
