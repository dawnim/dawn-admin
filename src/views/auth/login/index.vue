<!-- 登录页面 -->
<template>
  <div class="flex w-full h-screen">
    <LoginLeftView />

    <div class="relative flex-1">
      <AuthTopBar />

      <div class="auth-right-wrap">
        <div class="form">
          <h3 class="title">{{ $t('欢迎回来') }}</h3>
          <p class="sub-title">{{ $t('输入您的账号和密码登录') }}</p>
          <ElForm
            ref="formRef"
            :model="formData"
            :rules="rules"
            :key="formKey"
            @keyup.enter="handleSubmit"
            style="margin-top: 25px"
          >
            <ElFormItem prop="username">
              <ElInput
                class="custom-height"
                :placeholder="$t('请输入账号')"
                v-model.trim="formData.username"
              />
            </ElFormItem>
            <ElFormItem prop="password">
              <ElInput
                class="custom-height"
                :placeholder="$t('请输入密码')"
                v-model="formData.password"
                type="password"
                autocomplete="off"
                show-password
              />
            </ElFormItem>
            <ElFormItem prop="code">
              <ElInput
                class="custom-height"
                :placeholder="$t('请输入验证码')"
                v-model.trim="formData.code"
                type="text"
                autocomplete="off"
              >
                <template #append>
                  <img
                    :src="captcha"
                    class="dark:opacity-[0.27]"
                    style="
                      height: 36px;
                      cursor: pointer;
                      background: rgb(255 255 255 / 85%);
                      border-radius: 3px;
                    "
                    @click="refreshCaptcha"
                  />
                </template>
              </ElInput>
            </ElFormItem>

            <div style="margin-top: 30px">
              <ElButton
                class="w-full custom-height"
                type="primary"
                @click="handleSubmit"
                :loading="loading"
                v-ripple
              >
                {{ $t('登录') }}
              </ElButton>
            </div>

            <!-- <div class="mt-5 text-sm text-gray-600">
              <span>{{ $t('还没有账号') }}</span>
              <RouterLink class="text-theme" :to="{ name: 'Register' }">{{
                $t('注册')
              }}</RouterLink>
            </div> -->
          </ElForm>
        </div>
      </div>
      <footer class="absolute bottom-4 w-full text-center text-xs text-g-600">
        <p>{{ dawnConfig.copyright }}</p>
        <p>{{ dawnConfig.recordNumber }}</p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
  import AppConfig from '@/config'
  import { dawnConfig } from '@/dawn/config'
  import { useUserStore } from '@/store/modules/user'
  import { useI18n } from 'vue-i18n'
  import { HttpError } from '@/utils/http/error'
  import { fetchCaptcha, fetchLogin, fetchGetUserInfo } from '@/api/auth'
  import { ElNotification, type FormInstance, type FormRules } from 'element-plus'

  defineOptions({ name: 'Login' })

  const { t, locale } = useI18n()
  const formKey = ref(0)

  // 监听语言切换，重置表单
  watch(locale, () => {
    formKey.value++
  })

  const userStore = useUserStore()
  const router = useRouter()

  const captcha = ref(
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  )

  const systemName = computed(() => AppConfig.systemInfo.name)
  const formRef = ref<FormInstance>()

  const formData = reactive({
    username: '',
    password: '',
    code: '',
    uuid: ''
  })

  const rules = computed<FormRules>(() => ({
    username: [{ required: true, message: t('请输入账号'), trigger: 'blur' }],
    password: [{ required: true, message: t('请输入密码'), trigger: 'blur' }],
    code: [{ required: true, message: t('请输入验证码'), trigger: 'blur' }]
  }))

  const loading = ref(false)

  onMounted(() => {
    refreshCaptcha()
  })

  // 登录
  const handleSubmit = async () => {
    if (!formRef.value) return

    try {
      // 表单验证
      const valid = await formRef.value.validate()
      if (!valid) return

      loading.value = true

      // 登录请求
      const { access_token, refresh_token, expires_in } = await fetchLogin({
        username: formData.username,
        password: formData.password,
        code: formData.code,
        uuid: formData.uuid
      })

      // 验证token
      if (!access_token) {
        throw new Error('Login failed - no token received')
      }

      // 存储token和用户信息
      userStore.setToken(access_token, refresh_token, expires_in)
      const userInfo = await fetchGetUserInfo()
      userStore.setUserInfo(userInfo)
      userStore.setLoginStatus(true)

      // 登录成功处理
      showLoginSuccessNotice()
      router.push('/')
    } catch (error) {
      // 处理 HttpError
      if (error instanceof HttpError) {
        // console.log(error.code)
      } else {
        // 处理非 HttpError
        // ElMessage.error('登录失败，请稍后重试')
        console.error('[Login] Unexpected error:', error)
      }
    } finally {
      refreshCaptcha()
      loading.value = false
    }
  }

  // 获取验证码
  const refreshCaptcha = async () => {
    fetchCaptcha().then((res) => {
      formData.uuid = res.uuid
      captcha.value = res.image
    })
  }

  // 登录成功提示
  const showLoginSuccessNotice = () => {
    setTimeout(() => {
      ElNotification({
        title: t('登录成功'),
        type: 'success',
        duration: 2500,
        zIndex: 10000,
        message: `${t('欢迎回来')}, ${systemName.value}!`
      })
    }, 150)
  }
</script>

<style scoped>
  @reference '@styles/core/tailwind.css';

  /* 授权页右侧区域 */
  .auth-right-wrap {
    @apply absolute inset-0 w-[440px] h-[650px] py-[5px] m-auto overflow-hidden
    max-sm:px-7 max-sm:w-full
    animate-[slideInRight_0.6s_cubic-bezier(0.25,0.46,0.45,0.94)_forwards]
    max-md:animate-none;

    .form {
      @apply h-full py-[40px];
    }

    .title {
      @apply text-g-900 text-4xl font-semibold max-md:text-3xl max-sm:pt-10;
    }

    .sub-title {
      @apply mt-[10px] text-g-600 text-sm;
    }

    .custom-height {
      @apply !h-[40px];
    }
  }

  /* 滑入动画 */
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(30px);
    }

    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>

<style lang="scss" scoped>
  :deep(.el-select__wrapper) {
    height: 40px !important;
  }
</style>
