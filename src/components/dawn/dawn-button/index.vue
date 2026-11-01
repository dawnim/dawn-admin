<!-- 表格按钮 -->
<template>
  <div>
    <el-tooltip :disabled="toolTip === ''" :content="toolTip" placement="top">
      <div
        :class="[
          'inline-flex items-center justify-center min-w-8 h-8 px-2.5 text-sm c-p rounded-md align-middle',
          buttonClass
        ]"
        :style="{ backgroundColor: buttonBgColor, color: iconColor }"
        role="button"
        tabindex="0"
        :aria-label="toolTip || labels[type || 'info']"
        @keydown.enter="handleClick"
        @keydown.space.prevent="handleClick"
        @click="handleClick"
      >
        <Icon v-bind="bindAttrs" :icon="iconContent" class="art-svg-icon inline" />
      </div>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
  import { Icon } from '@iconify/vue'
  import { $t as t } from '@/locales'
  const labels = computed(() => ({
    primary: t('新增'),
    secondary: t('编辑'),
    error: t('删除'),
    info: t('操作'),
    success: t('查看')
  }))
  defineOptions({ name: 'DawnButton' })

  interface Props {
    /** 按钮类型 */
    type?: 'primary' | 'secondary' | 'error' | 'info' | 'success'
    /** 按钮图标 */
    icon?: string
    /** 按钮工具提示 */
    toolTip?: string
    /** icon 颜色 */
    iconColor?: string
    /** 按钮背景色 */
    buttonBgColor?: string
  }

  const props = withDefaults(defineProps<Props>(), { toolTip: '' })

  const attrs = useAttrs()

  const bindAttrs = computed<{ class: string; style: string }>(() => ({
    class: (attrs.class as string) || '',
    style: (attrs.style as string) || ''
  }))

  const emit = defineEmits<{
    (e: 'click'): void
  }>()

  // 默认按钮配置
  const defaultButtons = {
    primary: { icon: 'ri:add-fill', class: 'bg-primary/12 text-primary' },
    secondary: { icon: 'ri:pencil-line', class: 'bg-secondary/12 text-secondary' },
    error: { icon: 'ri:delete-bin-5-line', class: 'bg-error/12 text-error' },
    info: { icon: 'ri:more-2-fill', class: 'bg-info/12 text-info' },
    success: { icon: 'ri:eye-line', class: 'bg-success/12 text-success' }
  } as const

  // 获取图标内容
  const iconContent = computed(() => {
    return props.icon || (props.type ? defaultButtons[props.type]?.icon : '') || ''
  })

  // 获取按钮样式类
  const buttonClass = computed(() => {
    return props.type ? defaultButtons[props.type]?.class : ''
  })

  const handleClick = () => {
    emit('click')
  }
</script>
