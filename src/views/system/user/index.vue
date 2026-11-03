<template>
  <div class="art-full-height">
    <div class="box-border flex gap-4 h-full max-md:block max-md:gap-0 max-md:h-auto">
      <div class="flex-shrink-0 w-64 h-full max-md:w-full max-md:h-auto max-md:mb-5">
        <ElCard class="tree-card art-card-xs flex flex-col h-full mt-0" shadow="never">
          <template #header>
            <b>{{ t('部门列表') }}</b>
          </template>
          <ElScrollbar>
            <ElTree
              :data="treeData"
              :props="{ children: 'children', label: 'label' }"
              node-key="id"
              default-expand-all
              highlight-current
              @node-click="handleNodeClick"
            />
          </ElScrollbar>
        </ElCard>
      </div>

      <div class="flex flex-col flex-grow min-w-0">
        <!-- 搜索栏 -->
        <TableSearch v-model="searchForm" @search="handleSearch" @reset="handleReset" />

        <ElCard class="flex flex-col flex-1 min-h-0 art-table-card" shadow="never">
          <!-- 表格头部 -->
          <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
            <template #left>
              <ElSpace wrap>
                <ElButton v-permission="'dawn.users.create'" @click="showDialog('add')" v-ripple>
                  <template #icon>
                    <ArtSvgIcon icon="ri:add-fill" />
                  </template>
                  {{ t('新增') }}
                </ElButton>
                <ElButton v-permission="'dawn.users.list'" @click="openSessions"
                  ><ArtSvgIcon icon="ri:computer-line" class="mr-1" />{{ t('在线会话') }}</ElButton
                >
              </ElSpace>
            </template>
          </ArtTableHeader>

          <!-- 表格 -->
          <ArtTable
            :loading="loading"
            :data="data"
            :columns="columns"
            :pagination="pagination"
            @sort-change="handleSortChange"
            @selection-change="handleSelectionChange"
            @pagination:size-change="handleSizeChange"
            @pagination:current-change="handleCurrentChange"
          >
            <template #avatar="{ row }">
              <div class="flex items-center gap-3">
                <ArtAvatar :src="row.avatar" :size="36" />
                <div>
                  <div class="flex items-center gap-2">
                    <span>{{ row.username }}</span>
                    <ElButton
                      v-if="row.id !== userStore.info.id"
                      link
                      :title="t('聊天')"
                      :aria-label="t('聊天')"
                      @click.stop="openChat(row)"
                    >
                      <ArtSvgIcon icon="ri:chat-3-line" />
                    </ElButton>
                  </div>
                  <div class="text-xs text-g-600">{{ row.email }}</div>
                </div>
              </div>
            </template>
            <!-- 操作列 -->
            <template #operation="{ row }">
              <div class="flex gap-2" v-if="row.can_manage">
                <DawnButton
                  v-permission="'dawn.users.update'"
                  type="secondary"
                  @click="showDialog('edit', row)"
                />
                <DawnButton
                  v-permission="'dawn.users.delete'"
                  type="error"
                  @click="deleteRow(row, api.remove, refreshData)"
                />
                <ElDropdown
                  v-if="
                    ['dawn.users.dashboard', 'dawn.users.cache', 'dawn.users.password'].some(
                      hasAuth
                    )
                  "
                >
                  <ArtIconButton
                    icon="ri:more-2-fill"
                    class="!size-8 bg-g-200 dark:bg-g-300/45 text-sm"
                  />
                  <template #dropdown>
                    <ElDropdownMenu>
                      <ElDropdownItem
                        v-if="hasAuth('dawn.users.dashboard')"
                        @click="
                          () => {
                            dashboardUser = row
                            dashboardVisible = true
                          }
                        "
                      >
                        <ArtSvgIcon icon="ri:home-office-line" class="mr-2" />{{ t('设置首页') }}
                      </ElDropdownItem>
                      <ElDropdownItem
                        v-if="hasAuth('dawn.users.password')"
                        @click="handlePassword(row)"
                      >
                        <ArtSvgIcon icon="ri:key-line" class="mr-2" />{{ t('重置密码') }}
                      </ElDropdownItem>
                      <ElDropdownItem v-if="hasAuth('dawn.users.cache')" @click="handleCache(row)">
                        <ArtSvgIcon icon="ri:eraser-line" class="mr-2" />{{ t('清理缓存') }}
                      </ElDropdownItem>
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
              </div>
              <ElTag v-else type="info">{{ t('只读') }}</ElTag>
            </template>
          </ArtTable>
        </ElCard>
      </div>
    </div>
    <ElDialog
      v-model="sessionsVisible"
      :title="t('在线会话')"
      width="min(1000px,94vw)"
      align-center
    >
      <ArtTable
        :data="sessions"
        :columns="sessionColumns"
        :loading="sessionsLoading"
        height="52vh"
        :pagination="sessionsPagination"
        @pagination:size-change="sessionSizeChange"
        @pagination:current-change="sessionPageChange"
        ><template #operation="{ row }"
          ><DawnButton
            v-permission="'dawn.users.update'"
            type="error"
            @click="revokeSession(row.id)" /></template
      ></ArtTable>
    </ElDialog>
    <DashboardDialog v-model="dashboardVisible" :data="dashboardUser" @success="refreshData" />
    <!-- 表单弹窗 -->
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
  import { openChat } from '@/dawn/chat'
  import { useUserStore } from '@/store/modules/user'
  import { dateLabel } from '@/dawn/types'
  import { useTable } from '@/hooks/core/useTable'
  import { useAdmin } from '@/composables/useAdmin'
  import { useAuth } from '@/hooks/core/useAuth'
  import { ElMessageBox, ElMessage } from 'element-plus'
  import TableSearch from './modules/table-search.vue'
  import EditDialog from './modules/edit-dialog.vue'
  import DashboardDialog from './modules/dashboard-dialog.vue'
  import api from '@/api/system/user'
  import deptApi from '@/api/system/dept'

  const { hasAuth } = useAuth()
  const userStore = useUserStore()
  const dashboardVisible = ref(false)
  const dashboardUser = ref<Record<string, any>>()
  const sessionsVisible = ref(false)
  const {
    data: sessions,
    columns: sessionColumns,
    loading: sessionsLoading,
    pagination: sessionsPagination,
    getData: loadSessions,
    refreshData: refreshSessions,
    handleSizeChange: sessionSizeChange,
    handleCurrentChange: sessionPageChange
  } = useTable({
    core: {
      apiFn: api.sessions,
      immediate: false,
      columnsFactory: () => [
        { prop: 'user_id', label: t('用户ID'), width: 100 },
        { prop: 'ip', label: 'IP', width: 150 },
        { prop: 'user_agent', label: t('设备'), minWidth: 200 },
        {
          prop: 'created_at',
          label: t('创建时间'),
          width: 180,
          formatter: (row: any) => dateLabel(row.created_at)
        },
        { prop: 'operation', label: t('操作'), width: 80, useSlot: true }
      ]
    }
  })
  async function openSessions() {
    sessionsVisible.value = true
    await loadSessions()
  }
  async function revokeSession(id: string) {
    await ElMessageBox.confirm(t('撤销会话'), t('确认'))
    await api.revoke(id)
    await refreshSessions()
  }

  const treeData = ref<any[]>([])
  const departmentNames = computed(() => {
    const names = new Map<number, string>()
    const pending = [...treeData.value]
    while (pending.length) {
      const row = pending.pop()!
      names.set(row.id, row.label)
      pending.push(...row.children)
    }
    return names
  })

  // 编辑框
  const { dialogType, dialogVisible, dialogData, showDialog, handleSelectionChange, deleteRow } =
    useAdmin()

  // 搜索表单
  const searchForm = ref({
    username: undefined,
    phone: undefined,
    email: undefined,
    dept_id: undefined,
    status: ''
  })

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
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
      apiParams: {
        ...searchForm.value
      },
      columnsFactory: () => [
        { prop: 'id', width: 80, label: 'ID', sortable: true },
        {
          prop: 'avatar',
          label: t('用户名'),
          minWidth: 200,
          useSlot: true
        },
        { prop: 'phone', label: t('手机号'), width: 120 },
        {
          prop: 'dashboard',
          label: t('首页'),
          width: 110,
          dawnType: 'dict',
          dawnDict: 'dashboard'
        },
        {
          prop: 'dept_id',
          label: t('部门'),
          minWidth: 150,
          formatter: (row: any) =>
            row.dept_id ? departmentNames.value.get(row.dept_id) || '—' : t('未分配')
        },
        {
          prop: 'status',
          label: t('状态'),
          width: 80,
          dawnType: 'dict',
          dawnDict: 'data_status'
        },
        {
          prop: 'login_time',
          label: t('上次登录'),
          width: 170,
          sortable: true,
          formatter: (row: any) => dateLabel(row.login_time)
        },
        {
          prop: 'operation',
          label: t('操作'),
          width: 140,
          fixed: 'right',
          useSlot: true
        }
      ]
    }
  })

  /**
   * 搜索
   * @param params
   */
  const handleSearch = (params: Record<string, any>) => {
    Object.assign(searchParams, params, { page: 1 })
    getData()
  }

  /**
   * 重置
   */
  const handleReset = () => {
    searchForm.value.dept_id = undefined
    resetSearchParams()
  }

  /**
   * 切换部门
   * @param data
   */
  const handleNodeClick = (data: any) => {
    searchParams.dept_id = data.id || undefined
    getData()
  }

  /**
   * 获取部门数据
   */
  const getDeptList = () => {
    deptApi.accessDept().then((data: any) => {
      treeData.value = data
    })
  }

  /**
   * 修改密码
   * @param row
   */
  const handlePassword = (row: any) => {
    ElMessageBox.prompt(t('请输入新密码'), t('提示'), {
      confirmButtonText: t('确定'),
      cancelButtonText: t('取消'),
      inputPattern: /^.{6,72}$/,
      inputErrorMessage: t('密码长度在6到72之间'),
      type: 'warning'
    }).then(({ value }) => {
      api.changePassword({ id: row.id, password: value }).then(() => {
        ElMessage.success(t('密码重置成功'))
      })
    })
  }

  async function handleCache(row: Record<string, any>) {
    await api.clearCache(row.id)
    ElMessage.success(t('用户资料、权限和菜单缓存已清理'))
  }

  onMounted(() => {
    getDeptList()
  })
</script>
