import type { SoulStack } from './types'
import { serializeSoulStack } from './serialize'

// Pack the authored .soul/ tree into a zip and trigger a download. jszip is
// loaded on demand so it never weighs down the initial bundle.
export async function downloadSoulZip(stack: SoulStack, filename = 'soul.zip'): Promise<void> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  for (const file of serializeSoulStack(stack)) zip.file(file.path, file.content)
  const blob = await zip.generateAsync({ type: 'blob' })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
