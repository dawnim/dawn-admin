<!-- 个人中心页面 -->
<template>
  <div class="w-full h-full p-0 bg-transparent border-none shadow-none">
    <div class="relative flex-b mt-2.5 max-md:block max-md:mt-1">
      <div class="w-112 mr-5 max-md:w-full max-md:mr-0">
        <div class="art-card-sm relative p-9 pb-6 overflow-hidden text-center">
          <img
            class="absolute top-0 left-0 w-full h-50 object-cover"
            src="@imgs/user/user-bg.jpg"
          />
          <DawnImageUpload
            class="w-20 h-20 mt-30 mx-auto"
            :width="80"
            :height="80"
            :showTips="false"
            v-model="avatar"
            @change="handleAvatarChange"
            round
          />
          <h2 class="mt-5 text-xl font-normal">{{ userInfo.username }}</h2>
          <div class="w-75 mx-auto mt-2.5 text-left">
            <div class="mt-2.5">
              <ArtSvgIcon icon="ri:user-line" class="text-g-700" />
              <span class="ml-2 text-sm">{{ userInfo.realname }}</span>
            </div>
            <div class="mt-2.5">
              <ArtSvgIcon
                :icon="userInfo.gender === '1' ? 'ri:men-line' : 'ri:women-line'"
                class="text-g-700"
              />
              <span class="ml-2 text-sm">{{
                dictStore.getDataByValue('gender', userInfo.gender || '0')?.label
              }}</span>
            </div>
            <div class="mt-2.5">
              <ArtSvgIcon icon="ri:mail-line" class="text-g-700" />
              <span class="ml-2 text-sm">{{ userInfo.email }}</span>
            </div>
            <div class="mt-2.5">
              <ArtSvgIcon icon="ri:phone-line" class="text-g-700" />
              <span class="ml-2 text-sm">{{ userInfo.phone }}</span>
            </div>
            <div class="mt-2.5">
              <ArtSvgIcon icon="ri:dribbble-fill" class="text-g-700" />
              <span class="ml-2 text-sm">{{ userInfo.department?.name }}</span>
            </div>
          </div>
        </div>

        <div class="art-card-sm py-5 h-128 my-5">
          <div class="art-card-header border-b border-g-300">
            <h1 class="p-4 text-xl font-normal">{{ t('日志信息') }}</h1>
            <ElRadioGroup v-model="logType">
              <ElRadioButton :value="1" :label="t('登录日志')"></ElRadioButton>
              <ElRadioButton :value="2" :label="t('操作日志')"></ElRadioButton>
            </ElRadioGroup>
          </div>
          <div class="mt-7.5">
            <el-timeline class="pl-5 mt-3" v-if="logType === 1 && loginLogList.length > 0">
              <el-timeline-item
                v-for="(item, idx) in loginLogList"
                :key="idx"
                :timestamp="t('您于{v0}登录系统', { v0: dateLabel(item.created_at) })"
                placement="top"
              >
                <div class="py-2 text-xs">
                  <span>{{ t('地理位置') }}: {{ item.location || t('未知') }}</span>
                  <span class="ml-2">{{ t('请求方法') }} {{ item.method }}</span>
                </div>
              </el-timeline-item>
            </el-timeline>

            <el-timeline class="pl-5 mt-3" v-if="logType === 2 && operationLogList.length > 0">
              <el-timeline-item
                v-for="(item, idx) in operationLogList"
                :key="idx"
                :timestamp="
                  t('您于{v0}执行了{v1}', { v0: dateLabel(item.created_at), v1: item.message })
                "
                placement="top"
              >
                <div class="py-2 text-xs">
                  <span>{{ t('地理位置') }}: {{ item.location || t('未知') }}</span>
                  <span class="ml-2">{{ t('路由') }}: {{ item.path }}</span>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </div>
      </div>
      <div class="flex-1 overflow-hidden max-md:w-full max-md:mt-3.5">
        <div class="art-card-sm">
          <h1 class="p-4 text-xl font-normal border-b border-g-300">{{ t('基本设置') }}</h1>

          <ElForm
            :model="form"
            class="box-border p-5 [&>.el-row_.el-form-item]:w-[calc(50%-10px)] [&>.el-row_.el-input]:w-full [&>.el-row_.el-select]:w-full"
            ref="ruleFormRef"
            :rules="rules"
            label-width="86px"
            label-position="top"
          >
            <ElRow>
              <ElFormItem :label="t('姓名')" prop="realname">
                <ElInput v-model="form.realname" :disabled="!isEdit" />
              </ElFormItem>
              <ElFormItem :label="t('性别')" prop="gender" class="ml-5">
                <DawnSelect
                  v-model="form.gender"
                  :placeholder="t('请选择性别')"
                  dict="gender"
                  valueType="string"
                  :disabled="!isEdit"
                />
              </ElFormItem>
            </ElRow>

            <ElRow>
              <ElFormItem :label="t('邮箱')" prop="email">
                <ElInput v-model="form.email" :disabled="!isEdit" />
              </ElFormItem>
              <ElFormItem :label="t('手机')" prop="phone" class="ml-5">
                <ElInput v-model="form.phone" :disabled="!isEdit" />
              </ElFormItem>
            </ElRow>

            <ElFormItem :label="t('个人介绍')" prop="remark" class="h-32">
              <ElInput type="textarea" :rows="4" v-model="form.remark" :disabled="!isEdit" />
            </ElFormItem>

            <div class="flex-c justify-end [&_.el-button]:!w-27.5">
              <ElButton type="primary" class="w-22.5" v-ripple @click="edit">
                {{ isEdit ? t('保存') : t('编辑') }}
              </ElButton>
            </div>
          </ElForm>
        </div>

        <div class="art-card-sm h-128 my-5">
          <h1 class="p-4 text-xl font-normal border-b border-g-300">{{ t('更改密码') }}</h1>

          <ElForm
            :model="pwdForm"
            :rules="pwdRules"
            ref="pwdFormRef"
            class="box-border p-5"
            label-width="86px"
            label-position="top"
          >
            <ElFormItem :label="t('当前密码')" prop="oldPassword">
              <ElInput
                v-model="pwdForm.oldPassword"
                type="password"
                :disabled="!isEditPwd"
                show-password
              />
            </ElFormItem>

            <ElFormItem :label="t('新密码')" prop="newPassword">
              <ElInput
                v-model="pwdForm.newPassword"
                type="password"
                :disabled="!isEditPwd"
                show-password
                @input="checkSafe"
              />
            </ElFormItem>

            <ElFormItem :label="t('密码安全度')" prop="passwordSafePercent">
              <ElProgress
                :percentage="passwordSafePercent"
                :show-text="false"
                class="w-full"
                status="success"
                :stroke-width="12"
              />
            </ElFormItem>

            <ElFormItem :label="t('确认新密码')" prop="confirmPassword">
              <ElInput
                v-model="pwdForm.confirmPassword"
                type="password"
                :disabled="!isEditPwd"
                show-password
              />
            </ElFormItem>

            <div class="flex-c justify-end [&_.el-button]:!w-27.5">
              <ElButton type="primary" class="w-22.5" v-ripple @click="editPwd">
                {{ isEditPwd ? t('保存') : t('编辑') }}
              </ElButton>
            </div>
          </ElForm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { useDictStore } from '@/store/modules/dict'
  import { dateLabel } from '@/dawn/types'
  import { useUserStore } from '@/store/modules/user'
  import { fetchGetLogin, fetchGetOperate, updateUserInfo, modifyPassword } from '@/api/auth'
  import type { FormInstance, FormRules } from 'element-plus'

  defineOptions({ name: 'UserCenter' })

  const { t } = useI18n()
  const dictStore = useDictStore()
  const userStore = useUserStore()
  const userInfo = computed(() => userStore.getUserInfo)

  const isEdit = ref(false)
  const isEditPwd = ref(false)
  const date = ref('')

  /**
   * 用户信息表单
   */
  const form = toReactive(userStore.info)
  const ruleFormRef = ref<FormInstance>()
  const pwdFormRef = ref<FormInstance>()
  const passwordSafePercent = ref(0)

  const avatar = ref('')

  /**
   * 密码修改表单
   */
  const pwdForm = reactive({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  /**
   * 表单验证规则
   */
  const rules = computed<FormRules>(() => ({
    realname: [
      { required: true, message: t('请输入姓名'), trigger: 'blur' },
      { min: 2, max: 50, message: t('长度在2到50个字符'), trigger: 'blur' }
    ]
  }))

  const pwdRules = computed<FormRules>(() => ({
    oldPassword: [{ required: true, message: t('请输入当前密码'), trigger: 'blur' }],
    newPassword: [
      { required: true, message: t('请输入新密码'), trigger: 'blur' },
      { min: 6, max: 72, message: t('长度在6到72个字符'), trigger: 'blur' }
    ],
    confirmPassword: [{ required: true, message: t('请确认新密码'), trigger: 'blur' }]
  }))

  const loginLogList = ref<Api.Common.ApiData[]>([])
  const operationLogList = ref<Api.Common.ApiData[]>([])
  const logType = ref(1) // 1: 登录日志, 2: 操作日志

  // 监听radio切换
  watch(logType, (newVal) => {
    if (newVal === 1 && loginLogList.value.length === 0) {
      loadLogin()
    } else if (newVal === 2 && operationLogList.value.length === 0) {
      loadOperate()
    }
  })

  const loadLogin = async () => {
    try {
      const data = await fetchGetLogin({
        page: 1,
        limit: 5,
        self: 1,
        orderType: 'desc'
      })
      loginLogList.value = data.data || []
    } catch (error) {
      console.error(t('加载登录日志失败'), error)
    }
  }

  const loadOperate = async () => {
    try {
      const data = await fetchGetOperate({
        page: 1,
        limit: 5,
        self: 1,
        orderType: 'desc'
      })
      operationLogList.value = data.data || []
    } catch (error) {
      console.error(t('加载操作日志失败'), error)
    }
  }

  onMounted(() => {
    avatar.value = userInfo.value.avatar || ''
    getDate()
    loadLogin()
    loadOperate()
  })

  /**
   * 根据当前时间获取问候语
   */
  const getDate = () => {
    const h = new Date().getHours()

    if (h >= 6 && h < 9) date.value = t('早上好')
    else if (h >= 9 && h < 11) date.value = t('上午好')
    else if (h >= 11 && h < 13) date.value = t('中午好')
    else if (h >= 13 && h < 18) date.value = t('下午好')
    else if (h >= 18 && h < 24) date.value = t('晚上好')
    else date.value = t('很晚了，早点睡')
  }

  const handleAvatarChange = async (val: string | string[]) => {
    if (!val) {
      return
    }
    try {
      await updateUserInfo({
        avatar: val
      })
      userStore.setAvatar(val as string)
      ElMessage.success(t('修改头像成功'))
    } catch (error) {
      console.log(t('表单验证失败'), error)
    }
  }

  /**
   * 切换用户信息编辑状态
   */
  const edit = async () => {
    if (isEdit.value) {
      try {
        await ruleFormRef.value?.validate()
        await updateUserInfo(form)
        ElMessage.success(t('修改成功'))
        isEdit.value = !isEdit.value
      } catch (error) {
        console.log(t('表单验证失败'), error)
      }
    } else {
      isEdit.value = !isEdit.value
    }
  }

  /**
   * 切换密码编辑状态
   */
  const editPwd = async () => {
    if (isEditPwd.value) {
      try {
        await pwdFormRef.value?.validate()
        if (pwdForm.newPassword !== pwdForm.confirmPassword) {
          ElMessage.error(t('确认密码与新密码不一致'))
          return
        }
        await modifyPassword(pwdForm)
        userStore.logOut()
        ElMessage.success(t('修改成功'))
        Object.assign(pwdForm, { oldPassword: '', newPassword: '', confirmPassword: '' })
        isEditPwd.value = !isEditPwd.value
      } catch (error) {
        console.log(t('表单验证失败'), error)
      }
    } else {
      isEditPwd.value = !isEditPwd.value
    }
  }

  /**
   * 检查密码安全程度
   * @param password 密码
   */
  const checkSafe = (password: string) => {
    if (password.length < 1) {
      passwordSafePercent.value = 0
      return
    }
    if (!(password.length >= 6)) {
      passwordSafePercent.value = 0
      return
    }
    passwordSafePercent.value = 10
    if (/\d/.test(password)) {
      passwordSafePercent.value += 10
    }
    if (/[a-z]/.test(password)) {
      passwordSafePercent.value += 10
    }
    if (/[A-Z]/.test(password)) {
      passwordSafePercent.value += 30
    }
    if (/[`~!@#$%^&*()_+<>?:"{},./;'[\]]/.test(password)) {
      passwordSafePercent.value += 40
    }
  }
</script>
