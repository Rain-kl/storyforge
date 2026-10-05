import { createWorkspace } from '../workspace/create-workspace'
import { adopt } from '../registry/adopt'
import { createWorldRevision, publishWorldRevision } from './releases'
import { createWorldReferenceV1 } from './world-reference'
import { db } from '../db/schema'
import { resolveWorkspaceScope } from '../workspace/ownership'
import { readOwnedRows } from '../workspace/scope'

export interface AuthoredWorldPreset {
  workspaceUid: string
  workspace: Parameters<typeof createWorkspace>[0]
  world: Record<string, unknown>
  story: Record<string, unknown>
  player: Record<string, unknown>
  label: string
}

/** Explicit installation of an authored semantic preset, never a runtime writeback. */
export async function createAuthoredWorldPreset(config: AuthoredWorldPreset) {
  const existing = await db.projects.filter(project => project.workspaceUid === config.workspaceUid).first()
  const created = existing ? { scope: await resolveWorkspaceScope(existing.id!) } : await createWorkspace({ ...config.workspace, workspaceUid: config.workspaceUid }, { purpose: 'world-engine', kind: 'novel', novelProfile: 'long' })
  const frozen = await db.worldReleases.where('worldId').equals(created.scope.worldId).first()
  if (frozen) return { scope: created.scope, worldReference: await createWorldReferenceV1(frozen.id!), worldReleaseId: frozen.id! }
  const write = async (target: string, data: Record<string, unknown>, mode: 'replace' | 'add' = 'replace') => {
    const result = await adopt({ projectId: created.scope.projectId, scope: created.scope, target, mode, data })
    if (result.skipped.length || result.typeErrors.length || result.unknown.length || result.fkErrors.length || !result.written.length) {
      throw new Error(`内置世界预设校验失败：${target} ${JSON.stringify(result)}`)
    }
  }
  await write('worldviews', config.world)
  await write('storyCores', config.story)
  const hasPlayer = (await readOwnedRows(created.scope, 'characters', { owner: 'world' }))[0]
  if (!hasPlayer) await write('characters', config.player, 'add')
  const revision = await createWorldRevision({ scope: created.scope, label: config.label })
  const release = await publishWorldRevision(revision.id!)
  return { scope: created.scope, worldReference: await createWorldReferenceV1(release.id!), worldReleaseId: release.id! }
}
