<template>
  <ElButton :disabled="disabled" text size="small" :title="t('绑定Telegram')" @click="open"
    ><ArtSvgIcon v-if="compact" icon="ri:telegram-2-line" /><template v-else>{{
      t('绑定Telegram')
    }}</template></ElButton
  >
  <ElDialog v-model="visible" :title="t('绑定Telegram')" width="min(480px,95vw)" append-to-body
    ><p class="binding-help">{{ t('向任意已配置的客服机器人私聊发送下面的命令，然后返回确认') }}</p
    ><ElInput :model-value="`/bind ${code}`" readonly
      ><template #append
        ><ElButton @click="copy">{{ t('复制') }}</ElButton></template
      ></ElInput
    ><ElAlert
      class="mt-4"
      :title="t('绑定码5分钟内有效，只能绑定当前登录的管理员')"
      type="info"
      :closable="false"
    /><div v-if="binding.user_id" class="bound-profile"
      ><b>{{ binding.nickname }}</b
      ><span>@{{ binding.username }} · {{ binding.telegram_id }}</span></div
    ><template #footer
      ><ElButton @click="check">{{ t('检查绑定') }}</ElButton
      ><ElButton type="primary" :disabled="!binding.user_id" @click="confirm">{{
        t('确认绑定')
      }}</ElButton></template
    ></ElDialog
  >
</template>
<script setup lang="ts">
  import { ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { ElMessage } from 'element-plus'
  import request from '@/utils/http'
  defineProps<{ compact?: boolean; disabled?: boolean }>()
  const { t } = useI18n(),
    visible = ref(false),
    code = ref(''),
    binding = ref<{ user_id?: number; nickname?: string; username?: string; telegram_id?: number }>(
      {}
    )
  async function open() {
    const result = await request.post<{ code: string }>({ url: '/telegram-bindings' })
    code.value = result.code
    binding.value = {}
    visible.value = true
  }
  async function check() {
    binding.value = await request.get({ url: `/telegram-bindings/${code.value}` })
    if (!binding.value.user_id) ElMessage.info(t('等待Telegram验证'))
  }
  async function copy() {
    await navigator.clipboard.writeText(`/bind ${code.value}`)
    ElMessage.success(t('复制成功'))
  }
  async function confirm() {
    await request.put({ url: '/telegram-binding', data: { code: code.value } })
    visible.value = false
    ElMessage.success(t('绑定成功'))
  }
</script>
<style scoped>
  .binding-help {
    font-size: 13px;
    line-height: 1.8;
    margin-bottom: 18px;
    color: var(--el-text-color-secondary);
  }
  .bound-profile {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 18px 0 0;
  }
  .bound-profile span {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
</style>
