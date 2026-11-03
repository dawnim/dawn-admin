import { ref } from 'vue'
import { mittBus } from '@/utils/sys'

export const chatUnread = ref(0)
export function openChat(user?: {
  id: number
  username: string
  realname?: string
  avatar?: string
}) {
  mittBus.emit('openChat', user && { ...user, user_id: user.id })
}
