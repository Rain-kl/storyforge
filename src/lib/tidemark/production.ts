import type { WorkspaceScope } from '../types'
import { createBuiltinAdventureBrief, createBuiltinAdventureProduction } from '../builtin-adventure/production'
import { createTidemarkWorldPreset } from '../world-engine/tidemark-preset'
import { compileTidemarkPackage, measureTidemarkContent } from './compiler'
import { TIDEMARK_ID, TIDEMARK_TITLE } from './definition'

export async function createTidemarkBrief(scope: WorkspaceScope, worldReleaseId: number) {
  return createBuiltinAdventureBrief(scope, worldReleaseId, {
    slug: 'tidemark', title: TIDEMARK_TITLE, summary: '姜迟因哥哥的空白信回到白礁镇。',
    openingConflict: '暴潮前寻找失踪的守灯人，查清灯塔如何供能。',
    intent: participants => ({ productType: 'text-adventure', playerRole: '姜迟，归乡的水文测绘员', protagonistRefs: participants, openingSituation: '十三年后，姜迟回到白礁镇。灯塔没有按时亮起。', coreExperience: ['步行探索海边小镇', '核验证据并倾听九位人物', '承担选择，抵达四种结局'], requiredFacts: ['记忆不是死者本人', '暴潮是自然危险，停灯不能消除海潮', '记忆的使用需要所有者同意'], forbiddenChanges: ['不得将海中回声写成无条件复活', '不得以沉默视为同意'], contentBoundaries: ['涉及失亲与灾后创伤，无血腥画面'], tone: ['克制', '海边奇幻', '带着代价的希望'] }),
  })
}
const production = createBuiltinAdventureProduction({
  id: TIDEMARK_ID, slug: 'tidemark', title: TIDEMARK_TITLE, worldTitle: '白礁镇',
  createWorldPreset: createTidemarkWorldPreset, createBrief: createTidemarkBrief,
  compile: compileTidemarkPackage, measure: measureTidemarkContent,
})
export const createTidemarkPlan = production.createPlan
export const tidemarkExecutor = production.executor
export const findInstalledTidemark = production.findInstalled
export const installTidemark = production.install
