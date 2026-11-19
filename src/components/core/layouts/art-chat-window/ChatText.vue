<template>
  <div class="chat-markdown" v-html="renderChatMarkdown(text)" />
</template>
<script setup lang="ts">
  import { renderChatMarkdown } from '@/dawn/markdown'
  import '@/dawn/markdown.css'
  defineProps<{ text: string }>()
</script>
