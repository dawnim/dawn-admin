import { computed, ref } from 'vue'
import { mittBus } from '@/utils/sys'

export const directUnread = ref(0)
export const supportUnread = ref(0)
export const chatUnread = computed(() => directUnread.value + supportUnread.value)
export function openChat(user?: {
  id: number
  username: string
  realname?: string
  avatar?: string
}) {
  mittBus.emit('openChat', user && { ...user, user_id: user.id })
}
