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
            <ElButton v-permission="'dawn.menus.create'" @click="showDialog('add')" v-ripple>
              <template #icon>
                <ArtSvgIcon icon="ri:add-fill" />
              </template>
              {{ t('新增') }}
            </ElButton>
            <ElButton
              v-permission="'dawn.menus.delete'"
              :disabled="selectedRows.length === 0"
              @click="deleteSelectedRows(api.delete, refreshData)"
              v-ripple
            >
              <template #icon>
                <ArtSvgIcon icon="ri:delete-bin-5-line" />
              </template>
              {{ t('删除') }}
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
        :default-expand-all="false"
        @selection-change="handleSelectionChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <!-- 操作列 -->
        <template #operation="{ row }">
          <div class="flex justify-end gap-2">
            <DawnButton
              v-permission="'dawn.menus.create'"
              v-if="row.type !== 3"
              type="primary"
              @click="handleAdd(row)"
            />
            <DawnButton
              v-if="!row.builtin"
              v-permission="'dawn.menus.update'"
              type="secondary"
              @click="showDialog('edit', row)"
            />
            <DawnButton
              v-if="!row.builtin"
              v-permission="'dawn.menus.delete'"
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
  import { useTable } from '@/hooks/core/useTable'
  import { useAdmin } from '@/composables/useAdmin'
  import api from '@/api/system/menu'
  import TableSearch from './modules/table-search.vue'
  import EditDialog from './modules/edit-dialog.vue'
  import { h } from 'vue'
  import ArtSvgIcon from '@/components/core/base/art-svg-icon/index.vue'

  // 状态管理
  const isExpanded = ref(false)
  const tableRef = ref()

  // 搜索表单
  const searchForm = ref({
    name: undefined,
    path: undefined,
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
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: api.list,
      columnsFactory: () => [
        { type: 'selection', selectable: (row: any) => !row.builtin },
        { prop: 'name', label: t('菜单名称'), minWidth: 150 },
        {
          prop: 'type',
          label: t('菜单类型'),
          align: 'center',
          dawnType: 'dict',
          dawnDict: 'menu_type',
          width: 100
        },
        {
          prop: 'icon',
          label: t('图标'),
          align: 'center',
          width: 80,
          formatter: (row: any) => {
            return h(ArtSvgIcon, { icon: row.icon })
          }
        },
        { prop: 'code', label: t('稳定Key'), minWidth: 180, showOverflowTooltip: true },
        {
          prop: 'path',
          label: t('路由'),
          minWidth: 180,
          showOverflowTooltip: true,
          formatter: (row: any) => {
            if (row.type === 3) return ''
            return row.path || ''
          }
        },
        {
          prop: 'slug',
          label: t('权限标识'),
          minWidth: 160,
          formatter: (row: any) => {
            if (row.type === 2 || row.type === 4) {
              return row.children?.length ? row.children.length + t('个权限标识') : ''
            }
            if (row.type === 3) {
              return row.slug || ''
            }
            return ''
          }
        },
        { prop: 'sort', label: t('排序'), width: 100 },
        {
          prop: 'status',
          label: t('状态'),
          dawnType: 'dict',
          dawnDict: 'data_status',
          width: 100
        },
        { prop: 'operation', label: t('操作'), width: 140, fixed: 'right', useSlot: true }
      ]
    }
  })

  // 编辑配置
  const {
    dialogType,
    dialogVisible,
    dialogData,
    showDialog,
    selectedRows,
    deleteRow,
    deleteSelectedRows,
    handleSelectionChange
  } = useAdmin()

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

  /**
   * 添加子项
   * @param row
   */
  const handleAdd = (row: any) => {
    let data = { parent_id: row.key, type: 1 }
    if (row.type === 2 || row.type === 4) {
      data.type = 3
    }
    showDialog('add', data)
  }
</script>
