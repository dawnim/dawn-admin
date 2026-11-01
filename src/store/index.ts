import type { App } from 'vue'
import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'
import { storageKey } from '@/utils/storage'

export const store = createPinia()
store.use(createPersistedState({ key: storageKey, storage: localStorage }))

export function initStore(app: App): void {
  app.use(store)
}
