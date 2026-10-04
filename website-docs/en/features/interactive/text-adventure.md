---
productId: upper.text-adventure
status: preview
lastVerified: 2026-10-04
---
# Text adventure

> Preview. Professional production, asset review, publishing, and deterministic runtime are implemented; real-model content quality, human playtesting, and the first community-recommended finished work still require dedicated acceptance.

Text adventures combine action choices, inventory, abilities, quests, and endings. Each work references a frozen world version and owns its production artifacts, images, releases, and play progress.

## Choose play or production

For immediate play, open [Fog Harbor: The Lost-Tide Bells](/en/guides/examples) from Home → Example works. No model API is needed.

The Text adventure entry includes Works and playtests (作品与试玩), Product direction (产品定向), Automatic production (自动制作), Quality and assets (质量与素材), Publish and export (发布与导出), and Start adventure (开始冒险). Select the correct workspace and work first. Formal production requires explicit authorization and valid world sources. If an older build only shows a development entry, check [versions](/en/updates/compatibility).

## From sources to a playable version

1. Select a world version in Product direction and specify the intended experience, story scope, scale, and budget.
2. Check source sufficiency. Fill gaps or make the explicitly allowed decisions before production.
3. Review story and cast plans, quests, scenes, and dialogue in Automatic production, resolving pending confirmations.
4. In Quality and assets, review visual direction and character/scene images. Authors confirm visual requirements and images; independent review must pass before delivery.
5. Check quest routes, consequences, and endings through automated and actual playtests. Repair failed artifacts and affected dependencies first; follow authorization prompts if the budget is exhausted.
6. Check the frozen release and product package in Publish and export, then start from that version. After importing a product package, verify sources, assets, and the new save. A package serves a different purpose from a complete-project JSON backup.

## Play and recovery

The quest journal groups objectives by category. Inventory, equipment, skill points, and action explanations help you decide what to do next. Preconditions and resources constrain choices; actual events determine endings. Generated prose alone is not proof that an objective completed.

Progress binds to a frozen version. Check the version and save when refreshing or recovering. Use supported recovery paths after corruption warnings; do not manually alter frozen data. For failed or paused production, inspect the existing run and retained artifacts before restarting the entire work.

## Library, playtests, and local revisions

Works and playtests now groups cover cards by work. Open details to start, continue, or choose a save; historical versions of the same work appear in those details. A Build with valid provenance but no formal publication is explicitly labeled Unpublished playtest (未发布试玩), not a signed product release. If the selected Build changed before starting, refresh the library and confirm again.

Reading offers immersion, font, contrast, and reduced-motion controls. Starting, continuing, branching, and refreshing preserve the corresponding save. Characters in a scene follow its frozen cast list. Unavailable choices explain missing objectives, items, or resources, and completed actions provide explicit feedback.

Production supports version-constrained local revisions to accepted stories, cast, scene plans, prose, dialogue, and routes. Check the impact and rerun affected dependencies. Pause recovery, uploaded image replacements, and visual review retain the existing production flow, old Builds, and saves. Time-capacity revisions may only raise the limit, not reduce the time available in an older version.

These capabilities entered main through [PR #100](https://github.com/yuanbw2025/storyforge/pull/100) on October 4, 2026. The Tidal Bell Isles: The Last Light (潮钟群岛：最后的灯火) remains a local unpublished playtest: merging engineering code does not publish that work or make it available in a fresh installation. Local images and browser saves do not travel with Git. See [Pending development](/en/updates/development-status) for other branches requiring review.

Evidence: [Production flow](https://github.com/yuanbw2025/storyforge/commit/237f1912) · [Product packages](https://github.com/yuanbw2025/storyforge/commit/ecc178b8) · [Mainline production path](https://github.com/yuanbw2025/storyforge/commit/fdc5b87c).
