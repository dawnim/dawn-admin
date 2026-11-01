<template>
  <ElDialog
    v-model="visible"
    :title="t('菜单权限')"
    width="600px"
    align-center
    class="el-dialog-border"
    @close="handleClose"
  >
    <ElScrollbar height="70vh">
      <ElTree
        ref="treeRef"
        :data="menuList"
        show-checkbox
        node-key="id"
        :default-expand-all="false"
        :check-strictly="checkStrictly"
      >
        <template #default="{ data }">
          <div class="flex-c gap-2">
            <span>{{ data.label }}</span>
            <ElTag :type="getMenuTypeTag(data)" size="small">{{ getMenuTypeText(data) }}</ElTag>
          </div>
        </template>
      </ElTree>
    </ElScrollbar>
    <template #footer>
      <ElButton @click="toggleExpandAll" v-ripple>
        <template #icon>
          <ArtSvgIcon v-if="isExpandAll" icon="ri:collapse-diagonal-line" />
          <ArtSvgIcon v-else icon="ri:expand-diagonal-line" />
        </template>
        {{ isExpandAll ? t('收起') : t('展开') }}
      </ElButton>
      <ElButton @click="toggleCheck" style="margin-left: 8px">{{
        checkStrictly ? t('非关联选择模式') : t('关联选择模式')
      }}</ElButton>
      <ElButton type="primary" @click="savePermission">{{ t('保存') }}</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { $t as t } from '@/locales'
  import api from '@/api/system/role'

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

  const menuList = ref<Api.Common.ApiData[]>([])
  const treeRef = ref()

  const isExpandAll = ref(false)
  const checkStrictly = ref(true)

  /**
   * 弹窗显示状态双向绑定
   */
  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

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
    const data = await api.menuByRole({ id: props.data?.id })
    menuList.value = data.menus
    await nextTick()
    treeRef.value.setCheckedKeys(data.keys)
  }

  /**
   * 获取菜单类型标签颜色
   * @param row 菜单行数据
   * @returns 标签颜色类型
   */
  const getMenuTypeTag = (row: any): 'primary' | 'success' | 'warning' | 'info' | 'danger' => {
    if (row.type == 1) return 'info'
    if (row.type == 2) return 'primary'
    if (row.type == 3) return 'danger'
    if (row.type == 4) return 'success'
    return 'info'
  }

  /**
   * 获取菜单类型文本
   * @param row 菜单行数据
   * @returns 菜单类型文本
   */
  const getMenuTypeText = (row: any): string => {
    if (row.type == 1) return t('目录')
    if (row.type == 2) return t('菜单')
    if (row.type == 3) return t('按钮')
    if (row.type == 4) return t('外链')
    return t('未知')
  }

  /**
   * 关闭弹窗并清空选中状态
   */
  const handleClose = () => {
    visible.value = false
    treeRef.value?.setCheckedKeys([])
  }

  /**
   * 保存权限配置
   */
  const savePermission = async () => {
    const checkedKeys = treeRef.value
      .getCheckedKeys()
      .filter((key: string) => treeRef.value.getNode(key).data.grantable)
    try {
      await api.menuPermission({
        id: props.data?.id,
        menu_ids: checkedKeys
      })
      ElMessage.success(t('保存成功'))
      emit('success')
      handleClose()
    } catch (error) {
      console.log(t('表单验证失败'), error)
    }
  }

  /**
   * 切换全部展开/收起状态
   */
  const toggleExpandAll = () => {
    const tree = treeRef.value
    if (!tree) return

    const nodes = tree.store.nodesMap
    // 这里保留 any，因为 Element Plus 的内部节点类型较复杂
    Object.values(nodes).forEach((node: any) => {
      node.expanded = !isExpandAll.value
    })

    isExpandAll.value = !isExpandAll.value
  }

  /**
   * 切换关联选择/非关联选择状态
   */
  const toggleCheck = () => {
    const tree = treeRef.value
    if (!tree) return

    checkStrictly.value = !checkStrictly.value
  }
</script>
