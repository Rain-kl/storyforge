import type { AdventureActionDefinition, AdventureEffect, AdventureProductRuntimePackageV1, AdventureRequirement, FrozenNarrativeChoice, NarrativeCondition, ProductProductionBriefV3 } from '../types'
import { parseProductRuntimePackageV1 } from '../product-production/runtime-package'
import { parseAuthoredScript } from '../builtin-adventure/script'
import { CAST, ECHO_ID, ECHO_TITLE, ENDINGS, ITEMS, PLACES, SCENES, SCRIPT, type PlaceKey } from './definition'

const item = (key: string): AdventureRequirement => ({ itemKey: key, itemQuantity: 1 })
const phase = (key: string): AdventureRequirement => ({ narrativePath: 'scene', narrativeEquals: key })
const gain = (key: string): AdventureEffect => ({ op: 'gain-item', itemKey: key, quantity: 1, claimKey: `echo.${key}` })
const done = (questKey: string, objectiveKey: string): AdventureEffect => ({ op: 'complete-objective', questKey, objectiveKey })

function action(key: string, locationKey: PlaceKey, label: string, text: string, requirements: AdventureRequirement[] = [], effects: AdventureEffect[] = [], kind: AdventureActionDefinition['kind'] = 'use'): AdventureActionDefinition {
  return { key, kind, locationKey, label, description: text, targetKey: null, requirements, rule: { kind: 'automatic' },
    successEffects: effects, costlySuccessEffects: [], failureEffects: [], successText: text,
    costlySuccessText: text, failureText: '没有改变眼前的情况。', unavailableText: '先完成当前目标，再操作这里。', repeatable: false, narrativeChoiceKey: null }
}

export function compileEchoPackage(brief: ProductProductionBriefV3): AdventureProductRuntimePackageV1 {
  const choices: FrozenNarrativeChoice[] = []
  const actions: AdventureActionDefinition[] = []
  const addChoice = (key: string, from: string, to: string, label: string, note: string, requirements: AdventureRequirement[] = [], effects: AdventureEffect[] = [], variables: Record<string, boolean|string> = {}, choiceRequirements = requirements) => {
    const scene = SCENES.find(row => row.key === from)!
    const conditions: NarrativeCondition[] = [{ path: 'adventure.currentLocationKey', eq: scene.place }]
    for (const requirement of choiceRequirements) {
      if (requirement.itemKey) conditions.push({ path: `adventure.inventory.${requirement.itemKey}`, eq: requirement.itemQuantity ?? 1 })
      if (requirement.narrativePath) conditions.push({ path: requirement.narrativePath, eq: requirement.narrativeEquals ?? null })
    }
    choices.push({ choiceKey: key, sourceNodeKey: from, targetNodeKey: to, text: label, description: note,
      displayConditionJson: '{}', availableConditionJson: JSON.stringify({ all: conditions }), unavailableReason: from === 'survey' ? '先查看水尺、取工具，并按顺序打开回流闸。' : from === 'fast' || from === 'careful' ? '先完成救援操作，再回岸边。' : '到当前场景发生的地点继续。',
      effectsJson: JSON.stringify(Object.entries(variables).map(([path,value]) => ({ op: 'set', path, value }))), tags: [`adventure-action:answer.${key}`], order: choices.filter(row => row.sourceNodeKey === from).length,
    })
    actions.push({ ...action(`answer.${key}`, scene.place, label, note, [phase(from), ...requirements], effects, 'talk'),
      targetKey: `character:${scene.speaker}`, narrativeChoiceKey: key,
      interaction: { participantKey: scene.speaker, sceneKey: from, ruleKey: key },
    })
  }
  addChoice('begin', 'intro', 'survey', '我去看水尺，你守住绳', '接下任务：打开回流闸，接回被困的船工。')
  addChoice('cross', 'survey', 'signal', '栈桥露出来了，去接应阿照', '沿着打开的栈桥走到小船边。', [item('state_gate')], [{ op:'accept-quest',questKey:'rescue' }])
  addChoice('ask', 'signal', 'answer', '让他回答一个新的问题', '向眼前的人确认，而不把旧铃声当作回答。', [], [done('rescue','signal')], { listened: true })
  addChoice('echo', 'signal', 'echo', '把两声铃当作接应信号', '你示意乌荻准备拉绳，她却发现了不对劲。', [], [], { listened: false })
  addChoice('answer.ready', 'answer', 'plan', '听见了。现在说说怎么接你', '开始一起商量救援方案。')
  addChoice('echo.ready', 'echo', 'plan', '收回手势，先听阿照说', '乌荻守住绳，救援在确认后继续。', [], [done('rescue','signal')])
  addChoice('route.fast', 'plan', 'fast', '先接人 · 割断旧缆', '扣好吊带后割缆。阿照立刻上岸，信匣会落水。', [], [], { route: 'fast' })
  addChoice('route.careful', 'plan', 'careful', '人和信一起 · 使用备用绞盘', '扣好吊带，托起吊篮，取出信匣，再完成接应。', [], [], { route: 'careful' })
  addChoice('return.fast', 'fast', 'shore.fast', '救援完成，回接应岸', '乌荻已经接住阿照，回到岸边看看他。', [item('state_rescued')], [{op:'accept-quest',questKey:'return'}])
  addChoice('return.careful', 'careful', 'shore.careful', '带着信匣回接应岸', '人和信都已离开小船，回岸边把信交还。', [item('state_rescued'),item('paper')], [{op:'accept-quest',questKey:'return'}])
  addChoice('finish.fast', 'shore.fast', 'ending.fast', '递上干衣服，接过新铜铃', '完成接应 · 获得「一枚新铜铃」。', [], [gain('bell'),done('return','handback')])
  // The command validates possession before transferring the letter; the later
  // narrative event uses the persistent recovery receipt, not the consumed item.
  addChoice('finish.careful', 'shore.careful', 'ending.careful', '把封好的信交还阿照', '盐纸信已交还主人 · 获得「一枚新铜铃」。', [item('paper')], [{op:'transfer-item',itemKey:'paper',quantity:1,toOwnerKey:'zhao'},gain('bell'),done('return','handback')], {}, [item('state_locker')])

  for (const place of PLACES) for (const to of PLACES.filter(row => row.key !== place.key)) {
    actions.push({ ...action(`move.${place.key}.${to.key}`, place.key, `走向${to.title}`, `抵达${to.title}。`, to.key === 'boat' ? [item('state_gate')] : [], [{op:'enter-location',locationKey:to.key}], 'move'), repeatable:true, targetKey:to.key, unavailableText:'回流还没退去。先操作回流闸，让栈桥露出来。' })
  }
  for (const place of PLACES) actions.push({ ...action(`look.${place.key}`, place.key, '观察四周', place.description, [], [], 'look'), repeatable: true })
  actions.push(
    action('inspect.gauge','gauge','查看新旧水线','新水线比旧线低，水却从内湾倒灌。工匠刻着：断进水 → 松泄压 → 转手柄。你把顺序记在手记里。',[phase('survey')],[gain('gauge'),done('drain','observe')],'inspect'),
    action('take.tools','shed','取走手柄与割缆刀','手柄恰好能握住。割缆刀套上写着：先挂吊带，再动刀。',[phase('survey')],[gain('crank'),gain('knife'),done('drain','tools')],'take'),
    { ...action('sluice.inlet','sluice','合上进水挡板','闸后的涌浪收住了。水还压在板上，先松泄压锁。',[phase('survey'),item('gauge')],[gain('state_inlet')]), unavailableText:'先查看旧水尺，弄清回流方向。' },
    { ...action('sluice.pressure','sluice','松开泄压锁','锁销吐出一串水泡。闸轮松了，可以装上手柄。',[phase('survey'),item('state_inlet')],[gain('state_pressure')]), unavailableText:'进水挡板还开着。先断进水，再泄压。' },
    { ...action('sluice.crank','sluice','装上手柄，转开回流闸','水位降下半尺，旧栈桥露出木面。远处的两声铃又响起来。',[phase('survey'),item('state_pressure'),item('crank')],[gain('state_gate'),done('drain','gate')]), unavailableText:'需要黄铜手柄，并且先断进水、松开泄压锁。' },
    action('inspect.letter','boat','查看发声的信匣','每一轮铃声连末尾的喘息都分毫不差。这是一段被盐纸存住的声音；船工在旁边，正努力抬起另一只手。',[item('state_gate')],[gain('letter')],'inspect'),
    ...(['fast','careful'] as const).map(route => action(`harness.${route}`,'boat','把红色吊带扣到阿照身上','阿照把脚收进吊带，敲了敲扣环。这一次，你看见他的手在动。',[phase(route)],[gain('state_harness'),done('rescue','secure')])),
    { ...action('cut.rope','boat','使用割缆刀 · 切断旧缆','旧缆断开，信匣沉入潮水。乌荻拉紧红绳，把阿照接上岸。',[phase('fast'),item('knife'),item('state_harness')],[gain('state_rescued'),done('rescue','bring')]), unavailableText:'先把红色吊带扣好，不能直接割断受力绳。' },
    { ...action('lift.basket','boat','使用黄铜手柄 · 托起吊篮','备用绞盘咬住了重量。压在阿照腿边的木梁缓缓抬起，信匣露出搭扣。',[phase('careful'),item('crank'),item('state_harness')],[gain('state_counterweight')]), unavailableText:'先扣好吊带，再用黄铜手柄操作备用绞盘。' },
    { ...action('take.paper','boat','取出信匣，扣紧搭扣','你只碰了搭扣。银光收回匣子，最后一声铃停在半途。',[phase('careful'),item('state_counterweight')],[gain('paper'),gain('state_locker')],'take'), unavailableText:'旧吊篮还压着信匣，先用备用绞盘托起它。' },
    { ...action('haul.rope','boat','向乌荻招手 · 收紧接应绳','乌荻读懂你的手势。吊带越过船舷，阿照和信匣一起抵达岸边。',[phase('careful'),item('state_locker')],[gain('state_rescued'),done('rescue','bring')]), unavailableText:'先托起吊篮、取出信匣，再示意乌荻接应。' },
  )
  const pkg: AdventureProductRuntimePackageV1 = {
    schema:'storyforge.product-runtime-package',version:1,productType:'text-adventure',
    definition:{productKey:ECHO_ID,title:ECHO_TITLE,description:'五分钟的码头救援：辨认回声，打开闸门，把一个人和他的决定接回岸上。',enabledCapabilities:['narrative','interaction','adventure'],rulesetVersion:1,initialVariables:{echoVersion:1,scene:'intro',route:'',listened:false}},
    sourceWorld:{contentHash:brief.source.worldContentHash,selection:brief.source.selection},
    narrative:{moduleKind:'main',moduleTitle:ECHO_TITLE,entryNodeKey:'intro',choices,beats:parseAuthoredScript(SCRIPT,CAST),
      nodes:[...SCENES.map((scene,index)=>({key:scene.key,kind:index===0?'entry' as const:'scene' as const,title:scene.title,summary:scene.objective,conditionJson:'{}',effectsJson:JSON.stringify([{op:'set',path:'scene',value:scene.key}]),successorKeys:choices.filter(choice=>choice.sourceNodeKey===scene.key).map(choice=>choice.targetNodeKey)})),...ENDINGS.map(ending=>({key:ending.key,kind:'ending' as const,title:ending.title,summary:ending.subtitle,conditionJson:'{}',effectsJson:'[]',successorKeys:[]}))]},
    interaction:{playerKey:'player',profiles:Object.entries(CAST).filter(([key])=>key!=='player').map(([key,person])=>({participantKey:key,characterKey:key,name:person.name,roleLabel:person.role,voiceRules:'只表达本幕已发生的事。',initialKnowledge:[],relationshipDimensions:[{key:'trust',label:'信任',minimum:0,maximum:100,initial:50,largeChangeThreshold:10}],maxMemoryEntries:40})),
      sceneTemplates:SCENES.map((scene,order)=>({sceneKey:scene.key,title:scene.title,purpose:scene.objective,location:scene.place,timeLabel:'暴潮前夜',participantKeys:[scene.speaker],publicKnowledgeKeys:[],goals:[scene.objective],endingConditions:['玩家作出选择'],safetyBoundaries:['录音不能代替当事人的回答'],relationshipRules:choices.filter(choice=>choice.sourceNodeKey===scene.key).map(choice=>({ruleKey:choice.choiceKey,label:choice.text,playerText:choice.text,fromParticipantKey:scene.speaker,toParticipantKey:'player',dimensionKey:'trust',delta:choice.choiceKey==='echo'?-1:1,reason:choice.description,significantEventKey:null})),openingNodeKey:null,endingNodeKey:null,maxTurns:8,directorBudget:1,order}))},
    adventure:{version:1,playerKey:'player',playerIdentity:{name:'姜迟',description:'刚回到白礁镇的测绘员。'},initialLocationKey:'quay',
      locations:PLACES.map(place=>({key:place.key,title:place.title,description:place.description,tags:['tidemark-echo']})),objects:PLACES.map(place=>({key:`object.${place.key}`,locationKey:place.key,title:place.title,description:place.description,tags:['interactive']})),
      items:ITEMS.map(item=>({key:item.key,title:item.title,description:item.description,tags:[item.tag],stackable:false,consumable:false})),
      abilities:[{key:'observation',title:'观察',description:'核对眼前的事实。',initial:1,minimum:0,maximum:10}],resources:[{key:'resolve',title:'决心',initial:1,minimum:0,maximum:10}],conditions:[],initialInventory:[],actions,
      quests:[
        {key:'drain',title:'让栈桥露出水面',description:'看清回流，带上工具，依次打开闸门。',initialStatus:'active',prerequisites:[],objectives:[{key:'observe',title:'查看水尺',optional:false,alternativeActionKeys:['inspect.gauge']},{key:'tools',title:'取得救援工具',optional:false,alternativeActionKeys:['take.tools']},{key:'gate',title:'打开回流闸',optional:false,alternativeActionKeys:['sluice.crank']}],rewardEffects:[],completionNodeKey:null,failureNodeKey:null},
        {key:'rescue',title:'接回眼前的人',description:'确认阿照的回答，由你们一起决定怎么接应。',initialStatus:'locked',prerequisites:[],objectives:[{key:'signal',title:'确认活人的回答',optional:false,alternativeActionKeys:['answer.ask','answer.echo.ready']},{key:'secure',title:'扣好救生吊带',optional:false,alternativeActionKeys:['harness.fast','harness.careful']},{key:'bring',title:'完成接应',optional:false,alternativeActionKeys:['cut.rope','haul.rope']}],rewardEffects:[],completionNodeKey:null,failureNodeKey:null},
        {key:'return',title:'两声之间',description:'回岸边，把记忆和选择交还给它的主人。',initialStatus:'locked',prerequisites:[],objectives:[{key:'handback',title:'交还这一程，接过新铜铃',optional:false,alternativeActionKeys:['answer.finish.fast','answer.finish.careful']}],rewardEffects:[],completionNodeKey:null,failureNodeKey:null},
      ]},
  }
  return parseProductRuntimePackageV1(pkg) as AdventureProductRuntimePackageV1
}

export function measureEchoContent(pkg: Pick<AdventureProductRuntimePackageV1,'narrative'>) {
  const count=(key:string)=>pkg.narrative.beats.filter(beat=>beat.nodeKey===key).reduce((sum,beat)=>sum+(beat.text.match(/\p{Script=Han}/gu)??[]).length,0)
  const routes=[['intro','survey','signal','answer','plan','fast','shore.fast','ending.fast'],['intro','survey','signal','echo','plan','fast','shore.fast','ending.fast'],['intro','survey','signal','answer','plan','careful','shore.careful','ending.careful'],['intro','survey','signal','echo','plan','careful','shore.careful','ending.careful']]
  const dialogues=pkg.narrative.beats.filter(beat=>beat.kind==='dialogue')
  return { mainHan:['intro','survey','signal','plan'].reduce((sum,key)=>sum+count(key),0),shortestRouteHan:Math.min(...routes.map(route=>route.reduce((sum,key)=>sum+count(key),0))),totalHan:pkg.narrative.nodes.reduce((sum,node)=>sum+count(node.key),0),dialogueLines:dialogues.length,uniqueDialogueLines:new Set(dialogues.map(beat=>beat.text)).size,scenes:SCENES.length,endings:ENDINGS.length }
}
