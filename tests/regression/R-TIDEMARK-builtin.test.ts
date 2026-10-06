import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../src/lib/db/schema'
import { createTidemarkWorldPreset } from '../../src/lib/world-engine/tidemark-preset'
import { createTidemarkBrief, createTidemarkPlan, installTidemark, findInstalledTidemark } from '../../src/lib/tidemark/production'
import { compileTidemarkPackage, measureTidemarkContent, parseTidemarkScript } from '../../src/lib/tidemark/compiler'
import { CLUES, ENDINGS, SCENES, STORY_REQUIREMENTS } from '../../src/lib/tidemark/definition'
import { createTextAdventureInstance } from '../../src/lib/product/runtime-instances'
import { commitAdventureAction, commitAdventureNarrativeChoice, readProductRuntimeState, readProductRuntimeStateVersion, createProductRuntimeCheckpoint, branchProductRuntimeSession, verifyProductRuntimeCheckpoint } from '../../src/lib/adventure/runtime-api'
import { assertProductReleaseUnchanged, parseAdventureProductReleaseManifest } from '../../src/lib/product/releases'
import { exportProjectJSON, importProjectJSON } from '../../src/lib/export/json-export'
import { cascadeDeleteProject } from '../../src/lib/registry/lifecycle'
import { walkingPath, walkable } from '../../src/lib/tidemark/navigation'
import { openTidemarkPlayer, tidemarkSessions } from '../../src/lib/tidemark/player'
import { useAdventureGamePlayerStore } from '../../src/stores/adventure-game-player'
import { createWorldWork, switchActiveWork } from '../../src/lib/workspace/works'
import { createFixtureProductReleaseManifestV1 } from '../helpers/product-release-v1'
import { hashProductProductionValueV2 } from '../../src/lib/product-production/hash'
import { evaluateNarrativeChoices } from '../../src/lib/product/narrative-content'
import { createProductProductionWithBriefV1, readProductProductionDetailsV1 } from '../../src/lib/product-production/service'
import { executeProductProductionCommand } from '../../src/lib/product-production/commands'
import { runProductProductionUntilBlockedV1 } from '../../src/lib/product-production/scheduler'

describe('E-TEXTADV-TIDEMARK · 内置游戏',()=>{
  beforeEach(async()=>{await db.delete();await db.open()})
  afterEach(()=>db.close())
  it('世界预设经过采纳、冻结和需求适配器，重复安装不会新建世界',async()=>{
    const first=await createTidemarkWorldPreset();const second=await createTidemarkWorldPreset()
    expect(second.worldReference.referenceHash).toBe(first.worldReference.referenceHash)
    expect(await db.projects.count()).toBe(1)
    const brief=await createTidemarkBrief(first.scope,first.worldReleaseId)
    const pkg=compileTidemarkPackage(brief)
    expect(pkg.sourceWorld.contentHash).toBe(first.worldReference.releaseHash)
    expect(pkg.interaction.profiles).toHaveLength(8)
    expect(pkg.adventure.locations).toHaveLength(9)
    const conditions={adventure:{currentLocationKey:'lighthouse'},bypass:true,consent:true,rescued:true,shared:true,council:true}
    expect(evaluateNarrativeChoices(conditions,'s40',pkg.narrative.choices).filter(choice=>choice.available)).toHaveLength(4)
    for(const missing of ['bypass','consent','rescued','shared','council']){
      const choices=evaluateNarrativeChoices({...conditions,[missing]:false},'s40',pkg.narrative.choices)
      expect(choices.find(choice=>choice.choiceKey==='choose.ending.dawn')?.available).toBe(false)
      expect(choices.filter(choice=>choice.available)).toHaveLength(3)
    }
  },60000)
  it('主线正文实际达到三万汉字，独立对话超过五百句，每幕都有完整文本',async()=>{
    const world=await createTidemarkWorldPreset();const pkg=compileTidemarkPackage(await createTidemarkBrief(world.scope,world.worldReleaseId))
    const stats=measureTidemarkContent(pkg)
    expect(stats.mainHan).toBeGreaterThanOrEqual(30000)
    expect(stats.uniqueDialogueLines).toBeGreaterThanOrEqual(500)
    for(const scene of [...SCENES,...ENDINGS])expect(pkg.narrative.beats.filter(beat=>beat.nodeKey===scene.key).length).toBeGreaterThan(8)
    expect(()=>parseTidemarkScript('@@ s01\nunknown|伪造角色')).toThrow('未知发言人')
    expect(()=>parseTidemarkScript('@@ s01\n_|甲\n@@ s01\n_|乙')).toThrow('重复')
  },60000)
  it('寻路避开建筑，拒绝海面，允许绕行',()=>{
    const boxes=[{x:0,z:0,width:6,depth:8}]
    const path=walkingPath({x:-8,z:0},{x:8,z:0},boxes)
    expect(path.length).toBeGreaterThan(8)
    expect(path.every(point=>walkable(point,boxes))).toBe(true)
    expect(walkingPath({x:0,z:12},{x:90,z:0},boxes)).toEqual([])
  })
  it('安装失败后下一次明确开始保留失败证据并重新准备',async()=>{
    const world=await createTidemarkWorldPreset();const brief=await createTidemarkBrief(world.scope,world.worldReleaseId)
    const productionId=await createProductProductionWithBriefV1({scope:world.scope,worldReleaseId:world.worldReleaseId,title:'潮痕：最后一盏灯',brief})
    let details=await readProductProductionDetailsV1(world.scope,productionId)
    const authorized=await executeProductProductionCommand({scope:world.scope,productionId,command:{type:'authorize-start',commandId:'test.authorize',expectedStateRevision:details.production.stateRevision,briefRevision:details.brief!.revision,briefHash:details.brief!.briefHash,authorizationNonce:'test-explicit-start'}})
    expect(authorized.ok).toBe(true)
    details=await readProductProductionDetailsV1(world.scope,productionId)
    const result=await runProductProductionUntilBlockedV1({scope:world.scope,productionId,suppliedPlan:createTidemarkPlan(brief,details.brief!.briefHash,details.build!.buildNumber,details.build!.controlEpoch),executor:async()=>{throw new Error('测试安装中断')},maximumCycles:4})
    expect(result.buildStatus).toBe('failed')
    const installed=await installTidemark()
    expect((await db.productProductions.get(productionId))?.status).toBe('archived')
    expect(await db.projects.count()).toBe(1)
    expect((await assertProductReleaseUnchanged(installed.releaseId)).id).toBe(installed.releaseId)
  },60000)
  it('从备份恢复后内置入口继续使用重映射的发布与存档',async()=>{
    const installed=await installTidemark()
    await createTextAdventureInstance({scope:installed.scope,productReleaseId:installed.releaseId,title:'备份中的旅程'})
    const importedId=await importProjectJSON(await exportProjectJSON(installed.scope.projectId))
    await cascadeDeleteProject(installed.scope.projectId)
    const restored=await installTidemark()
    expect(restored.scope.projectId).toBe(importedId)
    expect(await db.projects.count()).toBe(1)
    expect(await db.productRuntimeSessions.where('projectId').equals(importedId).count()).toBe(1)
    await assertProductReleaseUnchanged(restored.releaseId)
  },60000)
  it('活动作品切换后仍按发布的固定作用域找到原游戏', async () => {
    const installed = await installTidemark()
    const another = await createWorldWork(installed.scope.projectId, { title: '另一部作品' })
    await switchActiveWork(installed.scope.projectId, another.id!)
    expect((await findInstalledTidemark())?.scope).toEqual(installed.scope)
    expect(await installTidemark()).toEqual(installed)
    expect((await db.projects.get(installed.scope.projectId))?.activeWorkId).toBe(another.id)
  }, 60000)
  it('损坏的旧存档明确报错，但不阻止新旅程，也不删除旧记录', async () => {
    const installed = await installTidemark()
    const old = await createTextAdventureInstance({ scope: installed.scope, productReleaseId: installed.releaseId, title: '损坏前的旅程' })
    await db.productRuntimeSessions.update(old.id!, { initialStateJson: '{damaged' })
    await expect(openTidemarkPlayer(installed, false)).rejects.toThrow()
    expect(await db.productRuntimeSessions.count()).toBe(1)
    const newId = await openTidemarkPlayer(installed, true)
    expect(newId).not.toBe(old.id)
    expect((await db.productRuntimeSessions.get(old.id!))?.initialStateJson).toBe('{damaged')
    expect(useAdventureGamePlayerStore.getState().runtimeState.narrative?.currentNodeKey).toBe('s01')
    expect(await db.productRuntimeSessions.count()).toBe(2)
  }, 60000)
  it('同一工作区存在另一游戏时，继续旅程只选择潮痕的存档', async () => {
    const installed = await installTidemark()
    const own = await createTextAdventureInstance({ scope: installed.scope, productReleaseId: installed.releaseId, title: '潮痕旅程' })
    const original = await assertProductReleaseUnchanged(installed.releaseId)
    const otherPackage = parseAdventureProductReleaseManifest(original.manifestJson)
    otherPackage.definition.productKey = 'test.other-adventure'
    const manifest = await createFixtureProductReleaseManifestV1({ runtimePackage: otherPackage, productionKey: 'other-adventure' })
    const otherReleaseId = await db.productReleases.add({ ...original, id: undefined, productionKey: 'other-adventure', manifestJson: JSON.stringify(manifest), contentHash: await hashProductProductionValueV2(manifest) })
    const other = await createTextAdventureInstance({ scope: installed.scope, productReleaseId: otherReleaseId, title: '另一个游戏' })
    await useAdventureGamePlayerStore.getState().load(installed.scope, null)
    await useAdventureGamePlayerStore.getState().select(other.id!)
    expect(await openTidemarkPlayer(installed, false)).toBe(own.id)
    const store = useAdventureGamePlayerStore.getState()
    expect(tidemarkSessions(store.sessions, installed.releaseId).map(item => item.id)).toEqual([own.id])
    expect(store.selectedManifest?.definition.productKey).toBe('storyforge.tidemark.v1')
  }, 60000)
  it('完整生产、公共命令通关、四结局、检查点与备份生命周期',async()=>{
    const installed=await installTidemark();expect(await installTidemark()).toEqual(installed)
    const release=await assertProductReleaseUnchanged(installed.releaseId)
    const pkg=parseAdventureProductReleaseManifest(release.manifestJson)
    const worldBefore=(await db.worldReleases.toArray()).map(row=>row.contentHash)
    const session=await createTextAdventureInstance({scope:installed.scope,productReleaseId:installed.releaseId,title:'测试通关'})
    const act=async(sessionId:number,key:string)=>{const base=await readProductRuntimeStateVersion(sessionId);return commitAdventureAction({sessionId,actionKey:key,commandId:`test.${crypto.randomUUID()}`,baseSequence:base.sequence,baseStateHash:base.stateHash})}
    for(const scene of SCENES){
      const state=await readProductRuntimeState(session.id!);expect(state.narrative?.currentNodeKey).toBe(scene.key)
      if(state.adventure?.currentLocationKey!==scene.place){
        await expect(commitAdventureNarrativeChoice({sessionId:session.id!,choiceKey:pkg.narrative.choices.find(choice=>choice.sourceNodeKey===scene.key)!.choiceKey})).rejects.toThrow()
        await act(session.id!,`move.${state.adventure!.currentLocationKey}.${scene.place}`)
      }
      const clue=STORY_REQUIREMENTS[scene.key]
      if(clue){
        const choice=pkg.narrative.choices.find(choice=>choice.sourceNodeKey===scene.key)!
        await expect(commitAdventureNarrativeChoice({sessionId:session.id!,choiceKey:choice.choiceKey})).rejects.toThrow()
        const cluePlace=CLUES.find(item=>item.key===clue)!.place
        if(cluePlace!==scene.place)await act(session.id!,`move.${scene.place}.${cluePlace}`)
        await act(session.id!,`inspect.${clue}`)
        await expect(act(session.id!,`inspect.${clue}`)).rejects.toThrow()
        if(cluePlace!==scene.place)await act(session.id!,`move.${cluePlace}.${scene.place}`)
      }
      if(scene.key!=='s40')await commitAdventureNarrativeChoice({sessionId:session.id!,choiceKey:`${scene.key}.choice0`})
    }
    const checkpoint=await createProductRuntimeCheckpoint({sessionId:session.id!,name:'灯塔抉择前'})
    expect(await verifyProductRuntimeCheckpoint(checkpoint.id!)).toBe(true)
    const preEnding=await readProductRuntimeState(session.id!)
    expect(preEnding.adventure?.inventory).toHaveLength(CLUES.length)
    expect(preEnding.narrative?.availableChoiceKeys).toHaveLength(4)
    for(const ending of ENDINGS){
      const branch=await branchProductRuntimeSession({parentSessionId:session.id!,throughSequence:preEnding.lastSequence,title:ending.title})
      await commitAdventureNarrativeChoice({sessionId:branch.id!,choiceKey:`choose.${ending.key}`})
      const finished=await readProductRuntimeState(branch.id!);expect(finished.narrative?.endingKey).toBe(ending.key)
      expect(finished.adventure?.quests.every(quest=>quest.status==='completed')).toBe(true)
    }
    expect((await db.worldReleases.toArray()).map(row=>row.contentHash)).toEqual(worldBefore)
    const exported=await exportProjectJSON(installed.scope.projectId)
    const importedId=await importProjectJSON(exported)
    expect(importedId).not.toBe(installed.scope.projectId)
    const copied=await db.productReleases.where('projectId').equals(importedId).first();expect(copied).toBeTruthy()
    await assertProductReleaseUnchanged(copied!.id!)
    await cascadeDeleteProject(importedId)
    expect(await db.productRuntimeSessions.where('projectId').equals(importedId).count()).toBe(0)
    expect(await db.productRuntimeSessions.get(session.id!)).toBeTruthy()
  },600000)
})
