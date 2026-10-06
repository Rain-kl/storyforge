import { useAdventureGamePlayerStore } from '../../stores/adventure-game-player'
import type { ProductRuntimeSession, WorkspaceScope } from '../types'

export function builtinAdventureSessions(sessions: ProductRuntimeSession[], releaseId: number) {
  return sessions.filter(session => session.kind === 'text-adventure'
    && session.productReleaseId === releaseId && session.worldGroupId == null)
}

/** Open the library before choosing a session: a damaged old save must not
 * prevent a fresh journey, and another product's session must never be chosen. */
export async function openBuiltinAdventurePlayer(installed: { scope: WorkspaceScope; releaseId: number }, fresh: boolean, title: string) {
  const before = useAdventureGamePlayerStore.getState()
  const preferredId = before.selectedSessionId
  await before.load(installed.scope, null, true)
  const library = useAdventureGamePlayerStore.getState()
  if (library.error) throw new Error(library.error)
  const sessions = builtinAdventureSessions(library.sessions, installed.releaseId)
  const session = sessions.find(item => item.id === preferredId) ?? sessions[0]
  if (fresh || !session) return library.start(installed.releaseId, title)
  await library.select(session.id!)
  const loaded = useAdventureGamePlayerStore.getState()
  if (loaded.error) throw new Error(loaded.error)
  return session.id!
}

/** A failed switch must not pair the old rendered state with a different save ID. */
export async function selectBuiltinAdventureSession(sessionId:number, releaseId:number) {
  const before=useAdventureGamePlayerStore.getState()
  if (!builtinAdventureSessions(before.sessions,releaseId).some(session=>session.id===sessionId)) throw new Error('该存档不属于当前游戏。')
  const previousId=before.selectedSessionId
  await before.select(sessionId)
  const problem=useAdventureGamePlayerStore.getState().error
  if(problem){await useAdventureGamePlayerStore.getState().select(previousId===sessionId?null:previousId);throw new Error(problem)}
}
