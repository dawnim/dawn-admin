<template>
  <ElConfigProvider size="default" :locale="locales[language]" :z-index="3000">
    <RouterView></RouterView>
  </ElConfigProvider>
</template>

<script setup lang="ts">
  import { useUserStore } from './store/modules/user'
  import zh from 'element-plus/es/locale/lang/zh-cn'
  import en from 'element-plus/es/locale/lang/en'
  import { toggleTransition } from './utils/ui/animation'
  import { initializeTheme } from './hooks/core/useTheme'
  import logo from './assets/images/common/logo.svg?raw'
  import { dawnConfig } from './dawn/config'
  import { loadSite } from './api/site'

  const userStore = useUserStore()
  const { language } = storeToRefs(userStore)

  const locales = {
    zh: zh,
    en: en
  }

  let icon: HTMLLinkElement
  let iconObserver: MutationObserver

  onBeforeMount(() => {
    toggleTransition(true)
    initializeTheme()
    icon =
      document.querySelector<HTMLLinkElement>('link[rel~="icon"]') || document.createElement('link')
    icon.rel = 'icon'
    const updateIcon = () => {
      if (dawnConfig.favicon) {
        icon.removeAttribute('type')
        icon.href = dawnConfig.favicon
        return
      }
      const style = getComputedStyle(document.documentElement)
      const svg = logo
        .replace('currentColor', style.getPropertyValue('--admin-logo-color').trim())
        .replace(
          'var(--admin-logo-sun, #ffb84d)',
          style.getPropertyValue('--admin-logo-sun').trim()
        )
      icon.type = 'image/svg+xml'
      icon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`
    }
    updateIcon()
    document.head.append(icon)
    iconObserver = new MutationObserver(updateIcon)
    iconObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style']
    })
  })

  onBeforeUnmount(() => iconObserver.disconnect())

  onMounted(() => {
    toggleTransition(false)
    loadSite().catch(console.error)
  })
</script>
