import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AIStreamOutput from '../../src/components/shared/AIStreamOutput'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mounted: Array<{ host: HTMLDivElement; root: ReturnType<typeof createRoot> }> = []

afterEach(async () => {
  while (mounted.length) {
    const item = mounted.pop()!
    await act(async () => item.root.unmount())
    item.host.remove()
  }
})

describe('AI 候选持久化屏障', () => {
  it('校验和持久化完成前不开放编辑、采纳、关闭或重试', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    mounted.push({ host, root })
    const output = JSON.stringify({ scenes: [{ title: '钟楼铜箔' }] })
    const props = {
      output,
      isStreaming: false,
      error: null,
      editable: true,
      onStop: vi.fn(),
      onRetry: vi.fn(),
      onAccept: vi.fn(),
      onDismiss: vi.fn(),
    }

    await act(async () => root.render(<AIStreamOutput {...props} isFinalizing />))

    expect(host.querySelector('textarea[aria-label="AI 候选可编辑内容"]')).toBeNull()
    expect(host.textContent).toContain('正在建立可恢复候选')
    expect([...host.querySelectorAll('button')].map(button => button.textContent)).not.toEqual(
      expect.arrayContaining(['采纳', '关闭', '重试']),
    )

    await act(async () => root.render(<AIStreamOutput {...props} isFinalizing={false} />))

    expect((host.querySelector('textarea[aria-label="AI 候选可编辑内容"]') as HTMLTextAreaElement).value)
      .toBe(output)
    expect([...host.querySelectorAll('button')].map(button => button.textContent)).toEqual(
      expect.arrayContaining(['采纳', '关闭', '重试']),
    )
  })
})
