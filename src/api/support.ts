import request from '@/utils/http'
import type { AxiosRequestConfig } from 'axios'
import { createResourceApi } from './resource'
import type { ChatContact, ChatMessage } from './chat'
import type { PageData, ListQuery } from '@/dawn/types'

export interface SupportSession {
  started_at: number
  offline_since: number
  last_online_at: number
  closing_requested_at: number
  close_reason: string
  id: number
  conversation_id: number
  round: number
  assigned_admin_id: number
  status: 'waiting' | 'active' | 'closing_pending' | 'closed' | 'cancelled'
  version: number
  rating: number | null
  comment: string
  closed_at: number
}
export interface SupportConfig {
  offline_timeout_minutes: number
  closing_offline_minutes: number
  model_protocol: 'responses' | 'chat_completions' | 'anthropic'
  reasoning_effort: string
  max_output_tokens: number

  entries: { key: string; origins: string[]; theme: string; greeting: string }[]
  agent_ids: number[]
  capacity: number
  greeting: string
  instructions: string
  model: string
  base_url: string
  embedding_url: string
  embedding_model: string
  embedding_dimensions: number
  index_driver: string
  allow_local_users: boolean
  input_preview: boolean
  ai_enabled: boolean
  telegram_enabled: boolean
  telegram_groups: number[]
  telegram_proactive: boolean
  tools: Record<string, unknown>[]
  skills: Record<string, unknown>[]
  context_fields: string[]
  active_index?: { model: string; dimensions: number; profile: string; driver: string }
}
export interface SupportApp {
  created_at: number
  updated_at: number
  id: number
  name: string
  avatar: string
  public_key: string
  status: number
  revision: number
  config: SupportConfig
}
export interface SupportConversation {
  visitor_online: boolean | null
  visitor_last_online_at: number
  visitor_offline_end_at: number
  support_session?: SupportSession
  id: number
  app_id: number
  app_name: string
  status: 'ai' | 'waiting' | 'human' | 'closed'
  assigned_admin_id: number
  version: number
  round: number
  nickname: string
  unique_id: string
  avatar: string
  content: string
  unread: number
  last_read_message_id: number
  last_message_id: number
  last_message_at: number
}
export interface SupportStatistics {
  replies: number
  customers: number
}
export interface CustomerProfile {
  status: number
  created_at: number
  updated_at: number
  id: number
  unique_id: string
  type: string
  nickname: string
  username: string | null
  avatar: string
  email: string
  mobile: string
  locale: string
  telegram_id: number | null
  telegram_username: string
}
export interface InputPreview {
  content: string
  sequence: number
  updated_at: number
  device: string
}
export interface CustomerDetail {
  conversation: SupportConversation
  user: CustomerProfile
  traits: {
    attributes: Record<string, unknown>
    observed: Record<string, unknown>
    verified_at: number
    external_user_id?: string
    identity_provider?: string
    remark: string
  }
  input_previews: InputPreview[]
}
export interface SupportMessage extends ChatMessage {
  visibility: 'public' | 'internal' | 'draft'
  attempt?: number
  sequence?: number
  payload?: {
    error?: string
    rating?: number
    comment?: string
    session_id?: number
    action_id?: number
    action_status?: string
    sources?: { id: number; title: string; location: string }[]
    status?: SupportConversation['status']
    version?: number
  }
}
export interface KnowledgeEntry {
  created_at: number
  updated_at: number
  id: number
  app_id: number
  source_id: number
  question: string
  answer: string
  keywords: string
  conditions: string
  locale: string
  reply_mode: string
  status: string
  version: number
  experts: number[]
  location: string
}
export type KnowledgeInput = Pick<
  KnowledgeEntry,
  | 'app_id'
  | 'source_id'
  | 'question'
  | 'answer'
  | 'keywords'
  | 'conditions'
  | 'locale'
  | 'reply_mode'
  | 'status'
  | 'experts'
  | 'location'
>
export interface KnowledgeSource {
  id: number
  app_id: number
  name: string
  kind: 'text' | 'markdown' | 'url'
  content: string
  status: string
  error: string
  updated_at: number
}
export interface AIRun {
  id: number
  app_id: number
  kind: string
  status: string
  attempt: number
  error: string
  updated_at: number
}
export type KnowledgeExpert = Pick<
  CustomerProfile,
  'id' | 'unique_id' | 'nickname' | 'username' | 'telegram_username'
>
export const supportAppApi = createResourceApi<
  SupportApp,
  Partial<SupportApp> & { secrets?: Record<string, unknown> }
>('/support-apps', { timeout: 65000 })
export const knowledgeApi = createResourceApi<KnowledgeEntry>('/knowledge-entries')
export const knowledgeSourceApi = createResourceApi<KnowledgeSource>('/knowledge-sources')
type MemberInput = Partial<
  Pick<CustomerProfile, 'nickname' | 'avatar' | 'email' | 'mobile' | 'locale' | 'status'>
>
export const memberApi = createResourceApi<
  CustomerProfile,
  MemberInput & { username: string; password: string },
  MemberInput
>('/members')
export const supportApi = {
  appSecrets: (id: number) =>
    request.get<{ identity_secret: string; telegram_token: string }>({
      url: `/support-apps/${id}/secrets`
    }),
  telegramGroups: (id: number) =>
    request.get<{ id: number; title: string }[]>({ url: `/support-apps/${id}/telegram-groups` }),
  knowledgeApps: (params: ListQuery = {}) =>
    request.get<PageData<Pick<SupportApp, 'id' | 'name'>>>({ url: '/knowledge-apps', params }),
  action: (id: number, approved: boolean) =>
    request.put({ url: `/support-actions/${id}`, data: { approved } }),
  agents: (params: ListQuery = {}) =>
    request.get<PageData<ChatContact>>({ url: '/support-agents', params }),
  capabilities: () =>
    request.get<{ view: boolean; reply: boolean; manage: boolean }>({
      url: '/support-capabilities',
      showErrorMessage: false
    }),
  inbox: (params: ListQuery = {}) =>
    request.get<
      PageData<SupportConversation> & {
        meta: {
          unread_total: number
          apps: { id: number; name: string }[]
          statistics: SupportStatistics
        }
      }
    >({
      url: '/support-inbox',
      params
    }),
  detail: (id: number) => request.get<CustomerDetail>({ url: `/support-conversations/${id}` }),
  messages: (id: number, beforeId?: number) =>
    request.get<{ data: SupportMessage[]; meta: { has_more: boolean; before_id: number } }>({
      url: `/support-conversations/${id}/messages`,
      params: { before_id: beforeId }
    }),
  send: (
    id: number,
    data: { request_id: string; content: string; visibility: string; version: number }
  ) => request.post<SupportMessage>({ url: `/support-conversations/${id}/messages`, data }),
  read: (id: number, messageId: number) =>
    request.put<void>({
      url: `/support-conversations/${id}/read-position`,
      data: { message_id: messageId },
      showErrorMessage: false
    }),
  reception: (id: number, action: string, version: number, adminId?: number) =>
    request.put<SupportConversation>({
      url: `/support-conversations/${id}/reception`,
      data: { action, version, admin_id: adminId }
    }),
  heartbeat: () =>
    request.post<{ online: boolean }>({
      url: '/support-presence/heartbeats',
      showErrorMessage: false
    }),
  presence: (online: boolean) => request.put<void>({ url: '/support-presence', data: { online } }),
  draft: (id: number) =>
    request.post<SupportMessage>({ url: `/support-conversations/${id}/drafts` }),
  traits: (id: number, data: { remark: string }) =>
    request.patch<void>({ url: `/support-conversations/${id}/customer`, data }),
  testModel: (id: number) =>
    request.post<{ content: string }>({ url: `/support-apps/${id}/model-tests`, timeout: 65000 }),
  index: (id: number) => request.post({ url: `/support-apps/${id}/index-builds` }),
  import: (id: number) => request.post({ url: `/knowledge-sources/${id}/imports` }),
  knowledgeDrafts: (id: number, data: { content: string; kind: string }, signal: AbortSignal) =>
    request.post<Partial<KnowledgeInput>[]>({
      url: `/support-apps/${id}/knowledge-drafts`,
      data,
      signal,
      timeout: 180000
    }),
  knowledgeBatch: (entries: KnowledgeInput[]) =>
    request.post<KnowledgeEntry[]>({ url: '/knowledge-entry-batches', data: { entries } }),
  experts: (params: ListQuery, config?: AxiosRequestConfig) =>
    request.get<PageData<KnowledgeExpert>>({ ...config, url: '/knowledge-experts', params }),
  search: (id: number, query: string, signal: AbortSignal) =>
    request.post<(KnowledgeEntry & { score: number })[]>({
      url: `/support-apps/${id}/knowledge-searches`,
      data: { query },
      signal,
      timeout: 65000
    }),
  runs: (params: ListQuery, config?: AxiosRequestConfig) =>
    request.get<PageData<AIRun>>({ ...config, url: '/ai-runs', params })
}
