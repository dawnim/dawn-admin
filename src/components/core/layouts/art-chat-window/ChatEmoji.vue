<template>
  <ElPopover placement="top-start" :width="292" trigger="click" popper-class="chat-emoji-popover">
    <template #reference
      ><button type="button" class="emoji-trigger" :title="t('表情')" :aria-label="t('表情')"
        ><ArtSvgIcon icon="ri:emotion-happy-line" /></button
    ></template>
    <div class="emoji-grid" role="group" :aria-label="t('表情')"
      ><button
        v-for="emoji in emojis"
        :key="emoji"
        type="button"
        @mousedown.prevent
        @click="$emit('select', emoji)"
        >{{ emoji }}</button
      ></div
    >
  </ElPopover>
</template>
<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  defineEmits<{ select: [emoji: string] }>()
  const { t } = useI18n()
  const emojis = [
    '😀',
    '😄',
    '😆',
    '😂',
    '😉',
    '😊',
    '🙂',
    '😋',
    '😌',
    '😍',
    '😘',
    '😎',
    '🤓',
    '🤗',
    '🤔',
    '🙄',
    '😅',
    '🥹',
    '😭',
    '😢',
    '😤',
    '😱',
    '🥳',
    '🤝',
    '👍',
    '👎',
    '👌',
    '🙏',
    '👏',
    '💪',
    '👋',
    '🙌',
    '❤️',
    '💚',
    '💛',
    '💙',
    '🎉',
    '🎁',
    '🌹',
    '☕',
    '✨',
    '✅',
    '💡',
    '📌',
    '🚀',
    '⭐',
    '🔥',
    '💯'
  ]
</script>
<style scoped>
  .emoji-trigger {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--chat-muted, var(--el-text-color-secondary));
    font-size: 21px;
    cursor: pointer;
    flex-shrink: 0;
  }
  .emoji-trigger:hover {
    background: var(--chat-hover, var(--el-fill-color-light));
    color: var(--chat-accent, var(--el-color-primary));
  }
  .emoji-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 2px;
    max-height: 220px;
    overflow: auto;
  }
  .emoji-grid button {
    border: 0;
    padding: 3px;
    background: transparent;
    border-radius: 5px;
    font-size: 23px;
    cursor: pointer;
  }
  .emoji-grid button:hover {
    background: var(--el-fill-color-light);
  }
</style>
