<template>
  <ElDrawer
    v-model="visible"
    :size="isMobile ? '100%' : '420px'"
    :with-header="false"
    class="wechat-drawer"
  >
    <section class="wechat-chat" :class="{ 'is-dark': settingStore.isDark }">
      <header class="chat-header">
        <button
          v-if="current || contactsVisible"
          class="header-action"
          :aria-label="t('返回')"
          @click="current ? (current = undefined) : (contactsVisible = false)"
        >
          <ArtSvgIcon icon="ri:arrow-left-s-line" />
        </button>
        <span v-else class="header-action" />
        <h2>{{
          current
            ? current.realname || current.username
            : contactsVisible
              ? t('发起聊天')
              : t('聊天')
        }}</h2>
        <div class="header-tools">
          <button
            class="header-action theme-action"
            :aria-label="settingStore.isDark ? t('切换至亮色') : t('切换至暗色')"
            :title="settingStore.isDark ? t('切换至亮色') : t('切换至暗色')"
            @click="
              switchThemeStyles(settingStore.isDark ? SystemThemeEnum.LIGHT : SystemThemeEnum.DARK)
            "
          >
            <ArtSvgIcon :icon="settingStore.isDark ? 'ri:sun-line' : 'ri:moon-line'" />
          </button>
          <button class="header-action" :aria-label="t('关闭')" @click="visible = false"
            ><ArtSvgIcon icon="ri:close-line"
          /></button>
        </div>
      </header>
      <template v-if="!current">
        <div class="chat-search">
          <ElInput
            v-if="contactsVisible"
            v-model="search"
            clearable
            :placeholder="t('搜索管理员')"
            @keyup.enter="loadContacts()"
          >
            <template #prefix><ArtSvgIcon icon="ri:search-line" /></template>
          </ElInput>
          <template v-else>
            <button
              class="search-entry"
              @click="
                () => {
                  contactsVisible = true
                  loadContacts()
                }
              "
              ><ArtSvgIcon icon="ri:search-line" />{{ t('搜索联系人') }}</button
            >
          </template>
        </div>
        <div
          class="conversation-list"
          v-loading="
            contactsVisible
              ? loadingContacts && !contacts.length
              : loadingList && !conversations.length
          "
        >
          <template v-if="contactsVisible">
            <ElEmpty v-if="!contacts.length && !loadingContacts" :description="t('暂无联系人')" />
            <button
              v-for="item in contacts"
              :key="item.id"
              class="conversation-row"
              @click="open({ ...item, user_id: item.id })"
            >
              <span class="chat-avatar"
                ><ArtAvatar v-if="item.avatar" :src="item.avatar" :size="44" /><span v-else>{{
                  (item.realname || item.username).slice(0, 1)
                }}</span></span
              >
              <span class="conversation-copy"
                ><span class="conversation-name">{{ item.realname || item.username }}</span
                ><span class="conversation-preview">{{ item.username }}</span></span
              >
            </button>
            <button
              v-if="contacts.length < contactsTotal"
              class="load-more"
              @click="loadContacts(contactsPage + 1)"
              >{{ t('加载更多') }}</button
            >
          </template>
          <template v-else>
            <ElEmpty v-if="!conversations.length && !loadingList" :description="t('暂无会话')" />
            <button
              v-for="item in conversations"
              :key="item.id"
              class="conversation-row"
              @click="select(item)"
            >
              <span class="chat-avatar"
                ><ArtAvatar v-if="item.avatar" :src="item.avatar" :size="44" /><span v-else>{{
                  (item.realname || item.username).slice(0, 1)
                }}</span
                ><b v-if="item.unread" class="unread-badge">{{
                  item.unread > 99 ? '99+' : item.unread
                }}</b></span
              >
              <span class="conversation-copy"
                ><span class="conversation-top"
                  ><span class="conversation-name">{{ item.realname || item.username }}</span
                  ><time>{{
                    item.last_message_at
                      ? new Date(item.last_message_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : ''
                  }}</time></span
                ><span class="conversation-preview">{{ item.content || t('暂无消息') }}</span></span
              >
            </button>
            <button
              v-if="conversations.length < total"
              class="load-more"
              @click="loadList(page + 1)"
              >{{ t('加载更多') }}</button
            >
          </template>
        </div>
      </template>
      <template v-else>
        <div ref="messageContainer" class="message-list" @scroll="markRead">
          <button
            v-if="hasMore"
            class="load-more"
            :disabled="loadingHistory"
            @click="loadMessages(true)"
            >{{ t('加载更早消息') }}</button
          >
          <ElEmpty v-if="!messages.length && !loadingHistory" :description="t('暂无消息')" />
          <template v-for="(message, index) in messages" :key="message.request_id">
            <div
              v-if="!index || message.created_at - messages[index - 1].created_at > 300000"
              class="message-time"
              >{{ dateLabel(message.created_at) }}</div
            >
            <div class="message-row" :class="{ mine: isMe(message) }">
              <span class="chat-avatar message-avatar"
                ><ArtAvatar
                  v-if="isMe(message) ? user.info.avatar : current.avatar"
                  :src="isMe(message) ? user.info.avatar : current.avatar"
                  :size="38"
                /><span v-else>{{
                  (isMe(message)
                    ? user.info.realname || user.info.username || ''
                    : current.realname || current.username
                  ).slice(0, 1)
                }}</span></span
              >
              <div class="message-copy">
                <div class="message-bubble">{{ message.content }}</div>
                <div v-if="isMe(message)" class="message-status">
                  <span v-if="message.status === 'sending'">{{ t('发送中') }}</span>
                  <button
                    v-else-if="message.status === 'failed'"
                    class="retry-message"
                    @click="deliver(message)"
                    >{{ t('发送失败，点击重试') }}</button
                  >
                  <span v-else>{{
                    message.id <= current.peer_last_read_message_id ? t('已读') : t('已发送')
                  }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>
        <footer class="chat-composer">
          <ElInput
            v-model="content"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 4 }"
            resize="none"
            maxlength="4000"
            :placeholder="t('输入消息')"
            @keydown="handleKey"
          />
          <button class="send-message" :disabled="!content.trim()" @click="send">{{
            t('发送')
          }}</button>
        </footer>
      </template>
    </section>
  </ElDrawer>
</template>
<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
  import { useWindowSize, useDocumentVisibility, useDebounceFn } from '@vueuse/core'
  import { useI18n } from 'vue-i18n'
  import { chatApi, type Conversation, type ChatMessage, type ChatContact } from '@/api/chat'
  import { chatUnread } from '@/dawn/chat'
  import { dateLabel } from '@/dawn/types'
  import { realtime } from '@/dawn/realtime'
  import { mittBus } from '@/utils/sys'
  import { useUserStore } from '@/store/modules/user'
  import { useSettingStore } from '@/store/modules/setting'
  import { useTheme } from '@/hooks/core/useTheme'
  import { SystemThemeEnum } from '@/enums/appEnum'

  defineOptions({ name: 'ArtChatWindow' })
  const { t } = useI18n()
  const user = useUserStore()
  const settingStore = useSettingStore()
  const { switchThemeStyles } = useTheme()
  const { width } = useWindowSize()
  const documentVisibility = useDocumentVisibility()
  const isMobile = computed(() => width.value < 640)
  const visible = ref(false)
  const current = ref<Conversation>()
  const contactsVisible = ref(false)
  const contacts = ref<ChatContact[]>([])
  const search = ref(''),
    contactsPage = ref(1),
    contactsTotal = ref(0)
  const loadingContacts = ref(false)
  let disposed = false
  let contactsRevision = 0
  const conversations = ref<Conversation[]>([])
  const messages = ref<ChatMessage[]>([])
  const content = ref('')
  const page = ref(1),
    total = ref(0)
  const hasMore = ref(false),
    beforeId = ref<number>()
  const loadingList = ref(false),
    loadingHistory = ref(false)
  const messageContainer = ref<HTMLElement>()
  let listRevision = 0,
    opening = 0
  const isMe = (message: ChatMessage) =>
    message.sender_realm === 'admin' && message.sender_subject === String(user.info.id)

  async function loadContacts(nextPage = 1) {
    if (disposed) return
    const revision = ++contactsRevision
    loadingContacts.value = true
    try {
      const result = await chatApi.contacts(nextPage, search.value)
      if (revision !== contactsRevision) return
      contacts.value = nextPage === 1 ? result.data : [...contacts.value, ...result.data]
      contactsPage.value = nextPage
      contactsTotal.value = result.meta.total
    } finally {
      if (revision === contactsRevision) loadingContacts.value = false
    }
  }
  async function loadList(nextPage = 1) {
    if (disposed) return
    const revision = ++listRevision
    loadingList.value = true
    try {
      const result = await chatApi.list(nextPage)
      if (revision !== listRevision) return
      conversations.value = nextPage === 1 ? result.data : [...conversations.value, ...result.data]
      page.value = nextPage
      total.value = result.meta.total
      chatUnread.value = result.meta.unread_total
      const updated = conversations.value.find((item) => item.id === current.value?.id)
      if (updated && current.value) current.value = updated
    } finally {
      if (revision === listRevision) loadingList.value = false
    }
  }
  const refreshList = useDebounceFn(() => loadList(), 250, { maxWait: 1000 })
  const searchContacts = useDebounceFn(() => loadContacts(), 250)
  watch(search, () => {
    void searchContacts()
  })
  let reading = false
  const markRead = useDebounceFn(
    async () => {
      const selected = current.value
      if (reading || !visible.value || !selected || documentVisibility.value !== 'visible') return
      const element = messageContainer.value
      if (!element || element.scrollHeight - element.scrollTop - element.clientHeight > 30) return
      const last = messages.value
        .filter((item) => item.id && item.status === 'completed' && !isMe(item))
        .at(-1)
      if (!last || last.id <= selected.last_read_message_id) return
      reading = true
      try {
        await chatApi.read(selected.id, last.id)
        applyRead(selected.id, String(user.info.id), last.id)
      } catch {
        return
      } finally {
        reading = false
      }
      const latestIncoming = messages.value
        .filter((item) => item.id && item.status === 'completed' && !isMe(item))
        .at(-1)
      if (latestIncoming && latestIncoming.id > selected.last_read_message_id) void markRead()
    },
    250,
    { maxWait: 1000 }
  )

  function applyRead(id: number, subject: string, messageId: number) {
    const row = conversations.value.find((item) => item.id === id)
    for (const item of [row, current.value?.id === id ? current.value : undefined]) {
      if (!item) continue
      if (subject === String(user.info.id))
        item.last_read_message_id = Math.max(item.last_read_message_id, messageId)
      else item.peer_last_read_message_id = Math.max(item.peer_last_read_message_id, messageId)
    }
    if (subject === String(user.info.id) && row) {
      if (messageId >= row.last_message_id) {
        chatUnread.value = Math.max(0, chatUnread.value - row.unread)
        row.unread = 0
      } else void refreshList()
    }
  }
  async function loadMessages(older = false) {
    const selected = current.value
    if (!selected) return
    loadingHistory.value = true
    const element = messageContainer.value
    const height = element?.scrollHeight || 0
    try {
      const result = await chatApi.messages(selected.id, older ? beforeId.value : undefined)
      if (current.value?.id !== selected.id) return
      const combined = older
        ? [...messages.value, ...result.data]
        : [
            ...messages.value.filter((item) => !item.id || item.id > (result.data[0]?.id || 0)),
            ...result.data
          ]
      messages.value = [...new Map(combined.map((item) => [item.request_id, item])).values()].sort(
        (a, b) => (a.id || Infinity) - (b.id || Infinity)
      )
      hasMore.value = result.meta.has_more
      beforeId.value = result.meta.before_id
      await nextTick()
      if (element) element.scrollTop = older ? element.scrollHeight - height : element.scrollHeight
      void markRead()
    } finally {
      loadingHistory.value = false
    }
  }
  async function select(item: Conversation) {
    current.value = item
    messages.value = []
    content.value = ''
    await nextTick()
    await loadMessages()
  }
  async function deliver(message: ChatMessage) {
    message.status = 'sending'
    let saved: ChatMessage
    try {
      saved = await chatApi.send(message.conversation_id, message)
    } catch {
      message.status = 'failed'
      return
    }
    Object.assign(message, saved)
    if (current.value?.id === saved.conversation_id) {
      messages.value = [...new Map(messages.value.map((item) => [item.request_id, item])).values()]
      void markRead()
    }
    void refreshList()
  }
  async function send() {
    if (!current.value || !content.value.trim()) return
    const message: ChatMessage = {
      id: 0,
      conversation_id: current.value.id,
      sender_realm: 'admin',
      sender_subject: String(user.info.id),
      request_id: crypto.randomUUID(),
      type: 'text',
      status: 'sending',
      content: content.value,
      created_at: Date.now()
    }
    content.value = ''
    messages.value.push(message)
    await nextTick()
    if (messageContainer.value)
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    await deliver(messages.value.find((item) => item.request_id === message.request_id)!)
  }
  function handleKey(event: Event | KeyboardEvent) {
    if (!(event instanceof KeyboardEvent)) return
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault()
      void send()
    }
  }
  const open: Parameters<typeof mittBus.on<'openChat'>>[1] = async (peer) => {
    const revision = ++opening
    visible.value = true
    contactsVisible.value = false
    if (peer) {
      const conversation = await chatApi.create(peer.user_id)
      if (revision !== opening) return
      await select({
        id: conversation.id,
        peer_id: peer.user_id,
        username: peer.username,
        realname: peer.realname || '',
        avatar: peer.avatar || '',
        content: '',
        unread: 0,
        last_read_message_id: 0,
        peer_last_read_message_id: 0,
        last_message_id: 0,
        last_message_at: 0
      })
    } else {
      current.value = undefined
    }
    await loadList()
  }
  mittBus.on('openChat', open)
  const stops = ['ready', 'resync_required', 'chat.message.created', 'chat.read.updated'].map(
    (type) =>
      realtime.on(type, async (message) => {
        if (type === 'chat.read.updated') {
          const read = (
            message.data as {
              data: { conversation_id: number; subject: string; message_id: number }
            }
          ).data
          applyRead(read.conversation_id, read.subject, read.message_id)
          return
        }
        if (type === 'ready' || type === 'resync_required') await loadList()
        else void refreshList()
        if (!current.value || !visible.value) return
        if (type === 'chat.message.created') {
          const saved = (message.data as { data: ChatMessage }).data
          if (saved.conversation_id !== current.value.id) return
          const element = messageContainer.value
          const atBottom =
            !element || element.scrollHeight - element.scrollTop - element.clientHeight <= 30
          const existing = messages.value.find((item) => item.request_id === saved.request_id)
          if (existing) Object.assign(existing, saved)
          else messages.value.push(saved)
          messages.value.sort((a, b) => (a.id || Infinity) - (b.id || Infinity))
          await nextTick()
          if (element && atBottom) element.scrollTop = element.scrollHeight
          void markRead()
        } else {
          await loadMessages()
        }
      })
  )
  watch([visible, documentVisibility], () => {
    void markRead()
  })
  if (realtime.status.value === 'ready') void loadList()
  onBeforeUnmount(() => {
    disposed = true
    ++opening
    ++listRevision
    ++contactsRevision
    mittBus.off('openChat', open)
    stops.forEach((stop) => stop())
    chatUnread.value = 0
  })
</script>
<style scoped>
  :global(.wechat-drawer .el-drawer__body) {
    padding: 0;
    overflow: hidden;
  }
  .wechat-chat {
    color-scheme: light;
    --chat-bg: #f0f2f3;
    --chat-panel: #fff;
    --chat-header: #f8f9fa;
    --chat-text: #20272c;
    --chat-muted: #7c878f;
    --chat-line: #e6eaec;
    --chat-hover: #f3f6f5;
    --chat-avatar-bg: #e1efe8;
    --chat-avatar-text: #397354;
    --chat-bubble: #fff;
    --chat-own-bubble: #a0e879;
    --chat-own-text: #1c3116;
    --chat-accent: #07a85a;
    --chat-disabled-bg: #e5e9e7;
    --chat-disabled-text: #8c9891;
    --chat-time-bg: #e6eaec;
    --chat-focus: #85cfa6;
    --chat-shadow: 0 1px 2px rgb(28 44 36 / 5%);
    display: flex;
    flex-direction: column;
    height: 100%;
    color: var(--chat-text);
    background: var(--chat-bg);
  }
  .wechat-chat.is-dark {
    color-scheme: dark;
    --chat-bg: #151a1e;
    --chat-panel: #1b2227;
    --chat-header: #1d252a;
    --chat-text: #e3e9ed;
    --chat-muted: #94a0a8;
    --chat-line: #2b353b;
    --chat-hover: #252e34;
    --chat-avatar-bg: #283f36;
    --chat-avatar-text: #a0cfb4;
    --chat-bubble: #2a343b;
    --chat-own-bubble: #386b36;
    --chat-own-text: #f1f7ed;
    --chat-accent: #269d60;
    --chat-disabled-bg: #2a3439;
    --chat-disabled-text: #7f9088;
    --chat-time-bg: #20292e;
    --chat-focus: #508d68;
    --chat-shadow: none;
  }
  .chat-header {
    display: grid;
    grid-template-columns: 80px minmax(0, 1fr) 80px;
    align-items: center;
    min-height: 64px;
    padding: 0 12px;
    background: var(--chat-header);
    border-bottom: 1px solid var(--chat-line);
  }
  .chat-header h2 {
    margin: 0;
    overflow: hidden;
    font-size: 16px;
    font-weight: 600;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  button {
    cursor: pointer;
    color: inherit;
    font: inherit;
  }
  .header-action {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 0;
    background: transparent;
    font-size: 23px;
    border-radius: 8px;
  }
  .header-action:hover {
    background: var(--chat-hover);
  }
  .header-tools {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
  }
  .theme-action {
    color: var(--chat-muted);
    font-size: 19px;
  }
  button:focus-visible {
    outline: 2px solid var(--chat-focus);
    outline-offset: -2px;
  }
  .chat-search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 18px;
  }
  .chat-search :deep(.el-input__wrapper) {
    background: var(--chat-panel);
    box-shadow: none;
    color: var(--chat-text);
    border-radius: 8px;
  }
  .chat-search :deep(.el-input__inner) {
    color: var(--chat-text);
  }
  .chat-search :deep(.el-input__inner::placeholder) {
    color: var(--chat-muted);
  }
  .search-entry {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    flex: 1;
    height: 36px;
    color: var(--chat-muted);
    background: var(--chat-panel);
    border: 0;
    border-radius: 6px;
    font-size: 13px;
  }
  .conversation-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    background: var(--chat-panel);
  }
  .conversation-row {
    display: flex;
    align-items: center;
    gap: 13px;
    width: 100%;
    min-height: 80px;
    padding: 17px 20px;
    border: 0;
    background: transparent;
    text-align: left;
  }
  .conversation-row:hover {
    background: var(--chat-hover);
  }
  .chat-avatar {
    position: relative;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 6px;
    color: var(--chat-avatar-text);
    background: var(--chat-avatar-bg);
    font-size: 20px;
    font-weight: 600;
  }
  .chat-avatar :deep(img) {
    border-radius: 6px;
  }
  .conversation-copy {
    flex: 1;
    min-width: 0;
  }
  .conversation-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .conversation-name {
    display: block;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 15px;
  }
  .conversation-top time {
    flex-shrink: 0;
    color: var(--chat-muted);
    font-size: 11px;
  }
  .conversation-preview {
    display: block;
    margin-top: 5px;
    overflow: hidden;
    color: var(--chat-muted);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .unread-badge {
    position: absolute;
    top: -6px;
    right: -7px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border: 2px solid var(--chat-panel);
    box-sizing: content-box;
    border-radius: 12px;
    background: #fa5151;
    color: #fff;
    font-size: 10px;
    line-height: 14px;
    text-align: center;
  }
  .load-more {
    display: block;
    width: 100%;
    padding: 15px;
    border: 0;
    color: var(--chat-muted);
    background: transparent;
    font-size: 12px;
  }
  .message-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 10px 20px 24px;
    scrollbar-width: thin;
    scrollbar-color: var(--chat-line) transparent;
  }
  .message-time {
    width: fit-content;
    margin: 16px auto 24px;
    padding: 4px 10px;
    border-radius: 12px;
    background: var(--chat-time-bg);
    color: var(--chat-muted);
    text-align: center;
    font-size: 11px;
  }
  .message-row {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    margin-bottom: 20px;
  }
  .message-row.mine {
    flex-direction: row-reverse;
  }
  .message-avatar {
    width: 38px;
    height: 38px;
    font-size: 17px;
  }
  .message-copy {
    max-width: 75%;
    min-width: 0;
  }
  .message-bubble {
    position: relative;
    padding: 11px 14px;
    border-radius: 8px;
    background: var(--chat-bubble);
    box-shadow: var(--chat-shadow);
    font-size: 14px;
    line-height: 1.6;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
  .message-bubble::before {
    position: absolute;
    top: 14px;
    left: -5px;
    width: 10px;
    height: 10px;
    background: inherit;
    content: '';
    transform: rotate(45deg);
  }
  .mine .message-bubble {
    color: var(--chat-own-text);
    background: var(--chat-own-bubble);
  }
  .mine .message-bubble::before {
    right: -5px;
    left: auto;
  }
  .message-status {
    margin-top: 4px;
    color: var(--chat-muted);
    text-align: right;
    font-size: 10px;
  }
  .retry-message {
    padding: 0;
    border: 0;
    color: #fa5151;
    background: transparent;
  }
  .chat-composer {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 14px 16px max(14px, env(safe-area-inset-bottom));
    border-top: 1px solid var(--chat-line);
    background: var(--chat-header);
  }
  .chat-composer :deep(.el-textarea__inner) {
    min-height: 40px !important;
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--chat-panel);
    box-shadow: none;
    color: var(--chat-text);
    font-size: 14px;
  }
  .chat-composer :deep(.el-textarea__inner::placeholder) {
    color: var(--chat-muted);
  }
  .chat-composer :deep(.el-textarea__inner:focus) {
    box-shadow: inset 0 0 0 1px var(--chat-focus);
  }
  .send-message {
    height: 40px;
    flex-shrink: 0;
    padding: 0 17px;
    border: 0;
    border-radius: 8px;
    color: #fff;
    background: var(--chat-accent);
    font-size: 14px;
  }
  .send-message:disabled {
    cursor: default;
    color: var(--chat-disabled-text);
    background: var(--chat-disabled-bg);
  }
  .conversation-list {
    scrollbar-width: thin;
    scrollbar-color: var(--chat-line) transparent;
  }
  .wechat-chat :deep(.el-loading-mask) {
    background: var(--chat-panel);
  }
</style>
