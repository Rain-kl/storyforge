import { db } from '../db/schema'
import { verifyProductRuntimeSource } from '../product-production/preview-source'
import type { AdventureProductRuntimePackageV1, WorkspaceScope } from '../types'

export interface AdventurePreviewItem {
  productionId: number
  buildId: number
  buildNumber: number
  previewHash: string
  title: string
  updatedAt: number
  manifest: AdventureProductRuntimePackageV1 | null
  error: string
}

/** Only the current frozen build is offered for a new preview. Existing saves retain their own source. */
export async function readAdventurePlayerPreviews(scope: WorkspaceScope): Promise<AdventurePreviewItem[]> {
  const productions = (await db.productProductions.where('workId').equals(scope.workId).toArray())
    .filter(row => row.projectId === scope.projectId && row.worldId === scope.worldId
      && row.productType === 'text-adventure' && row.currentBuildNumber != null)
  const items = await Promise.all(productions.map(async production => {
    const build = await db.productBuilds.where('[productionId+buildNumber]')
      .equals([production.id!, production.currentBuildNumber!]).first()
    if (!build || !['preview-ready', 'release-ready'].includes(build.status) || !build.previewHash) return null
    const item: AdventurePreviewItem = {
      productionId: production.id!, buildId: build.id!, buildNumber: build.buildNumber,
      previewHash: build.previewHash, title: production.title, updatedAt: build.updatedAt, manifest: null, error: '',
    }
    try {
      const verified = await verifyProductRuntimeSource({
        scope, source: { kind: 'build', productBuildId: build.id!, expectedPreviewHash: build.previewHash },
      })
      if (verified.runtimePackage.productType !== 'text-adventure' || !verified.runtimePackage.adventure) {
        throw new Error('当前版本不是可玩的文字冒险。')
      }
      item.manifest = verified.runtimePackage as AdventureProductRuntimePackageV1
    } catch (cause) {
      item.error = cause instanceof Error ? cause.message : String(cause)
    }
    return item
  }))
  return items.filter((item): item is AdventurePreviewItem => item != null).sort((a, b) => b.updatedAt - a.updatedAt)
}
