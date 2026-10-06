import { builtinAdventureSessions, openBuiltinAdventurePlayer } from '../builtin-adventure/player'
import type { WorkspaceScope } from '../types'
export const tidemarkSessions = builtinAdventureSessions
export const openTidemarkPlayer = (installed: { scope: WorkspaceScope; releaseId: number }, fresh: boolean) => openBuiltinAdventurePlayer(installed, fresh, '潮痕 · 我的旅程')
