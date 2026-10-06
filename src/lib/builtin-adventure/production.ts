import { db } from '../db/schema'
import { resolveScope } from '../workspace/scope'
import type { AdventureProductRuntimePackageV1, ProductBuildQualityReportV1, ProductProductionBriefV3, ProductProductionPlanV3, WorkspaceScope } from '../types'
import { loadProductProductionConsultationSourceV2 } from '../product-production/world-source'
import { compileUpperProductWorldRoleBindingsV1 } from '../product/world-requirement-adapters'
import { createProductProductionWithBriefV1, listProductProductionWorkspaceV1, readProductProductionDetailsV1, publishProductProductionV1, retryProductProductionBlockerV1, archiveProductProductionV1 } from '../product-production/service'
import { executeProductProductionCommand } from '../product-production/commands'
import { parseProductProductionBriefV3 } from '../product-production/contracts'
import { parseProductProductionPlanV3 } from '../product-production/plan'
import { hashProductProductionValueV2 } from '../product-production/hash'
import { parseProductRuntimePackageV1 } from '../product-production/runtime-package'
import { evaluateProductRuntimeProductQualityV1 } from '../product-production/product-quality'
import { runProductProductionUntilBlockedV1, type ProductProductionTaskExecutorV1 } from '../product-production/scheduler'
import { assertProductReleaseUnchanged, parseAdventureProductReleaseManifest } from '../product/releases'
import { compileTextAdventureProductionBriefV1 } from '../adventure/production-brief'

export interface AuthoredContentStats {
  mainHan: number; shortestRouteHan: number; totalHan: number; dialogueLines: number; uniqueDialogueLines: number; scenes: number; endings: number
}
export interface BuiltinAdventureBriefInput {
  slug: string; title: string; summary: string; openingConflict: string
  scale?: ProductProductionBriefV3['scale']
  intent: (participants: string[]) => ProductProductionBriefV3['intent']
}
export interface BuiltinAdventureProductionConfig {
  id: string; slug: string; title: string; worldTitle: string
  createWorldPreset(): Promise<{ scope: WorkspaceScope; worldReleaseId: number }>
  createBrief(scope: WorkspaceScope, worldReleaseId: number): Promise<ProductProductionBriefV3>
  compile(brief: ProductProductionBriefV3): AdventureProductRuntimePackageV1
  measure(pkg: Pick<AdventureProductRuntimePackageV1, 'narrative'>): AuthoredContentStats
  contentMinimum?: { mainHan: number; uniqueDialogueLines: number }
}

export async function createBuiltinAdventureBrief(scope: WorkspaceScope, worldReleaseId: number, config: BuiltinAdventureBriefInput): Promise<ProductProductionBriefV3> {
  const source = await loadProductProductionConsultationSourceV2({ scope, worldReleaseId })
  const roleBindings = compileUpperProductWorldRoleBindingsV1('text-adventure', source.selectionCatalog)
  const resourceKeys = [...new Set(Object.values(source.selectionCatalog).flat())].sort()
  // The authored chapters are preserved in the package. Scale describes the
  // bounded installation contract, not a request to regenerate or trim them.
  const scale: ProductProductionBriefV3['scale'] = config.scale ?? { scope: 'chapter', targetPlayMinutes: 120, targetWordCount: 30000, targetEndingCount: 4 }
  const media: ProductProductionBriefV3['media'] = { visualLevel: 'none', audioLevel: 'none', imageCount: 0, musicTrackCount: 0, sfxCount: 0, voiceLineCount: 0, requiredMediaKinds: [] }
  return parseProductProductionBriefV3({
    schema: 'storyforge.product-production-brief', version: 3,
    source: { worldReleaseId, worldContentHash: source.worldReference.releaseHash,
      selection: { schema: 'storyforge.product-world-source-selection', version: 1, productType: 'text-adventure', worldReferenceHash: source.worldReference.referenceHash, resourceKeys, roleBindings },
      startingPoint: { kind: 'mainline', title: config.title, summary: config.summary, sourceRefs: resourceKeys, protagonistRefs: roleBindings.participants ?? [], openingConflict: config.openingConflict },
    },
    intent: config.intent(roleBindings.participants ?? []),
    scale, media,
    textAdventure: compileTextAdventureProductionBriefV1({ scale, media, draft: { sourceTreatment: 'adapt-rich', minimumDistinctRoutes: scale.targetEndingCount, confirmAll: true } }),
    consultationBudget: { maximumModelCalls: 0, maximumInputTokens: 0, maximumOutputTokens: 0, maximumCostUsd: 0 },
    productionBudget: { maximumModelCalls: 0, maximumInputTokens: 100000, maximumOutputTokens: 0, maximumCostUsd: 0, maximumMediaCalls: 0, maximumDurationMs: 300000, maximumStorageBytes: 20000000 },
    qualityProfile: 'internal', capabilityRequirements: [],
    externalDataPolicy: { allowedDataClasses: ['world-selection'], forbiddenDataClasses: ['api-key'], allowReferenceImages: false, allowVoiceScripts: false },
    fallbackPolicy: { allowTextOnly: true, allowExistingProjectMedia: false, allowProceduralAudio: true, onRequiredCapabilityMissing: 'pause' },
    completionContract: { requiresPlayablePreview: true, requiredGateIds: ['runtime.package.valid', 'runtime.playable', 'narrative.graph.valid', 'rights.complete', `${config.slug}.authored-scale`], minimumMediaCoverage: 0, allowSoftWaivers: false }, unresolvedDecisionKeys: [],
  })
}

/** Shared only by authored text adventures; every game keeps its own frozen Brief and package. */
export function createBuiltinAdventureProduction(config: BuiltinAdventureProductionConfig) {
  const minimum = config.contentMinimum ?? { mainHan: 30000, uniqueDialogueLines: 500 }
  if (![minimum.mainHan, minimum.uniqueDialogueLines].every(value => Number.isSafeInteger(value) && value > 0)) {
    throw new Error('内置游戏内容下限必须是正整数')
  }
  function createPlan(brief: ProductProductionBriefV3, briefHash: string, buildNumber: number, controlEpoch: number): ProductProductionPlanV3 {
    return parseProductProductionPlanV3({ schema: 'storyforge.product-production-plan', version: 3,
      productType: 'text-adventure', briefHash, buildNumber, controlEpoch,
      concurrency: { maximumCostBearingTasks: 1, maximumTextProviderTasks: 1, maximumMediaProviderTasks: 1 },
      terminalTaskKey: 'quality.verify',
      tasks: [
        { taskKey: 'runtime.integrate', kind: 'runtime-package', lane: 'integration', outputArtifactKeys: ['runtime.package'], inputArtifactKeys: [], dependsOn: [], acceptanceGateIds: ['runtime.package.valid', 'narrative.graph.valid', 'rights.complete'] },
        { taskKey: 'quality.verify', kind: 'quality-report', lane: 'qa', outputArtifactKeys: ['quality.report'], inputArtifactKeys: ['runtime.package'], dependsOn: ['runtime.integrate'], acceptanceGateIds: ['runtime.playable', `${config.slug}.authored-scale`] },
      ].map(task => ({ ...task, skillId: null, executionMode: 'deterministic', requirementKeys: [], capabilityRequirementKeys: [], concurrencyGroup: task.lane, subjectLockKeys: task.outputArtifactKeys,
        priority: 50, maxAttempts: 1, timeoutMs: 120000, failurePolicy: 'fail-build', fallbackTaskKey: null, reuse: null,
        requiredReceipts: task.dependsOn.map(taskKey => ({ taskKey, receiptHash: null })),
        budgetReservation: { modelCalls: 0, inputTokens: task.kind === 'runtime-package' ? 100000 : 0, outputTokens: 0, mediaCalls: 0, maximumCostUsd: 0, durationMs: 120000, storageBytes: 8000000 },
      })),
    }, brief, briefHash)
  }

  function executor(brief: ProductProductionBriefV3): ProductProductionTaskExecutorV1 {
    return async task => {
      const started = performance.now()
      const usage = () => ({ modelCalls: 0, inputTokens: 0, outputTokens: 0, mediaCalls: 0, costUsd: 0, durationMs: Math.ceil(performance.now() - started), storageBytes: 0 })
      if (task.task.kind === 'runtime-package') {
        if (!task.contextText.trim()) throw new Error('内置游戏缺少真实世界读取证据')
        const pkg = config.compile(brief)
        return { artifacts: [{ artifactKey: 'runtime.package', kind: 'presentation', payload: pkg,
          quality: { sourceContextHash: await hashProductProductionValueV2(task.contextText), compiler: config.id },
          rights: { origin: 'original-authored-builtin', containsThirdPartyText: false, proceduralSceneOwner: config.id },
        }], passedGateIds: task.task.acceptanceGateIds, usage: usage() }
      }
      if (task.task.kind !== 'quality-report') throw new Error('不支持的内置游戏生产任务')
      const artifact = task.inputArtifacts.find(item => item.artifactKey === 'runtime.package')
      if (!artifact) throw new Error('内置游戏运行包缺失')
      const pkg = parseProductRuntimePackageV1(artifact.payloadJson)
      const product = evaluateProductRuntimeProductQualityV1({ runtimePackage: pkg, brief })
      if (pkg.productType !== 'text-adventure') throw new Error('内置游戏运行包产品身份错误')
      const stats = config.measure(pkg)
      const scalePassed = stats.mainHan >= minimum.mainHan && stats.uniqueDialogueLines >= minimum.uniqueDialogueLines
      if (!scalePassed || !product.passed) throw new Error(`内置游戏质量门未通过：${JSON.stringify({ stats, gates: product.gates.filter(gate => !gate.passed) })}`)
      const packageHash = await hashProductProductionValueV2(pkg)
      const report: ProductBuildQualityReportV1 = { schema: 'storyforge.product-build-quality-report', version: 1, buildNumber: task.buildNumber, packageHash,
        hardGateResults: brief.completionContract.requiredGateIds.map(gateId => ({ gateId, passed: true, evidence: [packageHash, JSON.stringify({ stats, minimum })] })),
        softGateResults: product.gates, mediaCoverage: 1, playable: true, releaseReady: true,
        warnings: ['原创内置脚本与程序化场景；无付费模型调用。3D 展示由内置游戏界面提供，无配音。'],
      }
      return { artifacts: [{ artifactKey: 'quality.report', kind: 'quality-report', payload: report, quality: { stats }, rights: {} }], passedGateIds: task.task.acceptanceGateIds, usage: usage() }
    }
  }

  let installation: Promise<{ scope: WorkspaceScope; releaseId: number }> | null = null

  /** Backups remap workspace IDs; recognize the immutable product, not a local ID. */
  async function findInstalled() {
    const releases = await db.productReleases.toArray()
    const release = releases.find(row => { try { return parseAdventureProductReleaseManifest(row.manifestJson).definition.productKey === config.id } catch { return false } })
    if (!release) return null
    await assertProductReleaseUnchanged(release.id!)
    return { scope: await resolveScope({ scope: { projectId: release.projectId, worldId: release.worldId, workId: release.workId } }), releaseId: release.id! }
  }

  /** User-triggered, resumable installation through the existing production lifecycle. */
  function install(onProgress: (message: string) => void = () => {}) {
    if (installation) return installation
    const performInstall = async () => {
      const installed = await findInstalled()
      if (installed) return installed
      onProgress(`准备${config.worldTitle}的世界版本…`)
      const world = await config.createWorldPreset()
      const { scope } = world
      const releases = await db.productReleases.where('workId').equals(scope.workId).toArray()
      const release = releases.find(row => { try { return parseAdventureProductReleaseManifest(row.manifestJson).definition.productKey === config.id } catch { return false } })
      if (release) { await assertProductReleaseUnchanged(release.id!); return { scope, releaseId: release.id! } }
      onProgress('锁定剧情与世界来源…')
      const workspace = await listProductProductionWorkspaceV1(scope, ['text-adventure'])
      let productionId = workspace.productions.find(item => item.title === config.title && item.status !== 'archived')?.id
      if (productionId == null) productionId = await createProductProductionWithBriefV1({ scope, worldReleaseId: world.worldReleaseId, title: config.title, brief: await config.createBrief(scope, world.worldReleaseId) })
      let details = await readProductProductionDetailsV1(scope, productionId)
      if (!details?.brief) throw new Error('内置游戏 Brief 缺失')
      if (details.build && ['failed', 'cancelled'].includes(details.build.status)) {
        onProgress('保留上次准备记录，重新核验内置内容…')
        await archiveProductProductionV1({ scope, production: details.production })
        productionId = await createProductProductionWithBriefV1({ scope, worldReleaseId: world.worldReleaseId, title: config.title, brief: await config.createBrief(scope, world.worldReleaseId) })
        details = await readProductProductionDetailsV1(scope, productionId)
      }
      if (details.build?.status === 'recovery-required') {
        await retryProductProductionBlockerV1({ scope, details })
        details = await readProductProductionDetailsV1(scope, productionId)
      }
      if (details.build?.status === 'paused') {
        const resumed = await executeProductProductionCommand({ scope, productionId, command: {
          type: 'resume', commandId: `${config.slug}.resume.${productionId}.${details.production.stateRevision}`, expectedStateRevision: details.production.stateRevision,
        } })
        if (!resumed.ok) throw new Error(String(resumed.result.message ?? resumed.errorCode))
        details = await readProductProductionDetailsV1(scope, productionId)
      }
      if (!details.brief) throw new Error('内置游戏 Brief 缺失')
      if (!details.build || details.production.status === 'brief-ready') {
        const authorized = await executeProductProductionCommand({ scope, productionId, command: {
          type: 'authorize-start', commandId: `${config.slug}.authorize.${productionId}.${details.brief.revision}`, expectedStateRevision: details.production.stateRevision,
          briefRevision: details.brief.revision, briefHash: details.brief.briefHash, authorizationNonce: `player-start.${crypto.randomUUID()}`,
        } })
        if (!authorized.ok) throw new Error(String(authorized.errorCode ?? '内置游戏开始授权失败'))
        details = await readProductProductionDetailsV1(scope, productionId)
      }
      if (!details?.build || !details.brief) throw new Error('内置游戏构建未就绪')
      const brief = parseProductProductionBriefV3(details.brief.briefJson)
      if (!['release-ready', 'released'].includes(details.build.status)) {
        onProgress('编译剧情、任务与分支，核验内容完整性…')
        const result = await runProductProductionUntilBlockedV1({ scope, productionId, suppliedPlan: createPlan(brief, details.brief.briefHash, details.build.buildNumber, details.build.controlEpoch), executor: executor(brief), maximumCycles: 12,
          onDurableBoundary: (boundary, snapshot) => {
            const quality = Boolean(snapshot.projection.steps['quality.verify'])
            onProgress(boundary === 'root.completed' ? '剧情核验完成，正在保存版本…' : quality ? '核验全部章节与分支结局…' : boundary === 'candidate.checkpoint' || boundary === 'artifact.accepted' ? '保存完整剧本与任务…' : `读取${config.worldTitle}的世界设定…`)
          },
        })
        if (result.buildStatus !== 'release-ready') throw new Error(`内置内容准备中断：${result.buildStatus}。已有进度已保留。`)
      }
      onProgress('保存不可变游戏版本…')
      await publishProductProductionV1({ scope, productionId })
      const completed = await readProductProductionDetailsV1(scope, productionId)
      const releaseId = completed?.production.currentProductReleaseId
      if (releaseId == null) throw new Error('内置游戏发布尚未完成')
      await assertProductReleaseUnchanged(releaseId)
      return { scope, releaseId }
    }
    installation = Promise.resolve(typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request(`storyforge.${config.slug}.install`, performInstall) : performInstall()).then(value => value).finally(() => { installation = null })
    return installation
  }

  return { createPlan, executor, findInstalled, install }
}
