<template>
  <div class="dawn-export-wrap" @click="handleExport">
    <slot>
      <ElButton :icon="Download" :loading="loading">
        {{ label }}
      </ElButton>
    </slot>
  </div>
</template>

<script setup lang="ts">
  import { $t as t } from '@/locales'
  import { ref } from 'vue'
  import { Download } from '@element-plus/icons-vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import request from '@/utils/http'

  defineOptions({ name: 'DawnExport' })

  const props = withDefaults(
    defineProps<{
      url: string
      params?: Record<string, any>
      fileName?: string
      method?: string
      label?: string
    }>(),
    {
      method: 'get',
      label: t('导出'),
      fileName: 'export.csv'
    }
  )

  const emit = defineEmits<{
    success: []
    error: [error: any]
  }>()

  const loading = ref(false)

  const handleExport = async () => {
    if (loading.value) return
    if (!props.url) {
      ElMessage.error(t('未配置导出接口'))
      return
    }

    const params = Object.fromEntries(
      Object.entries(props.params || {}).filter(([key]) => !['page', 'page_size'].includes(key))
    )
    let finalFileName = props.fileName

    try {
      const { value } = await ElMessageBox.prompt(t('请输入导出文件名称'), t('提示'), {
        confirmButtonText: t('确定'),
        cancelButtonText: t('取消'),
        inputValue: props.fileName,
        inputValidator: (val) => !!val.trim() || t('文件名不能为空')
      })
      finalFileName = value
    } catch {
      // User cancelled
      return
    }

    try {
      loading.value = true
      const blob = await request.request<Blob>({
        url: props.url,
        method: props.method,
        data: props.method.toLowerCase() === 'post' ? params : undefined,
        params: props.method.toLowerCase() === 'get' ? params : undefined,
        headers: { Accept: 'text/csv' },
        responseType: 'blob'
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = finalFileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      ElMessage.success(t('导出成功'))
      emit('success')
    } catch (error: any) {
      emit('error', error)
    } finally {
      loading.value = false
    }
  }
</script>

<style scoped>
  .dawn-export-wrap {
    display: inline-block;
  }
</style>
