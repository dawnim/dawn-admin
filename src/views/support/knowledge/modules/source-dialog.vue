<template>
  <ElDialog
    v-model="visible"
    class="knowledge-source-dialog"
    :title="t('资料来源')"
    width="min(760px,95vw)"
    align-center
    :close-on-click-modal="false"
    :show-close="!saving"
    :close-on-press-escape="!saving"
    destroy-on-close
  >
    <ElForm
      ref="formRef"
      v-loading="loading"
      :model="form"
      :rules="rules"
      label-width="110px"
      :disabled="saving || busy || loading"
    >
      <ElFormItem :label="t('客服应用')" prop="app_id">
        <ElSelect v-model="form.app_id" :disabled="!!form.id"
          ><ElOption v-for="app in apps" :key="app.id" :value="app.id" :label="app.name"
        /></ElSelect>
      </ElFormItem>
      <ElFormItem :label="t('资料名称')" prop="name"
        ><ElInput v-model="form.name" maxlength="200"
      /></ElFormItem>
      <ElFormItem :label="t('来源类型')">
        <ElRadioGroup v-model="form.kind"
          ><ElRadioButton value="text">{{ t('文本') }}</ElRadioButton
          ><ElRadioButton value="markdown">Markdown</ElRadioButton
          ><ElRadioButton value="url">URL</ElRadioButton></ElRadioGroup
        >
      </ElFormItem>
      <ElFormItem :label="form.kind === 'url' ? t('公开网页地址') : t('资料内容')" prop="content">
        <ElInput
          v-model="form.content"
          :type="form.kind === 'url' ? 'text' : 'textarea'"
          :rows="12"
        />
      </ElFormItem>
      <ElFormItem
        ><span class="form-tip">{{ t('处理后生成待审核知识条目，不会直接发布') }}</span></ElFormItem
      >
    </ElForm>
    <ElAlert v-if="busy" :title="t('资料正在处理，完成后可编辑')" type="info" :closable="false" />
    <ElAlert v-if="form.error" :title="form.error" type="error" :closable="false" show-icon />
    <template #footer>
      <ElButton :disabled="saving" @click="visible = false">{{ t('取消') }}</ElButton>
      <ElButton :loading="saving" :disabled="loading || busy" @click="save(false)">{{
        t('保存')
      }}</ElButton>
      <ElButton
        v-permission="'dawn.knowledge.update'"
        type="primary"
        :loading="saving"
        :disabled="loading || busy"
        @click="save(true)"
        >{{ t('保存并处理') }}</ElButton
      >
    </template>
  </ElDialog>
</template>
<script setup lang="ts">
  import { $t as t } from '@/locales'
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import {
    knowledgeSourceApi,
    supportApi,
    type KnowledgeSource,
    type SupportApp
  } from '@/api/support'
  const visible = defineModel<boolean>({ required: true })
  const props = defineProps<{
    apps: Pick<SupportApp, 'id' | 'name'>[]
    appId?: number
    data?: { id?: number }
  }>()
  const emit = defineEmits<{ success: [] }>()
  const form = ref<Partial<KnowledgeSource>>({})
  const loading = ref(false),
    saving = ref(false)
  const busy = computed(() => ['queued', 'processing'].includes(form.value.status || ''))
  const formRef = ref<FormInstance>()
  const rules: FormRules = {
    app_id: [{ required: true, message: t('请选择客服应用'), trigger: 'change' }],
    name: [{ required: true, whitespace: true, message: t('请输入资料名称'), trigger: 'blur' }],
    content: [{ required: true, whitespace: true, message: t('请输入资料内容'), trigger: 'blur' }]
  }
  watch(visible, async (open, _, onCleanup) => {
    if (!open) return
    let active = true
    onCleanup(() => {
      active = false
    })
    form.value = { app_id: props.appId || props.apps[0]?.id, name: '', kind: 'text', content: '' }
    loading.value = true
    try {
      if (props.data?.id) {
        const detail = await knowledgeSourceApi.get(props.data.id)
        if (active) form.value = detail
      }
    } catch {
      if (active) visible.value = false
    } finally {
      if (active) loading.value = false
    }
  })
  async function save(process: boolean) {
    if (!(await formRef.value?.validate().catch(() => false))) return
    saving.value = true
    try {
      const { name, kind, content } = form.value
      form.value = form.value.id
        ? await knowledgeSourceApi.update(form.value.id, { name, kind, content })
        : await knowledgeSourceApi.create({ app_id: form.value.app_id, name, kind, content })
      emit('success')
      if (process) {
        await supportApi.import(form.value.id!)
        emit('success')
      }
      visible.value = false
      ElMessage.success(process ? t('资料处理已加入队列') : t('保存成功'))
    } catch {
      // 统一请求层显示错误，保留已保存来源供重试
    } finally {
      saving.value = false
    }
  }
</script>
<style scoped>
  :global(.knowledge-source-dialog .el-dialog__body) {
    max-height: 65vh;
    overflow-y: auto;
    scrollbar-width: none;
  }
  :global(.knowledge-source-dialog .el-dialog__body::-webkit-scrollbar) {
    display: none;
  }
  .form-tip {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 1.6;
  }
</style>
