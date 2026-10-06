import type { AdventureActionDefinition, AdventureEffect, AdventureProductRuntimePackageV1, FrozenNarrativeChoice, NarrativeCondition, ProductProductionBriefV3 } from '../types'
import { parseProductRuntimePackageV1 } from '../product-production/runtime-package'
import { parseAuthoredScript } from '../builtin-adventure/script'
import { ALL_SCENES, APHELION_ID, APHELION_TITLE, CAST, CHAPTERS, CLUES, CLUE_CHAPTER, ENDINGS, PLACES, PUZZLES, SCENES, SIDE_SCENES, STORY_REQUIREMENTS } from './definition'
import chapter1 from './story/chapter1.txt?raw'
import chapter2 from './story/chapter2.txt?raw'
import chapter3 from './story/chapter3.txt?raw'
import chapter4 from './story/chapter4.txt?raw'
import chapter5 from './story/chapter5.txt?raw'
import chapter6 from './story/chapter6.txt?raw'
import chapter7 from './story/chapter7.txt?raw'
import chapter8 from './story/chapter8.txt?raw'
import chapter9 from './story/chapter9.txt?raw'
import chapter10 from './story/chapter10.txt?raw'
import branches from './story/branches.txt?raw'
import endings from './story/endings.txt?raw'

export const parseAphelionScript = (script: string) => parseAuthoredScript(script, CAST)
type Branch = { text: string; note: string; target?: string; flag: string; value: boolean }
export const BRANCHES: Record<string,Branch[]> = {
  s04: [
    { text:'保留原始录音，启动独立核验', note:'异常会进入所有值班员可见的记录。', flag:'preserved', value:true },
    { text:'先按紧急预案布置撤离', note:'饶舒先调动人手，核验将与撤离同步进行。', flag:'preserved', value:false },
  ],
  s08: [
    { text:'完整审计命令来源，包括未公开的附件', note:'与简溯进入档案室，保留独立建站所需的审计链。', target:'route.audit', flag:'auditTrail', value:true },
    { text:'给饶舒一次有记录的临时授权', note:'留在航务中枢，优先完成返航调度。', target:'route.trust', flag:'auditTrail', value:false },
  ],
  s12: [
    { text:'让照护需求与职业技能分列，保留全部姓名', note:'不把六名需要照护的人藏在负载总数里。', flag:'fullCensus', value:true },
    { text:'先按设备适配完成分组，再附乘员申诉表', note:'调度更快，陶然会继续检查被分类漏掉的人。', flag:'fullCensus', value:false },
  ],
  s16: [
    { text:'保留八吨循环水，接受较窄的返航余量', note:'到温室核验长期居留的物理基础。', target:'route.water', flag:'reserveWater', value:true },
    { text:'将备用水转成推进余量，优先保障返航', note:'到码头检查获得的十二秒航路容错。', target:'route.drive', flag:'reserveWater', value:false },
  ],
  s20: [
    { text:'保留公开协议，只撤销模型的设备写权限', note:'砾可以继续提供带来源的意见，不能直接下达命令。', flag:'openProtocol', value:true },
    { text:'封闭模型接口，之后只接受人工计算结果', note:'减少未知接口风险，也失去向地球迁移模型的通道。', flag:'openProtocol', value:false },
  ],
  s24: [
    { text:'把留站方案交给乘员共同修订', note:'到舱列组织实际劳动分工，为独立建站做准备。', target:'route.people', flag:'crewCouncil', value:true },
    { text:'以完整返航清单为首要承诺', note:'到码头核验每个人的转运位置。', target:'route.cargo', flag:'crewCouncil', value:false },
  ],
  s28: [
    { text:'将独立星位与误差范围附在每份命令上', note:'保留向地球传送完整观测与模型的资格。', flag:'verifiedSignal', value:true },
    { text:'只采用已验证的中央航道，封存其余数据', note:'减少操作员需要处理的选项，但不签发开放传输证明。', flag:'verifiedSignal', value:false },
  ],
  s32: [
    { text:'给砾独立身份封套，同时保留人类的物理否决权', note:'它的记录可以作为连续个体迁移，不被冒名为前站长。', flag:'identityKey', value:true },
    { text:'将砾封存为研究档案，暂不认定连续身份', note:'保存讨论证据，但不授权以个体名义发送砾。', flag:'identityKey', value:false },
  ],
  s36: [
    { text:'签署独立供能桥，让码头具备留站能力', note:'接受持续人工维护的负担，保留独立建站选项。', flag:'manualBridge', value:true },
    { text:'拆桥回收电容，给返航再加一道冗余', note:'把最后一份余量交给回家的航程。', flag:'manualBridge', value:false },
  ],
}

export function aphelionChoices(): FrozenNarrativeChoice[] {
  return ALL_SCENES.flatMap(scene => {
    const clue = STORY_REQUIREMENTS[scene.key]
    const conditions: NarrativeCondition[] = [{ path:'adventure.currentLocationKey', eq:scene.place }]
    if (clue) conditions.push({ path:`adventure.inventory.${clue}`, eq:1 })
    const base = { sourceNodeKey:scene.key, displayConditionJson:'{}' }
    if (scene.key === 's40') return ENDINGS.map((ending,order) => ({
      ...base, choiceKey:`choose.${ending.key}`, targetNodeKey:ending.key, order, text:ending.title, description:ending.subtitle,
      availableConditionJson:JSON.stringify({all:[...conditions,...ending.flags.map(path=>({path,eq:true}))]}),
      unavailableReason:ending.reason || '先抵达第七码头。', effectsJson:'[]', tags:[`adventure-action:answer.choose.${ending.key}`],
    }))
    const side = SIDE_SCENES.find(item=>item.key===scene.key)
    const next = side?.next ?? SCENES[Math.floor(scene.order)+1]?.key
    return (BRANCHES[scene.key] ?? [{text:'继续调查',note:`下一步：${ALL_SCENES.find(item=>item.key===next)?.title}`,flag:'',value:true}]).map((branch,order)=>({
      ...base, choiceKey:`${scene.key}.choice${order}`, targetNodeKey:branch.target??next!, order, text:branch.text, description:branch.note,
      availableConditionJson:JSON.stringify({all:conditions}), unavailableReason:clue?`先完成「${CLUES.find(item=>item.key===clue)?.title}」的核验。`:'请先到达本幕发生的地点。',
      effectsJson:JSON.stringify(branch.flag?[{op:'set',path:branch.flag,value:branch.value}]:[]), tags:[`adventure-action:answer.${scene.key}.choice${order}`],
    }))
  })
}

function action(key:string,locationKey:string,label:string,kind:AdventureActionDefinition['kind'],effects:AdventureEffect[]=[]):AdventureActionDefinition {
  return {key,locationKey,label,description:label,kind,targetKey:null,requirements:[],rule:{kind:'automatic'},successEffects:effects,costlySuccessEffects:[],failureEffects:[],successText:label,costlySuccessText:'暂时停下，重新核验。',failureText:'没有改变设备状态。',unavailableText:'当前条件尚未满足。',repeatable:false,narrativeChoiceKey:null}
}
export const puzzleStepKey = (clue:string, index:number) => `calibration.${clue}.${index}`

export function compileAphelionPackage(brief:ProductProductionBriefV3):AdventureProductRuntimePackageV1 {
  const choices=aphelionChoices()
  const beats=parseAphelionScript([chapter1,chapter2,chapter3,chapter4,chapter5,chapter6,chapter7,chapter8,chapter9,chapter10,branches,endings].join('\n'))
  const actions:AdventureActionDefinition[]=PLACES.flatMap(place=>[
    {...action(`look.${place.key}`,place.key,`观察${place.title}`,'look'),repeatable:true,successText:place.description},
    ...PLACES.filter(to=>to.key!==place.key).map(to=>({...action(`move.${place.key}.${to.key}`,place.key,`前往${to.title}`,'move',[{op:'enter-location',locationKey:to.key}]),targetKey:to.key,repeatable:true})),
  ])
  for(const puzzle of PUZZLES) {
    const clue=CLUES.find(item=>item.key===puzzle.clue)!
    puzzle.steps.forEach((label,index)=>actions.push({
      ...action(puzzleStepKey(clue.key,index),clue.place,label,'use',[{op:'gain-item',itemKey:puzzleStepKey(clue.key,index),quantity:1,claimKey:puzzleStepKey(clue.key,index)}]),
      requirements:[{narrativePath:`unlocked_${clue.key}`,narrativeEquals:true},...(index?[{itemKey:puzzleStepKey(clue.key,index-1),itemQuantity:1}]:[])],
      successText:`${puzzle.title}：${label}完成。`,
    }))
  }
  for(const clue of CLUES) actions.push({
    ...action(`inspect.${clue.key}`,clue.place,`核验${clue.title}`,'take',[{op:'gain-item',itemKey:clue.key,quantity:1,claimKey:`clue.${clue.key}`}]),
    targetKey:clue.key,successText:clue.description,
    requirements:[{narrativePath:`unlocked_${clue.key}`,narrativeEquals:true},...(PUZZLES.some(item=>item.clue===clue.key)?[{itemKey:puzzleStepKey(clue.key,2),itemQuantity:1}]:[])],
  })
  for(const choice of choices) {
    const scene=ALL_SCENES.find(item=>item.key===choice.sourceNodeKey)!
    const ending=ENDINGS.find(item=>item.key===choice.targetNodeKey)
    const chapterEnd=SCENES.some(item=>item.key===scene.key)&&(scene.order+1)%4===0
    actions.push({
      ...action(`answer.${choice.choiceKey}`,scene.place,choice.text,'talk',chapterEnd?[{op:'complete-objective',questKey:`chapter${scene.chapter}`,objectiveKey:'resolve'}]:[]),
      targetKey:`character:${scene.speaker}`,narrativeChoiceKey:choice.choiceKey,
      requirements:[{narrativePath:'scene',narrativeEquals:scene.key},...(STORY_REQUIREMENTS[scene.key]?[{itemKey:STORY_REQUIREMENTS[scene.key],itemQuantity:1}]:[]),...(ending?.flags.map(narrativePath=>({narrativePath,narrativeEquals:true}))??[])],
      successText:choice.description,interaction:{participantKey:scene.speaker,sceneKey:scene.key,ruleKey:choice.choiceKey},
    })
  }
  const pkg:AdventureProductRuntimePackageV1={
    schema:'storyforge.product-runtime-package',version:1,productType:'text-adventure',
    definition:{productKey:APHELION_ID,title:APHELION_TITLE,description:'在深空空间站核验一份来自未来的事故报告，为二百二十八个人决定返航方式。',enabledCapabilities:['narrative','interaction','adventure'],rulesetVersion:1,initialVariables:{aphelionVersion:1,scene:'s01',unlocked_blackbox:true}},
    sourceWorld:{contentHash:brief.source.worldContentHash,selection:brief.source.selection},
    narrative:{moduleKind:'main',moduleTitle:APHELION_TITLE,entryNodeKey:'s01',
      nodes:[...ALL_SCENES.map(scene=>({key:scene.key,kind:scene.key==='s01'?'entry' as const:'scene' as const,title:scene.title,summary:`${CHAPTERS[scene.chapter]} · ${PLACES.find(place=>place.key===scene.place)?.title}`,conditionJson:'{}',
        effectsJson:JSON.stringify([{op:'set',path:'scene',value:scene.key},...CLUES.filter(clue=>CLUE_CHAPTER[clue.key]<=scene.chapter).map(clue=>({op:'set',path:`unlocked_${clue.key}`,value:true}))]),
        successorKeys:[...new Set(choices.filter(choice=>choice.sourceNodeKey===scene.key).map(choice=>choice.targetNodeKey))],
      })),...ENDINGS.map(ending=>({key:ending.key,kind:'ending' as const,title:ending.title,summary:ending.subtitle,conditionJson:'{}',effectsJson:'[]',successorKeys:[]}))], choices,beats,
    },
    interaction:{playerKey:'player',
      profiles:Object.entries(CAST).filter(([key])=>key!=='player').map(([key,person])=>({participantKey:key,characterKey:key,name:person.name,roleLabel:person.role,voiceRules:'只引用已发生的剧情，明确预测与已观测事实的区别。',initialKnowledge:[{key:`${key}.identity`,content:person.description,visibility:'public' as const,importance:5}],relationshipDimensions:[{key:'trust' as const,label:'协作',minimum:-20,maximum:100,initial:0,largeChangeThreshold:10}],maxMemoryEntries:60})),
      sceneTemplates:ALL_SCENES.map((scene,index)=>({sceneKey:scene.key,title:scene.title,purpose:'核验事实与承担决策',location:scene.place,timeLabel:CHAPTERS[scene.chapter],participantKeys:[scene.speaker],publicKnowledgeKeys:[],goals:['说明证据、未知与可承担的代价'],endingConditions:['玩家作出决定'],safetyBoundaries:['不把预测当作已经发生的事实'],relationshipRules:choices.filter(choice=>choice.sourceNodeKey===scene.key).map(choice=>({ruleKey:choice.choiceKey,label:choice.text,playerText:choice.text,fromParticipantKey:scene.speaker,toParticipantKey:'player',dimensionKey:'trust' as const,delta:1,reason:choice.description,significantEventKey:null})),openingNodeKey:null,endingNodeKey:null,maxTurns:50,directorBudget:1,order:index})),
    },
    adventure:{version:1,playerKey:'player',playerIdentity:{name:CAST.player.name,description:CAST.player.description},initialLocationKey:'dock',
      locations:PLACES.map(place=>({key:place.key,title:place.title,description:place.description,tags:['aphelion-v1']})),
      objects:CLUES.map(clue=>({key:`object.${clue.key}`,locationKey:clue.place,title:clue.title,description:clue.description,tags:['evidence']})),
      items:[...CLUES.map(clue=>({key:clue.key,title:clue.title,description:clue.description,tags:['evidence'],stackable:false,consumable:false})),...PUZZLES.flatMap(puzzle=>puzzle.steps.map((step,index)=>({key:puzzleStepKey(puzzle.clue,index),title:`${puzzle.title} · ${step}`,description:'已保存的设备操作回执。',tags:['calibration'],stackable:false,consumable:false})))],
      abilities:[{key:'verification',title:'核验',description:'交叉比对独立来源，保留误差。',initial:3,minimum:0,maximum:10}],
      resources:[{key:'resolve',title:'专注',initial:10,minimum:0,maximum:10}],conditions:[],initialInventory:[],actions,
      quests:CHAPTERS.map((title,index)=>({key:`chapter${index}`,title,description:`完成${title}的调查与决定。`,initialStatus:'active',prerequisites:[],objectives:[{key:'resolve',title:SCENES[index*4+3].title,optional:false,alternativeActionKeys:choices.filter(choice=>choice.sourceNodeKey===SCENES[index*4+3].key).map(choice=>`answer.${choice.choiceKey}`)}],rewardEffects:[],completionNodeKey:null,failureNodeKey:null})),
    },
  }
  return parseProductRuntimePackageV1(pkg) as AdventureProductRuntimePackageV1
}

/** Count actual mandatory dialogue/narration. Optional route scenes never inflate mainHan. */
export function measureAphelionContent(pkg:Pick<AdventureProductRuntimePackageV1,'narrative'>) {
  const han=(text:string)=>(text.match(/\p{Script=Han}/gu)??[]).length
  const count=(key:string)=>pkg.narrative.beats.filter(beat=>beat.nodeKey===key).reduce((sum,beat)=>sum+han(beat.text),0)
  const main=SCENES.reduce((sum,scene)=>sum+count(scene.key),0)
  const routeMinimum=[['route.audit','route.trust'],['route.water','route.drive'],['route.people','route.cargo']].reduce((sum,keys)=>sum+Math.min(...keys.map(count)),0)
  const dialogue=pkg.narrative.beats.filter(beat=>beat.kind==='dialogue')
  return {mainHan:main,shortestRouteHan:main+routeMinimum+Math.min(...ENDINGS.map(ending=>count(ending.key))),totalHan:pkg.narrative.beats.reduce((sum,beat)=>sum+han(beat.text),0),dialogueLines:dialogue.length,uniqueDialogueLines:new Set(dialogue.map(beat=>beat.text)).size,scenes:SCENES.length,endings:ENDINGS.length}
}
