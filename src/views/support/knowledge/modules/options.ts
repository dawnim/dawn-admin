import type { TagProps } from 'element-plus'

export const statusLabels: Record<string, string> = {
  draft: '待审核',
  published: '已发布',
  disabled: '停用',
  queued: '排队中',
  processing: '处理中',
  running: '执行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
  waiting: '等待确认'
}
export const statusTypes: Record<string, TagProps['type']> = {
  draft: 'warning',
  published: 'success',
  disabled: 'info',
  queued: 'warning',
  processing: 'primary',
  running: 'primary',
  completed: 'success',
  failed: 'danger',
  cancelled: 'info',
  waiting: 'warning'
}
export const runKinds: Record<string, string> = {
  import: '知识导入',
  index: '索引重建',
  index_cleanup: '索引清理',
  reply: 'AI回复',
  draft: 'AI草稿',
  tool: '工具调用',
  probe: '模型测试',
  telegram_update: 'Telegram消息接收',
  telegram_send: 'Telegram消息发送'
}
