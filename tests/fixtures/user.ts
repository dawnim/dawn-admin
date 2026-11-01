export const user = {
  info: { is_super: false, buttons: [] as string[] },
  language: 'en',
  accessToken: '',
  refreshToken: '',
  setToken(access: string, refresh: string) {
    this.accessToken = access
    this.refreshToken = refresh
  },
  logOut() {
    this.accessToken = ''
    this.refreshToken = ''
  }
}

export const useUserStore = () => user
