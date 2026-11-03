<template>
  <ElDialog v-model="visible" :title="t('设置首页')" width="600px" align-center>
    <ElForm label-width="120px">
      <ElFormItem :label="t('工作台')">
        <DawnSelect v-model="dashboard" dict="dashboard" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="visible = false">{{ t('取消') }}</ElButton>
      <ElButton type="primary" :loading="saving" @click="submit">{{ t('提交') }}</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { $t as t } from '@/locales'
  import { ElMessage } from 'element-plus'
  import api from '@/api/system/user'

  const visible = defineModel<boolean>()
  const props = defineProps<{ data?: Record<string, any> }>()
  const emit = defineEmits<{ success: [] }>()
  const dashboard = ref('statistics')
  const saving = ref(false)
  watch(visible, (open) => {
    if (open) dashboard.value = props.data!.dashboard
  })

  async function submit() {
    saving.value = true
    try {
      await api.setDashboard(props.data!.id, dashboard.value)
      ElMessage.success(t('操作成功'))
      visible.value = false
      emit('success')
    } finally {
      saving.value = false
    }
  }
</script>
