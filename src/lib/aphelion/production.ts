import type { WorkspaceScope } from '../types'
import { createBuiltinAdventureBrief, createBuiltinAdventureProduction } from '../builtin-adventure/production'
import { createAphelionWorldPreset } from '../world-engine/aphelion-preset'
import { compileAphelionPackage, measureAphelionContent } from './compiler'
import { APHELION_ID, APHELION_TITLE } from './definition'

export const createAphelionBrief = (scope:WorkspaceScope,worldReleaseId:number) => createBuiltinAdventureBrief(scope,worldReleaseId,{
  slug:'aphelion',title:APHELION_TITLE,summary:'林舟从轮值冷眠醒来，在未来事故录音中听见自己的声音。',openingConflict:'返航窗口临近，预测系统正在把模拟事故变成设备命令。',
  intent:participants=>({productType:'text-adventure',playerRole:'林舟，航路鉴证员',protagonistRefs:participants,openingSituation:'第七码头出现一份提前四十七分钟的事故报告。',coreExperience:['探索深空空间站的十个区域','解开设备谜题，交叉核验原始证据','进入不同分支场景，承担四种返航方案的代价'],requiredFacts:['站内二百一十六名冷眠乘客加十二名值班船员共二百二十八人','事故预告是预测数据，不是真实时间旅行','砾不能证明自己的意识，也不能代替人类下达物理命令'],forbiddenChanges:['不得把模拟记录当作已经发生的事实','不得声称任一方案没有代价','不得把冷眠乘客写成货物'],contentBoundaries:['涉及深空孤独、失亲和生存决策，无血腥或战斗画面'],tone:['硬朗的工程细节','克制的人物情感','保留未知的科幻悬疑']}),
})
const production=createBuiltinAdventureProduction({id:APHELION_ID,slug:'aphelion',title:APHELION_TITLE,worldTitle:'远日点空间站',createWorldPreset:createAphelionWorldPreset,createBrief:createAphelionBrief,compile:compileAphelionPackage,measure:measureAphelionContent})
export const installAphelion=production.install
export const findInstalledAphelion=production.findInstalled
export const createAphelionPlan=production.createPlan
export const aphelionExecutor=production.executor
