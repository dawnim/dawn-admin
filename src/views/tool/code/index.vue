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
      class="code-dialog"
      :title="t(action === 'download' ? '下载代码' : '生成到项目')"
      width="80%"
      align-center
      :close-on-click-modal="false"
    >
      <div v-loading="editing">
        <ElForm inline>
          <ElFormItem :label="t('资源名称')">
            <ElInput
              v-model="resource"
              style="width: 220px"
              :disabled="editing || saving"
              @change="refreshPreview(false)"
            />
          </ElFormItem>
          <ElFormItem :label="t('前端目录')">
            <ElInput
              v-model="directory"
              style="width: 140px"
              :disabled="editing || saving"
              @change="refreshPreview(false)"
            />
          </ElFormItem>
          <ElFormItem>
            <ElCheckbox
              v-model="migration"
              :disabled="editing || saving"
              @change="refreshPreview()"
            >
              {{ t('生成表迁移') }}
            </ElCheckbox>
          </ElFormItem>
        </ElForm>
        <ElTabs v-model="activeFile" @tab-click="centerFileTab">
          <ElTabPane v-for="(_, name) in files" :key="name" :label="name" :name="name" lazy>
            <Codemirror
              v-if="visible"
              v-model="files[name]"
              :aria-label="name"
              :extensions="[...extensions, fileLanguages[name] || []]"
              :disabled="editing || saving"
              :tab-size="2"
              :style="{ height: '40vh' }"
              class="code-editor"
            />
          </ElTabPane>
        </ElTabs>
      </div>
      <ElAlert
        v-if="integrationExamples[integrationFile]"
        class="integration-guide"
        type="info"
        :closable="false"
      >
        <template #title>
          <div class="flex items-center justify-between gap-4">
            <span>{{ t('生成后接入') }}</span>
            <ElButton size="small" @click="copy(integrationExamples[integrationFile])">
              {{ t(copied ? '已复制' : '复制代码') }}
            </ElButton>
          </div>
        </template>
        <div>{{
          t(
            '将示例合并到现有配置；菜单默认放在开发工具下，可调整Title和ParentKey，再给角色分配权限；API和字段语言包已随代码生成'
          )
        }}</div>
        <ElTabs v-model="integrationFile">
          <ElTabPane
            v-for="(_, name) in integrationExamples"
            :key="name"
            :label="name"
            :name="name"
          />
        </ElTabs>
        <Codemirror
          v-if="visible"
          :model-value="integrationExamples[integrationFile]"
          :aria-label="integrationFile"
          :extensions="[...extensions, fileLanguages[integrationFile] || []]"
          disabled
          :tab-size="2"
          :style="{ height: '20vh' }"
          class="code-editor"
        />
        <div>{{
          t(
            '检查字段、必填规则与数据范围；业务表使用id主键和created_at、updated_at、deleted_at毫秒时间字段，结构变更执行新迁移'
          )
        }}</div>
      </ElAlert>
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
  import { useClipboard } from '@vueuse/core'
  const { t } = useI18n()
  const { copy, copied } = useClipboard()
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
    resource = ref(''),
    directory = ref('business'),
    activeFile = ref(''),
    integrationFile = ref('app/admin/routes.go'),
    action = ref<'download' | 'write'>('download')
  const integrationExamples = computed((): Record<string, string> => {
    const controller = files.value[`app/admin/controllers/${table.value}.go`]
    const module = controller?.match(/"([^"]+)\/app\/models"/)?.[1]
    const register = controller?.match(/func (Register\w+)\(/)?.[1]
    if (!module || !register) return {}
    const permission = `app.${table.value}`
    const page = `/${directory.value}/${table.value}`
    return {
      'app/admin/routes.go': `package admin

import (
    sdk "github.com/dawnim/dawn-server/app/admin"
    "${module}/app/admin/controllers"
    "github.com/prismgo/framework/route"
)

func RegisterRoutes(a *sdk.App, g *route.Registrar) {
    controllers.${register}(a, g)
}
`,
      'app/admin/menu.go': `package admin

import sdk "github.com/dawnim/dawn-server/app/admin"

func Configure(o *sdk.Options) {
    o.Routes = RegisterRoutes
    o.Menus = append(o.Menus, sdk.Menu{
        Key: "${permission}", ParentKey: "dawn.development",
        Title: "${table.value}", Path: "${page}",
        Component: "${page}", Permission: "${permission}.list",
    })
    for action, title := range map[string]string{
        "list": "查看", "create": "新增", "update": "修改",
        "delete": "删除", "export": "导出",
    } {
        o.Permissions = append(o.Permissions, sdk.Permission{
            Key: "${permission}." + action,
            ParentKey: "${permission}", Title: title,
        })
    }
}
`,
      'admin/src/main.ts': `import { createAdmin } from '@dawnim/admin'
import '@dawnim/admin/style.css'

createAdmin({
  pages: {
    '${page}': () => import('./views${page}/index.vue')
  }
}).mount('#app')
`
    }
  })
  watch(
    [activeFile, integrationFile],
    async (names) => {
      for (const name of names) {
        const language = LanguageDescription.matchFilename(languages, name)
        if (language && !fileLanguages[name]) fileLanguages[name] = await language.load()
      }
    },
    { immediate: true }
  )
  const { columns, columnChecks } = useTableColumns<any>(() => [
    { prop: 'name', label: t('表名称') },
    { prop: 'operation', label: t('操作'), width: 100, useSlot: true }
  ])
  async function load() {
    loading.value = true
    try {
      const names = await request.get<string[]>({ url: '/code/tables' })
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
    resource.value = name.replaceAll('_', '-')
    action.value = target
    migration.value = false
    files.value = {}
    activeFile.value = ''
    visible.value = true
    editing.value = true
    try {
      files.value = await request.get({
        url: '/code/previews',
        params: {
          table: name,
          resource: resource.value,
          directory: directory.value,
          mode: mode.value
        }
      })
      activeFile.value = `app/admin/controllers/${name}.go`
    } catch {
      visible.value = false
    } finally {
      editing.value = false
    }
  }
  // 切换迁移保留已编辑代码；资源或目录变化时重新生成代码。
  async function refreshPreview(keepEdits = true) {
    editing.value = true
    try {
      const fresh = await request.get<Record<string, string>>({
        url: '/code/previews',
        params: {
          table: table.value,
          resource: resource.value,
          directory: directory.value,
          mode: mode.value,
          migration: migration.value ? 1 : 0
        }
      })
      files.value = keepEdits
        ? Object.fromEntries(
            Object.entries(fresh).map(([name, code]) => [name, files.value[name] ?? code])
          )
        : fresh
      if (!(activeFile.value in files.value)) activeFile.value = Object.keys(files.value)[0]
    } catch {
      if (keepEdits) migration.value = !migration.value
    } finally {
      editing.value = false
    }
  }
  async function submit() {
    saving.value = true
    try {
      const params = {
        table: table.value,
        resource: resource.value,
        directory: directory.value,
        mode: mode.value,
        migration: migration.value ? 1 : 0
      }
      if (action.value === 'download') {
        const blob = await request.post<Blob>({
          url: '/code/archives',
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
        await request.post({ url: '/code/generations', params, data: { files: files.value } })
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
  :global(.code-dialog) {
    display: flex;
    flex-direction: column;
    max-height: 90vh;
  }

  :global(.code-dialog .el-dialog__body) {
    min-height: 0;
    overflow-y: auto;
  }

  .code-editor {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
    line-height: 1.6;
  }

  .integration-guide {
    margin-top: 16px;
    text-align: left;
  }

  .integration-guide :deep(.el-alert__content) {
    width: 100%;
    min-width: 0;
  }
</style>
