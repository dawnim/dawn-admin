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
            <ElButton v-permission="'dawn.roles.create'" @click="showDialog('add')" v-ripple>
              <template #icon>
                <ArtSvgIcon icon="ri:add-fill" />
              </template>
              {{ t('新增') }}
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 表格 -->
      <ArtTable
        rowKey="id"
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @sort-change="handleSortChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #operation="{ row }">
          <div class="flex gap-2">
            <DawnButton
              v-permission="'dawn.roles.update'"
              type="secondary"
              @click="showDialog('edit', row)"
            />
            <DawnButton
              v-permission="'dawn.roles.delete'"
              type="error"
              @click="deleteRow(row, api.delete, refreshData)"
            />
            <ElDropdown>
              <ArtIconButton
                icon="ri:more-2-fill"
                class="!size-8 bg-g-200 dark:bg-g-300/45 text-sm"
              />
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem
                    v-if="hasAuth('dawn.roles.update')"
                    @click="showPermissionDialog('edit', row)"
                  >
                    <div class="flex-c gap-2">
                      <ArtSvgIcon icon="ri:user-3-line" />
                      <span>{{ t('菜单权限') }}</span>
                    </div>
                  </ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
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

    <!-- 菜单权限弹窗 -->
    <PermissionDialog
      v-model="permissionDialogVisible"
      :dialog-type="permissionDialogType"
      :data="permissionDialogData"
      @success="refreshData"
    />
  </div>
</template>

<script setup lang="ts">
  import { useAuth } from '@/hooks/core/useAuth'
  import { $t as t } from '@/locales'
  import { dateLabel } from '@/dawn/types'
  import { useTable } from '@/hooks/core/useTable'
  import { useAdmin } from '@/composables/useAdmin'
  import api from '@/api/system/role'
  import TableSearch from './modules/table-search.vue'
  import EditDialog from './modules/edit-dialog.vue'
  import PermissionDialog from './modules/permission-dialog.vue'

  const { hasAuth } = useAuth()

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
    pagination,
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
        { prop: 'id', label: t('编号'), minWidth: 60, align: 'center' },
        { prop: 'name', label: t('角色名称'), minWidth: 120 },
        { prop: 'code', label: t('角色编码'), minWidth: 120 },
        { prop: 'level', label: t('角色级别'), minWidth: 100, sortable: true },
        {
          prop: 'remark',
          label: t('角色描述'),
          minWidth: 150,
          showOverflowTooltip: true
        },
        { prop: 'sort', label: t('排序'), minWidth: 100 },
        { prop: 'status', label: t('状态'), dawnType: 'dict', dawnDict: 'data_status' },
        {
          prop: 'created_at',
          label: t('创建日期'),
          width: 180,
          sortable: true,
          formatter: (row: any) => dateLabel(row.created_at)
        },
        { prop: 'operation', label: t('操作'), width: 140, fixed: 'right', useSlot: true }
      ]
    }
  })

  // 编辑配置
  const { dialogType, dialogVisible, dialogData, showDialog, deleteRow } = useAdmin()

  // 权限配置
  const {
    dialogType: permissionDialogType,
    dialogVisible: permissionDialogVisible,
    dialogData: permissionDialogData,
    showDialog: showPermissionDialog
  } = useAdmin()
</script>
