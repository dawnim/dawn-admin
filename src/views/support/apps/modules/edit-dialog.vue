<template>
  <ElDialog
    v-model="visible"
    :title="form.id ? t('配置客服应用') : t('创建客服应用')"
    width="900px"
    align-center
    :close-on-click-modal="false"
    class="support-app-dialog"
    :show-close="!saving"
    :close-on-press-escape="!saving"
    destroy-on-close
  >
    <ElForm
      ref="formRef"
      v-loading="loading"
      :model="form"
      :rules="rules"
      label-width="130px"
      :disabled="loading || saving"
      @submit.prevent="save"
    >
      <ElTabs v-model="tab">
        <ElTabPane :label="t('品牌与接待')" name="basic">
          <ElRow :gutter="24">
            <ElCol :xs="24" :sm="14">
              <ElFormItem :label="t('fields.support_apps.name')" prop="name">
                <ElInput v-model="form.name" maxlength="100" />
              </ElFormItem>
            </ElCol>
            <ElCol :xs="24" :sm="10">
              <ElFormItem :label="t('状态')"
                ><DawnRadio v-model="form.status" dict="data_status"
              /></ElFormItem>
            </ElCol>
          </ElRow>
          <ElFormItem :label="t('品牌头像')"><DawnImagePicker v-model="form.avatar" /></ElFormItem>
          <ElFormItem :label="t('欢迎语')"
            ><ElInput v-model="form.config.greeting" type="textarea" :rows="2"
          /></ElFormItem>
          <ElFormItem :label="t('接待客服')">
            <ElSelect v-model="form.config.agent_ids" multiple filterable>
              <ElOption
                v-for="agent in agents"
                :key="agent.id"
                :value="agent.id"
                :label="`${agent.realname || agent.username} #${agent.id}`"
              />
            </ElSelect>
          </ElFormItem>
          <ElRow :gutter="24">
            <ElCol :xs="24" :sm="12">
              <ElFormItem :label="t('接待容量')">
                <div class="field"
                  ><ElInputNumber
                    v-model="form.config.capacity"
                    :min="1"
                    :precision="0"
                    controls-position="right"
                  /><p class="field-tip">{{ t('每名客服可同时接待的客户数') }}</p></div
                >
              </ElFormItem>
            </ElCol>
            <ElCol :xs="24" :sm="12">
              <ElFormItem :label="t('实时输入预览')">
                <div class="field"
                  ><ElSwitch v-model="form.config.input_preview" /><p class="field-tip">{{
                    t('开启后客服可查看客户正在输入的内容')
                  }}</p></div
                >
              </ElFormItem>
            </ElCol>
            <ElCol :xs="24" :sm="12">
              <ElFormItem :label="t('离线结束时间')">
                <div class="field"
                  ><ElInputNumber
                    v-model="form.config.offline_timeout_minutes"
                    :min="0"
                    :precision="0"
                    controls-position="right"
                  /><span class="ml-2">{{ t('分钟') }}</span
                  ><p class="field-tip">{{ t('持续离线后结束接待或排队，0表示关闭') }}</p></div
                >
              </ElFormItem>
            </ElCol>
            <ElCol :xs="24" :sm="12">
              <ElFormItem :label="t('结束申请等待')">
                <div class="field"
                  ><ElInputNumber
                    v-model="form.config.closing_offline_minutes"
                    :min="0"
                    :precision="0"
                    controls-position="right"
                  /><span class="ml-2">{{ t('分钟') }}</span
                  ><p class="field-tip">{{ t('申请结束且客户离线时生效，0沿用离线时间') }}</p></div
                >
              </ElFormItem>
            </ElCol>
          </ElRow>
        </ElTabPane>
        <ElTabPane :label="t('AI模型')" name="ai">
          <ElRow :gutter="24">
            <ElCol :xs="24" :sm="12"
              ><ElFormItem :label="t('启用AI接待')"
                ><ElSwitch v-model="form.config.ai_enabled" /></ElFormItem
            ></ElCol>
            <ElCol :xs="24" :sm="12">
              <ElFormItem :label="t('模型协议')">
                <ElSelect v-model="form.config.model_protocol">
                  <ElOption value="responses" label="OpenAI Responses" />
                  <ElOption value="chat_completions" label="OpenAI Chat Completions" />
                  <ElOption value="anthropic" label="Anthropic Messages" />
                </ElSelect>
              </ElFormItem>
            </ElCol>
          </ElRow>
          <ElFormItem :label="t('模型名称')"
            ><ElInput v-model="form.config.model" placeholder="model-name"
          /></ElFormItem>
          <ElFormItem :label="t('模型接口地址')">
            <div class="field">
              <ElInput v-model="form.config.base_url" placeholder="https://api.example.com/v1" />
              <p class="field-tip">{{
                t(
                  '填写API基础地址，纯域名自动补/v1；也可填写/v1或代理前缀，请勿添加/responses、/chat/completions或/v1/messages'
                )
              }}</p>
            </div>
          </ElFormItem>
          <ElFormItem :label="t('模型密钥')" :error="keyError">
            <div class="field">
              <ElInput
                v-model="secrets.api_key"
                type="password"
                autocomplete="new-password"
                :placeholder="t('留空保持现有密钥')"
                @input="keyError = ''"
              />
              <p class="field-tip">{{
                t('已保存的模型密钥不回显；填写新密钥后提交时验证，失败不保存')
              }}</p>
            </div>
          </ElFormItem>
          <ElRow :gutter="24">
            <ElCol :xs="24" :sm="12">
              <ElFormItem :label="t('推理强度')"
                ><ElInput
                  v-model="form.config.reasoning_effort"
                  :placeholder="t('跟随模型默认')"
                  clearable
              /></ElFormItem>
            </ElCol>
            <ElCol :xs="24" :sm="12">
              <ElFormItem :label="t('输出Token上限')"
                ><ElInputNumber
                  v-model="form.config.max_output_tokens"
                  :min="0"
                  :step="1024"
                  :precision="0"
                  controls-position="right"
              /></ElFormItem>
            </ElCol>
          </ElRow>
          <ElFormItem>
            <div class="field field-tip effort-tip">
              <div
                >OpenAI:
                <ElButton
                  v-for="effort in openaiEfforts"
                  :key="effort"
                  link
                  type="primary"
                  @click="form.config.reasoning_effort = effort"
                  ><code>{{ effort }}</code></ElButton
                ></div
              >
              <div
                >Anthropic:
                <ElButton
                  v-for="effort in anthropicEfforts"
                  :key="effort"
                  link
                  type="primary"
                  @click="form.config.reasoning_effort = effort"
                  ><code>{{ effort }}</code></ElButton
                ></div
              >
              <p>{{
                t(
                  '点击取值可填入；支持范围由模型决定，强度留空跟随模型默认，Token上限0使用服务默认'
                )
              }}</p>
            </div>
          </ElFormItem>
          <ElFormItem :label="t('客服指令')"
            ><ElInput v-model="form.config.instructions" type="textarea" :rows="3"
          /></ElFormItem>
          <ElFormItem>
            <div class="field">
              <ElButton :disabled="!form.id" :loading="testingModel" @click="testModel">{{
                t('测试已保存的模型配置')
              }}</ElButton>
              <p v-if="!form.id" class="field-tip">{{ t('保存应用后可测试模型') }}</p>
            </div>
          </ElFormItem>
        </ElTabPane>
        <ElTabPane :label="t('知识检索')" name="knowledge">
          <ElFormItem :label="t('向量服务地址')">
            <div class="field">
              <ElInput
                v-model="form.config.embedding_url"
                placeholder="http://127.0.0.1:8852/v1/"
              />
              <p class="field-tip">{{
                t(
                  '本地地址保留/v1/；在当前Go项目根目录执行，首次安装需要Python并下载依赖，模型和运行参数在.env中配置'
                )
              }}</p>
              <ElButton class="command-tip" link type="primary" @click="copy(embeddingCommand)"
                ><code>{{ embeddingCommand }}</code
                ><ArtSvgIcon icon="ri:file-copy-line"
              /></ElButton>
            </div>
          </ElFormItem>
          <ElFormItem :label="t('向量服务密钥')"
            ><ElInput
              v-model="secrets.embedding_api_key"
              type="password"
              show-password
              :placeholder="t('留空保持现有密钥')"
          /></ElFormItem>
          <ElFormItem :label="t('向量模型')">
            <div class="field">
              <ElInput v-model="form.config.embedding_model" />
              <div class="field-tip"
                >{{ t('常用模型，点击复制完整名称')
                }}<div class="model-tips"
                  ><ElButton
                    v-for="model in embeddingModels"
                    :key="model"
                    link
                    type="primary"
                    @click="copy(model)"
                    ><code>{{ model }}</code></ElButton
                  ></div
                ></div
              >
              <p class="field-tip">{{
                t(
                  '名称须与向量服务实际加载的模型一致；修改此处不会下载或切换模型，更换后需重启向量服务并重建索引'
                )
              }}</p>
            </div>
          </ElFormItem>
          <ElRow :gutter="24">
            <ElCol :xs="24" :sm="12"
              ><ElFormItem :label="t('向量维度')"
                ><ElInputNumber
                  v-model="form.config.embedding_dimensions"
                  :min="0"
                  :precision="0"
                  controls-position="right" /></ElFormItem
            ></ElCol>
            <ElCol :xs="24" :sm="12"
              ><ElFormItem :label="t('索引存储')"
                ><ElSelect v-model="form.config.index_driver"
                  ><ElOption value="portable" :label="t('通用存储')" /><ElOption
                    value="mariadb"
                    :label="t('MariaDB原生向量索引')" /></ElSelect></ElFormItem
            ></ElCol>
          </ElRow>
          <ElFormItem :label="t('当前索引')">
            <div class="field">
              <span v-if="form.config.active_index"
                >{{ form.config.active_index.model }} /
                {{ form.config.active_index.dimensions }}</span
              ><span v-else>{{ t('当前使用关键词检索，向量索引尚未建成') }}</span>
              <p class="field-tip">{{ t('更换模型后先重建索引，完成前继续使用原索引') }}</p>
              <ElButton
                v-permission="'dawn.knowledge.update'"
                class="mt-2"
                :disabled="!form.id"
                @click="rebuild"
                >{{ t('重建知识索引') }}</ElButton
              >
            </div>
          </ElFormItem>
        </ElTabPane>
        <ElTabPane :label="t('网站接入')" name="website">
          <ElFormItem :label="t('本站身份同步')"
            ><div class="field"
              ><ElSwitch v-model="form.config.allow_local_users" /><p class="field-tip">{{
                t('允许通过公开身份API同步本站游客和登录用户')
              }}</p></div
            ></ElFormItem
          >
          <ElFormItem :label="t('身份签名密钥')">
            <div class="field">
              <div class="secret-row">
                <ElInput
                  v-model="secrets.identity_secret"
                  :type="revealed.identity_secret ? 'text' : 'password'"
                  :placeholder="t('留空保持现有密钥')"
                  autocomplete="new-password"
                />
                <ElButton
                  :title="t('查看或隐藏密钥')"
                  :aria-label="t('查看或隐藏密钥')"
                  :disabled="loadingSecrets"
                  @click="readSecret('identity_secret')"
                  ><ArtSvgIcon :icon="revealed.identity_secret ? 'ri:eye-off-line' : 'ri:eye-line'"
                /></ElButton>
                <ElButton
                  :title="t('复制')"
                  :aria-label="t('复制')"
                  :disabled="loadingSecrets"
                  @click="readSecret('identity_secret', true)"
                  ><ArtSvgIcon icon="ri:file-copy-line"
                /></ElButton>
              </div>
              <p class="field-tip">{{
                t('外部站点在后端签名，密钥不要放到网页；已保存的值可查看和复制')
              }}</p>
            </div>
          </ElFormItem>
          <div class="flex items-center justify-between mb-3"
            ><span>{{ t('网站入口') }}</span
            ><ElButton link type="primary" @click="addEntry"
              ><ArtSvgIcon icon="ri:add-line" />{{ t('添加入口') }}</ElButton
            ></div
          >
          <ElCollapse v-model="openEntries">
            <ElCollapseItem
              v-for="(entry, index) in form.config.entries"
              :key="index"
              :name="index"
            >
              <template #title
                ><span class="flex-1">{{ entry.key || t('新入口') }}</span
                ><ElButton
                  link
                  type="danger"
                  :title="t('删除')"
                  @click.stop="form.config.entries.splice(index, 1)"
                  ><ArtSvgIcon icon="ri:delete-bin-line" /></ElButton
              ></template>
              <ElRow :gutter="24">
                <ElCol :xs="24" :sm="12"
                  ><ElFormItem :label="t('入口标识')"
                    ><ElInput v-model="entry.key" placeholder="default" /></ElFormItem
                ></ElCol>
                <ElCol :xs="24" :sm="12"
                  ><ElFormItem :label="t('默认主题')"
                    ><ElSelect v-model="entry.theme"
                      ><ElOption value="system" :label="t('跟随系统')" /><ElOption
                        value="light"
                        :label="t('亮色')" /><ElOption
                        value="dark"
                        :label="t('暗色')" /></ElSelect></ElFormItem
                ></ElCol>
              </ElRow>
              <ElFormItem :label="t('允许的网站来源')"
                ><div class="field"
                  ><ElSelect
                    v-model="entry.origins"
                    multiple
                    filterable
                    allow-create
                    default-first-option
                    :placeholder="t('填写*或留空允许任意网站')"
                  /><p class="field-tip">{{
                    t('填写网站来源，如https://example.com；填写*或留空允许任意网站')
                  }}</p></div
                ></ElFormItem
              >
              <ElFormItem :label="t('入口欢迎语')"
                ><ElInput
                  v-model="entry.greeting"
                  type="textarea"
                  :rows="2"
                  :placeholder="t('留空使用应用欢迎语')"
              /></ElFormItem>
            </ElCollapseItem>
          </ElCollapse>
          <p class="field-tip mt-3">{{
            t('列表中的接入按钮可复制链接或脚本；自定义资料通过attributes传入，认证接入见文档')
          }}</p>
        </ElTabPane>
        <ElTabPane label="Telegram" name="telegram">
          <ElFormItem :label="t('启用机器人')"
            ><div class="field"
              ><ElSwitch v-model="form.config.telegram_enabled" /><p class="field-tip">{{
                t('保存后由WS服务自动加载，约5秒生效，无需重启')
              }}</p></div
            ></ElFormItem
          >
          <ElFormItem :label="t('机器人Token')">
            <div class="field">
              <div class="secret-row">
                <ElInput
                  v-model="secrets.telegram_token"
                  :type="revealed.telegram_token ? 'text' : 'password'"
                  :placeholder="t('留空保持现有密钥')"
                  autocomplete="new-password"
                />
                <ElButton
                  :title="t('查看或隐藏密钥')"
                  :aria-label="t('查看或隐藏密钥')"
                  :disabled="loadingSecrets"
                  @click="readSecret('telegram_token')"
                  ><ArtSvgIcon :icon="revealed.telegram_token ? 'ri:eye-off-line' : 'ri:eye-line'"
                /></ElButton>
                <ElButton
                  :title="t('复制')"
                  :aria-label="t('复制')"
                  :disabled="loadingSecrets"
                  @click="readSecret('telegram_token', true)"
                  ><ArtSvgIcon icon="ri:file-copy-line"
                /></ElButton>
              </div>
              <p class="field-tip">{{ t('从BotFather获取，已保存的Token可查看和复制') }}</p>
            </div>
          </ElFormItem>
          <ElFormItem :label="t('允许的群组ID')">
            <div class="field">
              <ElSelect
                v-model="form.config.telegram_groups"
                multiple
                filterable
                allow-create
                default-first-option
                :placeholder="t('选择群组或输入负数ID后回车')"
                :loading="loadingGroups"
                @visible-change="loadGroups"
              >
                <ElOption
                  v-for="group in groups"
                  :key="group.id"
                  :value="group.id"
                  :label="`${group.title || t('群组')} · ${group.id}`"
                />
              </ElSelect>
              <p class="field-tip">{{
                t(
                  '支持手动输入负数ID，如-1001234567890；机器人收到群消息或入群事件后会提供候选，选择后提交才允许接待'
                )
              }}</p>
            </div>
          </ElFormItem>
          <ElFormItem :label="t('接收普通群消息')"
            ><div class="field"
              ><ElSwitch v-model="form.config.telegram_proactive" /><p class="field-tip">{{
                t('关闭时仅在被提及、回复机器人或私聊时响应')
              }}</p></div
            ></ElFormItem
          >
          <ElFormItem :label="t('我的Telegram')">
            <div class="field"
              ><TelegramBinding :disabled="!form.id" /><p class="field-tip">{{
                t('绑定当前管理员的Telegram账号；请先保存并启用机器人，再私聊发送绑定命令')
              }}</p></div
            >
          </ElFormItem>
        </ElTabPane>
        <ElTabPane :label="t('扩展能力')" name="advanced">
          <ExtensionsEditor
            :app-id="form.id"
            v-model:tools="form.config.tools"
            v-model:skills="form.config.skills"
            v-model:headers="toolHeaders"
            @installed="reloadSkills"
          />
        </ElTabPane>
      </ElTabs>
    </ElForm>
    <template #footer
      ><ElButton :disabled="saving" @click="visible = false">{{ t('取消') }}</ElButton
      ><ElButton type="primary" :loading="saving" :disabled="loading" @click="save">{{
        saving && secrets.api_key ? t('验证并保存') : t('提交')
      }}</ElButton></template
    >
  </ElDialog>
</template>
<script setup lang="ts">
  import { $t as t } from '@/locales'
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import { supportAppApi, supportApi, type SupportApp, type SupportConfig } from '@/api/support'
  import { type ChatContact } from '@/api/chat'
  import { HttpError, type ErrorResponse } from '@/utils/http/error'
  import ExtensionsEditor from './extensions-editor.vue'
  import TelegramBinding from '@/components/core/layouts/art-chat-window/TelegramBinding.vue'
  const visible = defineModel<boolean>({ required: true })
  const props = defineProps<{ data?: Partial<SupportApp> }>()
  const emit = defineEmits<{ success: [] }>()
  const formRef = ref<FormInstance>()
  const rules: FormRules = {
    name: [{ required: true, whitespace: true, message: t('请输入应用名称'), trigger: 'blur' }]
  }
  const agents = ref<ChatContact[]>([])
  const saving = ref(false),
    loading = ref(false),
    tab = ref('basic'),
    keyError = ref('')
  const form = ref<SupportApp>({ config: {} } as SupportApp)
  const secrets = reactive({
    api_key: '',
    embedding_api_key: '',
    identity_secret: '',
    telegram_token: ''
  })
  const storedSecrets = reactive({ identity_secret: '', telegram_token: '' })
  const revealed = reactive({ identity_secret: false, telegram_token: false })
  const loadingSecrets = ref(false),
    secretsLoaded = ref(false),
    toolHeaders = ref('')
  const groups = ref<{ id: number; title: string }[]>([]),
    loadingGroups = ref(false)
  const savedSkillNames = ref<unknown[]>([])
  const openEntries = ref([0]),
    testingModel = ref(false)
  const openaiEfforts = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']
  const anthropicEfforts = ['low', 'medium', 'high', 'xhigh', 'max']
  const embeddingModels = [
    'Qwen/Qwen3-Embedding-0.6B',
    'Qwen/Qwen3-Embedding-4B',
    'Qwen/Qwen3-Embedding-8B',
    'BAAI/bge-m3',
    'intfloat/multilingual-e5-small'
  ]
  const embeddingCommand = 'go run . dawn:embedding install && go run . dawn:start embedding'
  async function copy(value: string) {
    await navigator.clipboard.writeText(value)
    ElMessage.success(t('复制成功'))
  }
  async function readSecret(field: keyof typeof storedSecrets, copying = false) {
    if (!secrets[field] && form.value.id && !secretsLoaded.value) {
      loadingSecrets.value = true
      try {
        Object.assign(storedSecrets, await supportApi.appSecrets(form.value.id))
        secretsLoaded.value = true
      } finally {
        loadingSecrets.value = false
      }
    }
    if (copying) {
      const value = secrets[field] || storedSecrets[field]
      if (value) await copy(value)
      else ElMessage.info(t('尚未配置密钥'))
    } else {
      secrets[field] ||= storedSecrets[field]
      revealed[field] = !revealed[field]
    }
  }
  async function loadGroups(open: boolean) {
    if (!open || !form.value.id) return
    loadingGroups.value = true
    try {
      groups.value = await supportApi.telegramGroups(form.value.id)
    } finally {
      loadingGroups.value = false
    }
  }
  async function testModel() {
    testingModel.value = true
    try {
      ElMessage.success((await supportApi.testModel(form.value.id)).content)
    } finally {
      testingModel.value = false
    }
  }
  function addEntry() {
    form.value.config.entries.push({ key: '', origins: [], theme: 'system', greeting: '' })
    openEntries.value = [form.value.config.entries.length - 1]
  }
  function edit(row?: Partial<SupportApp>) {
    const config: SupportConfig = {
      offline_timeout_minutes: 10,
      closing_offline_minutes: 3,
      entries: [{ key: 'default', origins: [], theme: 'system', greeting: '' }],
      agent_ids: [],
      capacity: 5,
      greeting: '',
      instructions: '',
      model: '',
      model_protocol: 'responses',
      reasoning_effort: 'low',
      max_output_tokens: 0,
      base_url: '',
      embedding_url: 'http://127.0.0.1:8852/v1/',
      embedding_model: 'Qwen/Qwen3-Embedding-0.6B',
      embedding_dimensions: 1024,
      index_driver: 'portable',
      allow_local_users: false,
      input_preview: false,
      ai_enabled: false,
      telegram_enabled: false,
      telegram_groups: [],
      telegram_proactive: false,
      tools: [],
      skills: [],
      context_fields: []
    }
    form.value = row?.id
      ? JSON.parse(JSON.stringify(row))
      : {
          id: 0,
          created_at: 0,
          updated_at: 0,
          name: '',
          avatar: '',
          public_key: '',
          status: 1,
          revision: 1,
          config
        }
    form.value.config = { ...config, ...form.value.config }
    for (const field of [
      'entries',
      'agent_ids',
      'telegram_groups',
      'tools',
      'skills',
      'context_fields'
    ] as const)
      form.value.config[field] ??= [] as never
    Object.assign(secrets, {
      api_key: '',
      embedding_api_key: '',
      identity_secret: '',
      telegram_token: ''
    })
    Object.assign(storedSecrets, { identity_secret: '', telegram_token: '' })
    Object.assign(revealed, { identity_secret: false, telegram_token: false })
    savedSkillNames.value = form.value.config.skills.map((skill) => skill.name)
    secretsLoaded.value = false
    toolHeaders.value = ''
    keyError.value = ''
    groups.value = []
    openEntries.value = [0]
    tab.value = 'basic'
  }
  async function save() {
    if (saving.value) return
    if (!(await formRef.value?.validate().catch(() => false))) {
      tab.value = 'basic'
      return
    }
    const groupIDs = form.value.config.telegram_groups.map(Number)
    if (groupIDs.some((id) => !Number.isSafeInteger(id) || id >= 0)) {
      tab.value = 'telegram'
      ElMessage.error(t('群组ID必须是负整数'))
      return
    }
    form.value.config.telegram_groups = [...new Set(groupIDs)]
    const values: Record<string, unknown> = Object.fromEntries(
      Object.entries(secrets).filter(
        ([key, value]) =>
          value !== '' &&
          (!(key in storedSecrets) || value !== storedSecrets[key as keyof typeof storedSecrets])
      )
    )
    if (toolHeaders.value.trim()) values.tool_headers = JSON.parse(toolHeaders.value)
    const input = {
      name: form.value.name,
      avatar: form.value.avatar,
      status: form.value.status,
      config: form.value.config,
      ...(form.value.id ? { revision: form.value.revision } : {}),
      ...(Object.keys(values).length ? { secrets: values } : {})
    }
    saving.value = true
    try {
      if (form.value.id) await supportAppApi.update(form.value.id, input)
      else await supportAppApi.create(input)
      visible.value = false
      ElMessage.success(t('保存成功'))
      emit('success')
    } catch (error) {
      if (error instanceof HttpError) {
        const errors = (error.data as ErrorResponse)?.errors
        if (errors?.['secrets.api_key']) {
          keyError.value = errors['secrets.api_key']
          tab.value = 'ai'
        }
      }
    } finally {
      saving.value = false
    }
  }
  async function reloadSkills() {
    const updated = await supportAppApi.get(form.value.id)
    form.value.revision = updated.revision
    const installed = updated.config.skills || []
    for (const skill of installed) {
      if (
        !savedSkillNames.value.includes(skill.name) &&
        !form.value.config.skills.some((item) => item.name === skill.name)
      )
        form.value.config.skills.push(skill)
    }
    savedSkillNames.value = installed.map((skill) => skill.name)
    emit('success')
  }
  async function rebuild() {
    await supportApi.index(form.value.id)
    ElMessage.success(t('索引重建已加入队列'))
  }
  watch(visible, async (open, _, onCleanup) => {
    if (!open) return
    let active = true
    onCleanup(() => {
      active = false
    })
    edit()
    loading.value = true
    try {
      if (props.data?.id) {
        const detail = await supportAppApi.get(props.data.id)
        if (!active) return
        edit(detail)
      }
      if (!agents.value.length) {
        let page = 1,
          result
        do {
          result = await supportApi.agents({ page: page++ })
          if (!active) return
          agents.value.push(...result.data)
        } while (agents.value.length < result.meta.total)
      }
    } catch {
      if (active) visible.value = false
    } finally {
      if (active) loading.value = false
    }
    await nextTick()
    if (active) formRef.value?.clearValidate()
  })
</script>
<style scoped>
  .field {
    width: 100%;
  }
  .field-tip {
    margin-top: 5px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--el-text-color-secondary);
    overflow-wrap: anywhere;
  }
  .effort-tip {
    margin-top: -12px;
  }
  .effort-tip .el-button,
  .model-tips .el-button {
    margin: 0 10px 0 0;
    font-size: 12px;
  }
  .model-tips {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 0;
  }
  .command-tip {
    max-width: 100%;
    margin-top: 4px;
    font-size: 12px;
  }
  .command-tip :deep(span) {
    white-space: normal;
    text-align: left;
    overflow-wrap: anywhere;
  }
  .secret-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .secret-row .el-button + .el-button {
    margin-left: 0;
  }
  :deep(.el-select) {
    width: 100%;
  }
  :deep(textarea) {
    scrollbar-width: none;
  }
  :deep(textarea::-webkit-scrollbar) {
    display: none;
  }
  :global(.support-app-dialog .el-dialog__body) {
    max-height: 65vh;
    overflow-y: auto;
    scrollbar-width: none;
  }
  :global(.support-app-dialog .el-dialog__body::-webkit-scrollbar) {
    display: none;
  }
</style>
