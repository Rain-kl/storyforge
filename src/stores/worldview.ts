import { create } from 'zustand'
import { db } from '../lib/db/schema'
import type { Worldview, StoryCore, PowerSystem } from '../lib/types'
import { adopt } from '../lib/registry/adopt'
import { refreshSettingAssertionSourceStatus } from '../lib/fact-ledger/setting-assertions'
import { readOwnedRows, resolveScopeLike, stampNewRecord, type WorkspaceScopeLike } from '../lib/workspace/scope'
import { coordinatePendingEditV1 } from '../lib/authoring/pending-edit-coordinator'

interface WorldviewStore {
  worldview: Worldview | null
  storyCore: StoryCore | null
  powerSystem: PowerSystem | null
  loading: boolean
  loadedProjectId: number | null
  /** 当前加载的世界组（null = 单世界模式 / 未指定） */
  activeWorldGroupId: number | null

  loadAll: (scope: WorkspaceScopeLike, worldGroupId?: number | null) => Promise<void>

  saveWorldview: (data: Partial<Worldview>) => Promise<void>
  saveStoryCore: (data: Partial<StoryCore>) => Promise<void>
  savePowerSystem: (data: Partial<PowerSystem>) => Promise<void>
}

const now = () => Date.now()
let worldviewLoadRequest = 0

export const useWorldviewStore = create<WorldviewStore>((set, get) => ({
  worldview: null,
  storyCore: null,
  powerSystem: null,
  loading: false,
  loadedProjectId: null,
  activeWorldGroupId: null,

  loadAll: async (scopeInput: WorkspaceScopeLike, worldGroupId: number | null = null) => {
    const request = ++worldviewLoadRequest
    set({ loading: true, activeWorldGroupId: worldGroupId })
    const scope = await resolveScopeLike(scopeInput)
    if (request !== worldviewLoadRequest) return
    set({ loadedProjectId: scope.projectId })
    const [wvList, sc, psList] = await Promise.all([
      readOwnedRows<Worldview>(scope, 'worldviews', { owner: 'world' }),
      readOwnedRows<StoryCore>(scope, 'storyCores', { owner: 'work' }).then(rows => rows[0]),
      readOwnedRows<PowerSystem>(scope, 'powerSystems', { owner: 'world' }),
    ])
    if (request !== worldviewLoadRequest || get().loadedProjectId !== scope.projectId || get().activeWorldGroupId !== worldGroupId) return
    // 单世界模式（worldGroupId == null）：取第一条
    // 多世界模式：取匹配该世界组的记录
    const wv = worldGroupId == null
      ? wvList[0]
      : wvList.find(w => w.worldGroupId === worldGroupId)
    const ps = psList.find(p => (p.worldGroupId ?? null) === worldGroupId)
    set({
      worldview: wv ?? null,
      storyCore: sc || null,   // 故事核心是项目级，不分世界
      powerSystem: ps || null,
      loading: false,
    })
  },

  saveWorldview: (data: Partial<Worldview>) => {
    const { worldview, activeWorldGroupId } = get()
    const projectId = data.projectId ?? worldview?.projectId
    if (projectId == null) return Promise.resolve()
    const { id: _, projectId: __, createdAt: ___, updatedAt: ____, worldGroupId, ...patch } = data
    const targetWorldGroupId = worldGroupId ?? activeWorldGroupId
    return coordinatePendingEditV1({
      key: `worldview:${projectId}:${targetWorldGroupId ?? 'default'}`,
      persist: async () => {
        await adopt({
          projectId,
          worldGroupId: targetWorldGroupId,
          target: 'worldviews',
          mode: 'replace',
          data: patch as Record<string, unknown>,
        })
        const list = await readOwnedRows<Worldview>(await resolveScopeLike(projectId), 'worldviews', { owner: 'world' })
        const next = (targetWorldGroupId == null
          ? (list.find(w => w.worldGroupId == null) ?? list[0])
          : list.find(w => w.worldGroupId === targetWorldGroupId)) ?? null
        set({ worldview: next })
      },
    })
  },

  saveStoryCore: (data: Partial<StoryCore>) => {
    const { storyCore } = get()
    const projectId = data.projectId ?? storyCore?.projectId
    if (projectId == null) return Promise.resolve()
    const { id: _, projectId: __, createdAt: ___, updatedAt: ____, ...patch } = data
    return coordinatePendingEditV1({
      key: `story-core:${projectId}`,
      persist: async () => {
        await adopt({
          projectId,
          target: 'storyCores',
          mode: 'replace',
          data: patch as Record<string, unknown>,
        })
        const next = (await readOwnedRows<StoryCore>(await resolveScopeLike(projectId), 'storyCores', { owner: 'work' }))[0] ?? null
        set({ storyCore: next })
      },
    })
  },

  savePowerSystem: (data: Partial<PowerSystem>) => {
    const { powerSystem, activeWorldGroupId } = get()
    const projectId = data.projectId ?? powerSystem?.projectId
    if (projectId == null) return Promise.resolve()
    const worldGroupId = data.worldGroupId !== undefined ? data.worldGroupId : activeWorldGroupId
    // Capture scope and field patch before the queued write; never borrow a newly
    // selected project's/group's record from the global store inside persist().
    const patch = Object.fromEntries(
      (['name', 'description', 'levels', 'rules'] as const)
        .filter(field => data[field] !== undefined).map(field => [field, data[field]]),
    )
    if (!Object.keys(patch).length) return Promise.resolve()
    const scopePromise = resolveScopeLike(projectId)
    return coordinatePendingEditV1({
      key: `power-system:${projectId}:${worldGroupId ?? 'default'}`,
      persist: async () => {
        const scope = await scopePromise
        const list = await readOwnedRows<PowerSystem>(scope, 'powerSystems', { owner: 'world' })
        const target = list.find(row => (row.worldGroupId ?? null) === worldGroupId)
        let next: PowerSystem
        if (target?.id) {
          const updatedAt = now()
          await db.powerSystems.update(target.id, { ...patch, updatedAt })
          await refreshSettingAssertionSourceStatus({
            projectId, table: 'powerSystems', recordId: target.id,
            changedFields: Object.keys(patch),
          })
          next = { ...target, ...patch, updatedAt }
        } else {
          const row = stampNewRecord(scope, 'powerSystems', {
            projectId, name: '', description: '', levels: '', rules: '',
            ...patch, worldGroupId, createdAt: now(), updatedAt: now(),
          }, { owner: 'world' }) as PowerSystem
          const id = await db.powerSystems.add(row)
          next = { ...row, id: id as number }
        }
        const current = get()
        if (current.activeWorldGroupId === worldGroupId
          && current.loadedProjectId === projectId) {
          set({ powerSystem: next })
        }
      },
    })
  },
}))
