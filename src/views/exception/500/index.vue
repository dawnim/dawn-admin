<!-- 500页面 -->
<template>
  <ArtException
    :data="{
      title: '500',
      desc: $t('抱歉，服务器出错了'),
      btnText: $t('返回首页'),
      imgUrl
    }"
  />
</template>

<script setup lang="ts">
  import imgUrl from '@imgs/svg/500.svg'
  defineOptions({ name: 'Exception500' })
</script>
