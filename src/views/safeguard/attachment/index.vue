<template>
  <div class="art-full-height">
    <div class="box-border flex gap-4 h-full max-md:block max-md:gap-0 max-md:h-auto">
      <div class="flex-shrink-0 w-64 h-full max-md:w-full max-md:h-auto max-md:mb-5">
        <ElCard class="tree-card art-card-xs flex flex-col h-full mt-0" shadow="never">
          <template #header>
            <div class="flex justify-between items-center">
              <b>{{ t('附件分类') }}</b>
              <DawnButton
                v-permission="'dawn.attachments.update'"
                type="primary"
                @click="categoryShowDialog('add')"
              />
            </div>
          </template>
          <ElScrollbar>
            <ElTree
              :data="treeData"
              :props="{ children: 'children', label: 'label' }"
              node-key="id"
              default-expand-all
              highlight-current
              :expand-on-click-node="false"
              @node-click="handleNodeClick"
            >
              <template #default="{ node, data }">
                <div class="flex items-center justify-between w-full" v-if="data.id > 0">
                  <span>{{ node.label }}</span>
                  <div class="tree-node-actions">
                    <DawnButton
                      v-permission="'dawn.attachments.update'"
                      type="secondary"
                      @click="categoryShowDialog('edit', data)"
                    />
                    <DawnButton
                      v-permission="'dawn.attachments.delete'"
                      type="error"
                      @click="categoryDeleteRow(data, categoryApi.delete, getCategoryList)"
                    />
                  </div>
                </div>
              </template>
            </ElTree>
          </ElScrollbar>
        </ElCard>
      </div>

      <div class="flex flex-col flex-grow min-w-0">
        <ElCard class="art-table-card !mt-0" shadow="never">
          <!-- 表格头部 -->
          <div class="flex justify-between items-center mb-4">
            <ElSpace wrap>
              <ElUpload
                v-permission="'dawn.attachments.create'"
                class="upload-btn"
                :show-file-list="false"
                :http-request="handleUpload"
              >
                <ElButton :icon="UploadFilled">{{ t('上传附件') }}</ElButton>
              </ElUpload>
              <ElButton
                v-permission="'dawn.attachments.delete'"
                :disabled="selectedRows.length === 0"
                @click="deleteSelectedRows(api.delete, refreshData)"
                v-ripple
              >
                <template #icon>
                  <ArtSvgIcon icon="ri:delete-bin-5-line" />
                </template>
                {{ t('删除') }}
              </ElButton>
              <ElButton
                v-permission="'dawn.attachments.update'"
                :disabled="selectedRows.length === 0"
                @click="moveDialogVisible = true"
                v-ripple
              >
                <template #icon>
                  <ArtSvgIcon icon="ri:swap-box-line" />
                </template>
                {{ t('移动') }}
              </ElButton>
            </ElSpace>
            <ElSpace wrap>
              <ElInput
                v-model="searchForm.origin_name"
                :placeholder="t('请输入文件名称')"
                :suffix-icon="Search"
                @keyup.enter="handleSearch"
                @clear="handleSearch"
                clearable
                style="width: 240px"
              />
            </ElSpace>
          </div>

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
              <div class="flex gap-2">
                <DawnButton
                  v-permission="'dawn.attachments.update'"
                  type="secondary"
                  @click="showDialog('edit', row)"
                />
                <DawnButton
                  v-permission="'dawn.attachments.delete'"
                  type="error"
                  @click="deleteRow(row, api.delete, refreshData)"
                />
              </div>
            </template>
          </ArtTable>
        </ElCard>
      </div>
    </div>

    <!-- 分类弹窗 -->
    <CategoryDialog
      v-model="categoryDialogVisible"
      :dialog-type="categoryDialogType"
      :data="categoryDialogData"
      @success="getCategoryList"
    />

    <!-- 移动弹窗 -->
    <MoveDialog v-model="moveDialogVisible" :selected-rows="selectedRows" @success="refreshData" />

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
  import api from '@/api/safeguard/attachment'
  import categoryApi from '@/api/safeguard/category'
  import { uploadImage } from '@/api/auth'
  import { useTable } from '@/hooks/core/useTable'
  import { useAdmin } from '@/composables/useAdmin'
  import { Search, UploadFilled } from '@element-plus/icons-vue'
  import type { UploadRequestOptions } from 'element-plus'
  import EditDialog from './modules/edit-dialog.vue'
  import CategoryDialog from './modules/category-dialog.vue'
  import MoveDialog from './modules/move-dialog.vue'

  /** 附件分类数据 */
  const treeData = ref([])

  /** 获取附件分类数据 */
  const getCategoryList = () => {
    categoryApi.list().then((data: any) => {
      treeData.value = data
    })
  }

  /**
   * 切换附件分类
   * @param data
   */
  const handleNodeClick = (data: any) => {
    if (data.id === 0) {
      searchParams.category_id = undefined
    } else {
      searchParams.category_id = data.id
    }
    getData()
  }

  /** 附件分类弹窗相关 */
  const {
    dialogType: categoryDialogType,
    dialogVisible: categoryDialogVisible,
    dialogData: categoryDialogData,
    showDialog: categoryShowDialog,
    deleteRow: categoryDeleteRow
  } = useAdmin()

  /** 移动弹窗相关 */
  const moveDialogVisible = ref(false)

  /** 附件弹窗相关 */
  const {
    dialogType,
    dialogVisible,
    dialogData,
    showDialog,
    selectedRows,
    handleSelectionChange,
    deleteRow,
    deleteSelectedRows
  } = useAdmin()

  /** 附件搜索表单 */
  const searchForm = ref({
    origin_name: undefined,
    storage_mode: undefined,
    category_id: undefined,
    orderField: 'created_at',
    orderType: 'desc'
  })

  /** 附件表格相关 */
  const {
    columns,
    data,
    loading,
    pagination,
    getData,
    searchParams,
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
        { prop: 'url', label: t('预览'), dawnType: 'image', width: 80 },
        {
          prop: 'origin_name',
          label: t('文件名称'),
          minWidth: 160,
          showOverflowTooltip: true
        },
        {
          prop: 'mime_type',
          label: t('文件类型'),
          width: 160,
          showOverflowTooltip: true
        },
        { prop: 'size_info', label: t('文件大小'), width: 100 },
        {
          prop: 'created_at',
          label: t('上传时间'),
          width: 180,
          sortable: true,
          formatter: (row: any) => dateLabel(row.created_at)
        },
        { prop: 'operation', label: t('操作'), width: 100, fixed: 'right', useSlot: true }
      ]
    }
  })

  /** 附件搜索 */
  const handleSearch = () => {
    Object.assign(searchParams, searchForm.value)
    getData()
  }

  /** 附件处理上传 */
  const handleUpload = async (options: UploadRequestOptions) => {
    const { file } = options
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category_id', String(searchParams.category_id || 0))
      await uploadImage(formData)
      ElMessage.success(t('上传成功'))
      refreshData()
    } catch (error: any) {
      console.error(t('上传失败'), error)
      ElMessage.error(error.message || t('上传失败'))
    }
  }

  /** 初始化附件分类数据 */
  onMounted(() => {
    getCategoryList()
  })
</script>

<style lang="scss" scoped>
  .tree-node-actions {
    opacity: 0;
    transition: opacity 0.2s;
    display: flex;
    gap: 4px;
  }

  .el-tree-node__content:hover .tree-node-actions {
    opacity: 1;
  }

  :deep(.el-tree-node__content) {
    height: 32px;
  }
</style>
