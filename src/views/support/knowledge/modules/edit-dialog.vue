<template>
  <ElDialog
    v-model="visible"
    class="knowledge-dialog"
    :title="editing ? t('编辑知识') : t('新增知识')"
    width="min(1100px,96vw)"
    align-center
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    destroy-on-close
  >
    <ElForm
      ref="formRef"
      v-loading="loading"
      :model="entry"
      :rules="rules"
      label-width="110px"
      :disabled="saving || loading || generating"
    >
      <ElFormItem :label="t('客服应用')" prop="app_id">
        <ElSelect v-model="entry.app_id" :disabled="editing || generating" @change="changeApp">
          <ElOption v-for="app in apps" :key="app.id" :value="app.id" :label="app.name" />
        </ElSelect>
      </ElFormItem>
      <ElRow :gutter="16" class="knowledge-workspace">
        <ElCol :xs="24" :lg="12">
          <ElFormItem :label="t('来源类型')">
            <ElRadioGroup v-model="rawKind" :disabled="generating">
              <ElRadioButton value="text">{{ t('文本') }}</ElRadioButton>
              <ElRadioButton value="url">{{ t('网页地址') }}</ElRadioButton>
            </ElRadioGroup>
          </ElFormItem>
          <ElFormItem :label="rawKind === 'url' ? t('网页地址') : t('原始资料')">
            <div class="knowledge-panel">
              <div class="knowledge-panel-header">
                <ElButton
                  type="primary"
                  size="small"
                  :loading="generating"
                  :disabled="!entry.app_id || !rawContent.trim()"
                  @click="generateKnowledge"
                >
                  {{ t(editing ? 'AI重新整理' : 'AI整理知识') }}
                </ElButton>
                <ElTooltip :content="t('生成结果可编辑，确认保存后才会发布')" placement="top">
                  <span class="form-tip">{{ t('生成结果可编辑，确认保存后才会发布') }}</span>
                </ElTooltip>
              </div>
              <ElInput
                v-model="rawContent"
                class="knowledge-editor"
                type="textarea"
                :rows="10"
                :disabled="generating"
              />
            </div>
          </ElFormItem>
        </ElCol>
        <ElCol :xs="24" :lg="12">
          <ElFormItem :label="t('标题')" prop="question">
            <ElInput v-model="entry.question" maxlength="1000" />
          </ElFormItem>
          <ElFormItem :label="t('知识内容')" prop="answer">
            <div class="knowledge-panel">
              <div class="knowledge-panel-header">
                <div class="knowledge-toolbar">
                  <div v-if="!editing && entries.length > 1" class="editor-line">
                    <ElSelect v-model="selected" @change="formRef?.clearValidate()">
                      <ElOption
                        v-for="(item, index) in entries"
                        :key="index"
                        :value="index"
                        :label="item.question || t('未命名知识')"
                      />
                    </ElSelect>
                    <ElButton
                      :disabled="generating"
                      :aria-label="t('移除此条')"
                      @click="
                        () => {
                          entries.splice(selected, 1)
                          selected = Math.max(0, selected - 1)
                        }
                      "
                    >
                      <ArtSvgIcon icon="ri:delete-bin-5-line" />
                    </ElButton>
                  </div>
                  <ElRadioGroup v-model="preview" size="small">
                    <ElRadioButton :value="false">{{ t('编辑') }}</ElRadioButton>
                    <ElRadioButton :value="true">{{ t('预览') }}</ElRadioButton>
                  </ElRadioGroup>
                </div>
              </div>
              <div v-if="preview" class="markdown-preview knowledge-editor"
                ><ChatText :text="entry.answer || ''"
              /></div>
              <ElInput
                v-else
                v-model="entry.answer"
                class="knowledge-editor"
                type="textarea"
                :rows="10"
              />
            </div>
          </ElFormItem>
        </ElCol>
      </ElRow>
      <ElDivider content-position="left">{{ t('更多设置') }}</ElDivider>
      <ElRow :gutter="16">
        <ElCol :xs="24" :md="12">
          <ElFormItem :label="t('关键词与相似问法')">
            <ElInput v-model="entry.keywords" type="textarea" :rows="2" />
          </ElFormItem>
        </ElCol>
        <ElCol :xs="24" :md="12">
          <ElFormItem :label="t('适用条件')">
            <ElInput v-model="entry.conditions" type="textarea" :rows="2" />
          </ElFormItem>
        </ElCol>
        <ElCol :xs="24" :md="12">
          <ElFormItem :label="t('协助人员')">
            <ElSelect
              v-model="entry.experts"
              multiple
              filterable
              remote
              :remote-method="searchExperts"
              :loading="expertsLoading"
            >
              <ElOption
                v-for="agent in agents"
                :key="agent.id"
                :value="agent.id"
                :label="
                  [
                    agent.nickname || agent.username || agent.unique_id,
                    '@' + (agent.telegram_username || agent.unique_id)
                  ].join(' · ')
                "
              />
              <template #footer>
                <ElPagination
                  small
                  layout="prev, pager, next"
                  :current-page="expertPage"
                  :page-size="10"
                  :total="expertTotal"
                  @current-change="(page: number) => searchExperts(expertQuery, page)"
                />
              </template>
            </ElSelect>
          </ElFormItem>
        </ElCol>
        <ElCol :xs="24" :md="12">
          <ElFormItem :label="t('来源位置')">
            <ElInput v-model="entry.location" maxlength="1000" />
          </ElFormItem>
        </ElCol>
        <ElCol :xs="24" :md="12">
          <ElFormItem :label="t('语言')">
            <ElInput v-model="entry.locale" maxlength="16" placeholder="zh / en" />
          </ElFormItem>
        </ElCol>
        <ElCol :xs="24" :md="12">
          <ElFormItem :label="t('回复方式')">
            <ElSelect v-model="entry.reply_mode">
              <ElOption value="reference" :label="t('参考知识回答')" />
              <ElOption value="fixed" :label="t('固定原文回复')" />
            </ElSelect>
          </ElFormItem>
        </ElCol>
        <ElCol :xs="24" :md="12">
          <ElFormItem :label="t('状态')">
            <ElSelect v-model="entry.status">
              <ElOption value="published" :label="t('已发布')" />
              <ElOption value="draft" :label="t('待审核')" />
              <ElOption value="disabled" :label="t('停用')" />
            </ElSelect>
          </ElFormItem>
        </ElCol>
      </ElRow>
    </ElForm>
    <template #footer>
      <ElButton :disabled="saving" @click="visible = false">{{ t('取消') }}</ElButton>
      <ElButton type="primary" :loading="saving" :disabled="loading || generating" @click="save">{{
        t('提交')
      }}</ElButton>
    </template>
  </ElDialog>
</template>
<script setup lang="ts">
  import { $t as t } from '@/locales'
  import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
  import {
    knowledgeApi,
    supportApi,
    type SupportApp,
    type KnowledgeEntry,
    type KnowledgeInput,
    type KnowledgeExpert
  } from '@/api/support'
  import ChatText from '@/components/core/layouts/art-chat-window/ChatText.vue'
  const visible = defineModel<boolean>({ required: true })
  const props = defineProps<{
    apps: Pick<SupportApp, 'id' | 'name'>[]
    appId?: number
    data?: { id?: number }
  }>()
  const emit = defineEmits<{ success: [] }>()
  const entries = ref<(KnowledgeInput & Partial<Pick<KnowledgeEntry, 'id' | 'version'>>)[]>([])
  const selected = ref(0)
  const entry = computed(() => entries.value[selected.value] || {})
  const editing = computed(() => !!props.data?.id)
  const rawKind = ref('text'),
    rawContent = ref(''),
    preview = ref(false)
  const loading = ref(false),
    saving = ref(false),
    generating = ref(false)
  const formRef = ref<FormInstance>()
  const rules: FormRules = {
    app_id: [{ required: true, message: t('请选择客服应用'), trigger: 'change' }],
    question: [{ required: true, whitespace: true, message: t('请输入知识标题'), trigger: 'blur' }],
    answer: [{ required: true, whitespace: true, message: t('请输入知识内容'), trigger: 'blur' }]
  }
  const agents = ref<KnowledgeExpert[]>([]),
    expertsLoading = ref(false)
  const expertQuery = ref(''),
    expertPage = ref(1),
    expertTotal = ref(0)
  let generation: AbortController | undefined, expertsRequest: AbortController | undefined
  watch(visible, async (open, _, onCleanup) => {
    generation?.abort()
    expertsRequest?.abort()
    if (!open) return
    let active = true
    onCleanup(() => {
      active = false
      generation?.abort()
      expertsRequest?.abort()
    })
    generating.value = false
    expertsLoading.value = false
    selected.value = 0
    rawKind.value = 'text'
    rawContent.value = ''
    preview.value = false
    entries.value = [
      {
        app_id: props.appId || props.apps[0]?.id || 0,
        source_id: 0,
        question: '',
        answer: '',
        keywords: '',
        conditions: '',
        locale: 'zh',
        reply_mode: 'reference',
        status: 'published',
        experts: [],
        location: ''
      }
    ]
    agents.value = []
    loading.value = true
    try {
      if (props.data?.id) {
        const detail = await knowledgeApi.get(props.data.id)
        if (!active) return
        entries.value = [{ ...detail, experts: detail.experts || [] }]
        if (detail.experts?.length) {
          const result = await supportApi.experts({
            ids: detail.experts.join(','),
            page_size: detail.experts.length
          })
          if (!active) return
          agents.value = result.data
        }
      }
      if (active) void searchExperts('')
    } catch {
      if (active) visible.value = false
    } finally {
      if (active) loading.value = false
    }
  })
  function changeApp() {
    entries.value = [{ ...entry.value, app_id: entry.value.app_id }]
    selected.value = 0
  }
  async function searchExperts(query: string, page = 1) {
    expertsRequest?.abort()
    const controller = (expertsRequest = new AbortController())
    expertsLoading.value = true
    expertQuery.value = query
    expertPage.value = page
    try {
      const result = await supportApi.experts(
        { query, page, page_size: 10 },
        { signal: controller.signal }
      )
      if (controller.signal.aborted) return
      const selectedIDs = entries.value.flatMap((item) => item.experts || [])
      agents.value = [
        ...new Map(
          [...agents.value.filter((agent) => selectedIDs.includes(agent.id)), ...result.data].map(
            (agent) => [agent.id, agent]
          )
        ).values()
      ]
      expertTotal.value = result.meta.total
    } catch {
      // 统一请求层显示错误，保留已选协助人员
    } finally {
      if (!controller.signal.aborted) expertsLoading.value = false
    }
  }
  async function generateKnowledge() {
    if (
      (editing.value || entries.value.some((item) => item.question || item.answer)) &&
      !(await ElMessageBox.confirm(t('重新生成会替换当前编辑内容，是否继续'), t('提示'))
        .then(() => true)
        .catch(() => false))
    )
      return
    const controller = (generation = new AbortController())
    const appID = entry.value.app_id!,
      original = { ...entry.value }
    generating.value = true
    try {
      const result = await supportApi.knowledgeDrafts(
        appID,
        { kind: rawKind.value, content: rawContent.value },
        controller.signal
      )
      if (controller.signal.aborted) return
      if (!result.length) {
        ElMessage.warning(t('未生成知识，请补充原始资料'))
        return
      }
      if (editing.value) {
        if (result.length > 1) ElMessage.info(t('多个主题已合并到当前条目，请确认后保存'))
        entries.value = [
          {
            ...original,
            ...result[0],
            answer:
              result.length > 1
                ? result.map((item) => `## ${item.question}\n\n${item.answer}`).join('\n\n')
                : (result[0].answer ?? ''),
            id: original.id,
            version: original.version,
            app_id: appID,
            source_id: original.source_id,
            experts: original.experts,
            status: original.status
          }
        ]
      } else {
        entries.value = result.map((item) => ({
          ...original,
          ...item,
          app_id: appID,
          status: 'published',
          experts: []
        }))
      }
      if (rawKind.value === 'url')
        entries.value.forEach((item) => {
          item.location = rawContent.value
        })
      selected.value = 0
      preview.value = false
      formRef.value?.clearValidate()
    } catch {
      // 统一请求层显示错误，保留原始资料和编辑内容
    } finally {
      if (!controller.signal.aborted) generating.value = false
    }
  }
  async function save() {
    const invalid = entries.value.findIndex(
      (item) => !item.app_id || !item.question?.trim() || !item.answer?.trim()
    )
    if (invalid >= 0) {
      selected.value = invalid
      preview.value = false
      await nextTick()
      await formRef.value?.validate().catch(() => false)
      return
    }
    if (!(await formRef.value?.validate().catch(() => false))) return
    saving.value = true
    try {
      if (editing.value) {
        const {
          question,
          answer,
          keywords,
          conditions,
          locale,
          reply_mode,
          status,
          experts,
          location,
          version
        } = entry.value
        await knowledgeApi.update(entry.value.id!, {
          question,
          answer,
          keywords,
          conditions,
          locale,
          reply_mode,
          status,
          experts,
          location,
          version
        })
      } else {
        await supportApi.knowledgeBatch(
          entries.value.map(
            ({
              app_id,
              source_id,
              question,
              answer,
              keywords,
              conditions,
              locale,
              reply_mode,
              status,
              experts,
              location
            }) => ({
              app_id,
              source_id,
              question,
              answer,
              keywords,
              conditions,
              locale,
              reply_mode,
              status,
              experts,
              location
            })
          )
        )
      }
      visible.value = false
      emit('success')
      ElMessage.success(t('保存成功'))
    } catch {
      // 整批保存失败时保留所有编辑内容
    } finally {
      saving.value = false
    }
  }
</script>
<style scoped>
  :global(.knowledge-dialog .el-dialog__body) {
    max-height: 78vh;
    overflow-y: auto;
    scrollbar-width: none;
  }
  :global(.knowledge-dialog .el-dialog__body::-webkit-scrollbar) {
    display: none;
  }
  .knowledge-workspace {
    align-items: start;
  }
  .knowledge-panel-header,
  .knowledge-toolbar,
  .editor-line {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .knowledge-panel-header {
    width: 100%;
    min-height: 32px;
    margin-bottom: 8px;
    justify-content: flex-start;
  }
  .knowledge-toolbar {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
  .editor-line {
    width: 190px;
  }
  .editor-line :deep(.el-select) {
    flex: 1;
    min-width: 0;
  }
  .knowledge-panel {
    width: 100%;
    min-width: 0;
  }
  :deep(.knowledge-editor .el-textarea__inner) {
    height: 266px;
  }
  .markdown-preview {
    height: 266px;
    padding: 12px;
    border: 1px solid var(--el-border-color);
    border-radius: var(--el-border-radius-base);
    overflow: auto;
    scrollbar-width: none;
  }
  .form-tip {
    min-width: 0;
    overflow: hidden;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 1.6;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  @media (max-width: 767px) {
    .knowledge-panel-header {
      flex-wrap: wrap;
    }
    :global(.knowledge-dialog .el-row) {
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
  }
</style>
