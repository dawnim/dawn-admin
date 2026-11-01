<template>
  <dawn-search-bar
    ref="searchBarRef"
    v-model="formData"
    label-width="100px"
    :showExpand="true"
    @reset="handleReset"
    @search="handleSearch"
    @expand="handleExpand"
  >
    <el-col v-bind="setSpan(6)">
      <el-form-item :label="t('操作用户')" prop="username">
        <el-input v-model="formData.username" :placeholder="t('请输入操作用户')" clearable />
      </el-form-item>
    </el-col>
    <el-col v-bind="setSpan(6)">
      <el-form-item :label="t('操作路由')" prop="router">
        <el-input v-model="formData.router" :placeholder="t('请输入操作路由')" clearable />
      </el-form-item>
    </el-col>
    <el-col v-bind="setSpan(6)">
      <el-form-item :label="t('操作IP')" prop="ip">
        <el-input v-model="formData.ip" :placeholder="t('请输入操作IP')" clearable />
      </el-form-item>
    </el-col>
    <el-col v-bind="setSpan(12)" v-show="isExpanded">
      <el-form-item :label="t('操作时间')" prop="created_at">
        <el-date-picker
          v-model="formData.created_at"
          type="datetimerange"
          :range-separator="t('至')"
          :start-placeholder="t('开始时间')"
          :end-placeholder="t('结束时间')"
          value-format="YYYY-MM-DD HH:mm:ss"
          clearable
        />
      </el-form-item>
    </el-col>
  </dawn-search-bar>
</template>

<script setup lang="ts">
  import { $t as t } from '@/locales'
  interface Props {
    modelValue: Record<string, any>
  }
  interface Emits {
    (e: 'update:modelValue', value: Record<string, any>): void
    (e: 'search', params: Record<string, any>): void
    (e: 'reset'): void
  }
  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()
  // 展开/收起
  const isExpanded = ref<boolean>(false)

  // 表单数据双向绑定
  const searchBarRef = ref()
  const formData = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  // 重置
  function handleReset() {
    searchBarRef.value?.ref.resetFields()
    emit('reset')
  }

  // 搜索
  async function handleSearch() {
    emit('search', formData.value)
  }

  // 展开/收起
  function handleExpand(expanded: boolean) {
    isExpanded.value = expanded
  }

  // 栅格占据的列数
  const setSpan = (span: number) => {
    return {
      span: span,
      xs: 24, // 手机：满宽显示
      sm: span >= 12 ? span : 12, // 平板：大于等于12保持，否则用半宽
      md: span >= 8 ? span : 8, // 中等屏幕：大于等于8保持，否则用三分之一宽
      lg: span,
      xl: span
    }
  }
</script>
