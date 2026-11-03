import request from '@/utils/http'
import type { PageData } from '@/dawn/types'

export interface ChatContact {
  id: number
  username: string
  realname: string
  avatar: string
}

export interface Conversation {
  last_message_id: number
  last_message_at: number
  id: number
  peer_id: number
  username: string
  realname: string
  avatar: string
  content: string
  unread: number
  last_read_message_id: number
  peer_last_read_message_id: number
}
export interface ChatMessage {
  id: number
  conversation_id: number
  sender_realm: string
  sender_subject: string
  request_id: string
  type: string
  status: string
  content: string
  created_at: number
}
export const chatApi = {
  contacts: (page = 1, search = '') =>
    request.get<PageData<ChatContact>>({ url: '/chat-contacts', params: { page, search } }),
  list: (page = 1) =>
    request.get<PageData<Conversation> & { meta: { unread_total: number } }>({
      url: '/chat-conversations',
      params: { page }
    }),
  create: (userId: number) =>
    request.post<{ id: number }>({ url: '/chat-conversations', data: { user_id: userId } }),
  messages: (id: number, beforeId?: number) =>
    request.get<{
      data: ChatMessage[]
      meta: { has_more: boolean; before_id: number }
    }>({ url: `/chat-conversations/${id}/messages`, params: { before_id: beforeId } }),
  send: (id: number, input: { request_id: string; content: string }) =>
    request.post<ChatMessage>({
      url: `/chat-conversations/${id}/messages`,
      data: input
    }),
  read: (id: number, messageId: number) =>
    request.put<void>({
      url: `/chat-conversations/${id}/read-position`,
      data: { message_id: messageId },
      showErrorMessage: false
    })
}
