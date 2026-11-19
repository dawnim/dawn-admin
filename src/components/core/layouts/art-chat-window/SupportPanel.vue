<template>
  <div class="support-panel" :class="{ 'has-current': current, 'show-profile': profileVisible }">
    <aside class="support-inbox">
      <div class="support-toolbar"
        ><b>{{ t('客户会话') }}</b
        ><ElSwitch
          v-if="canReply"
          v-model="online"
          size="small"
          :active-text="online ? t('接待中') : t('开始接待')"
          :loading="changingPresence"
          @change="setPresence" />
        <TelegramBinding compact
      /></div>
      <div class="support-filters"
        ><ElSelect v-model="filter" size="small" @change="loadList()"
          ><ElOption
            v-for="item in filters"
            :key="item.value"
            :value="item.value"
            :label="item.label" /></ElSelect
        ><ElButton text size="small" :title="t('刷新')" @click="loadList()"
          ><ArtSvgIcon icon="ri:refresh-line" /></ElButton
      ></div>
      <ElSelect
        v-if="apps.length > 1"
        v-model="appId"
        clearable
        size="small"
        class="app-filter"
        :placeholder="t('全部应用')"
        @change="loadList()"
      >
        <ElOption v-for="app in apps" :key="app.id" :value="app.id" :label="app.name" />
      </ElSelect>
      <div class="support-rows" v-loading="loading"
        ><ElEmpty v-if="!rows.length && !loading" :description="t('暂无会话')" :image-size="58" />
        <button
          v-for="row in rows"
          :key="row.id"
          class="support-row"
          :class="{ selected: current?.id === row.id }"
          @click="select(row)"
          ><ArtAvatar v-if="row.avatar" :src="row.avatar" :size="36" /><span
            v-else
            class="visitor-avatar"
            ><ArtSvgIcon icon="ri:user-3-line" /></span
          ><span class="row-copy"
            ><b>{{ row.nickname || row.unique_id || t('访客') }}</b
            ><small>{{ eventText(row.content) || t('暂无消息') }}</small
            ><small v-if="apps.length > 1">{{ row.app_name }}</small></span
          ><span class="row-tail"
            ><ElTag
              v-if="row.visitor_online != null"
              size="small"
              effect="light"
              :type="row.visitor_online ? 'success' : 'info'"
              >{{ row.visitor_online ? t('在线') : t('离线') }}</ElTag
            ><ElTag size="small" effect="light" :type="statusTypes[row.status]">{{
              statuses[row.status]
            }}</ElTag
            ><i v-if="row.unread">{{ row.unread > 99 ? '99+' : row.unread }}</i></span
          ></button
        >
        <ElButton v-if="rows.length < total" text class="load-rows" @click="loadList(page + 1)">{{
          t('加载更多')
        }}</ElButton>
      </div>
    </aside>
    <main class="support-thread">
      <template v-if="current">
        <header class="thread-header"
          ><ElButton class="mobile-back" text :aria-label="t('返回')" @click="current = undefined"
            ><ArtSvgIcon icon="ri:arrow-left-line" /></ElButton
          ><div class="thread-title"
            ><b>{{
              detail?.user.nickname ||
              detail?.traits.attributes?.nick ||
              current.nickname ||
              current.unique_id ||
              detail?.user.unique_id
            }}</b
            ><small
              ><ElTag
                size="small"
                effect="light"
                :type="
                  current.support_session?.status === 'closing_pending'
                    ? 'warning'
                    : statusTypes[current.status]
                "
                >{{
                  current.support_session?.status === 'closing_pending'
                    ? t('等待客户确认结束')
                    : statuses[current.status]
                }}</ElTag
              ><span>#{{ current.id }}</span></small
            ></div
          ><ElButton text :title="t('客户资料')" @click="profileVisible = !profileVisible"
            ><ArtSvgIcon icon="ri:user-settings-line" /></ElButton
          ><ElSwitch
            v-if="canReply"
            v-model="online"
            class="mobile-presence"
            size="small"
            :active-text="online ? t('接待中') : t('开始接待')"
            :loading="changingPresence"
            @change="setPresence"
          />
          <ElDropdown v-if="canReply && online" trigger="click" @command="reception"
            ><ElButton size="small" :title="t('接待操作')"
              ><span class="reception-label">{{ t('接待操作') }}</span
              ><ArtSvgIcon
                :icon="viewportWidth < 760 ? 'ri:more-2-line' : 'ri:arrow-down-s-line'" /></ElButton
            ><template #dropdown
              ><ElDropdownMenu
                ><ElDropdownItem v-if="current.status === 'waiting'" command="claim">{{
                  t('接待客户')
                }}</ElDropdownItem
                ><ElDropdownItem v-if="owned" command="transfer">{{ t('转交客服') }}</ElDropdownItem
                ><ElDropdownItem
                  v-if="['waiting', 'closed'].includes(current.status)"
                  command="ai"
                  >{{ t('恢复AI接待') }}</ElDropdownItem
                ><ElDropdownItem
                  v-if="owned && current.support_session?.status !== 'closing_pending'"
                  command="close"
                  >{{ t('申请结束') }}</ElDropdownItem
                ><ElDropdownItem
                  v-if="owned && current.support_session?.status === 'closing_pending'"
                  command="cancel_close"
                  >{{ t('撤销结束申请') }}</ElDropdownItem
                ><ElDropdownItem v-if="current.status === 'ai'" command="human">{{
                  t('转人工')
                }}</ElDropdownItem></ElDropdownMenu
              ></template
            ></ElDropdown
          ></header
        >
        <div ref="messageContainer" class="support-messages" @scroll="markRead"
          ><ElButton
            v-if="hasMore"
            text
            size="small"
            :loading="loadingHistory"
            @click="loadMessages(true)"
            >{{ t('加载更早消息') }}</ElButton
          ><ElEmpty
            v-if="!messages.length && !loadingHistory"
            :description="t('暂无消息')"
            :image-size="60"
          />
          <article
            v-for="message in messages"
            :key="message.request_id || message.id"
            class="support-message"
            :class="{
              own: message.sender_realm === 'admin',
              event: message.type === 'event',
              internal: message.visibility !== 'public'
            }"
            ><small v-if="message.type !== 'event'"
              >{{
                message.type === 'event'
                  ? ''
                  : message.sender_realm === 'admin'
                    ? t('人工客服')
                    : message.sender_realm === 'ai'
                      ? t('AI客服')
                      : t('客户')
              }}
              <span v-if="message.visibility === 'internal'">· {{ t('内部备注') }}</span
              ><span v-if="message.visibility === 'draft'">· {{ t('AI建议') }}</span></small
            ><div class="support-bubble"
              ><ChatText
                :text="
                  message.type === 'event'
                    ? eventText(message.content) +
                      (message.payload?.rating
                        ? ` · ${t(({ 1: '差评', 2: '一般', 3: '好评' } as Record<number, string>)[message.payload.rating])} · ${message.payload.comment || ''}`
                        : '')
                    : message.content ||
                      (['queued', 'streaming'].includes(message.status) ? t('正在回复') : '')
                " /></div
            ><footer v-if="message.type !== 'event'"
              ><template
                v-if="
                  message.type === 'action' &&
                  message.payload?.action_status === 'waiting' &&
                  message.status !== 'cancelled' &&
                  owned
                "
                ><ElButton link size="small" @click="decide(message, true)">{{
                  t('确认操作')
                }}</ElButton
                ><ElButton link size="small" @click="decide(message, false)">{{
                  t('拒绝操作')
                }}</ElButton></template
              >
              <time>{{
                new Date(message.created_at || Date.now()).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              }}</time
              ><span v-if="message.status === 'cancelled'">{{ t('回复已停止') }}</span
              ><span
                v-if="message.visibility === 'draft' && message.status === 'failed'"
                role="alert"
                >{{ t('AI建议生成失败')
                }}<template v-if="message.payload?.error"
                  >：{{ message.payload.error }}</template
                ></span
              ><ElButton
                v-if="message.status === 'failed' && message.sender_realm === 'admin'"
                link
                size="small"
                @click="deliver(message)"
                >{{ t('发送失败，点击重试') }}</ElButton
              ><ElButton
                v-if="message.visibility === 'draft' && message.content && owned"
                link
                size="small"
                @click="useDraft(message)"
                >{{ t('使用建议') }}</ElButton
              ><span v-for="source in message.payload?.sources" :key="source.id" class="source">{{
                source.title
              }}</span></footer
            ></article
          >
        </div>
        <div
          v-if="preview?.content && now.getTime() - preview.updated_at < 60000"
          class="input-preview"
          ><ArtSvgIcon icon="ri:edit-line" /><span
            >{{ t('客户正在输入') }}：{{ preview.content }}</span
          ></div
        >
        <footer class="support-composer"
          ><div class="composer-tools"
            ><div class="composer-options" :class="{ disabled: !owned }" :inert="!owned"
              ><ChatEmoji @select="content += $event" /><ElRadioGroup
                v-model="visibility"
                size="small"
                ><ElRadioButton value="public">{{ t('回复客户') }}</ElRadioButton
                ><ElRadioButton value="internal">{{ t('内部备注') }}</ElRadioButton></ElRadioGroup
              ></div
            >
            <ElButton v-if="owned" text size="small" :loading="drafting" @click="requestDraft">{{
              t('AI协助')
            }}</ElButton></div
          ><ElInput
            v-model="content"
            type="textarea"
            :rows="3"
            resize="none"
            maxlength="16000"
            :disabled="!owned"
            :placeholder="
              owned
                ? t('输入消息')
                : !online
                  ? t('开始接待后可以回复客户')
                  : t('分配给您的会话才可回复')
            "
            @keydown="handleKey"
            @compositionstart="composing = true"
            @compositionend="composing = false"
          /><div class="composer-bottom"
            ><small>{{ t('Enter发送，Shift+Enter换行') }}</small
            ><ElButton
              type="primary"
              size="small"
              :disabled="!owned || !content.trim()"
              :loading="sending"
              @click="send"
              >{{ t('发送') }}</ElButton
            ></div
          ></footer
        >
      </template>
      <ElEmpty v-else :description="t('选择会话查看消息')" :image-size="90" />
    </main>
    <aside v-if="current && detail && profileVisible" class="support-profile"
      ><div class="support-toolbar"
        ><b>{{ t('客户资料') }}</b
        ><ElButton text size="small" @click="profileVisible = false"
          ><ArtSvgIcon icon="ri:close-line" /></ElButton></div
      ><div class="profile-content"
        ><div class="identity"
          ><ArtAvatar v-if="detail.user.avatar" :src="detail.user.avatar" :size="48" /><span
            v-else
            class="visitor-avatar profile-avatar"
            ><ArtSvgIcon icon="ri:user-3-line" /></span
          ><b>{{
            detail.user.nickname || detail.traits.attributes?.nick || detail.user.unique_id
          }}</b
          ><span>{{ detail.user.unique_id }}</span
          ><ElTag :type="detail.traits.verified_at ? 'success' : 'danger'" size="small">{{
            detail.traits.verified_at ? t('已验证') : t('未验证')
          }}</ElTag></div
        ><dl v-if="current.visitor_online != null">
          <dt>{{ t('客户状态') }}</dt
          ><dd>{{ current.visitor_online ? t('在线') : t('离线') }}</dd>
          <template v-if="current.visitor_last_online_at"
            ><dt>{{ t('最近在线') }}</dt
            ><dd>{{ new Date(current.visitor_last_online_at).toLocaleString() }}</dd></template
          >
          <template v-if="!current.visitor_online && current.visitor_offline_end_at"
            ><dt>{{ t('接待保留时间') }}</dt
            ><dd>{{ t('剩余{seconds}秒', { seconds: offlineRemaining }) }}</dd></template
          > </dl
        ><dl
          ><template v-for="(value, key) in identityFields" :key="key"
            ><dt>{{ identityLabels[key] || key }}</dt
            ><dd
              :class="
                key === 'user_id' ? (detail.traits.verified_at ? 'verified' : 'unverified') : ''
              "
              >{{ value }}</dd
            ></template
          ></dl
        ><ElDivider>{{ t('传入资料') }}</ElDivider
        ><dl
          ><template v-for="(value, key) in detail.traits.attributes || {}" :key="key"
            ><dt>{{ key }}</dt
            ><dd>{{ display(value) }}</dd></template
          ></dl
        ><ElDivider>{{ t('访问环境') }}</ElDivider
        ><dl
          ><template v-for="(value, key) in visitFields" :key="key"
            ><dt>{{ key }}</dt
            ><dd>{{ value }}</dd></template
          ></dl
        >
        <details class="raw-context"
          ><summary>{{ t('原始访问数据') }}</summary
          ><pre>{{ display(detail.traits.observed) }}</pre>
        </details>
        <component
          v-if="dawnConfig.support.customerInfo"
          :is="dawnConfig.support.customerInfo"
          :customer="detail"
          :conversation="current"
        /><ElDivider>{{ t('客服备注') }}</ElDivider
        ><ElInput v-model="remark" type="textarea" :rows="4" :disabled="!canReply" /><ElButton
          v-if="canReply"
          size="small"
          class="save-remark"
          @click="saveRemark"
          >{{ t('保存') }}</ElButton
        ></div
      ></aside
    >
    <ElDialog v-model="transferVisible" :title="t('转交客服')" width="360px" append-to-body
      ><ElSelect v-model="transferId" filterable style="width: 100%"
        ><ElOption
          v-for="agent in transferAgents"
          :key="agent.id"
          :value="agent.id"
          :label="`${agent.realname || agent.username} #${agent.id}`" /></ElSelect
      ><template #footer
        ><ElButton @click="transferVisible = false">{{ t('取消') }}</ElButton
        ><ElButton type="primary" @click="transfer">{{ t('确定') }}</ElButton></template
      ></ElDialog
    >
  </div>
</template>
<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
  import { useDebounceFn, useDocumentVisibility } from '@vueuse/core'
  import { useI18n } from 'vue-i18n'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import {
    supportApi,
    type SupportConversation,
    type CustomerDetail,
    type SupportMessage,
    type InputPreview,
    type SupportStatistics
  } from '@/api/support'
  import { realtime } from '@/dawn/realtime'
  import { dawnConfig } from '@/dawn/config'
  import TelegramBinding from './TelegramBinding.vue'
  import type { ChatContact } from '@/api/chat'
  import { supportUnread } from '@/dawn/chat'
  import { useUserStore } from '@/store/modules/user'
  import ChatEmoji from './ChatEmoji.vue'
  import ChatText from './ChatText.vue'
  const props = defineProps<{ active: boolean; canReply: boolean }>()
  const emit = defineEmits<{ statistics: [value: SupportStatistics] }>()
  const { t } = useI18n(),
    user = useUserStore(),
    documentVisibility = useDocumentVisibility()
  const now = useNow({ interval: 1000 })
  const offlineRemaining = computed(() =>
    Math.max(
      0,
      Math.ceil(((current.value?.visitor_offline_end_at || 0) - now.value.getTime()) / 1000)
    )
  )
  const apps = ref<{ id: number; name: string }[]>([]),
    appId = ref<number>()
  const rows = ref<SupportConversation[]>([]),
    current = ref<SupportConversation>(),
    detail = ref<CustomerDetail>(),
    messages = ref<SupportMessage[]>([])
  const loading = ref(false),
    loadingHistory = ref(false),
    drafting = ref(false),
    sending = ref(false),
    online = ref(false),
    changingPresence = ref(false),
    profileVisible = ref(window.innerWidth > 1000),
    filter = ref('all'),
    content = ref(''),
    visibility = ref('public'),
    remark = ref(''),
    preview = ref<InputPreview>(),
    composing = ref(false)
  const page = ref(1),
    total = ref(0),
    hasMore = ref(false),
    beforeId = ref<number>(),
    messageContainer = ref<HTMLElement>(),
    transferVisible = ref(false),
    transferId = ref(1)
  const transferAgents = ref<ChatContact[]>([])
  const drafts = new Map<number, string>(),
    versions = new Map<number, { attempt: number; sequence: number }>()
  let revision = 0,
    selectedRevision = 0,
    disposed = false,
    presenceRevision = 0
  const { width: viewportWidth } = useWindowSize()
  watch(viewportWidth, (width) => {
    if (width < 760) profileVisible.value = false
  })
  const statuses = computed(() => ({
    ai: t('AI接待'),
    waiting: t('等待人工'),
    human: t('人工接待'),
    closed: t('已结束')
  }))
  const statusTypes = {
    ai: 'primary',
    waiting: 'warning',
    human: 'success',
    closed: 'info'
  } as const
  const filters = computed(() => [
    { value: 'mine', label: t('我的接待') },
    { value: 'waiting', label: t('等待人工') },
    { value: 'all', label: t('全部会话') },
    { value: 'ai', label: t('AI接待') },
    { value: 'closed', label: t('已结束') }
  ])
  const owned = computed(
    () =>
      props.canReply &&
      online.value &&
      !changingPresence.value &&
      current.value?.status === 'human' &&
      current.value.assigned_admin_id === user.info.id
  )
  const identityFields = computed(() =>
    detail.value
      ? Object.fromEntries(
          Object.entries({
            user_id: detail.value.traits.verified_at
              ? detail.value.traits.external_user_id || detail.value.user.id
              : detail.value.traits.attributes?.user_id || detail.value.user.id,
            provider:
              detail.value.traits.identity_provider ||
              (detail.value.traits.verified_at ? t('本站账号') : t('访客')),
            username: detail.value.user.username || '',
            mobile: detail.value.user.mobile,
            email: detail.value.user.email,
            telegram_id: detail.value.user.telegram_id,
            telegram_username: detail.value.user.telegram_username
          }).filter(([, value]) => value !== '' && value !== null && value !== undefined)
        )
      : {}
  )
  const identityLabels = computed<Record<string, string>>(() => ({
    user_id: t('用户ID'),
    provider: t('身份来源'),
    username: t('用户名'),
    mobile: t('手机号'),
    email: t('邮箱'),
    telegram_id: 'Telegram ID',
    telegram_username: t('Telegram用户名')
  }))
  const visitFields = computed(() => {
    const env = detail.value?.traits.observed || {}
    const geo = (env.geo_ip || {}) as Record<string, unknown>
    return Object.fromEntries(
      Object.entries({
        [t('IP地址')]: env.ip,
        [t('所在地区')]:
          [geo.country, geo.province, geo.city].filter(Boolean).join(' · ') || geo.location,
        [t('网络运营商')]: geo.isp || geo.organization,
        [t('当前页面')]: env.page_url,
        [t('来源页面')]: env.referrer,
        [t('语言')]: env.language,
        [t('时区')]: env.time_zone
      }).filter(([, value]) => value)
    )
  })
  const display = (value: unknown) =>
    typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '')
  const eventText = (value: string) =>
    (
      ({
        human: t('已申请人工客服'),
        claim: t('客服已接待'),
        transfer: t('已转交其他客服'),
        ai: t('已恢复AI接待'),
        close: t('客服申请结束，请客户确认'),
        cancel_close: t('客服已撤销结束申请'),
        closing_accepted: t('客户已同意结束'),
        offline_closed: t('因长时间离线，本次人工接待已结束'),
        offline_cancelled: t('因长时间离线，本次人工排队已取消'),
        closing_rejected: t('客户继续咨询'),
        客户评价: t('客户评价')
      }) as Record<string, string>
    )[value] || value
  async function loadList(nextPage = 1, openFirst = false) {
    const version = ++revision
    loading.value = true
    try {
      const result = await supportApi.inbox({
        page: nextPage,
        app_id: appId.value,
        ...(filter.value === 'mine'
          ? { mine: '1' }
          : filter.value === 'all'
            ? {}
            : { status: filter.value })
      })
      if (disposed || version !== revision) return
      rows.value = nextPage === 1 ? result.data : [...rows.value, ...result.data]
      apps.value = result.meta.apps || []
      total.value = result.meta.total
      page.value = nextPage
      supportUnread.value = result.meta.unread_total
      emit('statistics', result.meta.statistics)
      const updated = rows.value.find((row) => row.id === current.value?.id)
      if (updated && current.value && updated.version >= current.value.version)
        Object.assign(current.value, updated)
      if (openFirst && !current.value && rows.value.length)
        await select(rows.value.find((row) => row.unread > 0) || rows.value[0])
    } finally {
      if (version === revision) loading.value = false
    }
  }
  const refreshList = useDebounceFn(() => loadList(), 300, { maxWait: 1500 })
  async function select(row: SupportConversation) {
    if (current.value) drafts.set(current.value.id, content.value)
    const version = ++selectedRevision
    current.value = { ...row }
    content.value = drafts.get(row.id) || ''
    drafting.value = false
    messages.value = []
    detail.value = undefined
    preview.value = undefined
    const result = await supportApi.detail(row.id)
    if (version !== selectedRevision || disposed) return
    detail.value = result
    Object.assign(current.value, result.conversation)
    remark.value = result.traits.remark || ''
    preview.value = result.input_previews?.at(-1)
    await loadMessages()
  }
  async function loadMessages(older = false) {
    const selected = current.value
    if (!selected) return
    loadingHistory.value = true
    const height = messageContainer.value?.scrollHeight || 0
    try {
      const result = await supportApi.messages(selected.id, older ? beforeId.value : undefined)
      if (current.value?.id !== selected.id || disposed) return
      const combined = older
        ? [...messages.value, ...result.data]
        : [
            ...messages.value.filter(
              (message) => !message.id || message.id > (result.data[0]?.id || 0)
            ),
            ...result.data
          ]
      messages.value = [
        ...new Map(combined.map((message) => [message.request_id, message])).values()
      ].sort((a, b) => (a.id || Infinity) - (b.id || Infinity))
      drafting.value = messages.value.some(
        (message) =>
          message.visibility === 'draft' && ['queued', 'streaming'].includes(message.status)
      )
      hasMore.value = result.meta.has_more
      beforeId.value = result.meta.before_id
      await nextTick()
      if (messageContainer.value)
        messageContainer.value.scrollTop = older
          ? messageContainer.value.scrollHeight - height
          : messageContainer.value.scrollHeight
      void markRead()
    } finally {
      loadingHistory.value = false
    }
  }
  const markRead = useDebounceFn(async () => {
    const selected = current.value,
      element = messageContainer.value
    if (
      !selected ||
      !props.active ||
      documentVisibility.value !== 'visible' ||
      (element && element.scrollHeight - element.scrollTop - element.clientHeight > 50)
    )
      return
    const last = messages.value
      .filter((message) => message.id && message.status === 'completed')
      .at(-1)
    if (!last || last.id <= selected.last_read_message_id) return
    await supportApi.read(selected.id, last.id)
    selected.last_read_message_id = Math.max(selected.last_read_message_id, last.id)
    void refreshList()
  }, 300)
  function useDraft(message: SupportMessage) {
    if (!content.value.trim()) content.value = message.content
    else
      void ElMessageBox.confirm(t('替换当前输入内容'), t('使用建议'))
        .then(() => {
          content.value = message.content
        })
        .catch(() => {})
  }
  async function deliver(message: SupportMessage) {
    if (!current.value || !owned.value || sending.value) return
    sending.value = true
    message.status = 'sending'
    try {
      const saved = await supportApi.send(message.conversation_id, {
        request_id: message.request_id,
        content: message.content,
        visibility: message.visibility,
        version: current.value.version
      })
      Object.assign(message, saved)
      await syncDetail()
      void refreshList()
    } catch {
      message.status = 'failed'
    } finally {
      sending.value = false
    }
  }
  async function send() {
    if (!owned.value || !content.value.trim() || !current.value || sending.value) return
    const message: SupportMessage = {
      id: 0,
      request_id: crypto.randomUUID(),
      conversation_id: current.value.id,
      sender_realm: 'admin',
      sender_subject: String(user.info.id),
      type: 'text',
      status: 'sending',
      content: content.value,
      visibility: visibility.value as 'public' | 'internal',
      created_at: Date.now()
    }
    content.value = ''
    drafts.delete(current.value.id)
    messages.value.push(message)
    await nextTick()
    if (messageContainer.value)
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    await deliver(message)
  }
  function handleKey(event: Event | KeyboardEvent) {
    if (!(event instanceof KeyboardEvent)) return
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault()
      void send()
    }
  }
  async function syncDetail() {
    const id = current.value?.id
    if (!id) return
    const result = await supportApi.detail(id)
    if (current.value?.id !== id) return
    detail.value = result
    Object.assign(current.value, result.conversation)
  }
  async function reception(action: string) {
    if (!current.value) return
    const conversationID = current.value.id
    if (action === 'transfer') {
      const appID = current.value.app_id
      transferAgents.value = []
      let page = 1,
        result
      do {
        result = await supportApi.agents({ page: page++, app_id: appID })
        transferAgents.value.push(...result.data)
      } while (transferAgents.value.length < result.meta.total)
      if (current.value?.id !== conversationID) return
      transferId.value =
        transferAgents.value.find((agent) => agent.id !== user.info.id)?.id || user.info.id || 1
      transferVisible.value = true
      return
    }
    const version = current.value.version
    const updated = await supportApi.reception(conversationID, action, version)
    if (current.value?.id !== conversationID) return
    Object.assign(current.value, updated)
    await syncDetail()
    if (current.value?.id !== conversationID) return
    await loadMessages()
    void refreshList()
  }
  async function transfer() {
    if (!current.value) return
    const conversationID = current.value.id
    const version = current.value.version
    const updated = await supportApi.reception(
      conversationID,
      'transfer',
      version,
      transferId.value
    )
    if (current.value?.id !== conversationID) return
    Object.assign(current.value, updated)
    transferVisible.value = false
    void refreshList()
  }
  async function decide(message: SupportMessage, approved: boolean) {
    if (message.payload?.action_id) {
      await supportApi.action(message.payload.action_id, approved)
      await loadMessages()
    }
  }
  async function requestDraft() {
    if (!current.value || drafting.value) return
    drafting.value = true
    try {
      const id = current.value.id
      const message = await supportApi.draft(id)
      if (current.value?.id !== id) return
      if (!messages.value.some((row) => row.id === message.id)) messages.value.push(message)
      drafting.value = messages.value.some(
        (row) => row.visibility === 'draft' && ['queued', 'streaming'].includes(row.status)
      )
      await nextTick()
      if (messageContainer.value)
        messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    } catch {
      drafting.value = false
    }
  }
  async function setPresence() {
    if (changingPresence.value) return
    changingPresence.value = true
    ++presenceRevision
    try {
      await supportApi.presence(online.value)
      await loadList(1, true)
      if (current.value) await syncDetail()
    } catch {
      await refreshPresence()
    } finally {
      changingPresence.value = false
    }
  }
  async function refreshPresence() {
    if (!props.canReply) return
    const version = presenceRevision
    try {
      const result = await supportApi.heartbeat()
      if (!disposed && version === presenceRevision) online.value = result.online
    } catch {
      online.value = false
    }
  }
  async function saveRemark() {
    if (!current.value) return
    await supportApi.traits(current.value.id, { remark: remark.value })
    ElMessage.success(t('保存成功'))
  }
  const heartbeat = setInterval(() => {
    void refreshPresence()
    if (props.active) void refreshList()
  }, 45000)
  const stops = [
    'ready',
    'resync_required',
    'support.inbox.updated',
    'support.reception.updated',
    'support.input.updated',
    'chat.message.created',
    'chat.message.updated',
    'chat.message.delta',
    'chat.read.updated'
  ].map((type) =>
    realtime.on(type, async (event) => {
      if (disposed) return
      if (type === 'ready' || type === 'resync_required') {
        await loadList()
        if (current.value && props.active) await loadMessages()
        return
      }
      const data = ((event.data as { data?: unknown })?.data || event.data) as SupportMessage & {
        preview?: InputPreview
        conversation?: SupportConversation
      }
      if (type === 'support.inbox.updated' || type === 'chat.read.updated') {
        void refreshList()
        return
      }
      if (data.conversation_id !== current.value?.id) return
      if (type === 'support.input.updated') {
        if (
          data.preview &&
          (!preview.value ||
            data.preview.device !== preview.value.device ||
            data.preview.sequence > preview.value.sequence)
        )
          preview.value = data.preview
        return
      }
      if (type === 'support.reception.updated') {
        if (
          data.conversation &&
          (data.conversation.version > current.value.version ||
            (data.conversation.version === current.value.version &&
              (data.conversation.support_session?.version || 0) >=
                (current.value.support_session?.version || 0)))
        )
          Object.assign(current.value, data.conversation)
        void refreshList()
        return
      }
      const existing = messages.value.find(
        (message) =>
          message.id === data.id || (message.request_id && message.request_id === data.request_id)
      )
      if (type === 'chat.message.delta') {
        const version = versions.get(data.id)
        if (
          (existing && ['completed', 'cancelled', 'failed'].includes(existing.status)) ||
          (version &&
            ((data.attempt || 0) < version.attempt ||
              (data.attempt === version.attempt && (data.sequence || 0) <= version.sequence)))
        )
          return
        versions.set(data.id, { attempt: data.attempt || 0, sequence: data.sequence || 0 })
      }
      if (existing) Object.assign(existing, data)
      if (data.visibility === 'draft' && ['completed', 'failed', 'cancelled'].includes(data.status))
        drafting.value = false
      if (!existing && data.request_id) messages.value.push(data)
      messages.value.sort((a, b) => (a.id || Infinity) - (b.id || Infinity))
      if (
        data.visibility === 'draft' &&
        data.status === 'completed' &&
        !content.value.trim() &&
        !composing.value &&
        props.active &&
        documentVisibility.value === 'visible' &&
        owned.value
      )
        content.value = data.content
      if (data.sender_realm?.startsWith('support:')) preview.value = undefined
      await nextTick()
      const element = messageContainer.value
      if (element && element.scrollHeight - element.scrollTop - element.clientHeight < 150)
        element.scrollTop = element.scrollHeight
      void markRead()
      if (type !== 'chat.message.delta') void refreshList()
    })
  )
  watch(
    () => props.active,
    async (active) => {
      if (active) {
        const selected = current.value?.id
        void refreshPresence()
        await loadList(1, true)
        if (selected && selected === current.value?.id) await loadMessages()
        void markRead()
      }
    },
    { immediate: true }
  )
  onBeforeUnmount(() => {
    disposed = true
    ++revision
    ++selectedRevision
    stops.forEach((stop) => stop())
    clearInterval(heartbeat)
    supportUnread.value = 0
  })
</script>
<style scoped>
  .visitor-avatar {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: var(--chat-avatar-bg);
    color: var(--chat-avatar-text);
    font-size: 19px;
  }
  .profile-avatar {
    width: 48px;
    height: 48px;
    font-size: 26px;
  }
  .profile-content dd {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .raw-context {
    margin-top: 12px;
    color: var(--chat-muted);
    font-size: 11px;
  }
  .raw-context summary {
    cursor: pointer;
  }
  .raw-context pre {
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    margin: 10px 0;
    font:
      10px/1.6 ui-monospace,
      monospace;
  }
  .support-panel {
    display: flex;
    flex: 1;
    min-height: 0;
    background: var(--chat-panel);
    color: var(--chat-text);
    font-size: 12px;
  }
  .composer-options.disabled {
    opacity: 0.45;
    pointer-events: none;
  }
  .support-inbox {
    width: 270px;
    flex-shrink: 0;
    border-right: 1px solid var(--chat-line);
    display: flex;
    flex-direction: column;
  }
  .support-toolbar,
  .thread-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 14px;
    border-bottom: 1px solid var(--chat-line);
    min-height: 54px;
    background: var(--chat-header);
  }
  .support-filters {
    display: flex;
    gap: 6px;
    padding: 10px;
  }
  .app-filter {
    margin: 0 10px 10px;
    width: calc(100% - 20px);
  }
  .support-rows {
    overflow: auto;
    flex: 1;
  }
  .support-row {
    border: 0;
    background: transparent;
    color: inherit;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 13px 12px;
    width: 100%;
    text-align: left;
    transition: background 0.15s;
    cursor: pointer;
  }
  .support-row:hover,
  .support-row.selected {
    background: var(--chat-hover);
  }
  .support-row.selected {
    box-shadow: inset 3px 0 var(--el-color-primary);
  }
  .row-copy {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
    gap: 4px;
  }
  .row-copy b,
  .row-copy small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .row-copy b {
    font-size: 13px;
    font-weight: 600;
  }
  .row-copy small {
    font-size: 11px;
    color: var(--chat-muted);
  }
  .row-tail {
    display: flex;
    align-items: end;
    gap: 5px;
    flex-direction: column;
  }
  .row-tail i {
    background: var(--el-color-danger);
    color: #fff;
    font-size: 9px;
    border-radius: 8px;
    min-width: 15px;
    padding: 0 4px;
    text-align: center;
    font-style: normal;
  }
  .support-thread {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }
  .support-thread > .el-empty {
    margin: auto;
  }
  .thread-title {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    gap: 3px;
  }
  .thread-title small {
    font-size: 10px;
    color: var(--chat-muted);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .support-panel :deep(.el-tag) {
    border-color: transparent;
  }
  .thread-title :deep(.el-tag) {
    height: 18px;
    padding: 0 5px;
    font-size: 10px;
  }
  .thread-header {
    padding: 10px 14px;
  }
  .support-messages {
    flex: 1;
    overflow: auto;
    padding: 18px 20px;
    background: var(--chat-bg);
    display: flex;
    flex-direction: column;
    gap: 16px;
    scrollbar-width: thin;
  }
  .support-message {
    align-self: flex-start;
    max-width: 90%;
    overflow-wrap: anywhere;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .support-message.own {
    align-self: flex-end;
  }
  .support-message > small {
    font-size: 10px;
    color: var(--chat-muted);
  }
  .support-bubble {
    white-space: pre-wrap;
    padding: 10px 13px;
    border-radius: 12px 12px 12px 3px;
    background: var(--chat-panel);
    line-height: 1.65;
    font-size: 13px;
    box-shadow: var(--chat-shadow);
  }
  .own .support-bubble {
    background: var(--chat-own-bubble);
    color: var(--chat-own-text);
    border-radius: 12px 12px 3px 12px;
  }
  .internal .support-bubble {
    background: var(--el-color-warning-light-9);
    border: 1px dashed var(--el-color-warning-light-5);
  }
  .support-message.event {
    align-self: center;
    font-size: 10px;
    color: var(--chat-muted);
  }
  .event .support-bubble {
    background: var(--chat-time-bg);
    border-radius: 12px;
    padding: 3px 10px;
    font-size: 11px;
  }
  .support-message footer {
    display: flex;
    gap: 7px;
    align-items: center;
    font-size: 9px;
    color: var(--el-text-color-placeholder);
    flex-wrap: wrap;
  }
  .source {
    font-size: 9px;
    color: var(--el-color-primary);
  }
  .input-preview {
    display: flex;
    gap: 8px;
    padding: 8px 14px;
    background: var(--el-color-warning-light-9);
    color: var(--el-color-warning);
    font-size: 11px;
    max-height: 65px;
    overflow: auto;
    white-space: pre-wrap;
  }
  .input-preview span {
    overflow-wrap: anywhere;
    min-width: 0;
  }
  .support-composer {
    padding: 10px 14px 12px;
    border-top: 1px solid var(--chat-line);
  }
  .composer-options {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .composer-tools,
  .composer-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .composer-bottom {
    margin: 8px 0 0;
  }
  .composer-bottom small {
    font-size: 10px;
    color: var(--el-text-color-placeholder);
  }
  .composer-bottom :deep(.el-button) {
    margin-left: auto;
  }
  .support-composer :deep(.el-textarea__inner) {
    font-size: 12px;
    box-shadow: none;
    background: var(--chat-bg);
  }
  .support-profile {
    width: 260px;
    flex-shrink: 0;
    border-left: 1px solid var(--chat-line);
    display: flex;
    flex-direction: column;
  }
  .profile-content {
    padding: 16px;
    overflow: auto;
    font-size: 11px;
  }
  .identity {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 18px;
  }
  .identity > span {
    color: var(--chat-muted);
  }
  dl {
    margin: 0;
    display: grid;
    grid-template-columns: 82px minmax(0, 1fr);
    gap: 9px 8px;
  }
  dt {
    color: var(--chat-muted);
    overflow-wrap: anywhere;
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
  .verified {
    color: var(--el-color-success);
  }
  .unverified {
    color: var(--el-color-danger);
  }
  .save-remark {
    margin-top: 8px;
  }
  .support-profile :deep(.el-divider__text) {
    font-size: 11px;
  }
  .mobile-back {
    display: none;
  }
  .mobile-presence {
    display: none;
  }
  .load-rows {
    width: 100%;
  }
  @media (max-width: 1000px) {
    .support-profile {
      width: 225px;
    }
    .support-inbox {
      width: 220px;
    }
  }
  @media (max-width: 760px) {
    .reception-label {
      display: none;
    }
    .support-inbox {
      width: 100%;
    }
    .support-thread {
      display: none;
    }
    .has-current .support-inbox {
      display: none;
    }
    .has-current .support-thread {
      display: flex;
    }
    .mobile-back {
      display: inline-flex;
    }
    .mobile-presence {
      display: inline-flex;
    }
    .support-profile {
      display: none;
    }
    .has-current.show-profile .support-profile {
      display: flex;
      position: absolute;
      right: 0;
      bottom: 0;
      top: 58px;
      z-index: 2;
      width: min(320px, 90%);
      background: var(--chat-panel);
      box-shadow: -10px 0 40px #0002;
    }
    .support-messages {
      padding: 14px;
    }
    .composer-bottom small {
      display: none;
    }
  }
</style>
