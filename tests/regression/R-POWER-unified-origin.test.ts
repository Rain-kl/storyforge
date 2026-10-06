import { inspectContextGatewayManifestFreshnessV1 } from '../../src/lib/context-gateway/attempt-evidence'
import { beforeEach, afterEach, describe, it, expect } from 'vitest'
import { db } from '../../src/lib/db/schema'
import { seedCurrentWorkspace } from '../helpers/current-workspace'
import { stampNewRecord } from '../../src/lib/workspace/scope'
import { useWorldviewStore } from '../../src/stores/worldview'
import { formatPowerSystemBlock } from '../../src/lib/ai/context-builder'
import { prepareWorldviewFieldCopilot } from '../../src/lib/agent/worldview-field-copilot'
import { exportProjectJSON, importProjectJSON } from '../../src/lib/export/json-export'
import { deleteWorkspace } from '../../src/lib/workspace/lifecycle'
import { flushPendingEditsV1, resetPendingEditCoordinatorForTestsV1 } from '../../src/lib/authoring/pending-edit-coordinator'
import type { PowerSystem } from '../../src/lib/types'

beforeEach(async () => { resetPendingEditCoordinatorForTestsV1(); await db.delete(); await db.open() })
afterEach(async () => { await flushPendingEditsV1(); await db.delete() })

async function fixture() {
  const current = await seedCurrentWorkspace('力量统一')
  const projectId = current.project.id!
  const id = await db.powerSystems.add(stampNewRecord(current.scope, 'powerSystems', {
    projectId, worldGroupId: null, name: '潮息', description: '借潮汐之力',
    levels: '听潮\n引潮\n归海', rules: '不可借取明日之潮', createdAt: 1, updatedAt: 1,
  }, { owner: 'world' }) as PowerSystem)
  return { ...current, projectId, id }
}

describe('unified origin power editor boundaries', () => {
  it('preserves rules-only, newline levels and JSON level attributes in registered context formatting', () => {
    expect(formatPowerSystemBlock({ rules: '唯一禁忌' } as PowerSystem)).toContain('唯一禁忌')
    expect(formatPowerSystemBlock({ levels: '初境\n终境' } as PowerSystem)).toContain('初境\n终境')
    expect(formatPowerSystemBlock({ levels: '[{"name":"归海","cost":"失去记忆"}]' } as PowerSystem)).toContain('失去记忆')
    expect(formatPowerSystemBlock({} as PowerSystem)).toBe('')
  })

  it('edits the same rule record without overwriting the overview, other fields or another workspace', async () => {
    const current = await fixture()
    const other = await seedCurrentWorkspace('另一本书')
    const store = useWorldviewStore.getState()
    await store.loadAll(current.projectId)
    const queued = store.savePowerSystem({ projectId: current.projectId, worldGroupId: null, rules: '先付代价再借潮' })
    await store.loadAll(other.project.id!)
    await queued
    expect(await db.powerSystems.get(current.id)).toMatchObject({ name: '潮息', description: '借潮汐之力', levels: '听潮\n引潮\n归海', rules: '先付代价再借潮' })
    expect(await db.powerSystems.where('projectId').equals(other.project.id!).count()).toBe(0)
    expect(useWorldviewStore.getState().powerSystem).toBeNull()
    await store.loadAll(current.projectId)
    await Promise.all([store.savePowerSystem({ projectId: current.projectId, name: '新潮息' }), store.savePowerSystem({ projectId: current.projectId, description: '新的描述' })])
    expect(await db.powerSystems.get(current.id)).toMatchObject({ name: '新潮息', description: '新的描述', rules: '先付代价再借潮' })
    expect(await db.powerSystems.count()).toBe(1)
  })

  it('does not fall back to a different world group when the selected group has no record', async () => {
    const { projectId, id } = await fixture()
    await db.powerSystems.update(id, { worldGroupId: 123 })
    await useWorldviewStore.getState().loadAll(projectId, null)
    expect(useWorldviewStore.getState().powerSystem).toBeNull()
    await useWorldviewStore.getState().savePowerSystem({ projectId, worldGroupId: null, rules: '默认世界规则' })
    expect((await db.powerSystems.get(id))?.rules).toBe('不可借取明日之潮')
    expect(await db.powerSystems.count()).toBe(2)
  })

  it('freezes existing rule details as mandatory Gateway input without copying them into the AI write target', async () => {
    const current = await fixture()
    const foreign = await seedCurrentWorkspace('隔离作品')
    await useWorldviewStore.getState().loadAll(foreign.project.id!)
    await useWorldviewStore.getState().savePowerSystem({ projectId: foreign.project.id!, rules: 'FOREIGN_POWER_RULE' })
    const prepare = () => prepareWorldviewFieldCopilot({ projectId: current.projectId, scope: current.scope, worldGroupId: null, authorRequest: '生成世界基座字段。目标字段=powerHierarchy；生成模式=expand。' })
    const before = await prepare()
    expect(before.contextGatewayExecution!.retrievalTrace.mandatory).toEqual(expect.arrayContaining([expect.objectContaining({ sourceRefs: expect.arrayContaining([expect.objectContaining({ table: 'powerSystems', recordId: current.id })]) })]))
    expect(before.input.assembled.text).toContain('不可借取明日之潮')
    expect(before.input.assembled.text).toContain('归海')
    expect(before.input.assembled.text).not.toContain('FOREIGN_POWER_RULE')
    expect(before.contextEvidence.inputState?.state).toBe('partial')
    const execution = before.contextGatewayExecution!
    const manifest = { gateway: { scopeFingerprint: execution.session.scopeFingerprint, policyHash: execution.session.policyHash, retrievalTrace: execution.retrievalTrace } } as Parameters<typeof inspectContextGatewayManifestFreshnessV1>[0]['manifest']
    expect((await inspectContextGatewayManifestFreshnessV1({ manifest, session: execution.session })).status).toBe('fresh')
    await useWorldviewStore.getState().loadAll(current.projectId)
    await useWorldviewStore.getState().savePowerSystem({ rules: '借潮必须留下凭证' })
    const after = await prepare()
    expect(after.contextGatewayExecution!.contextPacket.contentHash).not.toBe(before.contextGatewayExecution!.contextPacket.contentHash)
    expect(after.input.assembled.text).toContain('借潮必须留下凭证')
    expect((await inspectContextGatewayManifestFreshnessV1({ manifest, session: after.contextGatewayExecution!.session })).status).toBe('stale')
    expect(await db.worldviews.where('projectId').equals(current.projectId).count()).toBe(0)
  })

  it('keeps all absorbed details through export/import and workspace deletion remains scoped', async () => {
    const current = await fixture()
    await db.characters.add(stampNewRecord(current.scope, 'characters', {
      projectId: current.projectId, name: '持潮者', roleWeight: 'main', moralAxis: 'good', orderAxis: 'neutral',
      homeWorldGroupId: null, isCrossWorld: false, powerSystemId: current.id,
      shortDescription: '', personality: '', background: '', createdAt: 1, updatedAt: 1,
    }, { owner: 'world' }) as never)
    const original = await db.powerSystems.get(current.id)
    const copy = await importProjectJSON(await exportProjectJSON(current.projectId))
    const imported = await db.powerSystems.where('projectId').equals(copy).first()
    expect(imported).toMatchObject({ name: original!.name, description: original!.description, levels: original!.levels, rules: original!.rules })
    expect(imported!.id).not.toBe(current.id)
    expect((await db.characters.where('projectId').equals(copy).first())?.powerSystemId).toBe(imported!.id)
    await deleteWorkspace(copy)
    expect(await db.powerSystems.where('projectId').equals(copy).count()).toBe(0)
    expect(await db.powerSystems.get(current.id)).toEqual(original)
  })
})
