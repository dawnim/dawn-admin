import request from '@/utils/http'
export const fetchStatistics = () => request.get<any>({ url: '/dashboard/statistics' })
export const fetchLoginChart = () => request.get<any>({ url: '/dashboard/daily' })
export const fetchLoginBarChart = () => request.get<any>({ url: '/dashboard/monthly' })
