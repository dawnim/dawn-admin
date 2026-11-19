<template>
  <ElDialog
    v-model="visible"
    :title="form.id ? t('编辑用户') : t('新增用户')"
    width="600px"
    align-center
    :close-on-click-modal="false"
    destroy-on-close
  >
    <ElForm ref="formRef" :model="form" :rules="rules" label-width="120px">
      <template v-if="!form.id">
        <ElFormItem :label="t('用户名')" prop="username">
          <ElInput v-model="form.username" :maxlength="80" :placeholder="t('请输入用户名')" />
        </ElFormItem>
        <ElFormItem :label="t('密码')" prop="password">
          <ElInput
            v-model="form.password"
            type="password"
            show-password
            :maxlength="72"
            :placeholder="t('请输入密码')"
          />
        </ElFormItem>
      </template>
      <ElFormItem :label="t('昵称')" prop="nickname">
        <ElInput v-model="form.nickname" :maxlength="100" />
      </ElFormItem>
      <ElFormItem :label="t('头像')" prop="avatar">
        <DawnImagePicker v-model="form.avatar" />
      </ElFormItem>
      <ElFormItem :label="t('邮箱')" prop="email">
        <ElInput v-model="form.email" :maxlength="180" />
      </ElFormItem>
      <ElFormItem :label="t('手机号')" prop="mobile">
        <ElInput v-model="form.mobile" :maxlength="40" />
      </ElFormItem>
      <ElFormItem :label="t('启用')" prop="status">
        <DawnRadio v-model="form.status" dict="data_status" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="visible = false">{{ t('取消') }}</ElButton>
      <ElButton type="primary" :loading="saving" @click="save">{{ t('提交') }}</ElButton>
    </template>
  </ElDialog>
</template>
<script setup lang="ts">
  import { $t as t } from '@/locales'
  import { memberApi } from '@/api/support'
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  const visible = defineModel<boolean>({ required: true })
  const props = defineProps<{ data?: Record<string, any> }>()
  const emit = defineEmits<{ success: [] }>()
  const formRef = ref<FormInstance>()
  const form = ref<Record<string, any>>({})
  const saving = ref(false)
  const rules = computed<FormRules>(() => ({
    username: [
      { required: true, min: 3, max: 80, message: t('用户名长度为3到80个字符'), trigger: 'blur' }
    ],
    password: [
      { required: true, min: 6, max: 72, message: t('密码长度为6到72个字符'), trigger: 'blur' }
    ],
    email: [{ type: 'email', message: t('请输入正确的邮箱地址'), trigger: 'blur' }]
  }))
  watch(visible, (open) => {
    if (open)
      form.value = {
        id: 0,
        username: '',
        password: '',
        nickname: '',
        avatar: '',
        email: '',
        mobile: '',
        locale: 'zh',
        status: 1,
        ...props.data
      }
  })
  async function save() {
    if (!(await formRef.value?.validate().catch(() => false))) return
    saving.value = true
    try {
      const input = Object.fromEntries(
        ['nickname', 'avatar', 'email', 'mobile', 'locale', 'status'].map((key) => [
          key,
          form.value[key]
        ])
      )
      if (form.value.id) await memberApi.update(form.value.id, input)
      else
        await memberApi.create({
          ...input,
          username: form.value.username,
          password: form.value.password
        })
      ElMessage.success(t('保存成功'))
      visible.value = false
      emit('success')
    } finally {
      saving.value = false
    }
  }
</script>
