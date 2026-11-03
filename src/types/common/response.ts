/** HTTP状态表示请求结果，JSON承载数据或错误信息。 */
export interface BaseResponse<T = unknown> {
  /** 详情、写入结果或列表记录；204响应没有正文。 */
  data: T
  /** 普通列表的分页信息，total为筛选后的总条数。 */
  meta?: { page: number; page_size: number; total: number }
  /** 按当前语言返回的提示或错误原因。 */
  message?: string
  /** 参数校验错误，以接口字段名为key。 */
  errors?: Record<string, string>
}
