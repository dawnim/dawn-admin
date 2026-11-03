<!-- 404页面 -->
<template>
  <ArtException
    :data="{
      title: '404',
      desc: $t('抱歉，您访问的页面不存在'),
      btnText: $t('返回首页'),
      imgUrl
    }"
  />
</template>

<script setup lang="ts">
  import imgUrl from '@imgs/svg/404.svg'
  defineOptions({ name: 'Exception404' })
</script>
