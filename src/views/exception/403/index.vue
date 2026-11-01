<!-- 403页面 -->
<template>
  <ArtException
    :data="{
      title: '403',
      desc: $t('抱歉，您无权访问该页面'),
      btnText: $t('返回首页'),
      imgUrl
    }"
  />
</template>

<script setup lang="ts">
  import imgUrl from '@imgs/svg/403.svg'
  defineOptions({ name: 'Exception403' })
</script>
