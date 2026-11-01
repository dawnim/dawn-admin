import SparkMD5 from 'spark-md5'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/hashes/utils'
import request from '@/utils/http'

export async function upload(
  file: File,
  categoryId = 0,
  onProgress: (value: number) => void = () => {}
) {
  const md5 = new SparkMD5.ArrayBuffer(),
    sha = sha256.create(),
    chunkSize = 2 * 1024 * 1024
  for (let offset = 0; offset < file.size; offset += chunkSize) {
    const block = await file.slice(offset, offset + chunkSize).arrayBuffer()
    md5.append(block)
    sha.update(new Uint8Array(block))
    onProgress(Math.min(25, Math.round(((offset + block.byteLength) / file.size) * 25)))
  }
  const info = {
    name: file.name,
    size: file.size,
    md5: md5.end(),
    sha256: bytesToHex(sha.digest()),
    category_id: categoryId
  }
  const hit = await request.post<{ exists: boolean; id: number; url: string }>({
    url: '/attachments/check',
    data: info
  })
  if (hit.exists) {
    onProgress(100)
    return hit
  }
  if (file.size <= 8 * 1024 * 1024) {
    const data = new FormData()
    data.append('file', file)
    data.append('md5', info.md5)
    data.append('sha256', info.sha256)
    data.append('category_id', String(categoryId))
    return request.post<{ id: number; url: string }>({
      url: '/attachments/upload',
      data,
      timeout: 120000,
      onUploadProgress: (e) => onProgress(25 + Math.round((e.progress || 0) * 75))
    })
  }
  const session = await request.post<{ upload_id: string; chunk_size: number }>({
    url: '/attachments/uploads',
    data: info
  })
  for (let offset = 0, index = 0; offset < file.size; offset += session.chunk_size, index++) {
    await request.put({
      url: `/attachments/uploads/${session.upload_id}/${index}`,
      data: file.slice(offset, offset + session.chunk_size),
      headers: { 'Content-Type': 'application/octet-stream' },
      timeout: 120000
    })
    onProgress(25 + Math.round((Math.min(file.size, offset + session.chunk_size) / file.size) * 75))
  }
  return request.post<{ id: number; url: string }>({
    url: `/attachments/uploads/${session.upload_id}/complete`
  })
}
