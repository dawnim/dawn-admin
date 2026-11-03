export const storageKeys = {
  theme: 'admin:theme',
  lastUserId: 'admin:last-user-id'
}

export const storageKey = (storeId: string): string => `admin:${storeId}`
