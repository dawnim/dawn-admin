<template>
  <div class="art-full-height">
    <DawnSearchBar v-model="search" :show-expand="false" @search="load" @reset="reset">
      <ElCol :span="8" :xs="24">
        <ElFormItem :label="t('表名称')">
          <ElInput v-model="search.name" clearable :placeholder="t('请输入表名称')" />
        </ElFormItem>
      </ElCol>
    </DawnSearchBar>
    <ElCard class="art-table-card" shadow="never">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="load">
        <template #left>
          <ElRadioGroup v-model="mode">
            <ElRadioButton value="simple">{{ t('引用模式') }}</ElRadioButton>
            <ElRadioButton value="full">{{ t('源码模式') }}</ElRadioButton>
          </ElRadioGroup>
        </template>
      </ArtTableHeader>
      <ArtTable :data="rows" :columns="columns" :loading="loading" row-key="name">
        <template #operation="{ row }">
          <div class="flex gap-2">
            <DawnButton
              type="primary"
              :tool-tip="t('下载')"
              icon="ri:download-line"
              @click="open(row.name, 'download')"
            />
            <DawnButton
              v-permission="'dawn.generator.create'"
              type="success"
              icon="ri:folder-add-line"
              :tool-tip="t('生成到项目')"
              @click="open(row.name, 'write')"
            />
          </div>
        </template>
      </ArtTable>
    </ElCard>
    <ElDialog
      v-model="visible"
      :title="t(action === 'download' ? '下载代码' : '生成到项目')"
      width="80%"
      align-center
      :close-on-click-modal="false"
    >
      <div v-loading="editing">
        <ElCheckbox v-model="migration" :disabled="editing || saving" @change="toggleMigration">
          {{ t('生成表迁移') }}
        </ElCheckbox>
        <ElTabs v-model="activeFile" @tab-click="centerFileTab">
          <ElTabPane v-for="(_, name) in files" :key="name" :label="name" :name="name" lazy>
            <Codemirror
              v-if="visible"
              v-model="files[name]"
              :aria-label="name"
              :extensions="[...extensions, fileLanguages[name] || []]"
              :disabled="editing || saving"
              :tab-size="2"
              :style="{ height: '55vh' }"
              class="code-editor"
            />
          </ElTabPane>
        </ElTabs>
      </div>
      <template #footer>
        <ElButton @click="visible = false">{{ t('取消') }}</ElButton>
        <ElButton type="primary" :loading="saving" :disabled="editing" @click="submit">
          {{ t(action === 'download' ? '下载' : '生成到项目') }}
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>
<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import request from '@/utils/http'
  import { useTableColumns } from '@/hooks/core/useTableColumns'
  import { useSettingStore } from '@/store/modules/setting'
  import { Codemirror } from 'vue-codemirror'
  import { LanguageDescription, type LanguageSupport } from '@codemirror/language'
  import { languages } from '@codemirror/language-data'
  import { oneDark } from '@codemirror/theme-one-dark'
  const { t } = useI18n()
  const { isDark } = storeToRefs(useSettingStore())
  const extensions = computed(() => (isDark.value ? [oneDark] : []))
  const fileLanguages = shallowReactive<Record<string, LanguageSupport>>({})
  const search = ref({ name: '' }),
    rows = ref<any[]>([]),
    loading = ref(false),
    visible = ref(false),
    editing = ref(false),
    saving = ref(false),
    files = ref<Record<string, string>>({}),
    mode = ref('simple'),
    migration = ref(false),
    table = ref(''),
    activeFile = ref(''),
    action = ref<'download' | 'write'>('download')
  watch(activeFile, async (name) => {
    const language = LanguageDescription.matchFilename(languages, name)
    if (language) fileLanguages[name] = await language.load()
  })
  const { columns, columnChecks } = useTableColumns<any>(() => [
    { prop: 'name', label: t('表名称') },
    { prop: 'operation', label: t('操作'), width: 100, useSlot: true }
  ])
  async function load() {
    loading.value = true
    try {
      const names = await request.get<string[]>({ url: '/development/tables' })
      rows.value = names
        .filter((name) => name.includes(search.value.name))
        .map((name) => ({ name }))
    } finally {
      loading.value = false
    }
  }
  function reset() {
    search.value.name = ''
    load()
  }
  function centerFileTab(_pane: unknown, event: Event) {
    const tab = (event.target as HTMLElement).closest<HTMLElement>('[role="tab"]')!
    const viewport = tab.closest<HTMLElement>('.el-tabs__nav-scroll')!
    const tabBox = tab.getBoundingClientRect(),
      box = viewport.getBoundingClientRect()
    // 复用标签栏的横向滚动处理，保留组件自身的边界和箭头状态。
    tab.parentElement!.dispatchEvent(
      new WheelEvent('wheel', {
        deltaX: tabBox.left + tabBox.width / 2 - box.left - box.width / 2,
        bubbles: true,
        cancelable: true
      })
    )
  }
  async function open(name: string, target: 'download' | 'write') {
    table.value = name
    action.value = target
    migration.value = false
    files.value = {}
    activeFile.value = ''
    visible.value = true
    editing.value = true
    try {
      files.value = await request.get({
        url: '/development/generate',
        params: { table: name, mode: mode.value }
      })
      activeFile.value = `app/admin/controllers/${name}.go`
    } catch {
      visible.value = false
    } finally {
      editing.value = false
    }
  }
  async function toggleMigration() {
    editing.value = true
    try {
      const fresh = await request.get<Record<string, string>>({
        url: '/development/generate',
        params: { table: table.value, mode: mode.value, migration: migration.value ? 1 : 0 }
      })
      files.value = Object.fromEntries(
        Object.entries(fresh).map(([name, code]) => [name, files.value[name] ?? code])
      )
      if (!(activeFile.value in files.value)) activeFile.value = Object.keys(files.value)[0]
    } catch {
      migration.value = !migration.value
    } finally {
      editing.value = false
    }
  }
  async function submit() {
    saving.value = true
    try {
      const params = { table: table.value, mode: mode.value, migration: migration.value ? 1 : 0 }
      if (action.value === 'download') {
        const blob = await request.post<Blob>({
          url: '/development/export',
          params,
          data: { files: files.value },
          responseType: 'blob'
        })
        const url = URL.createObjectURL(blob),
          link = document.createElement('a')
        link.href = url
        link.download = table.value + '.zip'
        link.click()
        URL.revokeObjectURL(url)
      } else {
        await request.post({ url: '/development/generate', params, data: { files: files.value } })
        ElMessage.success(t('文件已生成'))
      }
      visible.value = false
    } finally {
      saving.value = false
    }
  }
  onMounted(load)
</script>
<style scoped>
  .code-editor {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
    line-height: 1.6;
  }
</style>
