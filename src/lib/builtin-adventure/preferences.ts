export interface BuiltinAdventurePreferences {
  low: boolean
  fallback: boolean
  fullText: boolean
}

export function createBuiltinAdventurePreferences(slug:string) {
  const KEY = `storyforge.${slug}.display.v1`

  /** Device display preferences only. Saves and story state remain in the
   * registered product runtime tables and their existing backup lifecycle. */
  function read(): BuiltinAdventurePreferences {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) ?? '{}')
      return { low: value?.low === true, fallback: value?.fallback === true, fullText: value?.fullText === true }
    } catch { return { low: false, fallback: false, fullText: false } }
  }

  function save(value: BuiltinAdventurePreferences): void {
    try { localStorage.setItem(KEY, JSON.stringify(value)) } catch { /* Display preferences are optional on storage-restricted devices. */ }
  }

  return { read, save }
}
