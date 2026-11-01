<template>
  <el-drawer
    v-model="visible"
    :title="t('回收站- {v0}', { v0: props.data?.name })"
    size="70%"
    destroy-on-close
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="art-full-height">
      <!-- 表格头部 -->
      <div>
        <ElSpace wrap>
          <ElButton
            v-permission="'dawn.database.update'"
            :disabled="selectedRows.length === 0"
            @click="handleRestoreRows()"
            v-ripple
          >
            <template #icon>
              <ArtSvgIcon icon="ri:restart-line" />
            </template>
            {{ t('恢复') }}
          </ElButton>
        </ElSpace>
      </div>
      <!-- 表格 -->
      <ArtTable
        ref="tableRef"
        rowKey="id"
        :loading="loading"
        :data="tableData"
        :columns="columns"
        :pagination="pagination"
        @sort-change="handleSortChange"
        @selection-change="handleSelectionChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <!-- 数据详情插槽 -->
        <template #json_data="{ row }">
          {{ JSON.stringify(row) }}
        </template>
      </ArtTable>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
  import { $t as t } from '@/locales'
  import { dateLabel } from '@/dawn/types'
  import api from '@/api/safeguard/database'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { useAdmin } from '@/composables/useAdmin'

  interface Props {
    modelValue: boolean
    data?: Record<string, any>
  }

  interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'success'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: false,
    data: undefined
  })

  const emit = defineEmits<Emits>()

  /**
   * 弹窗显示状态双向绑定
   */
  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  /**
   * 监听弹窗打开，初始化表单数据
   */
  watch(
    () => props.modelValue,
    (newVal) => {
      if (newVal) {
        initPage()
      }
    }
  )

  /**
   * 初始化页面数据
   */
  const initPage = async () => {
    // 如果有数据，则填充数据
    if (props.data) {
      await nextTick()
      refreshData()
    }
  }

  const refreshData = () => {
    searchForm.value.table = props.data?.name
    Object.assign(searchParams, searchForm.value)
    getData()
  }

  const searchForm = ref({
    table: ''
  })

  const {
    loading,
    data: tableData,
    columns,
    getData,
    pagination,
    searchParams,
    handleSortChange,
    handleSizeChange,
    handleCurrentChange
  } = useTable({
    core: {
      apiFn: api.getRecycle,
      immediate: false,
      apiParams: {
        ...searchForm.value
      },
      columnsFactory: () => [
        { type: 'selection' },
        {
          prop: 'deleted_at',
          label: t('删除时间'),
          width: 180,
          formatter: (row: any) => dateLabel(row.deleted_at)
        },
        {
          prop: 'json_data',
          label: t('数据详情'),
          useSlot: true,
          showOverflowTooltip: true
        }
      ]
    }
  })

  // 编辑配置
  const { handleSelectionChange, selectedRows } = useAdmin()

  /**
   * 关闭弹窗并重置表单
   */
  const handleClose = () => {
    visible.value = false
  }

  /**
   * 恢复选中数据
   */
  const handleRestoreRows = (): void => {
    if (selectedRows.value.length === 0) {
      ElMessage.warning(t('请选择要恢复的行'))
      return
    }
    ElMessageBox.confirm(
      t('确定要恢复选中的{v0}条数据吗', { v0: selectedRows.value.length }),
      t('恢复选中数据'),
      {
        confirmButtonText: t('确定'),
        cancelButtonText: t('取消'),
        type: 'error'
      }
    ).then(() => {
      api
        .recovery({ table: searchForm.value.table, ids: selectedRows.value.map((row) => row.id) })
        .then(() => {
          ElMessage.success(t('操作成功'))
          refreshData()
          selectedRows.value = []
        })
    })
  }
</script>
