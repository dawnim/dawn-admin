<template>
  <div>
    <ElForm label-width="130px">
      <ElFormItem :label="t('安装范围')"
        ><ElRadioGroup v-model="scope"
          ><ElRadioButton value="app">{{ t('当前应用') }}</ElRadioButton
          ><ElRadioButton v-if="userStore.info.is_super" value="global">{{
            t('全局')
          }}</ElRadioButton></ElRadioGroup
        ></ElFormItem
      >
      <ElFormItem :label="t('与AI讨论Skill需求')"
        ><ElInput
          v-model="prompt"
          type="textarea"
          :rows="3"
          :placeholder="t('描述需要的能力，AI生成后可继续提出修改意见')"
      /></ElFormItem>
      <ElFormItem :label="t('参考网址')"
        ><ElInput v-model="url" placeholder="https://example.com/SKILL.md"
      /></ElFormItem>
      <ElButton :loading="generating" :disabled="!prompt.trim()" @click="generate">{{
        t('发送给AI')
      }}</ElButton>
      <template v-if="content">
        <ElFormItem class="mt-4" label="SKILL.md"
          ><ElInput v-model="content" type="textarea" :rows="12"
        /></ElFormItem>
        <ElButton type="primary" :loading="installing" @click="install">{{
          t('确认安装')
        }}</ElButton>
      </template>
    </ElForm>
    <ElDivider />
    <ElSelect
      v-model="selectedGlobal"
      :placeholder="t('选择全局Skill')"
      @visible-change="loadGlobals"
      ><ElOption
        v-for="skill in globalSkills"
        :key="skill.name"
        :value="skill.name"
        :label="skill.name + ' · ' + skill.description"
    /></ElSelect>
    <ElButton class="mt-3 mb-3" :disabled="!selectedGlobal" @click="enableGlobal">{{
      t('为当前应用启用')
    }}</ElButton>
    <ElDivider />
    <ElUpload :auto-upload="false" :show-file-list="false" accept=".md,.zip" :on-change="upload"
      ><ElButton :loading="installing">{{ t('上传Skill文件') }}</ElButton></ElUpload
    >
    <p class="mt-3 text-xs text-g-600">{{
      t('支持SKILL.md或ZIP，安装后只加载指令和资源，不自动执行脚本')
    }}</p>
  </div>
</template>
<script setup lang="ts">
  import { ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { ElMessage, type UploadFile } from 'element-plus'
  import { useUserStore } from '@/store/modules/user'
  import request from '@/utils/http'
  const props = defineProps<{ appId: number }>()
  const emit = defineEmits<{ installed: []; enable: [skill: Record<string, any>] }>()
  const { t } = useI18n()
  const userStore = useUserStore()
  const scope = ref('app'),
    prompt = ref(''),
    url = ref(''),
    content = ref('')
  const generating = ref(false),
    installing = ref(false)
  const globalSkills = ref<Record<string, any>[]>([]),
    selectedGlobal = ref('')
  async function loadGlobals(open: boolean) {
    if (open)
      globalSkills.value = await request.get({ url: `/support-apps/${props.appId}/global-skills` })
  }
  function enableGlobal() {
    const skill = globalSkills.value.find((skill) => skill.name === selectedGlobal.value)
    if (skill) emit('enable', skill)
  }
  async function generate() {
    generating.value = true
    try {
      const result = await request.post<{ content: string }>({
        url: `/support-apps/${props.appId}/skill-proposals`,
        data: {
          prompt: `${prompt.value}\n${content.value ? `当前版本：\n${content.value}` : ''}`,
          url: url.value
        }
      })
      content.value = result.content
    } finally {
      generating.value = false
    }
  }
  async function upload(file: UploadFile) {
    if (file.raw) await installFile(file.raw)
  }
  async function install() {
    await installFile(new File([content.value], 'SKILL.md', { type: 'text/markdown' }))
  }
  async function installFile(file: File) {
    installing.value = true
    try {
      const data = new FormData()
      data.set('file', file)
      data.set('scope', scope.value)
      await request.post({ url: `/support-apps/${props.appId}/skills`, data })
      ElMessage.success(t('安装成功'))
      emit('installed')
    } finally {
      installing.value = false
    }
  }
</script>
