<template>
  <div class="dawn-import-wrap" @click="open">
    <div class="trigger">
      <slot>
        <ElButton :icon="Upload">
          {{ title }}
        </ElButton>
      </slot>
    </div>

    <el-dialog
      v-model="visible"
      :title="title"
      :width="width"
      append-to-body
      destroy-on-close
      class="dawn-import-dialog"
      :close-on-click-modal="false"
    >
      <div class="import-container">
        <el-upload
          ref="uploadRef"
          class="upload-area"
          drag
          action="#"
          :accept="accept"
          :limit="1"
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
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
  import { $t as t } from '@/locales'
  import request from '@/utils/http'
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
      accept: '.xlsx,.xls'
    }
  )

  const emit = defineEmits<{
    success: [response: any]
    error: [error: any]
    'download-template': []
  }>()

  const visible = ref(false)
  const loading = ref(false)
  const uploadRef = ref<UploadInstance>()
  const fileList = ref<UploadUserFile[]>([])

  const showTemplate = computed(() => {
    return props.downloadUrl
  })

  const open = () => {
    visible.value = true
    fileList.value = []
  }

  const handleExceed: UploadProps['onExceed'] = (files) => {
    uploadRef.value!.clearFiles()
    const file = files[0] as UploadRawFile
    file.uid = genFileId()
    uploadRef.value!.handleStart(file)
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
      const response = await request.post({
        url: props.uploadUrl!,
        data: await options.file.text(),
        headers: { 'Content-Type': 'text/csv' }
      })
      ElMessage.success(t('导入成功'))
      emit('success', response)
      visible.value = false
    } catch (error: any) {
      console.error(error)
      ElMessage.error(error?.response?.data?.msg || t('导入失败'))
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
        console.error(error)
        ElMessage.error(t('下载模板失败'))
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
