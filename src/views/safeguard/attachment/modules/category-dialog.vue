<template>
  <el-dialog
    v-model="visible"
    :title="dialogType === 'add' ? t('新增分类') : t('编辑分类')"
    width="600px"
    align-center
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="120px">
      <el-form-item :label="t('上级分类')" prop="parent_id">
        <el-tree-select
          v-model="formData.parent_id"
          :data="optionData.treeData"
          :render-after-expand="false"
          check-strictly
          clearable
        />
      </el-form-item>
      <el-form-item :label="t('分类名称')" prop="name">
        <el-input v-model="formData.name" :placeholder="t('请输入分类名称')" />
      </el-form-item>
      <el-form-item :label="t('排序')" prop="sort">
        <el-input-number v-model="formData.sort" :placeholder="t('请输入排序')" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">{{ t('取消') }}</el-button>
      <el-button type="primary" @click="handleSubmit">{{ t('提交') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
  import { $t as t } from '@/locales'
  import api from '@/api/safeguard/category'
  import { ElMessage } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'

  interface Props {
    modelValue: boolean
    dialogType: string
    data?: Record<string, any>
  }

  interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'success'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: false,
    dialogType: 'add',
    data: undefined
  })

  const emit = defineEmits<Emits>()

  const formRef = ref<FormInstance>()
  const optionData = reactive({
    treeData: <any[]>[]
  })

  /**
   * 弹窗显示状态双向绑定
   */
  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  /**
   * 表单验证规则
   */
  const rules = reactive<FormRules>({
    parent_id: [{ required: true, message: t('请选择上级分类'), trigger: 'change' }],
    name: [{ required: true, message: t('请输入分类名称'), trigger: 'blur' }]
  })

  /**
   * 初始数据
   */
  const initialFormData = {
    id: null,
    parent_id: 0,
    level: '',
    name: '',
    sort: 100
  }

  /**
   * 表单数据
   */
  const formData = reactive({ ...initialFormData })

  /**
   * 监听弹窗打开，初始化表单数据
   */
  watch(
    () => props.modelValue,
    (newVal) => {
      if (newVal) {
        initPage()
      }
    }
  )

  /**
   * 初始化页面数据
   */
  const initPage = async () => {
    // 先重置为初始值
    Object.assign(formData, initialFormData)

    const data = await api.list()
    optionData.treeData = data

    // 如果有数据，则填充数据
    if (props.data) {
      await nextTick()
      initForm()
    }
  }

  /**
   * 初始化表单数据
   */
  const initForm = () => {
    if (props.data) {
      for (const key in formData) {
        if (props.data[key] != null && props.data[key] != undefined) {
          ;(formData as any)[key] = props.data[key]
        }
      }
    }
  }

  /**
   * 关闭弹窗并重置表单
   */
  const handleClose = () => {
    visible.value = false
    formRef.value?.resetFields()
  }

  /**
   * 提交表单
   */
  const handleSubmit = async () => {
    if (!formRef.value) return

    try {
      await formRef.value.validate()
      if (props.dialogType === 'add') {
        await api.save(formData)
        ElMessage.success(t('新增成功'))
      } else {
        await api.update(formData)
        ElMessage.success(t('修改成功'))
      }
      emit('success')
      handleClose()
    } catch (error) {
      console.log(t('表单验证失败'), error)
    }
  }
</script>
