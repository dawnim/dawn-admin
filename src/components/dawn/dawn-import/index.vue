<template>
  <div class="dawn-import-wrap">
    <div class="trigger" @click="open">
      <slot>
        <ElButton :icon="Upload">
          {{ title }}
        </ElButton>
      </slot>
    </div>

    <el-dialog
      v-model="visible"
      :title="preview ? t('导入预览') : title"
      :width="preview ? 'min(960px,96vw)' : width"
      align-center
      :show-close="!loading"
      :close-on-press-escape="!loading"
      append-to-body
      destroy-on-close
      class="dawn-import-dialog"
      :close-on-click-modal="false"
    >
      <div v-if="preview" v-loading="loading" class="import-preview">
        <ElText type="info" size="small" class="import-tip">
          {{
            t('按唯一字段覆盖CSV对应列，保留创建时间并自动更新修改时间；文件内重复以最后一行为准')
          }}
        </ElText>
        <div class="import-file">
          {{ selectedFile?.name }} · {{ t('共{count}条数据', { count: preview.rows.length }) }}
        </div>
        <ElTable :data="preview.rows" border max-height="min(420px,50vh)">
          <ElTableColumn type="index" label="#" width="60" align="center" />
          <ElTableColumn
            v-for="(column, index) in preview.columns"
            :key="column.key"
            :label="column.label"
            min-width="120"
            show-overflow-tooltip
          >
            <template #default="{ row }">{{ row[index] }}</template>
          </ElTableColumn>
        </ElTable>
      </div>
      <div v-else v-loading="loading" class="import-container">
        <el-upload
          ref="uploadRef"
          class="upload-area"
          drag
          action="#"
          :accept="accept"
          :limit="1"
          :disabled="loading"
          :auto-upload="true"
          :on-exceed="handleExceed"
          :on-remove="handleRemove"
          v-model:file-list="fileList"
          :http-request="customUpload"
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">
            {{ t('将文件拖到此处，或') }} <em>{{ t('点击上传') }}</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              {{ tip || t('请上传{v0}格式文件', { v0: accept.replace(/,/g, '/') }) }}
            </div>
          </template>
        </el-upload>

        <div class="template-download" v-if="showTemplate">
          <el-link type="primary" :underline="false" @click="downloadTemplate">
            <el-icon class="el-icon--left"><Download /></el-icon>
            {{ t('下载导入模板') }}
          </el-link>
        </div>
      </div>
      <template v-if="preview" #footer>
        <ElButton :disabled="loading" @click="open">{{ t('重新选择') }}</ElButton>
        <ElButton :disabled="loading" @click="visible = false">{{ t('取消') }}</ElButton>
        <ElButton type="primary" :loading="loading" @click="confirmImport">
          {{ t('确认导入') }}
        </ElButton>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
  import { $t as t } from '@/locales'
  import request from '@/utils/http'
  import type { ImportResult } from '@/dawn/types'
  import { ref, computed } from 'vue'
  import { UploadFilled, Upload, Download } from '@element-plus/icons-vue'
  import { ElMessage, genFileId } from 'element-plus'
  import type {
    UploadInstance,
    UploadProps,
    UploadRawFile,
    UploadUserFile,
    UploadRequestOptions
  } from 'element-plus'

  defineOptions({ name: 'DawnImport' })

  const props = withDefaults(
    defineProps<{
      title?: string
      width?: string | number
      uploadUrl?: string
      downloadUrl?: string
      accept?: string
      tip?: string
      data?: Record<string, any>
    }>(),
    {
      title: t('导入'),
      width: '600px',
      accept: '.csv'
    }
  )

  const emit = defineEmits<{
    success: [response: ImportResult]
    error: [error: any]
    'download-template': []
  }>()

  const visible = ref(false)
  const loading = ref(false)
  const uploadRef = ref<UploadInstance>()
  const fileList = ref<UploadUserFile[]>([])
  const selectedFile = ref<UploadRawFile>()
  const preview = ref<{
    columns: { key: string; label: string }[]
    rows: string[][]
  }>()

  const showTemplate = computed(() => {
    return props.downloadUrl
  })

  const open = () => {
    visible.value = true
    fileList.value = []
    selectedFile.value = undefined
    preview.value = undefined
  }

  const handleExceed: UploadProps['onExceed'] = (files) => {
    uploadRef.value!.clearFiles()
    const file = files[0] as UploadRawFile
    file.uid = genFileId()
    uploadRef.value!.handleStart(file)
    uploadRef.value!.submit()
  }

  const handleRemove = () => {
    fileList.value = []
  }

  const customUpload = async (options: UploadRequestOptions) => {
    if (!props.uploadUrl) {
      ElMessage.error(t('未配置上传接口'))
      options.onError(t('未配置上传接口') as any)
      return
    }

    try {
      loading.value = true
      const data = new FormData()
      data.append('file', options.file)
      const result = await request.post<NonNullable<typeof preview.value>>({
        url: props.uploadUrl!,
        params: { preview: true },
        data
      })
      selectedFile.value = options.file
      preview.value = result
      return result
    } catch (error: any) {
      emit('error', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const confirmImport = async () => {
    try {
      loading.value = true
      const data = new FormData()
      data.append('file', selectedFile.value!)
      const result = await request.post<ImportResult>({
        url: props.uploadUrl!,
        data
      })
      ElMessage.success(t('导入完成，新增{count}条，更新{updated}条', { ...result }))
      emit('success', result)
      visible.value = false
    } catch (error) {
      emit('error', error)
    } finally {
      loading.value = false
    }
  }

  const downloadTemplate = async () => {
    if (props.downloadUrl) {
      try {
        const blob = await request.get<Blob>({ url: props.downloadUrl!, responseType: 'blob' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'import-template.csv'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (error) {
        emit('error', error)
      }
    } else {
      emit('download-template')
    }
  }

  defineExpose({
    open
  })
</script>

<style scoped lang="scss">
  .dawn-import-wrap {
    display: inline-block;
  }

  .import-preview {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .import-file {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .import-tip {
    align-self: flex-start;
  }

  .import-container {
    padding: 10px 0;
    position: relative;

    .upload-area {
      :deep(.el-upload-dragger) {
        width: 100%;
      }
    }

    .template-download {
      margin-top: 10px;
      text-align: right;
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }
  }
</style>
