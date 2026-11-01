<template>
  <el-dialog
    v-model="visible"
    :title="dialogType === 'add' ? t('新增角色') : t('编辑角色')"
    width="600px"
    align-center
    @close="handleClose"
  >
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="120px">
      <el-form-item :label="t('角色名称')" prop="name">
        <el-input v-model="formData.name" :placeholder="t('请输入角色名称')" />
      </el-form-item>
      <el-form-item :label="t('角色标识')" prop="code">
        <el-input v-model="formData.code" :placeholder="t('请输入角色编码')" />
      </el-form-item>
      <el-form-item :label="t('角色级别')" prop="level">
        <el-input-number v-model="formData.level" :placeholder="t('角色级别')" :min="1" />
      </el-form-item>
      <div class="text-xs text-gray-400 pl-32 pb-4">{{
        t('控制角色的权限层级,不能操作职级高于自己的角色')
      }}</div>
      <el-form-item :label="t('数据范围')" prop="data_scope">
        <el-select v-model="formData.data_scope">
          <el-option :label="t('全部')" value="all" /><el-option :label="t('本人')" value="self" />
          <el-option :label="t('本部门')" value="department" /><el-option
            :label="t('指定部门')"
            value="departments"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-if="formData.data_scope === 'departments'" :label="t('指定部门')">
        <el-tree-select
          v-model="formData.department_ids"
          :data="departments"
          multiple
          show-checkbox
          check-strictly
        />
      </el-form-item>
      <el-form-item :label="t('描述')" prop="remark">
        <el-input
          v-model="formData.remark"
          type="textarea"
          :rows="3"
          :placeholder="t('请输入角色描述')"
        />
      </el-form-item>
      <el-form-item :label="t('排序')" prop="sort">
        <el-input-number v-model="formData.sort" :placeholder="t('请输入排序')" />
      </el-form-item>
      <el-form-item :label="t('启用')" prop="status">
        <dawn-radio v-model="formData.status" dict="data_status" />
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
  import api from '@/api/system/role'
  import deptApi from '@/api/system/dept'
  import { useUserStore } from '@/store/modules/user'
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
  const departments = ref<Api.Common.ApiData[]>([])

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
    name: [{ required: true, message: t('请输入角色名称'), trigger: 'blur' }],
    code: [{ required: true, message: t('请输入角色编码'), trigger: 'blur' }],
    level: [{ required: true, message: t('请输入角色级别'), trigger: 'blur' }]
  })

  /**
   * 初始数据
   */
  const initialFormData = {
    id: null,
    level: 100,
    name: '',
    code: '',
    remark: '',
    sort: 100,
    status: 1,
    data_scope: 'self',
    department_ids: [] as number[]
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
    if (useUserStore().info.is_super) departments.value = await deptApi.list()
    // 先重置为初始值
    Object.assign(formData, initialFormData)
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
