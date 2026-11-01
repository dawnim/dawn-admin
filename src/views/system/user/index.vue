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
            <!-- 操作列 -->
            <template #operation="{ row }">
              <div class="flex gap-2" v-if="!row.is_super && userStore.info.id !== row.id">
                <DawnButton
                  v-permission="'dawn.users.update'"
                  type="secondary"
                  @click="showDialog('edit', row)"
                />
                <DawnButton
                  v-permission="'dawn.users.delete'"
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
                      <ElDropdownItem>
                        <div
                          class="flex-c gap-2"
                          v-permission="'dawn.users.update'"
                          @click="handlePassword(row)"
                        >
                          <ArtSvgIcon icon="ri:key-line" />
                          <span>{{ t('修改密码') }}</span>
                        </div>
                      </ElDropdownItem>
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
              </div>
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
      <ArtTable :data="sessions" :columns="sessionColumns"
        ><template #operation="{ row }"
          ><DawnButton
            v-permission="'dawn.users.update'"
            type="error"
            @click="revokeSession(row.id)" /></template
      ></ArtTable>
    </ElDialog>
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
  import { dateLabel } from '@/dawn/types'
  import { useTable } from '@/hooks/core/useTable'
  import { useAdmin } from '@/composables/useAdmin'
  import { useUserStore } from '@/store/modules/user'
  import { ElMessageBox } from 'element-plus'
  import TableSearch from './modules/table-search.vue'
  import EditDialog from './modules/edit-dialog.vue'
  import api from '@/api/system/user'
  import deptApi from '@/api/system/dept'

  const userStore = useUserStore()
  const sessionsVisible = ref(false),
    sessions = ref<Api.Common.ApiData[]>([])
  const sessionColumns = computed(() => [
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
  ])
  async function openSessions() {
    sessions.value = await api.sessions()
    sessionsVisible.value = true
  }
  async function revokeSession(id: string) {
    await ElMessageBox.confirm(t('撤销会话'), t('确认'))
    await api.revoke(id)
    await openSessions()
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
        { type: 'index', width: 60, label: t('序号') },
        {
          prop: 'avatar',
          label: t('用户名'),
          minWidth: 200,
          dawnType: 'imageAndText',
          dawnFirst: 'username',
          dawnSecond: 'email'
        },
        { prop: 'phone', label: t('手机号'), width: 120 },
        {
          prop: 'dept_id',
          label: t('部门'),
          minWidth: 150,
          formatter: (row: any) => departmentNames.value.get(row.dept_id) || '—'
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
        ElMessage.success(t('修改密码成功'))
      })
    })
  }

  onMounted(() => {
    getDeptList()
  })
</script>
