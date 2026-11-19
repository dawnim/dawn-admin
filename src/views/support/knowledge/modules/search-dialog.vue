<template>
  <ElDialog
    v-model="visible"
    :title="t('检索测试')"
    width="min(960px,96vw)"
    align-center
    :close-on-click-modal="false"
    destroy-on-close
  >
    <ElForm label-width="100px" @submit.prevent="search">
      <ElRow :gutter="16">
        <ElCol :xs="24" :md="10">
          <ElFormItem :label="t('客服应用')">
            <ElSelect v-model="appID" @change="reset"
              ><ElOption v-for="app in apps" :key="app.id" :value="app.id" :label="app.name"
            /></ElSelect>
          </ElFormItem>
        </ElCol>
        <ElCol :xs="24" :md="14">
          <ElFormItem :label="t('客户问题')">
            <ElInput v-model="query" :placeholder="t('输入客户问题')">
              <template #append
                ><ElButton
                  :loading="loading"
                  :disabled="!appID || !query.trim()"
                  native-type="submit"
                  >{{ t('搜索') }}</ElButton
                ></template
              >
            </ElInput>
          </ElFormItem>
        </ElCol>
      </ElRow>
    </ElForm>
    <div v-loading="loading" class="search-results">
      <ElAlert v-if="error" :title="error" type="error" :closable="false" show-icon />
      <ElEmpty
        v-else-if="!entries.length && !loading"
        :description="searched ? t('暂无检索结果') : t('输入客户问题以测试知识检索')"
        :image-size="64"
      />
      <ElCard v-for="item in entries" :key="item.id" class="mb-3" shadow="never">
        <div class="result-title"
          ><b>{{ item.question }}</b
          ><ElTag size="small" effect="light">{{
            t('匹配分：{v0}', { v0: item.score.toFixed(3) })
          }}</ElTag></div
        >
        <ChatText :text="item.answer" />
        <div v-if="item.conditions" class="result-meta">{{
          t('适用条件：{v0}', { v0: item.conditions })
        }}</div>
        <div v-if="item.location" class="result-meta">{{
          t('来源位置：{v0}', { v0: item.location })
        }}</div>
      </ElCard>
    </div>
    <template #footer
      ><ElButton @click="visible = false">{{ t('关闭') }}</ElButton></template
    >
  </ElDialog>
</template>
<script setup lang="ts">
  import { $t as t } from '@/locales'
  import { supportApi, type KnowledgeEntry, type SupportApp } from '@/api/support'
  import ChatText from '@/components/core/layouts/art-chat-window/ChatText.vue'
  const visible = defineModel<boolean>({ required: true })
  const props = defineProps<{ apps: Pick<SupportApp, 'id' | 'name'>[]; appId?: number }>()
  const appID = ref<number>(),
    query = ref(''),
    loading = ref(false),
    searched = ref(false),
    error = ref('')
  const entries = ref<(KnowledgeEntry & { score: number })[]>([])
  let request: AbortController | undefined
  function reset() {
    request?.abort()
    entries.value = []
    error.value = ''
    searched.value = false
    loading.value = false
  }
  watch(visible, (open) => {
    reset()
    if (open) appID.value = props.appId || props.apps[0]?.id
  })
  onBeforeUnmount(() => request?.abort())
  async function search() {
    if (!appID.value || !query.value.trim()) return
    reset()
    const controller = (request = new AbortController())
    loading.value = true
    try {
      const result = await supportApi.search(appID.value, query.value, controller.signal)
      if (!controller.signal.aborted) {
        entries.value = result
        searched.value = true
      }
    } catch (err) {
      if (!controller.signal.aborted)
        error.value = err instanceof Error ? err.message : t('检索失败，请重试')
    } finally {
      if (!controller.signal.aborted) loading.value = false
    }
  }
</script>
<style scoped>
  .search-results {
    height: min(480px, 50vh);
    overflow-y: auto;
    scrollbar-width: none;
  }
  .search-results::-webkit-scrollbar {
    display: none;
  }
  .result-title {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 12px;
    margin-bottom: 12px;
  }
  .result-title b {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .result-title .el-tag {
    flex-shrink: 0;
  }
  .result-meta {
    margin-top: 10px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    overflow-wrap: anywhere;
  }
</style>
