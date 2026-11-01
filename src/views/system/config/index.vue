<template>
  <div class="art-full-height">
    <div class="box-border flex gap-4 h-full max-md:block max-md:h-auto">
      <div class="w-80 flex-shrink-0 max-md:w-full max-md:mb-5">
        <ElCard class="art-card-xs h-full !mt-0" shadow="never">
          <template #header
            ><b>{{ t('系统设置') }}</b></template
          >
          <ArtTableHeader @refresh="load" />
          <ArtTable
            :data="groups"
            :columns="[
              { prop: 'selected', label: t('已选择'), width: 70, useSlot: true },
              { prop: 'label', label: t('配置分组') }
            ]"
            highlight-current-row
            @row-click="(row: any) => (group = row.key)"
          >
            <template #selected="{ row }"
              ><ElRadio :model-value="group" :value="row.key"><span /></ElRadio
            ></template>
          </ArtTable>
        </ElCard>
      </div>
      <ElCard class="art-card-xs flex-1 min-w-0 !mt-0" shadow="never">
        <template #header
          ><b>{{ groups.find((g) => g.key === group)?.label }}</b></template
        >
        <ElScrollbar>
          <ElForm label-width="140px" class="max-w-200 p-4" @submit.prevent="save">
            <ElFormItem v-for="item in visibleRows" :key="item.key" :label="item.title">
              <ElSwitch v-if="item.kind === 'boolean'" v-model="item.value" />
              <ElInputNumber
                v-else-if="item.kind === 'number'"
                v-model="item.value"
                controls-position="right"
              />
              <ElSelect v-else-if="item.input === 'select'" v-model="item.value" clearable>
                <ElOption
                  v-for="option in item.options"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </ElSelect>
              <DawnImagePicker v-else-if="item.input === 'image'" v-model="item.value" />
              <ElInput
                v-else
                v-model="item.value"
                :type="
                  item.secret
                    ? 'password'
                    : item.kind === 'json' || item.input === 'textarea'
                      ? 'textarea'
                      : 'text'
                "
                :show-password="item.secret"
                :rows="5"
              />
              <p v-if="item.remark" class="text-sm text-g-600 mt-2 w-full">{{ item.remark }}</p>
            </ElFormItem>
            <ElFormItem
              ><ElButton
                v-permission="'dawn.settings.update'"
                type="primary"
                :loading="saving"
                @click="save"
                >{{ t('保存修改') }}</ElButton
              ></ElFormItem
            >
            <ElFormItem v-if="group === '邮件服务'" :label="t('测试邮件')">
              <div class="flex gap-2"
                ><ElInput v-model="to" :placeholder="t('测试收件邮箱')" /><ElButton
                  @click="sendTest"
                  ><ArtSvgIcon icon="ri:mail-line" class="mr-1" />{{ t('发送') }}</ElButton
                ></div
              >
            </ElFormItem>
          </ElForm>
        </ElScrollbar>
      </ElCard>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import request from '@/utils/http'
  import { loadSite } from '@/api/site'
  const { t, locale } = useI18n()
  const rows = ref<any[]>([]),
    group = ref(''),
    to = ref(''),
    saving = ref(false)
  const groups = computed(() => [
    ...new Map(rows.value.map((s) => [s.group_key, { key: s.group_key, label: s.group }])).values()
  ])
  const visibleRows = computed(() =>
    rows.value.filter(
      (s) =>
        s.group_key === group.value &&
        Object.entries(s.when || {}).every(
          ([key, value]) => rows.value.find((r) => r.key === key)?.value === value
        )
    )
  )
  async function load() {
    rows.value = await request.get({ url: '/system/settings' })
    for (const row of rows.value)
      if (row.kind === 'json') row.value = JSON.stringify(row.value, null, 2)
    group.value ||= groups.value[0]?.key || ''
  }
  async function save() {
    saving.value = true
    try {
      const data = Object.fromEntries(
        rows.value
          .filter((s) => s.group_key === group.value)
          .map((s) => [s.key, s.kind === 'json' ? JSON.parse(s.value) : s.value])
      )
      await request.put({ url: '/system/settings', data })
      if (group.value === '站点配置') await loadSite()
      ElMessage.success(t('保存成功'))
      await load()
    } finally {
      saving.value = false
    }
  }
  async function sendTest() {
    await request.post({ url: '/system/mail/test', data: { to: to.value } })
    ElMessage.success(t('发送成功'))
  }
  watch(locale, load)
  onMounted(load)
</script>
