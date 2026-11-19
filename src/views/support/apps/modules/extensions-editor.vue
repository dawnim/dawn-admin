<template>
  <p class="mb-4 text-sm text-g-500">{{ t('工具负责查询和操作，Skill指导AI使用这些能力') }}</p>
  <div class="flex items-center justify-between mb-2">
    <span>{{ t('业务工具') }}</span>
    <ElButton link type="primary" @click="open('tools')">{{ t('配置工具') }}</ElButton>
  </div>
  <ElTable :data="tools" :empty-text="t('暂无数据')" size="small" border>
    <ElTableColumn prop="name" :label="t('名称')" min-width="130" />
    <ElTableColumn prop="description" :label="t('用途')" min-width="200" show-overflow-tooltip />
    <ElTableColumn prop="driver" :label="t('接入类型')" width="100" />
    <ElTableColumn :label="t('操作')" width="70" align="center">
      <template #default="{ $index }">
        <ElButton link type="danger" @click="tools.splice($index, 1)">{{ t('移除') }}</ElButton>
      </template>
    </ElTableColumn>
  </ElTable>
  <div class="flex items-center justify-between mt-5 mb-2">
    <span>Agent Skills</span>
    <ElSpace>
      <ElButton link type="primary" @click="open('skills')">{{ t('配置Skills') }}</ElButton>
      <ElButton link type="primary" :disabled="!appId" @click="installing = true">{{
        t('安装Skill')
      }}</ElButton>
    </ElSpace>
  </div>
  <ElTable :data="skills" :empty-text="t('暂无数据')" size="small" border>
    <ElTableColumn prop="name" :label="t('名称')" min-width="130" />
    <ElTableColumn prop="description" :label="t('用途')" min-width="200" show-overflow-tooltip />
    <ElTableColumn :label="t('来源')" width="100">
      <template #default="{ row }">{{
        row.scope === 'global' ? t('全局') : t('当前应用')
      }}</template>
    </ElTableColumn>
    <ElTableColumn :label="t('操作')" width="70" align="center">
      <template #default="{ $index }">
        <ElButton link type="danger" @click="skills.splice($index, 1)">{{ t('移除') }}</ElButton>
      </template>
    </ElTableColumn>
  </ElTable>
  <p v-if="!appId" class="mt-2 text-xs text-g-500">{{
    t('保存应用后可安装Skill、测试模型及绑定Telegram')
  }}</p>
  <ElFormItem class="mt-5" :label="t('连接器凭证')">
    <div>
      <ElButton @click="open('headers')">{{ t('配置请求头') }}</ElButton>
      <p class="mt-1 text-xs text-g-500">{{ t('按工具名称配置HTTP请求头，留空保持现有凭证') }}</p>
    </div>
  </ElFormItem>
  <ElDialog
    v-model="editing"
    :title="titles[kind]"
    width="min(780px,95vw)"
    append-to-body
    :close-on-click-modal="false"
  >
    <p class="mb-3 text-xs text-g-500">{{ help[kind] }}</p>
    <ElInput
      v-model="content"
      type="textarea"
      :rows="14"
      class="code-input"
      :placeholder="examples[kind]"
    />
    <template #footer>
      <ElButton @click="editing = false">{{ t('取消') }}</ElButton>
      <ElButton type="primary" @click="apply">{{ t('确定') }}</ElButton>
    </template>
  </ElDialog>
  <ElDialog
    v-model="installing"
    :title="t('安装Skill')"
    width="min(780px,95vw)"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    class="support-skill-dialog"
  >
    <p class="mb-4 text-xs text-g-500">{{
      t('安装会立即保存Skill文件和应用引用，其他配置仍需提交')
    }}</p>
    <SkillInstaller :app-id="appId" @installed="emit('installed')" @enable="enableGlobal" />
  </ElDialog>
</template>
<script setup lang="ts">
  import { $t as t } from '@/locales'
  import { ElMessage } from 'element-plus'
  import SkillInstaller from '../SkillInstaller.vue'
  defineProps<{ appId: number }>()
  const emit = defineEmits<{ installed: [] }>()
  const tools = defineModel<Record<string, unknown>[]>('tools', { required: true })
  const skills = defineModel<Record<string, unknown>[]>('skills', { required: true })
  const headers = defineModel<string>('headers', { required: true })
  const editing = ref(false),
    installing = ref(false),
    content = ref('')
  const kind = ref<'tools' | 'skills' | 'headers'>('tools')
  const titles = { tools: t('业务工具契约'), skills: t('配置Skills'), headers: t('连接器请求头') }
  const help = {
    tools: t('使用JSON数组配置工具名称、说明、参数和接入类型，工具由开发者注册或连接外部服务'),
    skills: t('使用JSON数组配置Skill引用；安装文件可使用安装Skill按钮'),
    headers: t('格式为工具名称对应请求头对象，填写{}可清空已保存的请求头')
  }
  const examples = {
    tools:
      '[{"name":"account_profile","description":"Account profile","driver":"go","parameters":{"type":"object","properties":{}}}]',
    skills: '[{"name":"account-guide","scope":"app","description":"Account guide"}]',
    headers: '{"account_profile":{"Authorization":"Bearer ..."}}'
  }
  function open(value: typeof kind.value) {
    kind.value = value
    content.value =
      value === 'headers'
        ? headers.value
        : JSON.stringify(value === 'tools' ? tools.value : skills.value, null, 2)
    editing.value = true
  }
  function apply() {
    try {
      const value = JSON.parse(content.value)
      if (kind.value === 'headers') {
        if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error()
        headers.value = JSON.stringify(value)
      } else {
        if (
          !Array.isArray(value) ||
          value.some(
            (item) =>
              !item ||
              typeof item !== 'object' ||
              Array.isArray(item) ||
              typeof item.name !== 'string'
          )
        )
          throw new Error()
        if (kind.value === 'tools') tools.value = value
        else skills.value = value
      }
      editing.value = false
    } catch {
      ElMessage.error(t('JSON格式无效'))
    }
  }
  function enableGlobal(skill: Record<string, unknown>) {
    if (!skills.value.some((entry) => entry.name === skill.name)) skills.value.push(skill)
    ElMessage.success(t('已加入配置，提交后生效'))
  }
</script>
<style scoped>
  .code-input :deep(textarea) {
    font-family: ui-monospace, monospace;
  }
  :global(.support-skill-dialog .el-dialog__body) {
    max-height: 65vh;
    overflow-y: auto;
    scrollbar-width: none;
  }
  :global(.support-skill-dialog .el-dialog__body::-webkit-scrollbar) {
    display: none;
  }
</style>
