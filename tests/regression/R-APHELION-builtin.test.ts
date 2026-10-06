import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../src/lib/db/schema'
import { createAphelionWorldPreset } from '../../src/lib/world-engine/aphelion-preset'
import { createAphelionBrief, installAphelion, findInstalledAphelion } from '../../src/lib/aphelion/production'
import { compileAphelionPackage, measureAphelionContent, parseAphelionScript, puzzleStepKey } from '../../src/lib/aphelion/compiler'
import { ALL_SCENES, APHELION_ID } from '../../src/lib/aphelion/definition'
import { CAST, CLUES, ENDINGS, PLACES, PUZZLES, SCENES, SIDE_SCENES, STORY_REQUIREMENTS } from '../../src/lib/aphelion/definition'
import { BRANCHES } from '../../src/lib/aphelion/compiler'
import { walkingPath, walkable } from '../../src/lib/aphelion/navigation'
import { evaluateNarrativeChoices, validateNarrativeContentGraph } from '../../src/lib/product/narrative-content'
import { assertProductReleaseUnchanged, parseAdventureProductReleaseManifest } from '../../src/lib/product/releases'
import { createTextAdventureInstance } from '../../src/lib/product/runtime-instances'
import { commitAdventureAction, commitAdventureNarrativeChoice, readProductRuntimeState, readProductRuntimeStateVersion, createProductRuntimeCheckpoint, branchProductRuntimeSession, verifyProductRuntimeCheckpoint } from '../../src/lib/adventure/runtime-api'
import { installTidemark } from '../../src/lib/tidemark/production'
import { builtinAdventureSessions, openBuiltinAdventurePlayer, selectBuiltinAdventureSession } from '../../src/lib/builtin-adventure/player'
import { useAdventureGamePlayerStore } from '../../src/stores/adventure-game-player'
import { createWorldWork, switchActiveWork } from '../../src/lib/workspace/works'
import { exportProjectJSON, importProjectJSON } from '../../src/lib/export/json-export'
import { cascadeDeleteProject } from '../../src/lib/registry/lifecycle'

async function act(sessionId:number,actionKey:string){const base=await readProductRuntimeStateVersion(sessionId);return commitAdventureAction({sessionId,actionKey,commandId:`aphelion-test.${crypto.randomUUID()}`,baseSequence:base.sequence,baseStateHash:base.stateHash})}
async function move(sessionId:number,place:string){const state=await readProductRuntimeState(sessionId);if(state.adventure?.currentLocationKey!==place)await act(sessionId,`move.${state.adventure!.currentLocationKey}.${place}`)}

describe('E-TEXTADV-APHELION · 科幻内置游戏',()=>{
  beforeEach(async()=>{await db.delete();await db.open()})
  afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();db.close()})
  it('十区域互相可达，路径留在甲板并避开设备，不能走入太空',()=>{
    for(const from of PLACES)for(const to of PLACES){const path=walkingPath(from,to);expect(path.length,`${from.key} -> ${to.key}`).toBeGreaterThan(0);expect(path.every(walkable)).toBe(true);expect(path.at(-1)).toEqual(to)}
    expect(walkable({x:12,z:10})).toBe(false)
    expect(walkingPath(PLACES[0],{x:100,z:100})).toEqual([])
    expect(walkable({x:PLACES[0].x+5,z:PLACES[0].z-3})).toBe(false)
  })
  it('实际必经主线至少三万汉字与五百句独立对话，六个分支及四结局全部有文本',async()=>{
    const world=await createAphelionWorldPreset();const again=await createAphelionWorldPreset();expect(again.worldReleaseId).toBe(world.worldReleaseId)
    const pkg=compileAphelionPackage(await createAphelionBrief(world.scope,world.worldReleaseId));const stats=measureAphelionContent(pkg)
    expect(stats.mainHan).toBeGreaterThanOrEqual(30000);expect(stats.uniqueDialogueLines).toBeGreaterThanOrEqual(500)
    const mainKeys=new Set(SCENES.map(scene=>scene.key));expect(new Set(pkg.narrative.beats.filter(beat=>mainKeys.has(beat.nodeKey)&&beat.kind==='dialogue').map(beat=>beat.text)).size).toBeGreaterThanOrEqual(500)
    for(const scene of [...ALL_SCENES,...ENDINGS])expect(pkg.narrative.beats.filter(beat=>beat.nodeKey===scene.key).length,scene.key).toBeGreaterThanOrEqual(8)
    expect(validateNarrativeContentGraph({...pkg.narrative,knownSpeakerKeys:new Set(Object.keys(CAST))}).valid).toBe(true)
    expect(pkg.adventure.locations).toHaveLength(10);expect(pkg.sourceWorld.contentHash).toBe(world.worldReference.releaseHash)
    expect(()=>parseAphelionScript('@@ s01\nunknown|错误台词')).toThrow('未知发言人')
    expect(()=>parseAphelionScript('@@ s01\n_|甲\n@@ s01\n_|乙')).toThrow('重复')
    console.log('APHELION CONTENT',JSON.stringify(stats))
  },60000)
  it('终局条件逐项生效，没有硬条件的返航和静默始终保留',async()=>{
    const world=await createAphelionWorldPreset();const pkg=compileAphelionPackage(await createAphelionBrief(world.scope,world.worldReleaseId))
    const flags=Object.fromEntries(ENDINGS.flatMap(ending=>ending.flags.map(flag=>[flag,true])))
    const context={...flags,adventure:{currentLocationKey:'dock'}}
    expect(evaluateNarrativeChoices(context,'s40',pkg.narrative.choices).filter(choice=>choice.available)).toHaveLength(4)
    for(const ending of ENDINGS)for(const flag of ending.flags){const choices=evaluateNarrativeChoices({...context,[flag]:false},'s40',pkg.narrative.choices);expect(choices.find(choice=>choice.targetNodeKey===ending.key)?.available).toBe(false);expect(choices.filter(choice=>choice.available).map(choice=>choice.targetNodeKey)).toContain('ending.return');expect(choices.filter(choice=>choice.available).map(choice=>choice.targetNodeKey)).toContain('ending.quiet')}
  },60000)
  it('两款游戏并存且存档、显示入口与活动作品隔离；坏存档切换失败后保留原旅程',async()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch)
    const tide=await installTidemark();await openBuiltinAdventurePlayer(tide,true,'海边旅程')
    const installed=await installAphelion();const ownId=await openBuiltinAdventurePlayer(installed,true,'深空航程');expect(installed.scope.projectId).not.toBe(tide.scope.projectId)
    expect(useAdventureGamePlayerStore.getState().selectedManifest?.definition.productKey).toBe(APHELION_ID)
    expect(builtinAdventureSessions(useAdventureGamePlayerStore.getState().sessions,installed.releaseId).map(session=>session.id)).toEqual([ownId])
    const another=await createWorldWork(installed.scope.projectId,{title:'另一部独立作品'});await switchActiveWork(installed.scope.projectId,another.id!)
    expect((await findInstalledAphelion())?.scope).toEqual(installed.scope)
    const bad=await createTextAdventureInstance({scope:installed.scope,productReleaseId:installed.releaseId,title:'损坏存档'})
    await db.productRuntimeSessions.update(bad.id!,{initialStateJson:'{broken'})
    await useAdventureGamePlayerStore.getState().load(installed.scope,null,true)
    await useAdventureGamePlayerStore.getState().select(ownId)
    await expect(selectBuiltinAdventureSession(bad.id!,installed.releaseId)).rejects.toThrow()
    expect(useAdventureGamePlayerStore.getState().selectedSessionId).toBe(ownId)
    expect(useAdventureGamePlayerStore.getState().runtimeState.narrative?.currentNodeKey).toBe('s01')
    expect(await openBuiltinAdventurePlayer(installed,true,'重新开始')).not.toBe(bad.id)
    const exported=await exportProjectJSON(installed.scope.projectId);await cascadeDeleteProject(installed.scope.projectId)
    expect(await db.productReleases.get(tide.releaseId)).toBeTruthy()
    const restoredId=await importProjectJSON(exported);const restored=await findInstalledAphelion();expect(restored?.scope.projectId).toBe(restoredId)
    await assertProductReleaseUnchanged(restored!.releaseId);expect(fetch).not.toHaveBeenCalled()
  },90000)
  it('公共命令完成十章、设备联锁与四结局；三处支路可回溯，备份不改变世界',async()=>{
    const installed=await installAphelion();expect(await installAphelion()).toEqual(installed)
    const release=await assertProductReleaseUnchanged(installed.releaseId);const pkg=parseAdventureProductReleaseManifest(release.manifestJson)
    const worldBefore=(await db.worldReleases.toArray()).map(row=>row.contentHash)
    const session=await createTextAdventureInstance({scope:installed.scope,productReleaseId:installed.releaseId,title:'完整航程'})
    const id=session.id!,branchPoints=new Map<string,number>()
    await move(id,'core');await expect(act(id,'inspect.key')).rejects.toThrow();await move(id,'dock')
    for(let turn=0;turn<60;turn++){
      const state=await readProductRuntimeState(id);const scene=ALL_SCENES.find(item=>item.key===state.narrative?.currentNodeKey)!
      expect(scene).toBeTruthy()
      const required=CLUES.find(clue=>clue.key===STORY_REQUIREMENTS[scene.key])
      if(required&&!state.adventure?.inventory.some(item=>item.itemKey===required.key)){
        await expect(commitAdventureNarrativeChoice({sessionId:id,choiceKey:pkg.narrative.choices.find(choice=>choice.sourceNodeKey===scene.key)!.choiceKey})).rejects.toThrow()
        await move(id,required.place)
        const puzzle=PUZZLES.find(item=>item.clue===required.key)
        if(puzzle){
          await expect(act(id,`inspect.${required.key}`)).rejects.toThrow()
          await expect(act(id,puzzleStepKey(required.key,1))).rejects.toThrow()
          for(const step of puzzle.order){await act(id,puzzleStepKey(required.key,step));if(step===0){const halfway=await createProductRuntimeCheckpoint({sessionId:id,name:'设备半程'});expect(await verifyProductRuntimeCheckpoint(halfway.id!)).toBe(true);expect((await readProductRuntimeState(id)).adventure?.inventory.some(item=>item.itemKey===puzzleStepKey(required.key,0))).toBe(true)}}
        }
        await act(id,`inspect.${required.key}`);await expect(act(id,`inspect.${required.key}`)).rejects.toThrow()
      }
      await move(id,scene.place)
      if(['s08','s16','s24'].includes(scene.key)){const checkpoint=await createProductRuntimeCheckpoint({sessionId:id,name:scene.key});branchPoints.set(scene.key,checkpoint.throughSequence)}
      if(scene.key==='s40')break
      await commitAdventureNarrativeChoice({sessionId:id,choiceKey:`${scene.key}.choice0`})
    }
    const final=await readProductRuntimeState(id);expect(final.narrative?.currentNodeKey).toBe('s40');expect(final.narrative?.availableChoiceKeys).toHaveLength(4)
    expect(CLUES.every(clue=>final.adventure?.inventory.some(item=>item.itemKey===clue.key))).toBe(true)
    expect(SCENES.every(scene=>final.narrative?.visitedNodeKeys.includes(scene.key))).toBe(true)
    expect(final.narrative?.visitedNodeKeys).toContain('route.audit');expect(final.narrative?.visitedNodeKeys).not.toContain('route.trust')
    for(const ending of ENDINGS){const branch=await branchProductRuntimeSession({parentSessionId:id,throughSequence:final.lastSequence,title:ending.title});await commitAdventureNarrativeChoice({sessionId:branch.id!,choiceKey:`choose.${ending.key}`});const completed=await readProductRuntimeState(branch.id!);expect(completed.narrative?.endingKey).toBe(ending.key);expect(completed.adventure?.quests.every(quest=>quest.status==='completed')).toBe(true)}
    for(const [key,throughSequence] of branchPoints){
      const branch=await branchProductRuntimeSession({parentSessionId:id,throughSequence,title:`另一种${key}`})
      await commitAdventureNarrativeChoice({sessionId:branch.id!,choiceKey:`${key}.choice1`})
      const alternative=BRANCHES[key][1],side=SIDE_SCENES.find(scene=>scene.key===alternative.target)!
      expect((await readProductRuntimeState(branch.id!)).narrative?.currentNodeKey).toBe(side.key)
      await move(branch.id!,side.place);await commitAdventureNarrativeChoice({sessionId:branch.id!,choiceKey:`${side.key}.choice0`})
      const resumed=await readProductRuntimeState(branch.id!);expect(resumed.narrative?.currentNodeKey).toBe(side.next);expect(resumed.narrative?.variables[alternative.flag]).toBe(false);expect(resumed.narrative?.visitedNodeKeys).not.toContain(BRANCHES[key][0].target)
    }
    expect((await db.worldReleases.toArray()).map(row=>row.contentHash)).toEqual(worldBefore)
    const backup=await exportProjectJSON(installed.scope.projectId),copyId=await importProjectJSON(backup)
    const copied=await db.productReleases.where('projectId').equals(copyId).first();await assertProductReleaseUnchanged(copied!.id!)
    expect(await db.productRuntimeSessions.where('projectId').equals(copyId).count()).toBe(8)
    await cascadeDeleteProject(copyId);expect(await db.productRuntimeSessions.where('projectId').equals(copyId).count()).toBe(0);expect(await db.productRuntimeSessions.get(id)).toBeTruthy()
  },600000)
})
