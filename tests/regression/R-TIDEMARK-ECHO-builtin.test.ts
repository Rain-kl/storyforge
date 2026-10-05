import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../src/lib/db/schema'
import { installEcho, createEchoBrief, findInstalledEcho, openEchoPlayer } from '../../src/lib/tidemark-echo/production'
import { compileEchoPackage, measureEchoContent } from '../../src/lib/tidemark-echo/compiler'
import { createEchoWorldPreset } from '../../src/lib/world-engine/tidemark-echo-preset'
import { ECHO_ID, PLACES, hasItem } from '../../src/lib/tidemark-echo/definition'
import { echoWalkable, echoWalkingPath } from '../../src/lib/tidemark-echo/navigation'
import { createTextAdventureInstance } from '../../src/lib/product/runtime-instances'
import { commitAdventureAction, commitAdventureNarrativeChoice, readProductRuntimeState, readProductRuntimeStateVersion, createProductRuntimeCheckpoint, branchProductRuntimeSession, verifyProductRuntimeCheckpoint } from '../../src/lib/adventure/runtime-api'
import { assertProductReleaseUnchanged } from '../../src/lib/product/releases'
import { exportProjectJSON, importProjectJSON } from '../../src/lib/export/json-export'
import { cascadeDeleteProject } from '../../src/lib/registry/lifecycle'
import { useAdventureGamePlayerStore } from '../../src/stores/adventure-game-player'

async function act(sessionId: number, actionKey: string) {
  const base = await readProductRuntimeStateVersion(sessionId)
  return commitAdventureAction({ sessionId, actionKey, commandId: `echo-test.${crypto.randomUUID()}`, baseSequence: base.sequence, baseStateHash: base.stateHash })
}
const choose = async (sessionId: number, choiceKey: string) => {
  try { return await commitAdventureNarrativeChoice({ sessionId, choiceKey }) }
  catch (cause) { throw new Error(`Choice ${choiceKey}: ${String(cause)}`) }
}
async function go(sessionId: number, to: string) {
  const from = (await readProductRuntimeState(sessionId)).adventure!.currentLocationKey
  if (from !== to) await act(sessionId, `move.${from}.${to}`)
}
async function rejectUnchanged(id: number, key: string) {
  const before = await readProductRuntimeStateVersion(id)
  await expect(act(id, key)).rejects.toThrow()
  expect(await readProductRuntimeStateVersion(id)).toEqual(before)
}

describe('E-TEXTADV-TIDEMARK-ECHO · 有操作与后果的短篇', () => {
  beforeEach(async () => { await db.delete(); await db.open() })
  afterEach(() => db.close())

  it('明确声明短篇规模，完整冻结人物、图与可读文本', async () => {
    const world = await createEchoWorldPreset()
    const brief = await createEchoBrief(world.scope, world.worldReleaseId)
    const pkg = compileEchoPackage(brief)
    const stats = measureEchoContent(pkg)
    console.info('Echo actual authored content', stats)
    expect(brief.scale).toEqual({ scope: 'short-arc', targetPlayMinutes: 5, targetWordCount: 1500, targetEndingCount: 2 })
    expect(pkg.definition.productKey).toBe(ECHO_ID)
    expect(stats.mainHan).toBeGreaterThanOrEqual(250)
    expect(stats.uniqueDialogueLines).toBeGreaterThanOrEqual(30)
    expect(stats.shortestRouteHan).toBeGreaterThan(500)
    expect(stats.shortestRouteHan).toBeLessThan(1300)
    expect(pkg.narrative.nodes).toHaveLength(12)
    for (const node of pkg.narrative.nodes) expect(pkg.narrative.beats.filter(beat => beat.nodeKey === node.key).length).toBeGreaterThanOrEqual(3)
    expect(pkg.adventure.quests).toHaveLength(3)
    expect((await createEchoWorldPreset()).worldReference.referenceHash).toBe(world.worldReference.referenceHash)
  }, 60000)

  it('紧凑区域可达，未开闸不穿越水面，打开后全部地点连通', () => {
    for (const from of PLACES) for (const to of PLACES) {
      const path = echoWalkingPath(from, to, true)
      expect(path.length).toBeGreaterThan(0)
      expect(path.every(point => echoWalkable(point, true))).toBe(true)
    }
    expect(echoWalkingPath(PLACES[0], PLACES[4], false)).toEqual([])
    expect(echoWalkingPath(PLACES[0], { x: 10, z: 6 }, true)).toEqual([])
    for (const from of [{x:4,z:2.1},{x:-6.6,z:-1.4},{x:7.7,z:1.9}]) {
      const path=echoWalkingPath(from,PLACES[4],true)
      expect(path.length).toBeGreaterThan(0)
      let previous=from
      for (const next of path) {
        for (let step=0;step<=30;step++) expect(echoWalkable({x:previous.x+(next.x-previous.x)*step/30,z:previous.z+(next.z-previous.z)*step/30},true)).toBe(true)
        previous=next
      }
    }
  })

  it('四条组合公共命令通关，机关拒绝越序，分支/物品/备份有真实后果', async () => {
    const installed = await installEcho()
    expect(await installEcho()).toEqual(installed)
    const frozen = (await db.worldReleases.toArray()).map(row => row.contentHash)
    const original = await createTextAdventureInstance({ scope: installed.scope, productReleaseId: installed.releaseId, title: '最初的接应' })
    const id = original.id!
    await rejectUnchanged(id, 'move.quay.boat')
    await choose(id, 'begin')
    await go(id, 'sluice')
    await rejectUnchanged(id, 'sluice.inlet')
    await rejectUnchanged(id, 'sluice.pressure')
    await go(id, 'gauge'); await act(id, 'inspect.gauge')
    await rejectUnchanged(id, 'inspect.gauge')
    await go(id, 'shed'); await act(id, 'take.tools')
    await go(id, 'sluice'); await act(id, 'sluice.inlet')
    await rejectUnchanged(id, 'sluice.crank')
    await act(id, 'sluice.pressure'); await act(id, 'sluice.crank')
    expect(hasItem((await readProductRuntimeState(id)).adventure?.inventory, 'state_gate')).toBe(true)
    await go(id, 'quay'); await choose(id, 'cross'); await go(id, 'boat'); await act(id, 'inspect.letter')
    const signal = await readProductRuntimeState(id)
    const checkpoint = await createProductRuntimeCheckpoint({ sessionId: id, name: '铃声前' })
    expect(await verifyProductRuntimeCheckpoint(checkpoint.id!)).toBe(true)
    for (const voice of ['ask', 'echo']) {
      const voiceBranch = await branchProductRuntimeSession({ parentSessionId: id, throughSequence: signal.lastSequence, title: voice })
      const branchId = voiceBranch.id!
      await choose(branchId, voice)
      await choose(branchId, voice === 'ask' ? 'answer.ready' : 'echo.ready')
      const decision = await readProductRuntimeState(branchId)
      for (const route of ['fast', 'careful']) {
        const branch = await branchProductRuntimeSession({ parentSessionId: branchId, throughSequence: decision.lastSequence, title: `${voice}.${route}` })
        const run = branch.id!
        await choose(run, `route.${route}`)
        await rejectUnchanged(run, route === 'fast' ? 'cut.rope' : 'lift.basket')
        await act(run, `harness.${route}`)
        if (route === 'fast') {
          await rejectUnchanged(run, 'lift.basket')
          await act(run, 'cut.rope')
        } else {
          await rejectUnchanged(run, 'cut.rope'); await rejectUnchanged(run, 'take.paper')
          await act(run, 'lift.basket')
          await rejectUnchanged(run, 'haul.rope')
          await act(run, 'take.paper'); await act(run, 'haul.rope')
        }
        await choose(run, `return.${route}`)
        await expect(choose(run, `finish.${route}`)).rejects.toThrow()
        await go(run, 'quay'); await choose(run, `finish.${route}`)
        const end = await readProductRuntimeState(run)
        expect(end.narrative?.endingKey).toBe(`ending.${route}`)
        expect(end.narrative?.variables.listened).toBe(voice === 'ask')
        expect(end.adventure?.quests.every(quest => quest.status === 'completed')).toBe(true)
        expect(hasItem(end.adventure?.inventory, 'bell')).toBe(true)
        expect(hasItem(end.adventure?.inventory, 'paper')).toBe(false)
        expect(end.adventure?.inventory.some(item => item.itemKey === 'paper' && item.ownerKey === 'zhao')).toBe(route === 'careful')
        const endCheckpoint = await createProductRuntimeCheckpoint({ sessionId: run, name: '完整接应' })
        expect(await verifyProductRuntimeCheckpoint(endCheckpoint.id!)).toBe(true)
      }
    }
    expect((await readProductRuntimeState(id)).narrative?.currentNodeKey).toBe('signal')
    expect((await db.worldReleases.toArray()).map(row => row.contentHash)).toEqual(frozen)
    await assertProductReleaseUnchanged(installed.releaseId)
    const importedId = await importProjectJSON(await exportProjectJSON(installed.scope.projectId))
    expect(importedId).not.toBe(installed.scope.projectId)
    await cascadeDeleteProject(installed.scope.projectId)
    const restored = await findInstalledEcho()
    expect(restored?.scope.projectId).toBe(importedId)
    await openEchoPlayer(restored!, false)
    expect(useAdventureGamePlayerStore.getState().selectedManifest?.definition.productKey).toBe(ECHO_ID)
    expect(await db.projects.count()).toBe(1)
    await cascadeDeleteProject(importedId)
    expect(await findInstalledEcho()).toBe(null)
    expect(await db.productRuntimeSessions.count()).toBe(0)
  }, 600000)
})
