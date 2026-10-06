import { createBuiltinAdventurePreferences } from '../builtin-adventure/preferences'
export type { BuiltinAdventurePreferences as TidemarkPreferences } from '../builtin-adventure/preferences'
const preferences = createBuiltinAdventurePreferences('tidemark')
export const readTidemarkPreferences = preferences.read
export const saveTidemarkPreferences = preferences.save
