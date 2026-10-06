import type { FrozenNarrativeBeat } from '../types'

export function parseAuthoredScript(script: string, cast: Record<string, unknown>): FrozenNarrativeBeat[] {
  const beats: FrozenNarrativeBeat[] = []
  let nodeKey = ''; let order = 0
  for (const line of script.split('\n').map(line => line.trim()).filter(Boolean)) {
    if (line.startsWith('@@ ')) { nodeKey = line.slice(3); order = 0; continue }
    if (!nodeKey) throw new Error('剧本段落缺少场景标记')
    const divider = line.indexOf('|')
    if (divider < 1) throw new Error(`剧本格式错误：${nodeKey}`)
    const speaker = line.slice(0, divider); const text = line.slice(divider + 1).trim()
    if (speaker !== '_' && !Object.prototype.hasOwnProperty.call(cast, speaker)) throw new Error(`未知发言人：${speaker}`)
    if (!text) throw new Error(`空白台词：${nodeKey}`)
    beats.push({ beatKey: `${nodeKey}.b${order}`, nodeKey, kind: speaker === '_' ? 'narration' : 'dialogue', speakerKey: speaker === '_' ? null : speaker, text, order: order++ })
  }
  if (new Set(beats.map(beat => beat.beatKey)).size !== beats.length) throw new Error('重复剧本场景')
  return beats
}
