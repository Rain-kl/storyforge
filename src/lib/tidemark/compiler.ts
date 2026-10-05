import type { AdventureActionDefinition, AdventureEffect, AdventureProductRuntimePackageV1, FrozenNarrativeChoice, NarrativeCondition, ProductProductionBriefV3 } from '../types'
import { parseProductRuntimePackageV1 } from '../product-production/runtime-package'
import { CAST, CHAPTERS, CLUES, ENDINGS, PLACES, SCENES, STORY_REQUIREMENTS, TIDEMARK_ID, TIDEMARK_TITLE, type CastKey } from './definition'
import { parseAuthoredScript } from '../builtin-adventure/script'
import chapter1 from './story/act1.txt?raw'
import chapter2 from './story/act2.txt?raw'
import chapter3 from './story/act3.txt?raw'
import chapter4 from './story/act4.txt?raw'
import chapter5 from './story/act5.txt?raw'

export const parseTidemarkScript = (script: string) => parseAuthoredScript(script, CAST)

type Branch = { text: string; note: string; flag: string; value: boolean; trust?: number }
const BRANCHES: Record<string, Branch[]> = {
  s04: [{ text: '记下真实水位，先查清异常', note: '你会保留与公告矛盾的观测。', flag: 'measured', value: true }, { text: '先向镇务官报信，请他解释', note: '闻川会知道你正在调查。', flag: 'warned', value: true }],
  s08: [{ text: '答应梅婶：公开之前让当事人知道', note: '获得梅婶的信任。', flag: 'witness', value: true, trust: 1 }, { text: '我不能替真相承诺保密', note: '她会尊重你的坦率，但不再替你招集镇民。', flag: 'witness', value: false }],
  s12: [{ text: '让许芦保存原件，自己带副本', note: '证据有了第二位保管人。', flag: 'archiveSafe', value: true, trust: 1 }, { text: '把两份原件都带走', note: '完整证据由你独自承担。', flag: 'archiveSafe', value: false }],
  s16: [{ text: '保留旁路，寻找自愿供能的人', note: '赫生会继续准备新的线路。', flag: 'bypass', value: true, trust: 1 }, { text: '先备好旧灯芯，以防万一', note: '你留下了单人供灯的退路。', flag: 'bypass', value: false }],
  s20: [{ text: '先征得允许，再取走这段记忆', note: '守名人愿意协助自愿供能。', flag: 'consent', value: true, trust: 1 }, { text: '救人紧迫，这段记忆必须留下', note: '素琴拒绝替强取记忆做见证。', flag: 'consent', value: false }],
  s24: [{ text: '把救生绳交给乌荻，先救船工', note: '铜匣已有拓本，活着的人也能作证。', flag: 'rescued', value: true, trust: 1 }, { text: '先把原始铜匣拖出水面', note: '证据保全，受伤船工错过了第一班救援。', flag: 'rescued', value: false }],
  s28: [{ text: '让哥哥告诉镇民真相，不替大家决定', note: '姜澜答应离开蓄潮池。', flag: 'shared', value: true, trust: 1 }, { text: '你留在这里，我一个人处理', note: '哥哥会在灯塔等你作出最终决定。', flag: 'shared', value: false }],
  s32: [{ text: '公开责任，先救人，天亮后由镇民审议', note: '闻川保留调度权，接受公开记录。', flag: 'council', value: true, trust: 1 }, { text: '立即收回闻川的指挥权', note: '乌荻接管撤离，镇民各自准备。', flag: 'council', value: false }],
  s36: [{ text: '哥哥，我们都不该再替别人消失', note: '留下彼此可以说“不”的约定。', flag: 'brother', value: true }, { text: '我会承担你承担不了的那部分', note: '你开始理解供灯者的孤独。', flag: 'brother', value: false }],
}

const at = (place: string): NarrativeCondition => ({ path: 'adventure.currentLocationKey', eq: place })
export function tidemarkChoices(): FrozenNarrativeChoice[] {
  return SCENES.flatMap((scene, index) => {
    const requirement = STORY_REQUIREMENTS[scene.key]
    const conditions: NarrativeCondition[] = [at(scene.place)]
    if (requirement) conditions.push({ path: `adventure.inventory.${requirement}`, eq: 1 })
    const base = { sourceNodeKey: scene.key, displayConditionJson: '{}', tags: [] as string[] }
    if (scene.key === 's40') return ENDINGS.map((ending, order) => ({
      ...base, choiceKey: `choose.${ending.key}`, targetNodeKey: ending.key, order,
      text: ending.title, description: ending.subtitle,
      availableConditionJson: JSON.stringify({ all: [...conditions, ...(ending.key === 'ending.dawn' ? ['bypass', 'consent', 'rescued', 'shared', 'council'].map(path => ({ path, eq: true } as NarrativeCondition)) : [])] }),
      unavailableReason: ending.key === 'ending.dawn' ? '需要保留旁路、尊重同意、先救船工、让哥哥公开真相，并共同安排救援。' : '请先抵达灯塔。',
      effectsJson: '[]',
    }))
    return (BRANCHES[scene.key] ?? [{ text: '继续追寻', note: `下一步：${SCENES[index + 1].title}`, flag: '', value: true }]).map((branch, order) => ({
      ...base, choiceKey: `${scene.key}.choice${order}`, targetNodeKey: SCENES[index + 1].key, order,
      text: branch.text, description: branch.note,
      unavailableReason: requirement ? `先调查「${CLUES.find(clue => clue.key === requirement)?.title}」。` : '先到达这一幕发生的地点。',
      availableConditionJson: JSON.stringify({ all: conditions }),
      effectsJson: JSON.stringify(branch.flag ? [
        { op: 'set', path: branch.flag, value: branch.value },
        ...(branch.trust ? [{ op: 'increment', path: 'trust', value: branch.trust }] : []),
      ] : []),
    }))
  }).map(choice => ({ ...choice, tags: [`adventure-action:answer.${choice.choiceKey}`] }))
}

function action(key: string, locationKey: string, label: string, kind: AdventureActionDefinition['kind'], effects: AdventureEffect[] = []): AdventureActionDefinition {
  return { key, locationKey, label, description: label, kind, targetKey: null, requirements: [], rule: { kind: 'automatic' }, successEffects: effects, costlySuccessEffects: [], failureEffects: [], successText: label, costlySuccessText: '你暂时停下，重新确认眼前的情况。', failureText: '没有发生改变。', unavailableText: '当前条件尚未满足。', repeatable: false, narrativeChoiceKey: null }
}

export function compileTidemarkPackage(brief: ProductProductionBriefV3): AdventureProductRuntimePackageV1 {
  const choices = tidemarkChoices()
  const beats = parseTidemarkScript([chapter1, chapter2, chapter3, chapter4, chapter5].join('\n'))
  const actions: AdventureActionDefinition[] = PLACES.flatMap(place => [
    { ...action(`look.${place.key}`, place.key, `观察${place.title}`, 'look'), repeatable: true, successText: place.description },
    ...PLACES.filter(to => to.key !== place.key).map(to => ({ ...action(`move.${place.key}.${to.key}`, place.key, `前往${to.title}`, 'move', [{ op: 'enter-location', locationKey: to.key }]), targetKey: to.key, repeatable: true })),
  ])
  for (const clue of CLUES) actions.push({
    ...action(`inspect.${clue.key}`, clue.place, `调查${clue.title}`, 'take', [{ op: 'gain-item', itemKey: clue.key, quantity: 1, claimKey: `clue.${clue.key}` }]),
    targetKey: clue.key, successText: clue.description,
  })
  for (const choice of choices) {
    const scene = SCENES.find(item => item.key === choice.sourceNodeKey)!
    const effects: AdventureEffect[] = (scene.order + 1) % 4 === 0 ? [{ op: 'complete-objective', questKey: `chapter${scene.chapter}`, objectiveKey: 'resolve' }] : []
    actions.push({ ...action(`answer.${choice.choiceKey}`, scene.place, choice.text, 'talk', effects),
      targetKey: `character:${scene.speaker}`, narrativeChoiceKey: choice.choiceKey,
      requirements: [{ narrativePath: 'scene', narrativeEquals: scene.key },
        ...(STORY_REQUIREMENTS[scene.key] ? [{ itemKey: STORY_REQUIREMENTS[scene.key], itemQuantity: 1 }] : []),
        ...(choice.targetNodeKey === 'ending.dawn' ? ['bypass','consent','rescued','shared','council'].map(narrativePath => ({ narrativePath, narrativeEquals: true })) : []),
      ],
      successText: choice.description || choice.text,
      interaction: { participantKey: scene.speaker, sceneKey: scene.key, ruleKey: choice.choiceKey },
    })
  }
  const pkg: AdventureProductRuntimePackageV1 = {
    schema: 'storyforge.product-runtime-package', version: 1, productType: 'text-adventure',
    definition: { productKey: TIDEMARK_ID, title: TIDEMARK_TITLE, description: '暴潮前夜，回到白礁镇，寻找失踪的守灯人。在记忆与生者之间，为最后一盏灯选择燃料。', enabledCapabilities: ['narrative', 'interaction', 'adventure'], rulesetVersion: 1, initialVariables: { tidemarkVersion: 1, trust: 0, scene: 's01' } },
    sourceWorld: { contentHash: brief.source.worldContentHash, selection: brief.source.selection },
    narrative: { moduleKind: 'main', moduleTitle: TIDEMARK_TITLE, entryNodeKey: 's01',
      nodes: [...SCENES.map((scene, index) => ({ key: scene.key, kind: index === 0 ? 'entry' as const : 'scene' as const, title: scene.title, summary: `${CHAPTERS[scene.chapter]} · ${PLACES.find(place => place.key === scene.place)?.title}`, conditionJson: '{}', effectsJson: JSON.stringify([{ op: 'set', path: 'scene', value: scene.key }]), successorKeys: [...new Set(choices.filter(choice => choice.sourceNodeKey === scene.key).map(choice => choice.targetNodeKey))] })),
        ...ENDINGS.map(ending => ({ key: ending.key, kind: 'ending' as const, title: ending.title, summary: ending.subtitle, conditionJson: '{}', effectsJson: '[]', successorKeys: [] }))],
      choices, beats,
    },
    interaction: { playerKey: 'player',
      profiles: Object.entries(CAST).filter(([key]) => key !== 'player').map(([key, person]) => ({ participantKey: key, characterKey: key, name: person.name, roleLabel: person.role, voiceRules: '根据已发生的剧情和可见证据回答，不改变冻结事实。', initialKnowledge: [{ key: `${key}.identity`, content: person.description, visibility: 'public' as const, importance: 5 }], relationshipDimensions: [{ key: 'trust' as const, label: '信任', minimum: -20, maximum: 100, initial: 0, largeChangeThreshold: 10 }], maxMemoryEntries: 60 })),
      sceneTemplates: SCENES.map(scene => ({ sceneKey: scene.key, title: scene.title, purpose: '倾听并作出选择', location: scene.place, timeLabel: CHAPTERS[scene.chapter], participantKeys: [scene.speaker], publicKnowledgeKeys: [], goals: ['理解当事人的处境'], endingConditions: ['玩家作出选择'], safetyBoundaries: ['不将沉默当作同意'], relationshipRules: choices.filter(choice => choice.sourceNodeKey === scene.key).map(choice => ({ ruleKey: choice.choiceKey, label: choice.text, playerText: choice.text, fromParticipantKey: scene.speaker, toParticipantKey: 'player', dimensionKey: 'trust' as const, delta: choice.order === 0 ? 1 : -1, reason: choice.description, significantEventKey: null })), openingNodeKey: null, endingNodeKey: null, maxTurns: 40, directorBudget: 1, order: scene.order })),
    },
    adventure: { version: 1, playerKey: 'player', playerIdentity: { name: CAST.player.name, description: CAST.player.description }, initialLocationKey: 'quay',
      locations: PLACES.map(place => ({ key: place.key, title: place.title, description: place.description, tags: ['tidemark-v1'] })),
      objects: CLUES.map(clue => ({ key: `object.${clue.key}`, locationKey: clue.place, title: clue.title, description: clue.description, tags: ['evidence'] })),
      items: CLUES.map(clue => ({ key: clue.key, title: clue.title, description: clue.description, tags: ['evidence'], stackable: false, consumable: false })),
      abilities: [{ key: 'observation', title: '观测', description: '以事实核对说法。', initial: 3, minimum: 0, maximum: 10 }],
      resources: [{ key: 'resolve', title: '决心', initial: 10, minimum: 0, maximum: 10 }], conditions: [], initialInventory: [], actions,
      quests: CHAPTERS.map((title, index) => ({ key: `chapter${index}`, title, description: `完成${title}的调查并作出决定。`, initialStatus: 'active', prerequisites: [], objectives: [{ key: 'resolve', title: SCENES[index * 4 + 3].title, optional: false, alternativeActionKeys: choices.filter(choice => choice.sourceNodeKey === SCENES[index * 4 + 3].key).map(choice => `answer.${choice.choiceKey}`) }], rewardEffects: [], completionNodeKey: null, failureNodeKey: null })),
    },
  }
  return parseProductRuntimePackageV1(pkg) as AdventureProductRuntimePackageV1
}

export function measureTidemarkContent(pkg: Pick<AdventureProductRuntimePackageV1, 'narrative'>) {
  const hanCount = (text: string) => (text.match(/\p{Script=Han}/gu) ?? []).length
  const countNode = (key: string) => pkg.narrative.beats.filter(beat => beat.nodeKey === key).reduce((sum, beat) => sum + hanCount(beat.text), 0)
  const main = SCENES.reduce((sum, scene) => sum + countNode(scene.key), 0)
  const dialogues = pkg.narrative.beats.filter(beat => beat.kind === 'dialogue')
  return { mainHan: main, shortestRouteHan: main + Math.min(...ENDINGS.map(ending => countNode(ending.key))), totalHan: pkg.narrative.beats.reduce((sum, beat) => sum + hanCount(beat.text), 0), dialogueLines: dialogues.length, uniqueDialogueLines: new Set(dialogues.map(beat => beat.text)).size, scenes: SCENES.length, endings: ENDINGS.length }
}

export function speakerName(key: string | null) { return key && key in CAST ? CAST[key as CastKey].name : '' }
