<template>
  <label class="inline-flex items-center gap-3">
    <ElButton :loading="busy" @click="input?.click()">{{ t('选择文件') }}</ElButton>
    <span v-if="busy">{{ progress }}%</span>
    <input ref="input" type="file" hidden @change="selected" />
  </label>
</template>
<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { upload } from '@/api/upload'
  const { t } = useI18n()
  const props = withDefaults(defineProps<{ categoryId?: number }>(), { categoryId: 0 })
  const emit = defineEmits<{ success: [file: { id: number; url: string }] }>()
  const input = ref<HTMLInputElement>(),
    busy = ref(false),
    progress = ref(0)
  async function selected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    busy.value = true
    try {
      emit('success', await upload(file, props.categoryId, (value) => (progress.value = value)))
      ElMessage.success(t('上传成功'))
    } finally {
      busy.value = false
      if (input.value) input.value.value = ''
    }
  }
</script>
