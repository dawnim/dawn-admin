<template>
  <div class="page-content mb-5" v-loading="loading">
    <ElRow :gutter="20">
      <ElCol v-for="item in definitions" :key="item.name" :span="24" class="mb-4">
        <ElCard class="art-table-card" shadow="never">
          <template #header
            ><div class="flex justify-between items-center"
              ><span class="text-lg font-medium">{{ item.description }}</span
              ><ElButton @click="open(item)"
                ><ArtSvgIcon icon="ri:list-check" class="mr-1" />{{ t('查看缓存') }}</ElButton
              ></div
            ></template
          >
          <ElDescriptions :column="2" border>
            <ElDescriptionsItem :label="t('定义名称')">{{ item.name }}</ElDescriptionsItem
            ><ElDescriptionsItem :label="t('类型')">{{ item.type }}</ElDescriptionsItem>
            <ElDescriptionsItem :label="t('Key规则')">
              {{ item.pattern }}
              <ElTag class="ml-2" :type="item.clearable ? 'success' : 'info'">
                {{ t(item.clearable ? '清理缓存时会被清理' : '清理缓存时不清理，但可手动清理') }}
              </ElTag> </ElDescriptionsItem
            ><ElDescriptionsItem label="TTL">{{
              item.ttl ? item.ttl / 1e9 + 's' : t('永久')
            }}</ElDescriptionsItem>
          </ElDescriptions>
        </ElCard>
      </ElCol>
    </ElRow>
    <ElDialog v-model="visible" :title="selected.description" width="min(1000px,94vw)" align-center>
      <ArtTable :data="rows" :columns="columns">
        <template #operation="{ row }"
          ><div class="flex gap-2"
            ><DawnButton
              v-if="selected.readable"
              type="primary"
              icon="ri:eye-line"
              :tool-tip="t('查看')"
              @click="read(row.key)" /><DawnButton
              v-permission="'dawn.cache.delete'"
              type="error"
              @click="remove(row.key)" /></div
        ></template>
      </ArtTable>
      <template #footer
        ><ElButton v-if="cursor" @click="scan">{{ t('加载更多') }}</ElButton></template
      >
    </ElDialog>
    <ElDialog v-model="valueVisible" :title="t('缓存内容')" width="min(800px,94vw)" align-center
      ><div
        ><DawnCode :code="value" language="json" /><ElForm v-if="selected.editable" class="mt-4">
          <ElFormItem v-if="selected.type === 'hash'" :label="t('字段')"
            ><ElInput v-model="editField"
          /></ElFormItem>
          <ElFormItem :label="t('缓存内容')"
            ><ElInput v-model="editValue" type="textarea" :rows="8"
          /></ElFormItem>
          <ElButton v-permission="'dawn.cache.update'" type="primary" @click="saveValue">{{
            t('保存修改')
          }}</ElButton>
        </ElForm></div
      ><template #footer
        ><ElButton v-if="valueCursor" @click="read(currentKey, true)">{{
          t('加载更多')
        }}</ElButton></template
      ></ElDialog
    >
  </div>
</template>
<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import request from '@/utils/http'
  const { t } = useI18n()
  const definitions = ref<any[]>([]),
    selected = ref<any>({}),
    rows = ref<any[]>([]),
    cursor = ref(0),
    visible = ref(false),
    valueVisible = ref(false),
    value = ref(''),
    valueData = ref<any>(null),
    valueCursor = ref(0),
    currentKey = ref(''),
    editField = ref(''),
    editValue = ref(''),
    loading = ref(false)
  const columns = computed(() => [
    { prop: 'key', label: 'Key', minWidth: 300 },
    { prop: 'type', label: t('类型'), width: 100 },
    {
      prop: 'ttl',
      label: 'TTL',
      width: 100,
      formatter: (row: any) => (row.ttl < 0 ? t('永久') : row.ttl + 's')
    },
    { prop: 'operation', label: t('操作'), useSlot: true, width: 100 }
  ])
  async function scan() {
    const data = await request.get<{ data: any[]; cursor: number }>({
      url: '/cache/instances',
      params: { definition: selected.value.name, cursor: cursor.value }
    })
    rows.value.push(...data.data)
    cursor.value = data.cursor
  }
  async function open(item: any) {
    selected.value = item
    rows.value = []
    cursor.value = 0
    visible.value = true
    await scan()
  }
  async function read(key: string, more = false) {
    const data = await request.get<any>({
      url: '/cache/value',
      params: { definition: selected.value.name, key, cursor: more ? valueCursor.value : 0 }
    })
    valueData.value = more ? [...valueData.value, ...data.data] : (data.data ?? data)
    valueCursor.value = data.cursor || 0
    const content =
      selected.value.type === 'hash'
        ? Object.fromEntries(
            Array.from({ length: valueData.value.length / 2 }, (_, i) => [
              valueData.value[i * 2],
              selected.value.name === 'ForeverSettings'
                ? JSON.parse(valueData.value[i * 2 + 1])
                : valueData.value[i * 2 + 1]
            ])
          )
        : valueData.value
    value.value = JSON.stringify(content, null, 2)
    currentKey.value = key
    editField.value = ''
    editValue.value = typeof data === 'string' ? data : ''
    valueVisible.value = true
  }
  async function saveValue() {
    await request.put({
      url: '/cache/value',
      params: { definition: selected.value.name, key: currentKey.value },
      data: { field: editField.value, value: editValue.value }
    })
    ElMessage.success(t('保存成功'))
    await read(currentKey.value)
  }
  async function remove(key: string) {
    await request.del({ url: '/cache/value', params: { definition: selected.value.name, key } })
    rows.value = rows.value.filter((r) => r.key !== key)
  }
  onMounted(async () => {
    loading.value = true
    try {
      definitions.value = await request.get({ url: '/cache/definitions' })
    } finally {
      loading.value = false
    }
  })
</script>
