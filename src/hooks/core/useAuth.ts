/**
 * 组件与权限指令共用服务端下发的权限key。
 * @author Art Design Pro Team
 */
import { useUserStore } from '@/store/modules/user'

export function useAuth() {
  const user = useUserStore()
  return {
    hasAuth: (key: string): boolean => !!user.info.is_super || !!user.info.buttons?.includes(key)
  }
}
