import { describe, expect, it } from 'vitest'
import { compileTextAdventureInteractionV1 } from '../../src/lib/adventure/production-compiler'
import { adventureNarrativeActionContext, availableAdventureActions, createInitialAdventureState } from '../../src/lib/adventure/runtime'
import { createTextAdventureFoundationContentV2 } from '../helpers/text-adventure-v2-foundation'

describe('文字冒险现场与行动引导', () => {
  it('空 NPC 出场表保持独处，后续场景只绑定明确登记的角色', () => {
    // Only the fields consumed by the deterministic interaction compiler are needed here.
    const input = {
      brief: { scale: { targetPlayMinutes: 30 }, intent: { contentBoundaries: [] } },
      cast: { characters: [{
        key: 'mentor', name: '失踪导师', role: 'major-npc', publicIdentity: '修钟师',
        voice: '简短', motivation: '修钟', forbiddenKnowledge: ['玩家选择'], initialKnowledge: ['钟声'],
      }] },
      arcPlan: { acts: [{ sceneCards: [
        { key: 'alone', castKeys: [], purpose: '独自调查', locationOrdinal: 1, conflict: '钟坏了' },
        { key: 'reunion', castKeys: ['mentor'], purpose: '重逢', locationOrdinal: 2, conflict: '追问' },
      ] }] },
      narrative: { nodes: [
        { key: 'alone', kind: 'entry', title: '独处', summary: '独自调查' },
        { key: 'reunion', kind: 'scene', title: '重逢', summary: '导师现身' },
      ], choices: [] },
    } as unknown as Parameters<typeof compileTextAdventureInteractionV1>[0]
    const result = compileTextAdventureInteractionV1(input)
    expect(result.sceneTemplates[0]).toMatchObject({ participantKeys: [], relationshipRules: [], publicKnowledgeKeys: [] })
    expect(result.sceneTemplates[1].participantKeys).toEqual([result.profiles[0].participantKey])
    expect(result.sceneTemplates[1].relationshipRules).toHaveLength(2)
  })

  it('锁定原因来自真实前置；完成目标后恢复可用，不靠修改文案放行', () => {
    const content = createTextAdventureFoundationContentV2()
    const state = createInitialAdventureState(content, 'test.content.hash')
    const quest = content.quests[0]
    const objective = quest.objectives[0]
    const condition = content.conditions[0]
    const template = content.actions[0]
    content.actions.push({ ...template, key: 'test.complete', locationKey: state.currentLocationKey,
      successEffects: [
        { op: 'complete-objective', questKey: quest.key, objectiveKey: objective.key },
        { op: 'apply-condition', conditionKey: condition.key, duration: null },
      ],
    }, { ...template, key: 'test.choice', locationKey: state.currentLocationKey,
      requirements: [{ conditionKey: condition.key, conditionPresent: true }],
      unavailableText: '当前状态不满足此行动条件。',
    })
    const available = () => availableAdventureActions(content, state, adventureNarrativeActionContext()).find(row => row.action.key === 'test.choice')!
    expect(available()).toMatchObject({ available: false, reason: `先完成：${objective.title}` })
    state.conditions.push({ conditionKey: condition.key, duration: null, appliedSequence: 1 })
    expect(available()).toMatchObject({ available: true, reason: '' })
  })
})
