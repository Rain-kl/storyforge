import type { WorkspaceScope } from '../types'
import { createBuiltinAdventureBrief, createBuiltinAdventureProduction } from '../builtin-adventure/production'
import { openBuiltinAdventurePlayer } from '../builtin-adventure/player'
import { createEchoWorldPreset } from '../world-engine/tidemark-echo-preset'
import { compileEchoPackage, measureEchoContent } from './compiler'
import { ECHO_ID, ECHO_TITLE } from './definition'

export async function createEchoBrief(scope: WorkspaceScope, worldReleaseId: number) {
  return createBuiltinAdventureBrief(scope, worldReleaseId, {
    slug: 'tidemark-echo', title: ECHO_TITLE, summary: '两声一模一样的铜铃，一位等待接应的船工。', openingConflict: '分辨回声与活人的回答，让人平安回到岸上。',
    scale: { scope: 'short-arc', targetPlayMinutes: 5, targetWordCount: 1500, targetEndingCount: 2 },
    intent: participants => ({ productType: 'text-adventure', playerRole: '姜迟，穿橙雨衣的归乡测绘员', protagonistRefs: participants, openingSituation: '灯塔没有亮，两声铃从旧码头下传来。', coreExperience: ['用调查指导实际操作', '短对话中确认当事人的想法', '亲手执行不同的救援方案'], requiredFacts: ['盐纸是记录，不是活人', '先扣吊带再释放旧缆', '信件归收信人所有'], forbiddenChanges: ['不得将旧声音当作当事人的同意', '不得替阿照打开信匣', '不得用阅读超时杀死角色'], contentBoundaries: ['涉及失亲，无血腥画面'], tone: ['克制', '具体', '温暖'] }),
  })
}
const production = createBuiltinAdventureProduction({
  id: ECHO_ID, slug: 'tidemark-echo', title: ECHO_TITLE, worldTitle: '两声之间',
  createWorldPreset: createEchoWorldPreset, createBrief: createEchoBrief,
  compile: compileEchoPackage, measure: measureEchoContent,
  contentMinimum: { mainHan: 250, uniqueDialogueLines: 30 },
})
export const installEcho = production.install
export const findInstalledEcho = production.findInstalled
export const openEchoPlayer = (installed: { scope: WorkspaceScope; releaseId: number }, fresh: boolean) => openBuiltinAdventurePlayer(installed, fresh, '两声之间 · 我的接应')
