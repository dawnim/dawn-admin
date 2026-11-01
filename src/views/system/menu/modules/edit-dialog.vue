<template>
  <el-dialog
    v-model="visible"
    :title="dialogType === 'add' ? t('新增菜单') : t('编辑菜单')"
    width="820px"
    align-center
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="120px">
      <el-form-item :label="t('菜单类型')" prop="type">
        <dawn-radio v-model="formData.type" type="button" dict="menu_type"></dawn-radio>
      </el-form-item>
      <el-form-item :label="t('上级菜单')" prop="parent_id">
        <el-tree-select
          :props="{ label: 'label' }"
          node-key="key"
          v-model="formData.parent_id"
          :data="parentOptions"
          :render-after-expand="false"
          check-strictly
          clearable
        />
      </el-form-item>
      <el-row>
        <el-col :span="12">
          <el-form-item :label="t('菜单名称')" prop="name">
            <el-input v-model="formData.name" :placeholder="t('请输入菜单名称')" />
          </el-form-item>
        </el-col>
        <el-col :span="12" v-if="formData.type === 2">
          <el-form-item prop="path">
            <template #label>
              <dawn-label
                :label="t('路由地址')"
                :tooltip="t('路由使用以/开头的完整路径，如/business/support')"
              />
            </template>
            <el-input v-model="formData.path" :placeholder="t('如：/custom/support')" />
          </el-form-item>
        </el-col>
        <el-col :span="12" v-if="formData.type !== 3">
          <el-form-item :label="t('稳定Key')" prop="code">
            <el-input
              :disabled="!!formData.id"
              v-model="formData.code"
              :placeholder="t('如: custom.support')"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12" v-if="formData.type === 2">
          <el-form-item prop="component">
            <template #label>
              <dawn-label
                :label="t('组件路径')"
                :tooltip="t('填写组件路径（views目录下）目录菜单：留空')"
              />
            </template>
            <el-autocomplete
              class="w-full"
              v-model="formData.component"
              :fetch-suggestions="querySearch"
              clearable
              :placeholder="t('如：/business/support')"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12" v-if="formData.type !== 3">
          <el-form-item :label="t('菜单图标')" prop="icon">
            <dawn-icon-picker v-model="formData.icon" />
          </el-form-item>
        </el-col>
        <el-col :span="12" v-if="formData.type === 3">
          <el-form-item :label="t('权限标识')" prop="slug">
            <el-input
              :disabled="!!formData.id"
              v-model="formData.slug"
              :placeholder="t('请输入权限标识')"
            />
          </el-form-item>
        </el-col>
        <el-col :span="24" v-if="formData.type === 4">
          <el-form-item :label="t('外链地址')" prop="link_url">
            <el-input v-model="formData.link_url" :placeholder="t('如：https://example.com')" />
          </el-form-item>
        </el-col>
        <el-col :span="24" v-if="formData.type === 4">
          <el-form-item :label="t('受控系统Key')" prop="system_key"
            ><el-input v-model="formData.system_key"
          /></el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item prop="sort">
            <template #label>
              <dawn-label :label="t('排序')" :tooltip="t('数字越小越靠前')" />
            </template>
            <el-input-number
              v-model="formData.sort"
              :placeholder="t('请输入排序')"
              controls-position="right"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item prop="status">
            <template #label>
              <dawn-label :label="t('状态')" :tooltip="t('禁用后，该菜单项将不可用')" />
            </template>
            <dawn-radio v-model="formData.status" dict="data_status" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item prop="is_iframe">
            <template #label>
              <dawn-label :label="t('是否内嵌')" :tooltip="t('外链模式下有效')" />
            </template>
            <dawn-switch v-model="formData.is_iframe" dict="yes_or_no" :showText="false" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item prop="is_keep_alive">
            <template #label>
              <dawn-label :label="t('是否缓存')" :tooltip="t('切换tabs不刷新')" />
            </template>
            <dawn-switch v-model="formData.is_keep_alive" dict="yes_or_no" :showText="false" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item prop="is_hidden">
            <template #label>
              <dawn-label
                :label="t('是否隐藏')"
                :tooltip="t('不在菜单栏显示，但是可以通过路由访问')"
              />
            </template>
            <dawn-switch v-model="formData.is_hidden" dict="yes_or_no" :showText="false" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item prop="is_fixed_tab">
            <template #label>
              <dawn-label :label="t('是否固定')" :tooltip="t('固定在tabs导航栏')" />
            </template>
            <dawn-switch v-model="formData.is_fixed_tab" dict="yes_or_no" :showText="false" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item prop="is_full_page">
            <template #label>
              <dawn-label :label="t('是否全屏')" :tooltip="t('不继承左侧菜单和顶部导航栏')" />
            </template>
            <dawn-switch v-model="formData.is_full_page" dict="yes_or_no" :showText="false" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">{{ t('取消') }}</el-button>
      <el-button type="primary" @click="handleSubmit">{{ t('提交') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
  import { $t as t } from '@/locales'
  import api from '@/api/system/menu'
  import { dawnConfig } from '@/dawn/config'
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
  const menuTree = ref<any[]>([])
  const parentOptions = computed(() => {
    const build = (rows: any[]): any[] =>
      rows.map((row) => ({
        ...row,
        disabled:
          row.key === props.data?.key ||
          (formData.type === 3 ? ![2, 4].includes(row.type) : row.type !== 1),
        children: build(row.children)
      }))
    return [
      {
        key: '0',
        label: t('顶级'),
        disabled: formData.type === 3,
        children: build(menuTree.value)
      }
    ]
  })

  /**
   * 处理自动查找视图文件
   */
  const modules = import.meta.glob('/src/views/**/*.vue')
  const getModulesKey = () => {
    return [
      ...Object.keys(modules).map((item) => item.replace('/src/views/', '/').replace('.vue', '')),
      ...Object.keys(dawnConfig.pages)
    ]
  }
  const componentsOptions = ref(getModulesKey())
  const querySearch = (queryString: string, cb: any) => {
    const results = queryString
      ? componentsOptions.value.filter((item) =>
          item.toLowerCase().includes(queryString.toLowerCase())
        )
      : componentsOptions.value
    cb(results.map((item) => ({ value: item })))
  }

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
  const validateKey = async (_rule: any, value: string) => {
    const result = await api.available(value, formData.id || undefined)
    if (!result.available) throw new Error(t('Key已占用或格式无效'))
  }
  const rules = reactive<FormRules>({
    parent_id: [{ required: true, message: t('请选择上级菜单'), trigger: 'change' }],
    name: [{ required: true, message: t('请输入菜单名称'), trigger: 'blur' }],
    path: [{ required: true, message: t('请输入路由地址'), trigger: 'blur' }],
    code: [
      { required: true, message: t('请输入稳定Key'), trigger: 'blur' },
      { validator: validateKey, trigger: 'blur' }
    ],
    slug: [
      { required: true, message: t('请输入权限标识'), trigger: 'blur' },
      { validator: validateKey, trigger: 'blur' }
    ],
    link_url: [{ required: true, message: t('请输入外链地址'), trigger: 'blur' }]
  })

  /**
   * 初始数据
   */
  const initialFormData = {
    id: 0,
    parent_id: '0' as string | number,
    type: 1,
    component: '',
    name: '',
    slug: '',
    path: '',
    icon: '',
    code: '',
    remark: '',
    link_url: '',
    system_key: '',
    is_iframe: 1,
    is_keep_alive: 2,
    is_hidden: 2,
    is_fixed_tab: 2,
    is_full_page: 2,
    sort: 100,
    status: 1
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

    menuTree.value = await api.list({ tree: true })

    // 如果有数据，则填充数据
    if (props.data) {
      await nextTick()
      initForm()
      formData.parent_id = props.data.parent_key || props.data.parent_id || '0'
      if (props.data.key) formData.code = formData.slug = props.data.key
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

<style lang="scss" scoped>
  :deep(.el-input-number) {
    width: 100%;
  }
</style>
